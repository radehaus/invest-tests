// Erzeugt data/private/broker.json aus data/private/source.json (echte Namen und Δ 5J, nur lokal).
// Dieses Skript enthält bewusst keine echten Daten, es liegt im öffentlichen Repo.
// Alles unter "facts" ist Platzhalter (placeholder: true) und wird später durch echte Werte ersetzt.
// Deterministisch: gleicher Name ergibt immer dieselben Werte.
// Aufruf: node scripts/generate-broker-data.mjs

import { mkdirSync, readFileSync, writeFileSync } from "node:fs";

const SOURCE = JSON.parse(readFileSync(new URL("../data/private/source.json", import.meta.url), "utf8"));

// --- deterministischer Zufall -------------------------------------------------
function hash(s) {
  let h = 1779033703 ^ s.length;
  for (let i = 0; i < s.length; i++) {
    h = Math.imul(h ^ s.charCodeAt(i), 3432918353);
    h = (h << 13) | (h >>> 19);
  }
  return h >>> 0;
}
function rng(seed) {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const between = (r, a, b) => a + r() * (b - a);
const round = (n, d = 2) => Math.round(n * 10 ** d) / 10 ** d;

// --- Ableitungen aus dem Namen -----------------------------------------------
const slug = (s) =>
  s.toLowerCase().replace(/&/g, "and").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
const providerOf = (n) => (n.startsWith("PIMCO") ? "PIMCO" : "Allianz GI");
function assetClassOf(n) {
  if (/Multi Asset|Balanced Income|Dynamic Allocation/.test(n)) return "Multi Asset";
  if (/Equity|Oriental Income/.test(n)) return "Equity";
  return "Bonds";
}
const emergingOf = (n) => /\bEM\b|Emerging|India|Oriental/.test(n);
const esgOf = (n) => /SRI|ESG|Climate/.test(n);

// --- Platzhalter-Bausteine ---------------------------------------------------
const HOLDINGS = {
  Bonds: [
    "US Treasury Note 4.25% 2034", "Fannie Mae TBA 5.5% 30Y", "German Bund 2.6% 2034",
    "UK Gilt 4.125% 2029", "Japan Govt Bond 0.8% 2033", "Mexico Bonos 7.75% 2031",
    "Brazil NTN-F 10% 2033", "BNP Paribas 4.375% 2030", "Italy BTP 3.85% 2034", "France OAT 3% 2033",
  ],
  Equity: [
    "Microsoft", "Apple", "Nvidia", "Alphabet", "Amazon", "ASML", "Novo Nordisk",
    "Taiwan Semiconductor", "Samsung Electronics", "Nestlé", "SAP", "Allianz SE", "LVMH",
  ],
  "Multi Asset": [
    "Allianz Euro Bond Fund", "Microsoft", "German Bund 2.6% 2034", "Apple",
    "US Treasury Note 4.25% 2034", "SAP", "ASML", "France OAT 3% 2033", "Nvidia",
  ],
  India: ["HDFC Bank", "ICICI Bank", "Reliance Industries", "Infosys", "Bharti Airtel", "Larsen & Toubro", "Axis Bank"],
  Asia: ["Taiwan Semiconductor", "Samsung Electronics", "Tencent", "Alibaba", "Toyota", "Sony", "DBS Group"],
};
const COUNTRIES = {
  Bonds: ["United States", "Germany", "United Kingdom", "France", "Japan", "Italy"],
  EmBonds: ["Mexico", "Brazil", "Indonesia", "South Africa", "India", "Poland"],
  Equity: ["United States", "France", "Germany", "Switzerland", "United Kingdom", "Netherlands"],
  EmEquity: ["China", "Taiwan", "India", "South Korea", "Brazil", "Saudi Arabia"],
  India: ["India"],
  Asia: ["Japan", "Taiwan", "China", "South Korea", "Australia", "Singapore"],
  Europe: ["France", "Germany", "Switzerland", "United Kingdom", "Netherlands", "Spain"],
};
const SECTORS = {
  Bonds: ["Government", "Securitised", "Corporate IG", "High Yield", "Emerging Markets", "Cash"],
  Equity: ["Information Technology", "Financials", "Health Care", "Industrials", "Consumer Discretionary", "Energy"],
  "Multi Asset": ["Bonds", "Equities", "Cash", "Alternatives"],
};

function weights(r, n, total = 100) {
  const raw = Array.from({ length: n }, (_, i) => (n - i) * between(r, 0.7, 1.3));
  const sum = raw.reduce((a, b) => a + b, 0);
  return raw.map((w) => round((w / sum) * total, 1));
}

function isin(r, provider) {
  const country = provider === "PIMCO" ? "IE00B" : "LU0";
  const len = 11 - country.length;
  const body = Array.from({ length: len }, () => Math.floor(r() * 10)).join("");
  return country + body + Math.floor(r() * 10);
}

function facts(name, provider, assetClass, emerging) {
  const r = rng(hash(name));
  const india = /India/.test(name);
  const asia = /Oriental/.test(name);
  const europe = /Europe/.test(name);

  const terRange = { Bonds: [0.49, 1.45], Equity: [1.3, 1.95], "Multi Asset": [1.05, 1.65] }[assetClass];
  let srri = { Bonds: 2, Equity: 5, "Multi Asset": 3 }[assetClass];
  if (emerging) srri += 1;
  if (/Short-Term|Low Duration|Floating/.test(name)) srri = 1;
  if (/High Yield/.test(name)) srri = 3;
  if (/SRI 75|Plus Equity/.test(name)) srri = 4;

  const holdingsPool = india ? HOLDINGS.India : asia ? HOLDINGS.Asia : HOLDINGS[assetClass];
  const countriesPool = india
    ? COUNTRIES.India
    : asia
      ? COUNTRIES.Asia
      : europe
        ? COUNTRIES.Europe
        : assetClass === "Equity"
          ? emerging ? COUNTRIES.EmEquity : COUNTRIES.Equity
          : emerging ? COUNTRIES.EmBonds : COUNTRIES.Bonds;

  const shuffled = [...holdingsPool].sort(() => r() - 0.5).slice(0, 5);
  const hw = weights(r, 5, between(r, 14, 32));
  const cw = weights(r, countriesPool.length, 100);
  const sectorsPool = SECTORS[assetClass];
  const sw = weights(r, sectorsPool.length, 100);

  return {
    placeholder: true,
    isin: isin(r, provider),
    ter: round(between(r, ...terRange)),
    srri,
    stars: r() > 0.45 ? 5 : 4,
    aumEurM: Math.round(between(r, 180, provider === "PIMCO" && /Income/.test(name) ? 60000 : 9000)),
    launch: `${Math.floor(between(r, 1998, 2019))}-${String(Math.floor(between(r, 1, 12.99))).padStart(2, "0")}-01`,
    price: round(between(r, 9, assetClass === "Equity" ? 260 : 140)),
    distribution: /Income|Dividend|PM12/.test(name) ? "Distributing" : "Accumulating",
    holdings: shuffled.map((n, i) => ({ name: n, weight: hw[i] })),
    countries: countriesPool.map((n, i) => ({ name: n, weight: cw[i] })),
    sectors: sectorsPool.map((n, i) => ({ name: n, weight: sw[i] })),
  };
}

const funds = SOURCE.funds.map(({ name, delta5y }) => {
  const provider = providerOf(name);
  const assetClass = assetClassOf(name);
  const emerging = emergingOf(name);
  return {
    id: slug(name),
    name,
    provider,
    assetClass,
    emerging,
    esg: esgOf(name),
    delta5y,
    facts: facts(name, provider, assetClass, emerging),
  };
});

const id = (name) => slug(name);
const data = {
  source: "Names and Δ 5Y: FNZ Bank, Morningstar. Everything under facts is placeholder.",
  funnel: SOURCE.funnel,
  funds,
  mostBought: SOURCE.mostBought.map(([name, investors]) => ({ id: id(name), investors })),
  recommended: SOURCE.recommended.map(([name, reason]) => ({ id: id(name), reason })),
  initialPositions: SOURCE.initialPositions.map(([name, value, invested]) => ({ id: id(name), value, invested })),
  initialWatchlist: SOURCE.initialWatchlist.map(id),
};

const ids = new Set(funds.map((f) => f.id));
for (const ref of [...data.mostBought, ...data.recommended, ...data.initialPositions, ...data.initialWatchlist.map((id) => ({ id }))]) {
  if (!ids.has(ref.id)) throw new Error(`Unbekannte Fonds-ID: ${ref.id}`);
}
if (funds.length !== SOURCE.funnel.selected) throw new Error(`Erwartet ${SOURCE.funnel.selected} Fonds, gefunden ${funds.length}`);

mkdirSync(new URL("../data/private/", import.meta.url), { recursive: true });
writeFileSync(new URL("../data/private/broker.json", import.meta.url), JSON.stringify(data, null, 2) + "\n");
const count = (k, v) => funds.filter((f) => f[k] === v).length;
console.log(
  `broker.json: ${funds.length} Fonds (PIMCO ${count("provider", "PIMCO")}, AGI ${count("provider", "Allianz GI")}; ` +
    `Bonds ${count("assetClass", "Bonds")}, Equity ${count("assetClass", "Equity")}, Multi Asset ${count("assetClass", "Multi Asset")})`,
);
