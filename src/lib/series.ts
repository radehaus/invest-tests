import { gaussian, hash, rng } from "./random";

// Kursverläufe sind Platzhalter: deterministisch aus einem Seed erzeugt.
// Fester Stichtag, damit jede Demo exakt gleich aussieht.
export const AS_OF = Date.UTC(2026, 9, 30); // Fr, 30. Oktober 2026
const DAYS_5Y = 1260;
const DAY = 86_400_000;

export type Range = "1W" | "1M" | "6M" | "1Y" | "5Y";
export const RANGES: Range[] = ["1W", "1M", "6M", "1Y", "5Y"];
const RANGE_DAYS: Record<Range, number> = { "1W": 5, "1M": 21, "6M": 126, "1Y": 252, "5Y": DAYS_5Y };
export const RANGE_LABEL: Record<Range, string> = {
  "1W": "past week",
  "1M": "past month",
  "6M": "past 6 months",
  "1Y": "past year",
  "5Y": "past 5 years",
};

export type Series = { dates: number[]; values: number[]; compare?: number[] };

/** Handelstage rückwärts ab Stichtag (Wochenenden ausgelassen) */
const tradingDates = (() => {
  const out: number[] = [];
  let t = AS_OF;
  while (out.length <= DAYS_5Y) {
    const d = new Date(t).getUTCDay();
    if (d !== 0 && d !== 6) out.push(t);
    t -= DAY;
  }
  return out.reverse();
})();

/**
 * Log-Pfad mit exakt vorgegebener Gesamtrendite: erst zufällig laufen, dann linear
 * entzerren, damit Start und Ende genau stimmen.
 */
function path(seed: string, totalLogReturn: number, vol: number, shocks?: number[]) {
  const r = rng(hash(seed));
  const n = DAYS_5Y;
  const steps = shocks ?? Array.from({ length: n }, () => gaussian(r));
  const daily = vol / Math.sqrt(252);
  const raw = [0];
  for (let i = 0; i < n; i++) raw.push(raw[i] + steps[i] * daily);
  const drift = (totalLogReturn - raw[n]) / n;
  return { log: raw.map((x, i) => x + drift * i), steps };
}

type SeriesInput = { id: string; assetClass: string; delta5y: number; price: number };
const cache = new Map<string, { values: number[]; bench: number[] }>();

/** Fondskurs und Benchmark über 5 Jahre. Der Fonds schlägt die Benchmark um delta5y pp p. a. */
export function fundHistory(f: SeriesInput) {
  const hit = cache.get(f.id);
  if (hit) return hit;
  const base = { Bonds: 0.022, Equity: 0.068, "Multi Asset": 0.041 }[f.assetClass] ?? 0.04;
  const vol = { Bonds: 0.055, Equity: 0.17, "Multi Asset": 0.095 }[f.assetClass] ?? 0.1;
  const r = rng(hash(f.id + ":jitter"));
  const benchAnnual = base + (r() - 0.5) * 0.02;
  const fundAnnual = benchAnnual + f.delta5y / 100;

  const bench = path(f.id + ":bench", 5 * Math.log(1 + benchAnnual), vol);
  // Fonds: korreliert mit der Benchmark, plus eigenes Rauschen
  const own = rng(hash(f.id + ":own"));
  const shocks = bench.steps.map((z) => 0.92 * z + 0.39 * gaussian(own));
  const fund = path(f.id, 5 * Math.log(1 + fundAnnual), vol, shocks);

  const end = fund.log[DAYS_5Y];
  const values = fund.log.map((l) => f.price * Math.exp(l - end));
  // Benchmark startet im selben Punkt wie der Fonds
  const bench0 = values[0];
  const benchValues = bench.log.map((l) => bench0 * Math.exp(l));
  const out = { values, bench: benchValues };
  cache.set(f.id, out);
  return out;
}

/** Ausschnitt für einen Zeitraum, auf max. ~140 Punkte verdichtet. Benchmark auf Startpunkt normiert. */
export function slice(full: { values: number[]; bench?: number[] }, range: Range): Series {
  const n = RANGE_DAYS[range];
  const from = full.values.length - 1 - n;
  const step = Math.max(1, Math.floor(n / 140));
  const idx: number[] = [];
  for (let i = from; i < full.values.length; i += step) idx.push(i);
  if (idx[idx.length - 1] !== full.values.length - 1) idx.push(full.values.length - 1);

  const values = idx.map((i) => full.values[i]);
  const dates = idx.map((i) => tradingDates[i]);
  let compare: number[] | undefined;
  if (full.bench) {
    const k = full.values[from] / full.bench[from];
    compare = idx.map((i) => full.bench![i] * k);
  }
  return { dates, values, compare };
}

/** Synthetische Wertentwicklung (z. B. Gesamtwert im Cockpit), endet genau bei `end`. */
export function syntheticHistory(seed: string, end: number, annual: number, vol: number) {
  const p = path(seed, 5 * Math.log(1 + annual), vol);
  const last = p.log[DAYS_5Y];
  return { values: p.log.map((l) => end * Math.exp(l - last)) };
}
