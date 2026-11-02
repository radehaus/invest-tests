"use client";

import { motion } from "motion/react";
import { ChevronRight, FileText, Repeat, Zap } from "lucide-react";
import { useState, type ReactNode } from "react";
import { Keypad, Sheet, SwipeToConfirm, formatInput, parseAmount } from "@/components/sheet";
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
import { FundAvatar, shortName } from "@/components/fund-bits";
import { useStore } from "@/lib/store";
import { eur, eur0, num, percent, shortDate } from "@/lib/format";
import type { Fund } from "@/lib/types";

const MIN = 10;

// ---------------------------------------------------------------------------

type BuyStep = "type" | "amount" | "schedule" | "review" | "done";

export function BuySheet({ fund, open, onClose }: { fund: Fund; open: boolean; onClose: () => void }) {
  return (
    <Sheet open={open} onClose={onClose}>
      <BuyFlow fund={fund} onClose={onClose} />
    </Sheet>
  );
}

export function BuyFlow({ fund, onClose }: { fund: Fund; onClose: () => void }) {
  const { buy, addPlan } = useStore();
  const [step, setStep] = useState<BuyStep>("type");
  const [dir, setDir] = useState(1);
  const [plan, setPlan] = useState(false);
  const [amount, setAmount] = useState("");
  const [rhythm, setRhythm] = useState<Rhythm>("Monthly");
  const [startDay, setStartDay] = useState<StartDay>(1);
  const [units, setUnits] = useState(0);

  const value = parseAmount(amount);
  const price = fund.facts.price;
  const start = firstExecution(startDay);

  const to = (s: BuyStep, d = 1) => {
    setDir(d);
    setStep(s);
  };

  return (
    <Steps step={step} dir={dir}>
      {step === "type" && (
        <div>
          <StepHeader title={`Buy ${shortName(fund)}`} subtitle={fund.name} icon={<FundAvatar fund={fund} size={40} />} />
          <div className="space-y-3">
            {[
              { p: false, icon: Zap, title: "One-time purchase", text: "Invest once. Executed on the next trading day." },
              { p: true, icon: Repeat, title: "Savings plan", text: "Invest automatically every month or quarter. Pause anytime." },
            ].map(({ p, icon: Icon, title, text }) => (
              <motion.button
                key={title}
                whileTap={{ scale: 0.98 }}
                onClick={() => {
                  haptic();
                  setPlan(p);
                  to("amount");
                }}
                className="glass flex w-full items-center gap-4 rounded-2xl p-4 text-left"
              >
                <span className="flex size-12 shrink-0 items-center justify-center rounded-full bg-blue-wash text-blue">
                  <Icon size={22} />
                </span>
                <span className="flex-1">
                  <span className="block text-[17px] font-semibold">{title}</span>
                  <span className="block text-[14px] text-muted">{text}</span>
                </span>
                <ChevronRight className="text-faint" />
              </motion.button>
            ))}
          </div>
          <p className="mt-5 text-center text-[13px] text-muted">No entry charges. No custody fees.</p>
        </div>
      )}

      {step === "amount" && (
        <div>
          <StepHeader title={plan ? "Savings plan amount" : "How much?"} onBack={() => to("type", -1)} subtitle={fund.name} icon={<FundAvatar fund={fund} size={40} />} />
          <AmountDisplay
            value={amount}
            hint={value > 0 && value < MIN ? `Minimum ${eur(MIN)}` : `≈ ${num(value / price, 3)} units at ${eur(price)}`}
            error={value > 0 && value < MIN}
          />
          <div className="mb-3 flex justify-center gap-2">
            {(plan ? [25, 50, 100, 250] : [100, 250, 500, 1000]).map((n) => (
              <Chip key={n} active={value === n} onClick={() => setAmount(String(n))}>
                {eur0(n)}
              </Chip>
            ))}
          </div>
          <Keypad value={amount} onChange={setAmount} max={100000} />
          <Button className="mt-4 w-full" disabled={value < MIN} onClick={() => to(plan ? "schedule" : "review")}>
            Continue
          </Button>
        </div>
      )}

      {step === "schedule" && (
        <div>
          <StepHeader title="When?" onBack={() => to("amount", -1)} subtitle={fund.name} icon={<FundAvatar fund={fund} size={40} />} />
          <ScheduleFields rhythm={rhythm} onRhythm={setRhythm} startDay={startDay} onStartDay={setStartDay} />
          <Button className="mt-8 w-full" onClick={() => to("review")}>
            Continue
          </Button>
        </div>
      )}

      {step === "review" && (
        <div>
          <StepHeader title="Review" onBack={() => to(plan ? "schedule" : "amount", -1)} subtitle={fund.name} icon={<FundAvatar fund={fund} size={40} />} />
          <ReviewRows
            rows={[
              ["Order", plan ? `Savings plan, ${rhythm.toLowerCase()}` : "One-time purchase"],
              ["Amount", eur(value)],
              ...(plan ? ([["First execution", shortDate(start)]] as [string, ReactNode][]) : []),
              ["Price per unit", `${eur(price)} (indicative)`],
              ["Estimated units", num(value / price, 3)],
              ["Entry charge", eur(0)],
              ["Ongoing charges", `${percent(fund.facts.ter)} p. a. ≈ ${eur((value * fund.facts.ter) / 100)}${plan ? "" : " per year"}`],
            ]}
          />
          <div className="mt-4 flex items-center gap-3 rounded-2xl bg-blue-wash p-4 text-blue-deep">
            <FileText size={20} className="shrink-0" />
            <p className="text-[14px]">
              By confirming you acknowledge the <u>Key Information Document</u> and the <u>cost information</u> for this fund.
            </p>
          </div>
          <div className="mt-6">
            <SwipeToConfirm
              label={plan ? "Swipe to start plan" : "Swipe to buy"}
              onConfirm={() => {
                if (plan) addPlan({ fundId: fund.id, amount: value, rhythm, start });
                else setUnits(buy(fund.id, value));
                to("done");
              }}
            />
          </div>
        </div>
      )}

      {step === "done" && (
        <Done
          title={plan ? "Savings plan started" : "Order placed"}
          text={
            plan ? (
              <>
                {eur(value)} {rhythm.toLowerCase()} into {shortName(fund)}, starting {shortDate(start)}.
              </>
            ) : (
              <>
                You now own {num(units, 3)} more units of {shortName(fund)}.<br />
                It’s already in your portfolio.
              </>
            )
          }
          onClose={onClose}
        />
      )}
    </Steps>
  );
}

