"use client";

import { ArrowUpFromLine, Building2, Phone, Plus, Repeat, SlidersHorizontal, Sparkles } from "lucide-react";
import { useMemo, useState } from "react";
import { Button, Card, Placeholder, SectionTitle } from "@/components/ui";
import { Bars, Checklist, Donut, Legend, ScenarioChart, Slider } from "@/components/viz";
import { ChangeText, FundAvatar, change } from "@/components/fund-bits";
import { useRouter } from "@/lib/router";
import { useStore } from "@/lib/store";
import { contractHistory, projection } from "@/lib/contract-series";
import { NOW_YEAR, PROFILE_RATES, PROFILE_SPLIT, uniqueFunds, wealthCost, wealthRegions, wealthSectors, yearFraction } from "@/lib/products";
import { eur, eur0, percent } from "@/lib/format";
import type { Fund } from "@/lib/types";
import contractsJson from "@/data/contracts.json";
import { ActivityList, ContractLayout, Documents, docDate, historyActivity, useDemoActivity } from "./contract";
import { BuyMoreSheet, CallbackSheet, PersonaliseSheet, ProfileSheet, WithdrawSheet, useMonthlyPlans } from "./contract-sheets";
import { SavingsPlanSheet } from "./savings-plan";

const META = contractsJson.contracts.find((c) => c.id === "wealth")!;
const HORIZON = 15;

type Holding = { key: string; name: string; kind: "Bonds" | "Equity"; weight: number; fund?: Fund };

/** Platzhalter-ETF-Namen an die Vorlieben anpassen (Passiv-Strategie) */
function passiveName(name: string, prefs: string[]) {
  return prefs.includes("Only ESG funds") || prefs.includes("No fossil fuels") ? name.replace(" Index ETF", " ESG Index ETF") : name;
}

