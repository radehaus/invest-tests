"use client";

import { motion } from "motion/react";
import { Plus, Repeat, ShieldCheck, SlidersHorizontal, ArrowUpFromLine } from "lucide-react";
import { useState } from "react";
import { Button, Card, SectionTitle } from "@/components/ui";
import { Checklist, Donut, Legend, ScenarioChart, Slider } from "@/components/viz";
import { ChangeText, FundAvatar, change } from "@/components/fund-bits";
import { useRouter } from "@/lib/router";
import { useStore } from "@/lib/store";
import { contractHistory, projection } from "@/lib/contract-series";
import { NOW_YEAR, guaranteedAmount, uniqueFunds, lifeRates, lifeSplit, yearFraction, yearOf, yearsUntil } from "@/lib/products";
import { eur, eur0, percent } from "@/lib/format";
import contractsJson from "@/data/contracts.json";
import { ActivityList, ChartToggle, ContractLayout, Documents, docDate, historyActivity, useDemoActivity } from "./contract";
import { BuyMoreSheet, GuaranteeSheet, StrategySheet, WithdrawSheet, useMonthlyPlans } from "./contract-sheets";
import { SavingsPlanSheet } from "./savings-plan";

const META = contractsJson.contracts.find((c) => c.id === "life")!;
const SAFETY_RATE = META.safetyRate ?? 4.5;

