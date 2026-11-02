"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import contractsJson from "@/data/contracts.json";
import type { BrokerData, Fund } from "./types";

// Demo-Zustand im localStorage: Verträge, Käufe, Sparpläne, Beobachtungsliste, Kursalarme, Aktivität.
// Reset über Profil oder langes Drücken auf das Logo im Cockpit.

const STORE_KEY = "ai-demo-state-v1";

export type Strategy = "Active" | "Passive";
export type Profile = "Defensive" | "Balanced" | "Dynamic";
export type Rhythm = "Monthly" | "Quarterly";

export type Position = { units: number; invested: number };
/** Sparplan: läuft entweder in einen Fonds im Broker (fundId) oder in einen Vertrag wie Life oder Wealth (contractId) */
export type Plan = {
  id: string;
  fundId?: string;
  contractId?: string;
  amount: number;
  rhythm: Rhythm;
  start: number;
  paused?: boolean;
};
export type Tx = { id: string; fundId: string; kind: "buy" | "sell"; amount: number; units: number; at: number };

/** Veränderlicher Teil eines Vertrags (Life, Wealth) */
export type ContractState = {
  value: number;
  paidIn: number;
  strategy: Strategy;
  guarantee?: number;
  guaranteeDate?: string;
  profile?: Profile;
  preferences?: string[];
};

/** Eintrag in der Aktivität eines Vertrags. "broker" steht für das Broker-Depot. */
export type DemoEvent = {
  id: string;
  contractId: string;
  kind: "deposit" | "withdraw" | "change" | "plan" | "callback";
  title: string;
  amount?: number;
  at: number;
};

type State = {
  v: 2;
  positions: Record<string, Position>;
  plans: Plan[];
  watchlist: string[];
  alerts: string[];
  txs: Tx[];
  contracts: Record<string, ContractState>;
  events: DemoEvent[];
};

type ContractMeta = (typeof contractsJson.contracts)[number];

function initialContracts(): Record<string, ContractState> {
  const out: Record<string, ContractState> = {};
  for (const c of contractsJson.contracts as (ContractMeta & Partial<ContractState>)[]) {
    out[c.id] = {
      value: c.value,
      paidIn: c.paidIn,
      strategy: c.strategy as Strategy,
      guarantee: c.guarantee,
      guaranteeDate: c.guaranteeDate,
      profile: c.profile as Profile | undefined,
      preferences: [],
    };
  }
  return out;
}

function initial(data: BrokerData): State {
  const byId = new Map(data.funds.map((f) => [f.id, f]));
  const positions: Record<string, Position> = {};
  for (const p of data.initialPositions) {
    const f = byId.get(p.id)!;
    positions[p.id] = { units: p.value / f.facts.price, invested: p.invested };
  }
  return {
    v: 2,
    positions,
    plans: [],
    watchlist: data.initialWatchlist,
    alerts: [],
    txs: [],
    contracts: initialContracts(),
    events: [],
  };
}

function load(data: BrokerData): State {
  try {
    const raw = localStorage.getItem(STORE_KEY);
    if (raw) {
      const s = JSON.parse(raw);
      if (s.v === 2) return s as State;
      // v1 (vor den Vertragsdetailseiten): Depot und Pläne übernehmen, Verträge neu anlegen
      if (s.v === 1) return { ...s, v: 2, contracts: initialContracts(), events: [] } as State;
    }
  } catch {}
  return initial(data);
}

const uid = () => Math.random().toString(36).slice(2, 10);
const log = (s: State, e: Omit<DemoEvent, "id" | "at">): DemoEvent[] => [{ ...e, id: uid(), at: Date.now() }, ...s.events];