// ---------------------------------------------------------------------------

type SellStep = "amount" | "review" | "done";

export function SellSheet({ fund, open, onClose }: { fund: Fund; open: boolean; onClose: () => void }) {
  return (
    <Sheet open={open} onClose={onClose}>
      <SellFlow fund={fund} onClose={onClose} />
    </Sheet>
  );
}

export function SellFlow({ fund, onClose }: { fund: Fund; onClose: () => void }) {
  const { sell, positionValue, state } = useStore();
  const [step, setStep] = useState<SellStep>("amount");
  const [dir, setDir] = useState(1);
  const [amount, setAmount] = useState("");
  const [result, setResult] = useState({ units: 0, value: 0 });
  // Wert beim Öffnen festhalten, damit die Anzeige nach dem Verkauf nicht springt
  const [max] = useState(() => Math.floor(positionValue(fund.id) * 100) / 100);
  const [units] = useState(() => state.positions[fund.id]?.units ?? 0);

  const value = parseAmount(amount);
  const price = fund.facts.price;
  const to = (s: SellStep, d = 1) => {
    setDir(d);
    setStep(s);
  };

  return (
    <Steps step={step} dir={dir}>
      {step === "amount" && (
        <div>
          <StepHeader title={`Sell ${shortName(fund)}`} subtitle={fund.name} icon={<FundAvatar fund={fund} size={40} />} />
          <AmountDisplay value={amount} hint={`Available: ${eur(max)} · ${num(units, 3)} units`} />
          <div className="mb-3 flex justify-center gap-2">
            {[0.25, 0.5, 1].map((share) => (
              <Chip
                key={share}
                active={value === Math.floor(max * share * 100) / 100}
                onClick={() => setAmount(formatInput(max * share))}
              >
                {share === 1 ? "Sell all" : percent(share * 100, 0)}
              </Chip>
            ))}
          </div>
          <Keypad value={amount} onChange={setAmount} max={max} />
          <Button className="mt-4 w-full" disabled={value <= 0} onClick={() => to("review")}>
            Continue
          </Button>
        </div>
      )}

      {step === "review" && (
        <div>
          <StepHeader title="Review" onBack={() => to("amount", -1)} subtitle={fund.name} icon={<FundAvatar fund={fund} size={40} />} />
          <ReviewRows
            rows={[
              ["Order", value >= max ? "Sell entire position" : "Partial sale"],
              ["Amount", eur(value)],
              ["Units", num(Math.min(units, value / price), 3)],
              ["Price per unit", `${eur(price)} (indicative)`],
              ["Fees", eur(0)],
              ["Paid out to", "Your reference account"],
            ]}
          />
          <p className="mt-3 px-1 text-[13px] text-muted">Taxes on gains are withheld automatically where applicable.</p>
          <div className="mt-6">
            <SwipeToConfirm
              label="Swipe to sell"
              onConfirm={() => {
                const sold = sell(fund.id, value >= max ? Infinity : value);
                setResult({ units: sold, value: sold * price });
                to("done");
              }}
            />
          </div>
        </div>
      )}

      {step === "done" && (
        <Done
          title="Sale placed"
          text={
            <>
              {num(result.units, 3)} units for about {eur(result.value)}.<br />
              The money arrives in 2 business days.
            </>
          }
          onClose={onClose}
        />
      )}
    </Steps>
  );
}