export function WealthScreen() {
  const { contracts, data } = useStore();
  const { go } = useRouter();
  const c = contracts.find((x) => x.id === "wealth")!;
  const prefs = useMemo(() => c.preferences ?? [], [c.preferences]);
  const monthly = useMonthlyPlans("wealth");
  const [sheet, setSheet] = useState<"buy" | "withdraw" | "plan" | "profile" | "personalise" | "callback" | null>(null);
  const [projMonthly, setProjMonthly] = useState(Math.max(100, Math.round(monthly / 25) * 25));

  const split = PROFILE_SPLIT[c.profile!];
  const cost = wealthCost(c.strategy);
  const costYtd = c.value * cost * yearFraction();

  const history = useMemo(
    () =>
      contractHistory({
        seed: "wealth",
        since: META.since,
        basePaidIn: META.paidIn,
        baseValue: META.value,
        paidIn: c.paidIn,
        value: c.value,
        vol: 0.08,
      }),
    [c.paidIn, c.value],
  );
  const proj = useMemo(() => projection(c.value, projMonthly, HORIZON, PROFILE_RATES[c.profile!]), [c.value, projMonthly, c.profile]);

  // Bestände: Gewichte folgen dem Profil, Auswahl folgt Strategie und Vorlieben
  const holdings = useMemo<Holding[]>(() => {
    let list: Holding[];
    if (c.strategy === "Passive") {
      list = contractsJson.passiveHoldings.map((h) => ({
        key: h.name,
        name: passiveName(h.name, prefs),
        kind: h.assetClass as Holding["kind"],
        weight: h.weight,
      }));
      if (prefs.includes("More Asia"))
        list.push({ key: "asia", name: passiveName("Allianz Asia Pacific Equity Index ETF", prefs), kind: "Equity", weight: 12 });
    } else {
      const esgOnly = prefs.includes("Only ESG funds") || prefs.includes("No fossil fuels");
      const pool = uniqueFunds(data.funds.filter((f) => !esgOnly || f.esg).sort((a, b) => b.delta5y - a.delta5y));
      const asia = prefs.includes("More Asia");
      // Reine Aktienfonds zuerst, Mischfonds nur als Auffüllung
      const equities = pool
        .filter((f) => f.assetClass !== "Bonds")
        .sort(
          (a, b) =>
            (asia ? Number(b.emerging) - Number(a.emerging) : 0) ||
            Number(b.assetClass === "Equity") - Number(a.assetClass === "Equity"),
        )
        .slice(0, 3);
      const bonds = pool.filter((f) => f.assetClass === "Bonds").slice(0, 2);
      list = [
        ...equities.map((f, i) => ({ key: f.id, name: f.name, kind: "Equity" as const, weight: [45, 33, 22][i], fund: f })),
        ...bonds.map((f, i) => ({ key: f.id, name: f.name, kind: "Bonds" as const, weight: [60, 40][i], fund: f })),
      ];
    }
    // Innerhalb jeder Anlageklasse normieren, dann nach Profil gewichten
    const sum = (k: Holding["kind"]) => list.filter((h) => h.kind === k).reduce((a, h) => a + h.weight, 0) || 1;
    const eq = sum("Equity");
    const bo = sum("Bonds");
    return list
      .map((h) => ({ ...h, weight: h.kind === "Equity" ? (h.weight / eq) * split.equities : (h.weight / bo) * split.bonds }))
      .sort((a, b) => b.weight - a.weight);
  }, [c.strategy, prefs, data.funds, split]);

  const regions = useMemo(() => wealthRegions(prefs), [prefs]);
  const sectors = useMemo(() => wealthSectors(prefs), [prefs]);

  const activity = [...useDemoActivity("wealth"), ...historyActivity({ monthly: 150, rebalancing: true })];

  return (
    <>
      <ContractLayout
        title={c.name}
        subtitle={c.subtitle}
        value={c.value}
        paidIn={c.paidIn}
        history={history}
        actions={[
          { label: "Buy more", icon: Plus, primary: true, onClick: () => setSheet("buy") },
          { label: "Withdraw", icon: ArrowUpFromLine, onClick: () => setSheet("withdraw") },
          { label: "Savings plan", icon: Repeat, onClick: () => setSheet("plan") },
          { label: "Adjust", icon: SlidersHorizontal, onClick: () => setSheet("profile") },
        ]}
        tabs={{
          Overview: (
            <>
              {/* Profil */}
              <Card className="p-5">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-[13px] font-semibold tracking-wide text-muted uppercase">Your profile</p>
                    <p className="text-[20px] font-bold">
                      {c.profile} · {c.strategy}
                    </p>
                  </div>
                  <Button variant="secondary" className="h-10 px-4 text-[14px]" onClick={() => setSheet("profile")}>
                    Adjust
                  </Button>
                </div>
                <div className="mt-4 flex items-center gap-5">
                  <Donut
                    size={112}
                    parts={[
                      { value: split.bonds, color: "var(--safety)" },
                      { value: split.equities, color: "var(--growth)" },
                    ]}
                  />
                  <Legend
                    items={[
                      { label: `Bonds · ${percent(split.bonds, 0)}`, value: eur((c.value * split.bonds) / 100), color: "var(--safety)" },
                      { label: `Equities · ${percent(split.equities, 0)}`, value: eur((c.value * split.equities) / 100), color: "var(--growth)" },
                    ]}
                  />
                </div>
                <p className="mt-4 text-[13px] text-muted">Change your profile anytime, free of charge.</p>
              </Card>

              {/* Personalise with AI */}
              <section className="hero rounded-card p-5 shadow-float">
                <p className="flex items-center gap-2 text-[17px] font-bold">
                  <Sparkles size={20} /> Personalise with AI
                </p>
                <p className="mt-1 text-[14px] text-white/80">
                  {prefs.length ? "Your portfolio follows these preferences:" : "Tell us what matters to you. We adjust your holdings."}
                </p>
                {prefs.length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {prefs.map((p) => (
                      <span key={p} className="glass-dark rounded-full px-3 py-1.5 text-[13px] font-semibold">
                        {p}
                      </span>
                    ))}
                  </div>
                )}
                <button onClick={() => setSheet("personalise")} className="mt-4 h-11 rounded-full bg-white px-5 text-[15px] font-semibold text-blue-deep">
                  {prefs.length ? "Edit preferences" : "Get started"}
                </button>
              </section>

              {/* Private markets */}
              <Card className="p-5">
                <div className="flex items-center gap-3">
                  <span className="flex size-11 shrink-0 items-center justify-center rounded-full bg-orange-wash text-orange">
                    <Building2 size={20} />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-[16px] font-bold">Private markets</p>
                    <p className="text-[13px] text-muted">Infrastructure, private equity and private debt</p>
                  </div>
                </div>
                <p className="mt-3 text-[14px]">Add assets that were reserved for institutional investors. Our team helps you decide if they fit.</p>
                <Button variant="secondary" className="mt-4 h-11 w-full text-[15px]" onClick={() => setSheet("callback")}>
                  <Phone size={16} /> Talk to our team
                </Button>
              </Card>

              {/* Kosten */}
              <Card className="p-5">
                <SectionTitle>Costs</SectionTitle>
                <div className="flex items-end justify-between">
                  <div>
                    <p className="tabular text-[28px] font-bold">{percent(cost * 100)}</p>
                    <p className="text-[13px] text-muted">total costs p. a.</p>
                  </div>
                  <div className="text-right">
                    <p className="tabular text-[20px] font-bold">{eur(costYtd)}</p>
                    <p className="text-[13px] text-muted">paid this year</p>
                  </div>
                </div>
                <Checklist
                  className="mt-4"
                  items={["Total costs below 1% p. a.", "Institutional share classes", "No entry or exit charges"]}
                />
                {/* Vision nennt nur "below 1% p. a."; 0,59 und 0,89 % sind Platzhalter (products.ts wealthCost) */}
                <Placeholder className="mt-3 block" />
              </Card>

              {/* Prognose */}
              <Card className="p-5">
                <SectionTitle>Your forecast for {HORIZON} years</SectionTitle>
                <Slider label="Monthly contribution" value={projMonthly} min={0} max={1000} step={25} format={eur0} onChange={setProjMonthly} />
                <div className="mt-5">
                  <ScenarioChart data={proj} startYear={NOW_YEAR} />
                </div>
                <p className="mt-3 text-[12px] text-faint">Illustrative scenarios for a {c.profile!.toLowerCase()} profile, not a forecast.</p>
              </Card>
            </>
          ),
          Holdings: (
            <>
              <Card className="divide-y divide-line px-3">
                {holdings.map((h) => (
                  <button
                    key={h.key}
                    disabled={!h.fund}
                    onClick={() => h.fund && go(`/broker/fund/${h.fund.id}`)}
                    className="flex w-full items-center gap-3 py-3 text-left"
                  >
                    {h.fund ? (
                      <FundAvatar fund={h.fund} size={40} />
                    ) : (
                      <span
                        className={
                          h.kind === "Bonds"
                            ? "flex size-10 shrink-0 items-center justify-center rounded-full bg-blue-wash text-[11px] font-bold text-blue"
                            : "flex size-10 shrink-0 items-center justify-center rounded-full bg-orange-wash text-[11px] font-bold text-orange"
                        }
                      >
                        ETF
                      </span>
                    )}
                    <span className="min-w-0 flex-1">
                      <span className="block text-[15px] leading-snug font-semibold">{h.name}</span>
                      <span className="block text-[13px] text-muted">
                        {h.fund?.assetClass ?? h.kind} · {percent(h.weight, 1)}
                      </span>
                    </span>
                    <span className="text-right">
                      <span className="tabular block text-[15px] font-semibold">{eur((c.value * h.weight) / 100)}</span>
                      {h.fund && <ChangeText value={change(h.fund, "1Y")} />}
                    </span>
                  </button>
                ))}
              </Card>
              <Bars title="Regions" items={regions} />
              <Bars title="Sectors" items={sectors} />
              {prefs.length > 0 && (
                <p className="flex items-center gap-1.5 px-1 text-[12px] text-faint">
                  <Sparkles size={12} /> Adjusted to your preferences
                </p>
              )}
              <p className="px-1 text-[12px] text-faint">Weights are illustrative.</p>
            </>
          ),
          Activity: <ActivityList items={activity} />,
          Documents: (
            <Documents
              docs={[
                { title: "Contract document", date: docDate(41), size: "388 KB" },
                { title: "Annual statement 2025", date: docDate(9), size: "174 KB" },
                { title: "Cost information", date: docDate(9), size: "92 KB" },
                { title: "Key information document", date: docDate(2), size: "131 KB" },
              ]}
            />
          ),
        }}
      />
      <BuyMoreSheet contract={c} open={sheet === "buy"} onClose={() => setSheet(null)} />
      <WithdrawSheet contract={c} open={sheet === "withdraw"} onClose={() => setSheet(null)} />
      <ProfileSheet contract={c} open={sheet === "profile"} onClose={() => setSheet(null)} />
      <PersonaliseSheet contract={c} open={sheet === "personalise"} onClose={() => setSheet(null)} />
      <CallbackSheet open={sheet === "callback"} onClose={() => setSheet(null)} />
      <SavingsPlanSheet preset="wealth" open={sheet === "plan"} onClose={() => setSheet(null)} />
    </>
  );
}

