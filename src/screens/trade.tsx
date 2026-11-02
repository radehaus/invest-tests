"use client";

import { AnimatePresence, motion } from "motion/react";
import { CalendarDays, ChevronLeft, ChevronRight, FileText, Repeat, Zap } from "lucide-react";
import { useState, type ReactNode } from "react";
import { Keypad, Sheet, SuccessCheck, SwipeToConfirm, formatInput, inputAsEur, parseAmount } from "@/components/sheet";
import { Button, Chip, Segmented, haptic } from "@/components/ui";
import { FundAvatar, shortName } from "@/components/fund-bits";
import { useStore } from "@/lib/store";
import { AS_OF } from "@/lib/series";
import { eur, eur0, num, percent, shortDate } from "@/lib/format";
import type { Fund } from "@/lib/types";
import { cx } from "@/lib/cx";

const MIN = 10;

/** Schritt-Container mit seitlichem Schieben zwischen den Schritten */
function Steps({ step, dir, children }: { step: string; dir: number; children: ReactNode }) {
  return (
    <AnimatePresence mode="popLayout" initial={false} custom={dir}>
      <motion.div
        key={step}
        custom={dir}
        initial={{ x: dir > 0 ? 60 : -60, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        exit={{ x: dir > 0 ? -60 : 60, opacity: 0 }}
        transition={{ type: "spring", stiffness: 420, damping: 38 }}
      >
        {children}
      </motion.div>
    </AnimatePresence>
  );
}

function StepHeader({ title, onBack, fund }: { title: string; onBack?: () => void; fund: Fund }) {
  return (
    <div className="mb-5 flex items-center gap-3">
      {onBack ? (
        <button onClick={onBack} aria-label="Back" className="flex size-10 items-center justify-center rounded-full bg-ink/[0.05]">
          <ChevronLeft size={22} />
        </button>
      ) : (
        <FundAvatar fund={fund} size={40} />
      )}
      <div className="min-w-0">
        <p className="text-[20px] leading-tight font-bold">{title}</p>
        <p className="truncate text-[13px] text-muted">{fund.name}</p>
      </div>
    </div>
  );
}

function AmountDisplay({ value, hint, error }: { value: string; hint: string; error?: boolean }) {
  return (
    <div className="py-4 text-center">
      <motion.p
        key={value}
        initial={{ scale: 0.97 }}
        animate={{ scale: 1 }}
        className={cx("tabular text-[52px] leading-none font-bold tracking-tight", !value && "text-faint")}
      >
        {inputAsEur(value)}
      </motion.p>
      <p className={cx("mt-2 text-[14px]", error ? "text-negative" : "text-muted")}>{hint}</p>
    </div>
  );
}

function ReviewRows({ rows }: { rows: [string, ReactNode][] }) {
  return (
    <div className="divide-y divide-line rounded-2xl bg-card-solid px-4">
      {rows.map(([k, v]) => (
        <div key={k} className="flex justify-between gap-4 py-3 text-[15px]">
          <span className="text-muted">{k}</span>
          <span className="tabular text-right font-semibold">{v}</span>
        </div>
      ))}
    </div>
  );
}

function Done({ title, text, onClose }: { title: string; text: ReactNode; onClose: () => void }) {
  return (
    <div className="flex flex-col items-center pt-6 pb-2 text-center">
      <SuccessCheck />
      <motion.h2
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0, transition: { delay: 0.5 } }}
        className="headline mt-6 text-[28px] font-bold tracking-tight"
      >
        {title}
      </motion.h2>
      <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1, transition: { delay: 0.65 } }} className="mt-2 text-[15px] text-muted">
        {text}
      </motion.p>
      <Button className="mt-8 w-full" onClick={onClose}>
        Done
      </Button>
    </div>
  );
}

// ---------------------------------------------------------------------------

type BuyStep = "type" | "amount" | "schedule" | "review" | "done";

export function BuySheet({ fund, open, onClose }: { fund: Fund; open: boolean; onClose: () => void }) {
  return (
    <Sheet open={open} onClose={onClose}>
      <BuyFlow fund={fund} onClose={onClose} />
    </Sheet>
  );
}

function BuyFlow({ fund, onClose }: { fund: Fund; onClose: () => void }) {
  const { buy, addPlan } = useStore();
  const [step, setStep] = useState<BuyStep>("type");
  const [dir, setDir] = useState(1);
  const [plan, setPlan] = useState(false);
  const [amount, setAmount] = useState("");
  const [rhythm, setRhythm] = useState<"Monthly" | "Quarterly">("Monthly");
  const [startDay, setStartDay] = useState<1 | 15>(1);
  const [units, setUnits] = useState(0);

  const value = parseAmount(amount);
  const price = fund.facts.price;
  const nextMonth = new Date(AS_OF);
  const start = Date.UTC(nextMonth.getUTCFullYear(), nextMonth.getUTCMonth() + 1, startDay);

  const to = (s: BuyStep, d = 1) => {
    setDir(d);
    setStep(s);
  };

  return (
    <Steps step={step} dir={dir}>
      {step === "type" && (
        <div>
          <StepHeader title={`Buy ${shortName(fund)}`} fund={fund} />
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
          <StepHeader title={plan ? "Savings plan amount" : "How much?"} onBack={() => to("type", -1)} fund={fund} />
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
          <StepHeader title="When?" onBack={() => to("amount", -1)} fund={fund} />
          <p className="mb-2 text-[15px] font-semibold">Rhythm</p>
          <Segmented options={["Monthly", "Quarterly"] as const} value={rhythm} onChange={setRhythm} />
          <p className="mt-6 mb-2 text-[15px] font-semibold">First execution</p>
          <div className="grid grid-cols-2 gap-3">
            {([1, 15] as const).map((d) => {
              const ts = Date.UTC(nextMonth.getUTCFullYear(), nextMonth.getUTCMonth() + 1, d);
              return (
                <motion.button
                  key={d}
                  whileTap={{ scale: 0.97 }}
                  onClick={() => {
                    haptic(5);
                    setStartDay(d);
                  }}
                  className={cx(
                    "rounded-2xl p-4 text-left transition-colors",
                    startDay === d ? "bg-blue-deep text-white" : "glass",
                  )}
                >
                  <CalendarDays size={20} className={startDay === d ? "text-white/80" : "text-blue"} />
                  <span className="mt-2 block text-[16px] font-semibold">{shortDate(ts)}</span>
                  <span className={cx("text-[13px]", startDay === d ? "text-white/70" : "text-muted")}>
                    then every {d === 1 ? "1st" : "15th"}
                  </span>
                </motion.button>
              );
            })}
          </div>
          <Button className="mt-8 w-full" onClick={() => to("review")}>
            Continue
          </Button>
        </div>
      )}

      {step === "review" && (
        <div>
          <StepHeader title="Review" onBack={() => to(plan ? "schedule" : "amount", -1)} fund={fund} />
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

function SellFlow({ fund, onClose }: { fund: Fund; onClose: () => void }) {
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
          <StepHeader title={`Sell ${shortName(fund)}`} fund={fund} />
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
          <StepHeader title="Review" onBack={() => to("amount", -1)} fund={fund} />
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
