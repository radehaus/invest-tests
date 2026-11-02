"use client";

import { motion } from "motion/react";
import { ChevronRight, Landmark, ShieldCheck, TrendingUp, type LucideIcon } from "lucide-react";
import { useMemo, useState, type ReactNode } from "react";
import { Keypad, Sheet, SwipeToConfirm, parseAmount } from "@/components/sheet";
import { Button, Chip, haptic } from "@/components/ui";
import {
  AmountDisplay,
  Done,
  ReviewRows,
  ScheduleFields,
  StepHeader,
  Steps,
  firstExecution,
  type Rhythm,
  type StartDay,
} from "@/components/flow";
import { DeltaBadge, FundAvatar, shortName } from "@/components/fund-bits";
import { useStore } from "@/lib/store";
import { eur, eur0, percent, shortDate } from "@/lib/format";
import type { Fund } from "@/lib/types";

// Sparplan aus dem Cockpit: erst Vertrag wählen (Life, Wealth oder Broker mit Fonds), dann Betrag und Rhythmus.

const MIN = 10;
type Step = "target" | "fund" | "amount" | "schedule" | "review" | "done";
type Target = { kind: "contract"; id: string } | { kind: "broker" };

/**
 * Produkte mit Sparplan. Protection (Risikolebensversicherung) hat keinen, dort zahlt man nur die Prämie.
 * Der Broker ist immer dabei (über die Fondsauswahl).
 */
const SAVINGS_PRODUCTS = new Set(["life", "wealth", "pension", "kids"]);

const ICONS: Record<string, LucideIcon> = { life: ShieldCheck, wealth: Landmark };
// Was mit dem Geld im jeweiligen Vertrag passiert (fiktiv, passend zu den Vertragsdaten)
const HOW: Record<string, string> = {
  life: "Split into the safety and growth parts of your contract.",
  wealth: "Invested according to your Balanced profile.",
};
const COSTS: Record<string, string> = {
  life: "Included in your contract",
  wealth: `Below ${percent(1, 0)} p. a.`,
};

/** preset: von einer Vertragsseite aus direkt mit diesem Vertrag starten ("broker" = Fondsauswahl) */
export function SavingsPlanSheet({ open, onClose, preset }: { open: boolean; onClose: () => void; preset?: string }) {
  return (
    <Sheet open={open} onClose={onClose}>
      <SavingsPlanFlow onClose={onClose} preset={preset} />
    </Sheet>
  );
}

function Option({
  icon,
  title,
  text,
  right,
  onClick,
}: {
  icon: ReactNode;
  title: string;
  text: string;
  right?: ReactNode;
  onClick: () => void;
}) {
  return (
    <motion.button
      whileTap={{ scale: 0.98 }}
      onClick={() => {
        haptic();
        onClick();
      }}
      className="glass flex w-full items-center gap-4 rounded-2xl p-4 text-left"
    >
      {icon}
      <span className="min-w-0 flex-1">
        <span className="block text-[17px] leading-snug font-semibold">{title}</span>
        <span className="block text-[14px] text-muted">{text}</span>
      </span>
      {right ?? <ChevronRight className="shrink-0 text-faint" />}
    </motion.button>
  );
}

const IconCircle = ({ icon: Icon }: { icon: LucideIcon }) => (
  <span className="flex size-12 shrink-0 items-center justify-center rounded-full bg-blue-wash text-blue">
    <Icon size={22} />
  </span>
);

