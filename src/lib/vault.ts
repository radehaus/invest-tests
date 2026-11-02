import type { BrokerData } from "./types";

// Entschlüsselt die Demo-Daten im Browser (Gegenstück zu scripts/build-vault.mjs).
// Tempo-Vorgaben aus den Anforderungen, Abschnitt 7:
// - Der verschlüsselte Block wird schon geladen, während der Passwort-Screen zu sehen ist (prefetchVault).
// - PBKDF2 läuft nur einmal, direkt nach der Passworteingabe.
// - Danach liegen die Daten im Speicher und für die Sitzung in sessionStorage. Kein erneutes Entschlüsseln.
// - Für spätere Sitzungen merken wir den abgeleiteten AES-Schlüssel: Öffnen dauert dann ~1 ms, ohne PBKDF2.
// Das ist eine Sperre gegen Zufallsbesucher, kein Schutz vor jemandem, der das Passwort kennt.

type Vault = { v: 1; iterations: number; salt: string; iv: string; data: string };

const SESSION_DATA = "ai-vault-data";
const KEY_STORE = "ai-vault-key";
const BASE = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

const unb64 = (s: string) => Uint8Array.from(atob(s), (c) => c.charCodeAt(0));
const b64 = (buf: ArrayBuffer) => btoa(String.fromCharCode(...new Uint8Array(buf)));

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

async function open(key: CryptoKey): Promise<BrokerData> {
  const v = await prefetchVault();
  const plain = await crypto.subtle.decrypt({ name: "AES-GCM", iv: unb64(v.iv) }, key, unb64(v.data));
  const text = new TextDecoder().decode(plain);
  memory = JSON.parse(text);
  sessionStorage.setItem(SESSION_DATA, text);
  return memory!;
}

/** Sofort verfügbare Daten (Speicher oder Sitzung), sonst null. Synchron, ohne Krypto. */
export function cached(): BrokerData | null {
  if (memory) return memory;
  const s = typeof window === "undefined" ? null : sessionStorage.getItem(SESSION_DATA);
  if (s) memory = JSON.parse(s);
  return memory;
}

/** Mit Passwort öffnen (PBKDF2, einmal). Wirft bei falschem Passwort. */
export async function unlock(password: string) {
  const v = await prefetchVault();
  const base = await crypto.subtle.importKey("raw", new TextEncoder().encode(password.trim()), "PBKDF2", false, [
    "deriveKey",
  ]);
  const key = await crypto.subtle.deriveKey(
    { name: "PBKDF2", hash: "SHA-256", salt: unb64(v.salt), iterations: v.iterations },
    base,
    { name: "AES-GCM", length: 256 },
    true,
    ["decrypt"],
  );
  const data = await open(key);
  localStorage.setItem(KEY_STORE, b64(await crypto.subtle.exportKey("raw", key)));
  return data;
}

/** Mit gemerktem Schlüssel öffnen (ohne PBKDF2). null, wenn keiner da oder veraltet. */
export async function resume(): Promise<BrokerData | null> {
  const raw = localStorage.getItem(KEY_STORE);
  if (!raw) return null;
  try {
    const key = await crypto.subtle.importKey("raw", unb64(raw), "AES-GCM", false, ["decrypt"]);
    return await open(key);
  } catch {
    localStorage.removeItem(KEY_STORE);
    return null;
  }
}

export function lock() {
  memory = null;
  localStorage.removeItem(KEY_STORE);
  sessionStorage.removeItem(SESSION_DATA);
}
