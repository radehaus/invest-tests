import { gaussian, hash, rng } from "./random";
import { AS_OF, type Series } from "./series";

// Wert- und Einzahlungsverlauf eines Vertrags (fiktiv, deterministisch).
// Basis ist der Startzustand aus contracts.json. Eigene Aktionen der Demo (Nachkauf, Auszahlung)
// passieren "heute": Sie verschieben nur den letzten Punkt, damit die Kurve sofort reagiert.

export type ContractRange = "1M" | "6M" | "1Y" | "3Y" | "Max";
export const CONTRACT_RANGES: ContractRange[] = ["1M", "6M", "1Y", "3Y", "Max"];
const RANGE_DAYS: Record<Exclude<ContractRange, "Max">, number> = { "1M": 30, "6M": 182, "1Y": 365, "3Y": 1095 };
export const CONTRACT_RANGE_LABEL: Record<ContractRange, string> = {
  "1M": "past month",
  "6M": "past 6 months",
  "1Y": "past year",
  "3Y": "past 3 years",
  Max: "since start",
};

const DAY = 86_400_000;

type Base = { dates: number[]; values: number[]; deposits: number[] };
const cache = new Map<string, Base>();

/**
 * Tägliche Punkte vom Vertragsbeginn bis zum Stichtag.
 * Einzahlungen: Startbetrag (35 %) plus gleichmäßige Monatsraten bis zum Stand paidIn.
 * Wert: Einzahlungen mal Wertentwicklung, die genau bei value/paidIn endet.
 */
function base(seed: string, since: string, paidIn: number, value: number, vol: number): Base {
  const key = `${seed}:${since}:${paidIn}:${value}`;
  const hit = cache.get(key);
  if (hit) return hit;

  const start = Date.parse(since);
  const n = Math.max(2, Math.round((AS_OF - start) / DAY));
  const months = Math.max(1, Math.round(n / 30.44));
  const lump = paidIn * 0.35;
  const rate = (paidIn - lump) / months;

  const r = rng(hash(seed));
  const daily = vol / Math.sqrt(365);
  const walk = [0];
  for (let i = 0; i < n; i++) walk.push(walk[i] + gaussian(r) * daily);
  const drift = (Math.log(value / paidIn) - walk[n]) / n;

  const dates: number[] = [];
  const values: number[] = [];
  const deposits: number[] = [];
  for (let i = 0; i <= n; i++) {
    const t = start + i * DAY;
    const paid = Math.min(paidIn, lump + rate * Math.floor(i / 30.44));
    const dep = i === n ? paidIn : paid;
    dates.push(t);
    deposits.push(dep);
    values.push(dep * Math.exp(walk[i] + drift * i));
  }
  const out = { dates, values, deposits };
  cache.set(key, out);
  return out;
}

export function contractHistory(opts: {
  seed: string;
  since: string;
  /** Startzustand (für eine stabile Kurve) */
  basePaidIn: number;
  baseValue: number;
  /** Heutiger Stand */
  paidIn: number;
  value: number;
  vol: number;
}) {
  const b = base(opts.seed, opts.since, opts.basePaidIn, opts.baseValue, opts.vol);
  const last = b.values.length - 1;
  const values = b.values.slice();
  const deposits = b.deposits.slice();
  values[last] = opts.value;
  deposits[last] = opts.paidIn;
  return { dates: b.dates, values, deposits };
}

/** Ausschnitt für einen Zeitraum, auf max. ~140 Punkte verdichtet. compare = Einzahlungen. */
export function sliceContract(h: { dates: number[]; values: number[]; deposits: number[] }, range: ContractRange): Series {
  const len = h.values.length;
  const n = range === "Max" ? len - 1 : Math.min(len - 1, RANGE_DAYS[range]);
  const from = len - 1 - n;
  const step = Math.max(1, Math.floor(n / 140));
  const idx: number[] = [];
  for (let i = from; i < len; i += step) idx.push(i);
  if (idx[idx.length - 1] !== len - 1) idx.push(len - 1);
  return { dates: idx.map((i) => h.dates[i]), values: idx.map((i) => h.values[i]), compare: idx.map((i) => h.deposits[i]) };
}

/**
 * Prognose bis zum Zieldatum: günstig, mittel, ungünstig plus Summe der Beiträge.
 * Jährliche Punkte, Monatsbeitrag als Rente nachschüssig.
 */
export function projection(start: number, monthly: number, years: number, rates: [number, number, number]) {
  const ys = Math.max(1, Math.round(years));
  const run = (rate: number) => {
    const m = Math.pow(1 + rate, 1 / 12) - 1;
    const out = [start];
    let v = start;
    for (let y = 1; y <= ys; y++) {
      for (let k = 0; k < 12; k++) v = v * (1 + m) + monthly;
      out.push(v);
    }
    return out;
  };
  const contributions = Array.from({ length: ys + 1 }, (_, y) => start + monthly * 12 * y);
  return { good: run(rates[0]), mid: run(rates[1]), bad: run(rates[2]), contributions, years: ys };
}