function SavingsPlanFlow({ onClose, preset }: { onClose: () => void; preset?: string }) {
  const { contracts, data, fund: fundById, state, addPlan } = useStore();
  const [step, setStep] = useState<Step>(preset === "broker" ? "fund" : preset ? "amount" : "target");
  const [dir, setDir] = useState(1);
  const [target, setTarget] = useState<Target | null>(
    preset === "broker" ? { kind: "broker" } : preset ? { kind: "contract", id: preset } : null,
  );
  const [fund, setFund] = useState<Fund | null>(null);
  const [amount, setAmount] = useState("");
  const [rhythm, setRhythm] = useState<Rhythm>("Monthly");
  const [startDay, setStartDay] = useState<StartDay>(1);

  const value = parseAmount(amount);
  const start = firstExecution(startDay);
  const to = (s: Step, d = 1) => {
    setDir(d);
    setStep(s);
  };

  const contract = target?.kind === "contract" ? contracts.find((c) => c.id === target.id) : undefined;
  const targetName = contract ? contract.name : fund ? fund.name : "";
  const plansFor = (pred: (p: (typeof state.plans)[number]) => boolean) => state.plans.filter(pred).length;
  const plansLabel = (n: number) => (n ? ` · ${n} plan${n > 1 ? "s" : ""} running` : "");

  // Fonds im Depot zuerst, dann der Rest nach Mehrrendite
  const funds = useMemo(() => {
    const held = Object.keys(state.positions).map(fundById);
    const rest = data.funds.filter((f) => !state.positions[f.id]).sort((a, b) => b.delta5y - a.delta5y);
    return { held, rest };
  }, [data.funds, state.positions, fundById]);

  const headerIcon = contract ? (
    <IconCircle icon={ICONS[contract.product] ?? ShieldCheck} />
  ) : fund ? (
    <FundAvatar fund={fund} size={40} />
  ) : null;
  const backFromAmount =
    target?.kind === "broker" ? () => to("fund", -1) : preset ? undefined : () => to("target", -1);

  return (
    <Steps step={step} dir={dir}>
      {step === "target" && (
        <div>
          <StepHeader title="New savings plan" subtitle="Where should your money go?" />
          <div className="space-y-3">
            {contracts.filter((c) => SAVINGS_PRODUCTS.has(c.product)).map((c) => (
              <Option
                key={c.id}
                icon={<IconCircle icon={ICONS[c.product] ?? ShieldCheck} />}
                title={c.name}
                text={c.subtitle + plansLabel(plansFor((p) => p.contractId === c.id))}
                onClick={() => {
                  setTarget({ kind: "contract", id: c.id });
                  setFund(null);
                  to("amount");
                }}
              />
            ))}
            <Option
              icon={<IconCircle icon={TrendingUp} />}
              title="Allianz Invest Broker"
              text={`Choose one of ${data.funnel.selected} selected funds${plansLabel(plansFor((p) => Boolean(p.fundId)))}`}
              onClick={() => {
                setTarget({ kind: "broker" });
                to("fund");
              }}
            />
          </div>
          <p className="mt-5 text-center text-[13px] text-muted">Change, pause or stop any plan anytime, free of charge.</p>
        </div>
      )}

      {step === "fund" && (
        <div>
          <StepHeader title="Choose a fund" subtitle="Allianz Invest Broker" onBack={preset ? undefined : () => to("target", -1)} />
          {[
            { label: "In your portfolio", list: funds.held },
            { label: "All funds", list: funds.rest },
          ].map(
            ({ label, list }) =>
              list.length > 0 && (
                <div key={label} className="mb-5">
                  <p className="mb-2 px-1 text-[13px] font-semibold tracking-wide text-muted uppercase">{label}</p>
                  <div className="space-y-2">
                    {list.map((f) => (
                      <Option
                        key={f.id}
                        icon={<FundAvatar fund={f} size={40} />}
                        title={shortName(f)}
                        text={`${f.provider} · ${f.assetClass}`}
                        right={<DeltaBadge value={f.delta5y} />}
                        onClick={() => {
                          setFund(f);
                          to("amount");
                        }}
                      />
                    ))}
                  </div>
                </div>
              ),
          )}
        </div>
      )}

      {step === "amount" && (
        <div>
          <StepHeader title="How much each time?" subtitle={targetName} onBack={backFromAmount} />
          <AmountDisplay
            value={amount}
            hint={
              value > 0 && value < MIN
                ? `Minimum ${eur(MIN)}`
                : value > 0
                  ? `${eur(value * 12)} a year at a monthly rhythm`
                  : contract
                    ? HOW[contract.product] ?? ""
                    : "Bought at the next price after each execution."
            }
            error={value > 0 && value < MIN}
          />
          <div className="mb-3 flex justify-center gap-2">
            {[25, 50, 100, 250].map((n) => (
              <Chip key={n} active={value === n} onClick={() => setAmount(String(n))}>
                {eur0(n)}
              </Chip>
            ))}
          </div>
          <Keypad value={amount} onChange={setAmount} max={10000} />
          <Button className="mt-4 w-full" disabled={value < MIN} onClick={() => to("schedule")}>
            Continue
          </Button>
        </div>
      )}

      {step === "schedule" && (
        <div>
          <StepHeader title="When?" subtitle={targetName} onBack={() => to("amount", -1)} />
          <ScheduleFields rhythm={rhythm} onRhythm={setRhythm} startDay={startDay} onStartDay={setStartDay} />
          <Button className="mt-8 w-full" onClick={() => to("review")}>
            Continue
          </Button>
        </div>
      )}

      {step === "review" && (
        <div>
          <StepHeader title="Review" subtitle={targetName} onBack={() => to("schedule", -1)} icon={headerIcon} />
          <ReviewRows
            rows={[
              ["Into", contract ? contract.name.replace("Allianz Invest ", "") : fund ? shortName(fund) : ""],
              ["Amount", eur(value)],
              ["Rhythm", rhythm],
              ["First execution", shortDate(start)],
              ["Per year", eur(value * (rhythm === "Monthly" ? 12 : 4))],
              ["Costs", contract ? COSTS[contract.product] ?? "" : fund ? `${percent(fund.facts.ter)} p. a., no entry charge` : ""],
            ]}
          />
          <div className="mt-6">
            <SwipeToConfirm
              label="Swipe to start plan"
              onConfirm={() => {
                addPlan(
                  contract
                    ? { contractId: contract.id, amount: value, rhythm, start }
                    : { fundId: fund!.id, amount: value, rhythm, start },
                );
                to("done");
              }}
            />
          </div>
        </div>
      )}

      {step === "done" && (
        <Done
          title="Savings plan started"
          text={
            <>
              {eur(value)} {rhythm.toLowerCase()} into {contract ? contract.name : fund ? shortName(fund) : ""}, starting{" "}
              {shortDate(start)}.
            </>
          }
          onClose={onClose}
        />
      )}
    </Steps>
  );
}
