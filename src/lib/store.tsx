"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import contractsJson from "@/data/contracts.json";
import type { BrokerData, Fund } from "./types";

// Demo-Zustand im localStorage: Käufe, Sparpläne, Beobachtungsliste, Kursalarme.
// Reset über Profil oder langes Drücken auf das Logo im Cockpit.

const STORE_KEY = "ai-demo-state-v1";

export type Position = { units: number; invested: number };
export type Plan = { id: string; fundId: string; amount: number; rhythm: "Monthly" | "Quarterly"; start: number };
export type Tx = { id: string; fundId: string; kind: "buy" | "sell"; amount: number; units: number; at: number };

type State = {
  v: 1;
  positions: Record<string, Position>;
  plans: Plan[];
  watchlist: string[];
  alerts: string[];
  txs: Tx[];
};

function initial(data: BrokerData): State {
  const byId = new Map(data.funds.map((f) => [f.id, f]));
  const positions: Record<string, Position> = {};
  for (const p of data.initialPositions) {
    const f = byId.get(p.id)!;
    positions[p.id] = { units: p.value / f.facts.price, invested: p.invested };
  }
  return { v: 1, positions, plans: [], watchlist: data.initialWatchlist, alerts: [], txs: [] };
}

function load(data: BrokerData): State {
  try {
    const raw = localStorage.getItem(STORE_KEY);
    if (raw) {
      const s = JSON.parse(raw) as State;
      if (s.v === 1) return s;
    }
  } catch {}
  return initial(data);
}

const uid = () => Math.random().toString(36).slice(2, 10);

function useDemoState(data: BrokerData) {
  const [state, setState] = useState<State>(() => load(data));
  useEffect(() => {
    localStorage.setItem(STORE_KEY, JSON.stringify(state));
  }, [state]);

  const fundById = useMemo(() => new Map(data.funds.map((f) => [f.id, f])), [data]);
  const fund = useCallback((id: string) => fundById.get(id) as Fund, [fundById]);

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

  const addPlan = useCallback((plan: Omit<Plan, "id">) => {
    setState((s) => ({ ...s, plans: [...s.plans, { ...plan, id: uid() }] }));
  }, []);

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

  const contracts = contractsJson.contracts;
  const total = contracts.reduce((a, c) => a + c.value, 0) + broker.value;

  return { data, state, fund, buy, sell, addPlan, toggle, reset, positionValue, broker, contracts, total };
}

type Store = ReturnType<typeof useDemoState>;
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
