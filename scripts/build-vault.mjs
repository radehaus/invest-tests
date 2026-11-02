// Verschlüsselt data/private/broker.json mit dem Demo-Passwort nach public/vault.json.
// Nur vault.json liegt im (öffentlichen) Repo. Klartext und Passwort bleiben lokal.
//
//   Passwort:  VAULT_PASSWORD in .env.local (gitignored)
//   Aufruf:    npm run vault
//
// Verfahren: PBKDF2-SHA256 (150.000 Iterationen, 16 Byte Salt) -> AES-256-GCM (12 Byte IV).
// 150.000 Iterationen: auf einem Apple M4 rund 25 ms, auf einem Mittelklasse-Handy geschätzt
// 120 bis 200 ms. Vorgabe aus den Anforderungen: unter etwa 300 ms. Nur einmal pro Sitzung.
// Läuft automatisch vor dev und build. Fehlen Klartext oder Passwort (z. B. im CI), bleibt
// die vorhandene vault.json unverändert. Sie wird nur neu geschrieben, wenn sich Daten oder Passwort ändern.

import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { webcrypto as crypto } from "node:crypto";

const PLAIN = new URL("../data/private/broker.json", import.meta.url);
const VAULT = new URL("../public/vault.json", import.meta.url);
const ITERATIONS = 150_000;

const b64 = (buf) => Buffer.from(buf).toString("base64");
const unb64 = (s) => new Uint8Array(Buffer.from(s, "base64"));

async function deriveKey(password, salt, iterations) {
  const base = await crypto.subtle.importKey("raw", new TextEncoder().encode(password), "PBKDF2", false, ["deriveKey"]);
  return crypto.subtle.deriveKey(
    { name: "PBKDF2", hash: "SHA-256", salt, iterations },
    base,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"],
  );
}

async function decryptExisting(password) {
  if (!existsSync(VAULT)) return null;
  try {
    const v = JSON.parse(readFileSync(VAULT, "utf8"));
    const key = await deriveKey(password, unb64(v.salt), v.iterations);
    const plain = await crypto.subtle.decrypt({ name: "AES-GCM", iv: unb64(v.iv) }, key, unb64(v.data));
    return new TextDecoder().decode(plain);
  } catch {
    return null; // anderes Passwort oder beschädigt: neu verschlüsseln
  }
}

const password = process.env.VAULT_PASSWORD;
if (!existsSync(PLAIN) || !password) {
  const why = !existsSync(PLAIN) ? "keine Klartext-Daten (data/private/broker.json)" : "kein VAULT_PASSWORD in .env.local";
  if (!existsSync(VAULT)) {
    console.error(`vault: ${why}, und es gibt noch keine public/vault.json.`);
    process.exit(1);
  }
  console.log(`vault: ${why}, vorhandene vault.json bleibt.`);
  process.exit(0);
}

// Kompakt serialisieren, damit der Vergleich stabil ist
const plaintext = JSON.stringify(JSON.parse(readFileSync(PLAIN, "utf8")));
const existing = existsSync(VAULT) ? JSON.parse(readFileSync(VAULT, "utf8")) : null;
if (existing?.iterations === ITERATIONS && (await decryptExisting(password)) === plaintext) {
  console.log("vault: aktuell.");
  process.exit(0);
}

const salt = crypto.getRandomValues(new Uint8Array(16));
const iv = crypto.getRandomValues(new Uint8Array(12));
const key = await deriveKey(password, salt, ITERATIONS);
const data = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, new TextEncoder().encode(plaintext));

const vault = { v: 1, kdf: "PBKDF2-SHA256", cipher: "AES-256-GCM", iterations: ITERATIONS, salt: b64(salt), iv: b64(iv), data: b64(data) };
writeFileSync(VAULT, JSON.stringify(vault, null, 2) + "\n");
console.log(`vault: neu verschlüsselt (${Math.round(data.byteLength / 1024)} KB).`);
