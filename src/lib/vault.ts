import type { BrokerData } from "./types";

// Entschlüsselt die Demo-Daten im Browser (Gegenstück zu scripts/build-vault.mjs).
// Vorgaben aus den Anforderungen, Abschnitt 7:
// - Passwort bei jedem Besuch. Kein Schlüssel und nichts Entschlüsseltes in localStorage oder sessionStorage,
//   die Daten liegen nur im Speicher. Neu laden heißt neu eingeben.
// - Der verschlüsselte Block wird schon geladen, während der Passwort-Screen zu sehen ist (prefetchVault).
// - PBKDF2 läuft einmal pro Seitenaufruf, direkt nach der Passworteingabe (geschätzt 120 bis 200 ms auf
//   einem Mittelklasse-Handy). Danach kein erneutes Entschlüsseln, Seitenwechsel bleiben schnell.

type Vault = { v: 1; iterations: number; salt: string; iv: string; data: string };

const BASE = process.env.NEXT_PUBLIC_BASE_PATH ?? "";
// Frühere Versionen haben Schlüssel bzw. Daten gespeichert. Beim Laden entfernen.
const LEGACY = { local: "ai-vault-key", session: "ai-vault-data" };

const unb64 = (s: string) => Uint8Array.from(atob(s), (c) => c.charCodeAt(0));

let memory: BrokerData | null = null;
let vaultPromise: Promise<Vault> | null = null;

/** Lädt den verschlüsselten Block (einmal). Früh aufrufen, z. B. beim Anzeigen des Passwort-Screens. */
export function prefetchVault() {
  vaultPromise ??= fetch(`${BASE}/vault.json`).then((r) => {
    if (!r.ok) throw new Error(`vault.json: ${r.status}`);
    return r.json();
  });
  return vaultPromise;
}

/** Entfernt gespeicherte Schlüssel und Daten älterer Versionen. */
export function purgeLegacy() {
  localStorage.removeItem(LEGACY.local);
  sessionStorage.removeItem(LEGACY.session);
}

/** Daten dieses Seitenaufrufs, sonst null */
export const cached = () => memory;

/** Mit Passwort öffnen. Wirft bei falschem Passwort. */
export async function unlock(password: string) {
  const v = await prefetchVault();
  const base = await crypto.subtle.importKey("raw", new TextEncoder().encode(password.trim()), "PBKDF2", false, [
    "deriveKey",
  ]);
  const key = await crypto.subtle.deriveKey(
    { name: "PBKDF2", hash: "SHA-256", salt: unb64(v.salt), iterations: v.iterations },
    base,
    { name: "AES-GCM", length: 256 },
    false,
    ["decrypt"],
  );
  const plain = await crypto.subtle.decrypt({ name: "AES-GCM", iv: unb64(v.iv) }, key, unb64(v.data));
  memory = JSON.parse(new TextDecoder().decode(plain));
  return memory!;
}

export function lock() {
  memory = null;
}