function useDemoState(data: BrokerData) {
  const [state, setState] = useState<State>(() => load(data));
  useEffect(() => {
    localStorage.setItem(STORE_KEY, JSON.stringify(state));
  }, [state]);

  const fundById = useMemo(() => new Map(data.funds.map((f) => [f.id, f])), [data]);
  const fund = useCallback((id: string) => fundById.get(id) as Fund, [fundById]);

  // --- Broker ---------------------------------------------------------------
  const buy = useCallback(
    (fundId: string, amount: number) => {
      const units = amount / fund(fundId).facts.price;
      setState((s) => {
        const p = s.positions[fundId] ?? { units: 0, invested: 0 };
        return {
          ...s,
          positions: { ...s.positions, [fundId]: { units: p.units + units, invested: p.invested + amount } },
          txs: [{ id: uid(), fundId, kind: "buy", amount, units, at: Date.now() }, ...s.txs],
        };
      });
      return units;
    },
    [fund],
  );

  const sell = useCallback(
    (fundId: string, amount: number) => {
      const price = fund(fundId).facts.price;
      const p = state.positions[fundId];
      if (!p) return 0;
      const units = Math.min(p.units, amount / price);
      const left = p.units - units;
      setState((s) => {
        const positions = { ...s.positions };
        // Rest unter 1 Cent: Position schließen
        if (left * price < 0.01) delete positions[fundId];
        else positions[fundId] = { units: left, invested: p.invested * (left / p.units) };
        return {
          ...s,
          positions,
          txs: [{ id: uid(), fundId, kind: "sell", amount: units * price, units, at: Date.now() }, ...s.txs],
        };
      });
      return units;
    },
    [fund, state.positions],
  );

  // --- Sparpläne --------------------------------------------------------------
  const addPlan = useCallback(
    (plan: Omit<Plan, "id">) => {
      const target = plan.contractId ?? "broker";
      const what = plan.fundId ? fund(plan.fundId).name : "your contract";
      setState((s) => ({
        ...s,
        plans: [...s.plans, { ...plan, id: uid() }],
        events: log(s, { contractId: target, kind: "plan", title: `Savings plan started: ${what}`, amount: plan.amount }),
      }));
    },
    [fund],
  );

  const updatePlan = useCallback((id: string, patch: Partial<Plan>) => {
    setState((s) => ({ ...s, plans: s.plans.map((p) => (p.id === id ? { ...p, ...patch } : p)) }));
  }, []);

  const removePlan = useCallback((id: string) => {
    setState((s) => ({ ...s, plans: s.plans.filter((p) => p.id !== id) }));
  }, []);

  // --- Verträge (Life, Wealth) ---------------------------------------------
  const deposit = useCallback((contractId: string, amount: number) => {
    setState((s) => {
      const c = s.contracts[contractId];
      return {
        ...s,
        contracts: { ...s.contracts, [contractId]: { ...c, value: c.value + amount, paidIn: c.paidIn + amount } },
        events: log(s, { contractId, kind: "deposit", title: "Additional payment", amount }),
      };
    });
  }, []);

  const withdraw = useCallback((contractId: string, amount: number) => {
    setState((s) => {
      const c = s.contracts[contractId];
      const share = Math.min(1, amount / c.value);
      return {
        ...s,
        contracts: {
          ...s.contracts,
          // Einzahlungen sinken anteilig, damit der Gewinn in % gleich bleibt
          [contractId]: { ...c, value: c.value - amount, paidIn: c.paidIn * (1 - share) },
        },
        events: log(s, { contractId, kind: "withdraw", title: "Withdrawal to your reference account", amount }),
      };
    });
  }, []);

  /** Einstellungen ändern (Garantie, Strategie, Profil, Vorlieben) und in der Aktivität vermerken */
  const updateContract = useCallback((contractId: string, patch: Partial<ContractState>, title: string) => {
    setState((s) => ({
      ...s,
      contracts: { ...s.contracts, [contractId]: { ...s.contracts[contractId], ...patch } },
      events: log(s, { contractId, kind: "change", title }),
    }));
  }, []);

  const logEvent = useCallback((e: Omit<DemoEvent, "id" | "at">) => {
    setState((s) => ({ ...s, events: log(s, e) }));
  }, []);

  // --- Sonstiges --------------------------------------------------------------
  const toggle = useCallback((key: "watchlist" | "alerts", id: string) => {
    setState((s) => ({ ...s, [key]: s[key].includes(id) ? s[key].filter((x) => x !== id) : [...s[key], id] }));
  }, []);

  const reset = useCallback(() => setState(initial(data)), [data]);

  const positionValue = useCallback(
    (id: string) => {
      const p = state.positions[id];
      return p ? p.units * fund(id).facts.price : 0;
    },
    [state.positions, fund],
  );

  const broker = useMemo(() => {
    let value = 0;
    let invested = 0;
    for (const [id, p] of Object.entries(state.positions)) {
      value += p.units * fund(id).facts.price;
      invested += p.invested;
    }
    return { value, invested, gain: value - invested };
  }, [state.positions, fund]);

  /** Verträge mit aktuellem Stand und passendem Untertitel */
  const contracts = useMemo(
    () =>
      contractsJson.contracts.map((meta) => {
        const c = state.contracts[meta.id];
        const subtitle =
          meta.product === "life"
            ? `${c.guarantee}% guarantee · ${c.strategy.toLowerCase()} strategy`
            : `${c.profile} · ${c.strategy.toLowerCase()} strategy`;
        return { ...meta, ...c, subtitle } as Omit<ContractMeta, keyof ContractState> & ContractState & { subtitle: string };
      }),
    [state.contracts],
  );

  const total = contracts.reduce((a, c) => a + c.value, 0) + broker.value;

  return {
    data,
    state,
    fund,
    buy,
    sell,
    addPlan,
    updatePlan,
    removePlan,
    deposit,
    withdraw,
    updateContract,
    logEvent,
    toggle,
    reset,
    positionValue,
    broker,
    contracts,
    total,
  };
}

type Store = ReturnType<typeof useDemoState>;
export type Contract = Store["contracts"][number];
const Ctx = createContext<Store | null>(null);

export function StoreProvider({ data, children }: { data: BrokerData; children: ReactNode }) {
  const store = useDemoState(data);
  return <Ctx.Provider value={store}>{children}</Ctx.Provider>;
}

export function useStore() {
  const s = useContext(Ctx);
  if (!s) throw new Error("useStore außerhalb von StoreProvider");
  return s;
}

export const clearDemoState = () => localStorage.removeItem(STORE_KEY);
