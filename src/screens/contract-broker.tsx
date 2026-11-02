"use client";

import { ArrowDownLeft, ArrowUpRight, ChevronRight, Compass, Minus, Pause, Plus, Repeat } from "lucide-react";
import { useMemo, useState } from "react";
import { Card, SectionTitle } from "@/components/ui";
import { Bars } from "@/components/viz";
import { DeltaBadge, FundAvatar, shortName } from "@/components/fund-bits";
import { useRouter } from "@/lib/router";
import { useStore } from "@/lib/store";
import { contractHistory } from "@/lib/contract-series";
import { eur, num, shortDate, signedEur } from "@/lib/format";
import { cx } from "@/lib/cx";
import type { Weight } from "@/lib/types";
import contractsJson from "@/data/contracts.json";
import { ActivityList, ContractLayout, Documents, docDate, useDemoActivity, type ActivityItem } from "./contract";
import { BrokerBuySheet, BrokerSellSheet, PlanEditSheet } from "./contract-sheets";
import { SavingsPlanSheet } from "./savings-plan";

const SINCE = contractsJson.brokerSince;

export function BrokerContractScreen() {
  const { data, state, fund, broker, positionValue } = useStore();
  const { go } = useRouter();
  const [sheet, setSheet] = useState<"buy" | "sell" | "plan" | null>(null);
  const [editPlan, setEditPlan] = useState<string | null>(null);

  const base = useMemo(
    () => ({
      paidIn: data.initialPositions.reduce((a, p) => a + p.invested, 0),
      value: data.initialPositions.reduce((a, p) => a + p.value, 0),
    }),
    [data.initialPositions],
  );
  const history = useMemo(
    () =>
      contractHistory({
        seed: "broker",
        since: SINCE,
        basePaidIn: base.paidIn,
        baseValue: base.value,
        paidIn: broker.invested,
        value: broker.value,
        vol: 0.1,
      }),
    [base, broker.invested, broker.value],
  );

  const positions = useMemo(
    () =>
      Object.entries(state.positions)
        .map(([id, p]) => {
          const value = positionValue(id);
          return { f: fund(id), units: p.units, value, gain: value - p.invested };
        })
        .sort((a, b) => b.value - a.value),
    [state.positions, fund, positionValue],
  );

  // Aufteilung nach Anbieter und Anlageklasse, aus dem aktuellen Depot
  const allocation = useMemo(() => {
    const group = (key: (f: (typeof positions)[number]["f"]) => string): Weight[] => {
      const m = new Map<string, number>();
      for (const p of positions) m.set(key(p.f), (m.get(key(p.f)) ?? 0) + p.value);
      const total = broker.value || 1;
      return [...m].map(([name, v]) => ({ name, weight: (v / total) * 100 })).sort((a, b) => b.weight - a.weight);
    };
    return { provider: group((f) => f.provider), asset: group((f) => f.assetClass) };
  }, [positions, broker.value]);

  const plans = state.plans.filter((p) => p.fundId);

  const activity: ActivityItem[] = [
    ...useDemoActivity("broker"),
    ...state.txs.map((t) => ({
      id: t.id,
      title: `${t.kind === "buy" ? "Bought" : "Sold"} ${shortName(fund(t.fundId))}`,
      sub: `${num(t.units, 3)} units`,
      amount: t.amount,
      sign: (t.kind === "buy" ? 1 : -1) as 1 | -1,
      at: t.at,
      icon: t.kind === "buy" ? ArrowDownLeft : ArrowUpRight,
      demo: true,
    })),
    // Erstkäufe bei Eröffnung des Depots
    ...data.initialPositions.map((p, i) => ({
      id: `init-${p.id}`,
      title: `Bought ${shortName(fund(p.id))}`,
      sub: "Opening purchase",
      amount: p.invested,
      sign: 1 as const,
      at: Date.parse(SINCE) + i * 3_600_000,
      icon: ArrowDownLeft,
    })),
  ];

  return (
    <>
      <ContractLayout
        title="Allianz Invest Broker"
        subtitle={`${positions.length} funds · since ${shortDate(Date.parse(SINCE))}`}
        value={broker.value}
        paidIn={broker.invested}
        history={history}
        actions={[
          { label: "Buy more", icon: Plus, primary: true, onClick: () => setSheet("buy") },
          { label: "Sell", icon: Minus, onClick: () => setSheet("sell") },
          { label: "Savings plan", icon: Repeat, onClick: () => setSheet("plan") },
          { label: "Discover", icon: Compass, onClick: () => go("/broker") },
        ]}
        tabs={{
          Overview: (
            <>
              <Bars title="By provider" items={allocation.provider} />
              <Bars title="By asset class" items={allocation.asset} />

              {/* Sparpläne */}
              <Card className="p-5">
                <SectionTitle>Savings plans</SectionTitle>
                {plans.length === 0 ? (
                  <p className="text-[14px] text-muted">No savings plan yet. Invest automatically from €10 a month.</p>
                ) : (
                  <div className="divide-y divide-line">
                    {plans.map((p) => {
                      const f = fund(p.fundId!);
                      return (
                        <button key={p.id} onClick={() => setEditPlan(p.id)} className="flex w-full items-center gap-3 py-3 text-left">
                          <FundAvatar fund={f} size={40} />
                          <span className="min-w-0 flex-1">
                            <span className="block text-[15px] leading-snug font-semibold">{shortName(f)}</span>
                            <span className={cx("flex items-center gap-1 text-[13px]", p.paused ? "text-orange" : "text-muted")}>
                              {p.paused && <Pause size={12} />}
                              {p.rhythm}
                              {p.paused ? " · paused" : ""}
                            </span>
                          </span>
                          <span className="tabular text-[15px] font-semibold">{eur(p.amount)}</span>
                          <ChevronRight size={18} className="text-faint" />
                        </button>
                      );
                    })}
                  </div>
                )}
                <button onClick={() => setSheet("plan")} className="mt-3 text-[15px] font-semibold text-blue">
                  + New savings plan
                </button>
              </Card>

              <button onClick={() => go("/broker")} className="glass flex w-full items-center gap-3 rounded-card p-4 text-left">
                <span className="flex size-11 shrink-0 items-center justify-center rounded-full bg-blue-wash text-blue">
                  <Compass size={20} />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-[16px] font-bold">Discover funds</span>
                  <span className="block text-[13px] text-muted">{data.funnel.selected} funds that beat their benchmark</span>
                </span>
                <ChevronRight className="text-faint" />
              </button>
            </>
          ),
          Holdings: (
            <Card className="divide-y divide-line px-3">
              {positions.length === 0 && <p className="py-5 text-center text-[15px] text-muted">No funds yet.</p>}
              {positions.map(({ f, units, value, gain }) => (
                <button key={f.id} onClick={() => go(`/broker/fund/${f.id}`)} className="flex w-full items-center gap-3 py-3 text-left">
                  <FundAvatar fund={f} size={40} />
                  <span className="min-w-0 flex-1">
                    <span className="line-clamp-2 text-[15px] leading-snug font-semibold">{f.name}</span>
                    <span className="block text-[13px] text-muted">
                      {f.provider} · {num(units, 3)} units
                    </span>
                    <span className="mt-1 block">
                      <DeltaBadge value={f.delta5y} />
                      <span className="ml-1.5 text-[12px] text-faint">vs benchmark p. a.</span>
                    </span>
                  </span>
                  <span className="self-start text-right">
                    <span className="tabular block text-[15px] font-semibold">{eur(value)}</span>
                    <span className={cx("tabular text-[13px] font-semibold", gain >= 0 ? "text-positive" : "text-negative")}>
                      {signedEur(gain)}
                    </span>
                  </span>
                </button>
              ))}
            </Card>
          ),
          Activity: <ActivityList items={activity} />,
          Documents: (
            <Documents
              docs={[
                { title: "Account agreement", date: shortDate(Date.parse(SINCE)), size: "296 KB" },
                { title: "Quarterly statement Q3 2026", date: docDate(1), size: "142 KB" },
                { title: "Cost information", date: docDate(1), size: "88 KB" },
                { title: "Key information documents", date: docDate(2), size: "1.2 MB" },
              ]}
            />
          ),
        }}
      />
      <BrokerBuySheet open={sheet === "buy"} onClose={() => setSheet(null)} />
      <BrokerSellSheet open={sheet === "sell"} onClose={() => setSheet(null)} />
      <SavingsPlanSheet preset="broker" open={sheet === "plan"} onClose={() => setSheet(null)} />
      <PlanEditSheet planId={editPlan} onClose={() => setEditPlan(null)} />
    </>
  );
}
