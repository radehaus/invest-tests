export type Provider = "PIMCO" | "Allianz GI";
export type AssetClass = "Bonds" | "Equity" | "Multi Asset";
export type Weight = { name: string; weight: number };

export type FundFacts = {
  /** Alle Werte hier sind Platzhalter, bis echte Daten kommen */
  placeholder: true;
  isin: string;
  ter: number;
  srri: number;
  stars: number;
  aumEurM: number;
  launch: string;
  price: number;
  distribution: "Accumulating" | "Distributing";
  holdings: Weight[];
  countries: Weight[];
  sectors: Weight[];
};

export type Fund = {
  id: string;
  name: string;
  provider: Provider;
  assetClass: AssetClass;
  emerging: boolean;
  esg: boolean;
  /** Mehrrendite zur Benchmark über 5 Jahre, Prozentpunkte p. a. (echt) */
  delta5y: number;
  facts: FundFacts;
};

/** Inhalt des verschlüsselten Tresors (src/data/vault.json) */
export type BrokerData = {
  funnel: { screened: number; afterStars: number; selected: number; pimco: number; agi: number };
  funds: Fund[];
  mostBought: { id: string; investors: number }[];
  recommended: { id: string; reason: string }[];
  initialPositions: { id: string; value: number; invested: number }[];
  initialWatchlist: string[];
};