export function LifeScreen() {
  const { contracts, data } = useStore();
  const { go } = useRouter();
  const c = contracts.find((x) => x.id === "life")!;
  const monthly = useMonthlyPlans("life");
  const [sheet, setSheet] = useState<"buy" | "withdraw" | "plan" | "guarantee" | "strategy" | null>(null);
  const [showGuarantee, setShowGuarantee] = useState(false);
  const [projMonthly, setProjMonthly] = useState(Math.max(100, Math.round(monthly / 25) * 25));

  const years = yearsUntil(c.guaranteeDate!);
  const split = lifeSplit(c.guarantee!, years);
  const safetyValue = (c.value * split.safety) / 100;
  const growthValue = c.value - safetyValue;
  const safetyRate = SAFETY_RATE;
  const guaranteedNow = (c.guarantee! / 100) * c.paidIn;
  const guaranteedAtDate = guaranteedAmount(c.guarantee!, c.paidIn, monthly, years);
  const totalYears = (Date.parse(c.guaranteeDate!) - Date.parse(META.since)) / (365.25 * 86_400_000);
  const progress = Math.min(1, Math.max(0, 1 - years / totalYears));

  // Ohne useMemo: der React Compiler memoisiert selbst
  const history = contractHistory({
    seed: "life",
    since: META.since,
    basePaidIn: META.paidIn,
    baseValue: META.value,
    paidIn: c.paidIn,
    value: c.value,
    vol: 0.06,
  });
  const proj = projection(c.value, projMonthly, years, lifeRates(split.safety, safetyRate, c.strategy));

  // Renditeteil: aktiv = Allianz-GI-Fonds aus der Auswahl, passiv = Indexfonds (Platzhalter)
  const holdings = (() => {
    if (c.strategy === "Active") {
      const picks = uniqueFunds(
        data.funds.filter((f) => f.provider === "Allianz GI" && f.assetClass !== "Bonds").sort((a, b) => b.delta5y - a.delta5y),
      ).slice(0, 4);
      const weights = [34, 28, 22, 16];
      return picks.map((f, i) => ({ key: f.id, name: f.name, weight: weights[i], fund: f }));
    }
    return contractsJson.passiveHoldings.map((h) => ({ key: h.name, name: h.name, weight: h.weight, fund: undefined }));
  })();

  const interestThisYear = safetyValue * (safetyRate / 100) * yearFraction();
  const activity = [
    ...useDemoActivity("life"),
    ...historyActivity({ monthly: Math.round((META.paidIn * 0.65) / 68), interest: Math.round((safetyValue * safetyRate) / 400) }),
  ];

  return (
    <>
      <ContractLayout
        title={c.name}
        subtitle={c.subtitle}
        value={c.value}
        paidIn={c.paidIn}
        history={history}
        hline={showGuarantee ? { value: guaranteedNow, label: `Guaranteed ${eur0(guaranteedNow)}` } : undefined}
        chartToggles={
          <ChartToggle active={showGuarantee} onClick={() => setShowGuarantee((s) => !s)}>
            {showGuarantee ? "Hide guaranteed" : "Show guaranteed"}
          </ChartToggle>
        }
        actions={[
          { label: "Buy more", icon: Plus, primary: true, onClick: () => setSheet("buy") },
          { label: "Withdraw", icon: ArrowUpFromLine, onClick: () => setSheet("withdraw") },
          { label: "Savings plan", icon: Repeat, onClick: () => setSheet("plan") },
          { label: "Adjust", icon: SlidersHorizontal, onClick: () => setSheet("guarantee") },
        ]}
        tabs={{
          Overview: (
            <>
              {/* Garantie */}
              <section className="hero rounded-card p-5 shadow-float">
                <div className="flex items-center justify-between">
                  <p className="flex items-center gap-2 text-[14px] font-semibold text-white/80">
                    <ShieldCheck size={18} /> {c.guarantee}% guarantee
                  </p>
                  <button onClick={() => setSheet("guarantee")} className="glass-dark rounded-full px-3 py-1.5 text-[13px] font-semibold">
                    Adjust
                  </button>
                </div>
                <p className="mt-3 text-[13px] text-white/70">Guaranteed on {new Date(c.guaranteeDate!).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })}</p>
                <p className="tabular text-[32px] font-bold tracking-tight">{eur0(guaranteedAtDate)}</p>
                <div className="mt-3 h-2 overflow-hidden rounded-full bg-white/20">
                  <motion.div
                    className="h-full rounded-full bg-white"
                    initial={{ width: 0 }}
                    animate={{ width: `${progress * 100}%` }}
                    transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
                  />
                </div>
                <p className="mt-2 text-[13px] text-white/80">
                  {Math.ceil(years)} years to go · already guaranteed today: {eur0(guaranteedNow)}
                </p>
              </section>

              {/* Aufteilung */}
              <Card className="p-5">
                <p className="mb-4 text-[15px] font-semibold">How your money is invested</p>
                <div className="flex items-center gap-5">
                  <Donut
                    parts={[
                      { value: split.safety, color: "var(--safety)" },
                      { value: split.growth, color: "var(--growth)" },
                    ]}
                    size={120}
                  />
                  <Legend
                    items={[
                      {
                        label: `Safety part · ${percent(split.safety, 0)}`,
                        value: eur(safetyValue),
                        color: "var(--safety)",
                        note: `Currently earning ${percent(safetyRate, 1)} p. a. · ${eur(interestThisYear)} this year`,
                      },
                      {
                        label: `Growth part · ${percent(split.growth, 0)}`,
                        value: eur(growthValue),
                        color: "var(--growth)",
                        note: c.strategy === "Active" ? "Actively managed funds" : "ETFs and index funds",
                      },
                    ]}
                  />
                </div>
              </Card>

              {/* Strategie */}
              <Card className="flex items-center gap-4 p-5">
                <div className="min-w-0 flex-1">
                  <p className="text-[13px] font-semibold tracking-wide text-muted uppercase">Strategy</p>
                  <p className="text-[18px] font-bold">{c.strategy}</p>
                  <p className="text-[13px] text-muted">
                    {c.strategy === "Active" ? "Allianz Global Investors" : "Allianz Investment Management"} · switch anytime, free
                  </p>
                </div>
                <Button variant="secondary" className="h-11 px-4 text-[15px]" onClick={() => setSheet("strategy")}>
                  Switch
                </Button>
              </Card>

              {/* Prognose */}
              <Card className="p-5">
                <SectionTitle>Your forecast until {yearOf(c.guaranteeDate!)}</SectionTitle>
                <Slider label="Monthly contribution" value={projMonthly} min={0} max={1000} step={25} format={eur0} onChange={setProjMonthly} />
                <div className="mt-5">
                  <ScenarioChart data={proj} startYear={NOW_YEAR} endYear={yearOf(c.guaranteeDate!)} />
                </div>
                <p className="mt-3 text-[12px] text-faint">Illustrative scenarios, not a forecast. Your guaranteed amount applies in any case.</p>
              </Card>

              <Card className="p-5">
                <Checklist
                  items={[
                    "Tax advantages of a pension insurance policy",
                    "At the guarantee date: lump sum or pension",
                    "Pay in and withdraw anytime, free of charge",
                  ]}
                />
              </Card>
            </>
          ),
          Holdings: (
            <>
              <Card className="flex items-center gap-3 p-4">
                <span className="flex size-11 shrink-0 items-center justify-center rounded-full bg-blue-wash text-blue">
                  <ShieldCheck size={20} />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-[15px] font-semibold">Safety part</span>
                  <span className="block text-[13px] text-muted">Guaranteed interest {percent(safetyRate, 1)} p. a.</span>
                </span>
                <span className="text-right">
                  <span className="tabular block text-[15px] font-semibold">{eur(safetyValue)}</span>
                  <span className="text-[13px] text-muted">{percent(split.safety, 0)}</span>
                </span>
              </Card>
              <p className="px-1 pt-2 text-[13px] font-semibold tracking-wide text-muted uppercase">
                Growth part · {c.strategy.toLowerCase()}
              </p>
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
                      <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-orange-wash text-[11px] font-bold text-orange">ETF</span>
                    )}
                    <span className="min-w-0 flex-1">
                      <span className="block text-[15px] leading-snug font-semibold">{h.name}</span>
                      <span className="block text-[13px] text-muted">{percent(h.weight, 0)} of growth part</span>
                    </span>
                    <span className="text-right">
                      <span className="tabular block text-[15px] font-semibold">{eur((growthValue * h.weight) / 100)}</span>
                      {h.fund && <ChangeText value={change(h.fund, "1Y")} />}
                    </span>
                  </button>
                ))}
              </Card>
              <p className="px-1 text-[12px] text-faint">Fund weights are illustrative.</p>
            </>
          ),
          Activity: <ActivityList items={activity} />,
          Documents: (
            <Documents
              docs={[
                { title: "Policy document", date: docDate(68), size: "412 KB" },
                { title: "Annual statement 2025", date: docDate(9), size: "186 KB" },
                { title: "Cost information", date: docDate(9), size: "94 KB" },
                { title: "Key information document", date: docDate(2), size: "128 KB" },
                { title: "Tax certificate 2025", date: docDate(8), size: "61 KB" },
              ]}
            />
          ),
        }}
      />
      <BuyMoreSheet contract={c} open={sheet === "buy"} onClose={() => setSheet(null)} />
      <WithdrawSheet contract={c} open={sheet === "withdraw"} onClose={() => setSheet(null)} />
      <GuaranteeSheet contract={c} open={sheet === "guarantee"} onClose={() => setSheet(null)} />
      <StrategySheet contract={c} open={sheet === "strategy"} onClose={() => setSheet(null)} />
      <SavingsPlanSheet preset="life" open={sheet === "plan"} onClose={() => setSheet(null)} />
    </>
  );
}
