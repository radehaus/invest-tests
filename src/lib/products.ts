import type { Profile, Strategy } from "./store";
import type { Weight } from "./types";
import { AS_OF } from "./series";

// Produktlogik nach Vision. Alle Zahlen sind plausible Platzhalter für die Demo, keine Tarifberechnung.

const YEAR = 365.25 * 86_400_000;
export const yearsUntil = (iso: string) => Math.max(0, (Date.parse(iso) - AS_OF) / YEAR);
export const yearOf = (iso: string) => new Date(iso).getUTCFullYear();
export const NOW_YEAR = new Date(AS_OF).getUTCFullYear();

// --- Life -------------------------------------------------------------------------------------

/**
 * Anteil des Sicherungsteils. (Zins 4,5 % p. a. im Sicherungsteil ist der Wert aus Vision, kein Platzhalter.)
 * Vision: 80 % Garantie über 30 Jahre ergibt 45 % Sicherung.
 * Höhere Garantie und kürzere Restlaufzeit brauchen mehr Sicherung.
 */
export function lifeSplit(guarantee: number, years: number) {
  const base = { 60: 30, 80: 45, 90: 55 }[guarantee] ?? 45;
  const safety = Math.round(Math.min(85, Math.max(15, base * Math.pow(30 / Math.max(years, 5), 0.35))));
  return { safety, growth: 100 - safety };
}

/** Garantierter Betrag zum Garantiedatum: Garantieniveau mal alle Beiträge bis dahin */
export function guaranteedAmount(guarantee: number, paidIn: number, monthly: number, years: number) {
  return (guarantee / 100) * (paidIn + monthly * 12 * years);
}

/** Erwartete Renditen p. a. (günstig, mittel, ungünstig), gemischt aus Sicherungs- und Renditeteil */
export function lifeRates(safetyShare: number, safetyRate: number, strategy: Strategy): [number, number, number] {
  const s = safetyShare / 100;
  const g = strategy === "Active" ? [0.085, 0.062, 0.02] : [0.08, 0.058, 0.018];
  return g.map((r) => s * (safetyRate / 100) + (1 - s) * r) as [number, number, number];
}

// --- Wealth -----------------------------------------------------------------------------------

export const PROFILES: Profile[] = ["Defensive", "Balanced", "Dynamic"];
export const PROFILE_SPLIT: Record<Profile, { bonds: number; equities: number }> = {
  Defensive: { bonds: 70, equities: 30 },
  Balanced: { bonds: 50, equities: 50 },
  Dynamic: { bonds: 25, equities: 75 },
};
export const PROFILE_RATES: Record<Profile, [number, number, number]> = {
  Defensive: [0.055, 0.035, 0.01],
  Balanced: [0.07, 0.048, 0.015],
  Dynamic: [0.085, 0.06, 0.018],
};

/** Vorlieben für "Personalise with AI" */
export const PREFERENCES = ["No fossil fuels", "More Asia", "Tech focus", "Only ESG funds", "Less USA"] as const;

const normalise = (items: Weight[]) => {
  const sum = items.reduce((a, i) => a + i.weight, 0) || 1;
  return items.map((i) => ({ ...i, weight: Math.round((i.weight / sum) * 1000) / 10 })).sort((a, b) => b.weight - a.weight);
};

export function wealthRegions(prefs: string[]): Weight[] {
  const r: Record<string, number> = { "North America": 46, Europe: 28, "Asia Pacific": 14, "Emerging Markets": 8, Other: 4 };
  if (prefs.includes("More Asia")) {
    r["Asia Pacific"] += 12;
    r["Emerging Markets"] += 4;
    r["North America"] -= 10;
  }
  if (prefs.includes("Less USA")) {
    r["North America"] -= 14;
    r.Europe += 9;
    r["Asia Pacific"] += 5;
  }
  return normalise(Object.entries(r).map(([name, weight]) => ({ name, weight: Math.max(0, weight) })));
}

export function wealthSectors(prefs: string[]): Weight[] {
  const r: Record<string, number> = {
    "Information Technology": 22,
    Financials: 16,
    "Health Care": 13,
    Industrials: 12,
    "Consumer Goods": 14,
    Energy: 6,
    Other: 17,
  };
  if (prefs.includes("No fossil fuels")) {
    r.Other += r.Energy / 2;
    r.Industrials += r.Energy / 2;
    r.Energy = 0;
  }
  if (prefs.includes("Tech focus")) {
    r["Information Technology"] += 10;
    r.Financials -= 4;
    r["Consumer Goods"] -= 3;
  }
  return normalise(
    Object.entries(r)
      .filter(([, w]) => w > 0)
      .map(([name, weight]) => ({ name, weight })),
  );
}

/** Kosten Wealth: PLATZHALTER. Vision sagt nur "below 1% p. a.". Aktiv etwas teurer als Passiv */
export const wealthCost = (strategy: Strategy) => (strategy === "Active" ? 0.0089 : 0.0059);

/** Anteil des Jahres bis zum Stichtag, für "seit Jahresbeginn" */
export const yearFraction = () => {
  const d = new Date(AS_OF);
  return (AS_OF - Date.UTC(d.getUTCFullYear(), 0, 1)) / YEAR;
};

// --- Fondsauswahl ---------------------------------------------------------------------------------

/** Name ohne Anteilsklasse am Ende (z. B. " P", " PM12", " AT"), damit ein Fonds nur einmal vorkommt */
const baseName = (name: string) => name.replace(/\s+[A-Z0-9]{1,5}$/, "");

/** Pro Fonds nur die erste Anteilsklasse behalten (Reihenfolge der Liste zählt) */
export function uniqueFunds<T extends { name: string }>(list: T[]): T[] {
  const seen = new Set<string>();
  return list.filter((f) => {
    const k = baseName(f.name);
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });
}
