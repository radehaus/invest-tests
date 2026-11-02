"use client";

import { AnimatePresence, motion } from "motion/react";
import { Building2, CalendarClock, Gauge, Phone, Sparkles, Zap } from "lucide-react";
import { useMemo, useState } from "react";
import { Keypad, Sheet, SwipeToConfirm, parseAmount } from "@/components/sheet";
import { Button, Chip, Segmented, haptic } from "@/components/ui";
import { AmountDisplay, Done, ReviewRows, StepHeader, Steps } from "@/components/flow";
import { Checklist, Donut, Legend, Slider } from "@/components/viz";
import { DeltaBadge, FundAvatar, shortName } from "@/components/fund-bits";
import { BuyFlow, SellFlow } from "./trade";
import { useStore, type Contract, type Profile, type Strategy } from "@/lib/store";
import {
  NOW_YEAR,
  PREFERENCES,
  PROFILES,
  PROFILE_SPLIT,
  guaranteedAmount,
  lifeSplit,
  wealthCost,
  yearOf,
  yearsUntil,
} from "@/lib/products";
import { eur, eur0, percent } from "@/lib/format";
import type { Fund } from "@/lib/types";
import { cx } from "@/lib/cx";

// Bottom Sheets der Vertragsdetailseiten (Anforderungen 5.3). Jede Aktion: Eingabe, Prüfen, Bestätigen, Erfolg.

const MIN = 10;

/** Monatliche Sparplan-Summe eines Vertrags (pausierte zählen nicht) */
export function useMonthlyPlans(contractId: string) {
  const { state } = useStore();
  return state.plans
    .filter((p) => p.contractId === contractId && !p.paused)
    .reduce((a, p) => a + (p.rhythm === "Monthly" ? p.amount : p.amount / 3), 0);
}

/** Wohin fließt das Geld? Life: Sicherung/Rendite, Wealth: Anleihen/Aktien */
function allocation(c: Contract) {
  if (c.product === "life") {
    const s = lifeSplit(c.guarantee!, yearsUntil(c.guaranteeDate!));
    return { a: { label: "Safety part", share: s.safety }, b: { label: "Growth part", share: s.growth } };
  }
  const s = PROFILE_SPLIT[c.profile!];
  return { a: { label: "Bonds", share: s.bonds }, b: { label: "Equities", share: s.equities } };
}

const contractIcon = (
  <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-blue-wash text-blue">
    <Zap size={18} />
  </span>
);

// --- Buy more (Life, Wealth) ---------------------------------------------------------------------

export function BuyMoreSheet({ contract, open, onClose }: { contract: Contract; open: boolean; onClose: () => void }) {
  return (
    <Sheet open={open} onClose={onClose}>
      <BuyMoreFlow contract={contract} onClose={onClose} />
    </Sheet>
  );
}

function BuyMoreFlow({ contract: c, onClose }: { contract: Contract; onClose: () => void }) {
  const { deposit } = useStore();
  const [step, setStep] = useState<"amount" | "review" | "done">("amount");
  const [dir, setDir] = useState(1);
  const [amount, setAmount] = useState("");
  const value = parseAmount(amount);
  const { a, b } = allocation(c);
  const to = (s: typeof step, d = 1) => {
    setDir(d);
    setStep(s);
  };
  const split = `${eur((value * a.share) / 100)} ${a.label.toLowerCase()} · ${eur((value * b.share) / 100)} ${b.label.toLowerCase()}`;

  return (
    <Steps step={step} dir={dir}>
      {step === "amount" && (
        <div>
          <StepHeader title="Buy more" subtitle={c.name} icon={contractIcon} />
          <AmountDisplay
            value={amount}
            hint={value > 0 && value < MIN ? `Minimum ${eur(MIN)}` : value > 0 ? split : `Split ${a.share}/${b.share} like your contract`}
            error={value > 0 && value < MIN}
          />
          <div className="mb-3 flex justify-center gap-2">
            {[250, 500, 1000, 2500].map((n) => (
              <Chip key={n} active={value === n} onClick={() => setAmount(String(n))}>
                {eur0(n)}
              </Chip>
            ))}
          </div>
          <Keypad value={amount} onChange={setAmount} max={250000} />
          <Button className="mt-4 w-full" disabled={value < MIN} onClick={() => to("review")}>
            Continue
          </Button>
        </div>
      )}
      {step === "review" && (
        <div>
          <StepHeader title="Review" subtitle={c.name} onBack={() => to("amount", -1)} />
          <ReviewRows
            rows={[
              ["Payment", eur(value)],
              [a.label, `${eur((value * a.share) / 100)} (${percent(a.share, 0)})`],
              [b.label, `${eur((value * b.share) / 100)} (${percent(b.share, 0)})`],
              ["Entry charge", eur(0)],
              ["Debited from", "Your reference account"],
            ]}
          />
          {c.product === "life" && (
            <p className="mt-3 px-1 text-[13px] text-muted">Your guarantee of {c.guarantee}% also applies to this payment.</p>
          )}
          <div className="mt-6">
            <SwipeToConfirm
              label="Swipe to pay in"
              onConfirm={() => {
                deposit(c.id, value);
                to("done");
              }}
            />
          </div>
        </div>
      )}
      {step === "done" && (
        <Done title="Payment received" text={<>{eur(value)} is now invested in your {c.name.replace("Allianz Invest ", "")} contract.</>} onClose={onClose} />
      )}
    </Steps>
  );
}

// --- Withdraw (Life, Wealth) ---------------------------------------------------------------------

export function WithdrawSheet({ contract, open, onClose }: { contract: Contract; open: boolean; onClose: () => void }) {
  return (
    <Sheet open={open} onClose={onClose}>
      <WithdrawFlow contract={contract} onClose={onClose} />
    </Sheet>
  );
}

function WithdrawFlow({ contract: c, onClose }: { contract: Contract; onClose: () => void }) {
  const { withdraw } = useStore();
  const [step, setStep] = useState<"amount" | "review" | "done">("amount");
  const [dir, setDir] = useState(1);
  const [amount, setAmount] = useState("");
  const [max] = useState(() => Math.floor(c.value * 100) / 100);
  const value = parseAmount(amount);
  const to = (s: typeof step, d = 1) => {
    setDir(d);
    setStep(s);
  };
  return (
    <Steps step={step} dir={dir}>
      {step === "amount" && (
        <div>
          <StepHeader title="Withdraw" subtitle={c.name} icon={contractIcon} />
          <AmountDisplay value={amount} hint={`Available: ${eur(max)} · free of charge`} />
          <div className="mb-3 flex justify-center gap-2">
            {[500, 1000, 2500].map((n) => (
              <Chip key={n} active={value === n} onClick={() => setAmount(String(Math.min(n, max)))}>
                {eur0(n)}
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
          <StepHeader title="Review" subtitle={c.name} onBack={() => to("amount", -1)} />
          <ReviewRows
            rows={[
              ["Withdrawal", eur(value)],
              ["Remaining value", eur(c.value - value)],
              ["Fees", eur(0)],
              ["Paid out to", "Your reference account"],
            ]}
          />
          <p className="mt-3 px-1 text-[13px] text-muted">
            {c.product === "life"
              ? "Withdrawals reduce your guaranteed amount proportionally. Taxes are withheld where applicable."
              : "Taxes on gains are withheld automatically where applicable."}
          </p>
          <div className="mt-6">
            <SwipeToConfirm
              label="Swipe to withdraw"
              onConfirm={() => {
                withdraw(c.id, value);
                to("done");
              }}
            />
          </div>
        </div>
      )}
      {step === "done" && <Done title="Withdrawal placed" text={<>{eur(value)} arrives in your account in 2 business days.</>} onClose={onClose} />}
    </Steps>
  );
}

// --- Adjust guarantee (Life) ----------------------------------------------------------------------

export function GuaranteeSheet({ contract, open, onClose }: { contract: Contract; open: boolean; onClose: () => void }) {
  return (
    <Sheet open={open} onClose={onClose}>
      <GuaranteeFlow contract={contract} onClose={onClose} />
    </Sheet>
  );
}

function GuaranteeFlow({ contract: c, onClose }: { contract: Contract; onClose: () => void }) {
  const { updateContract } = useStore();
  const monthly = useMonthlyPlans(c.id);
  const [level, setLevel] = useState(String(c.guarantee) as "60" | "80" | "90");
  const [year, setYear] = useState(yearOf(c.guaranteeDate!));
  const [done, setDone] = useState(false);
  const years = year - NOW_YEAR;
  const split = lifeSplit(Number(level), years);
  const guaranteed = guaranteedAmount(Number(level), c.paidIn, monthly, years);
  const changed = Number(level) !== c.guarantee || year !== yearOf(c.guaranteeDate!);

  if (done)
    return (
      <Done
        title="Guarantee updated"
        text={
          <>
            {level}% guaranteed on {new Date(Date.UTC(year, 2, 1)).toLocaleDateString("en-GB", { month: "long", year: "numeric" })}.
          </>
        }
        onClose={onClose}
      />
    );

  return (
    <div>
      <StepHeader title="Adjust guarantee" subtitle={c.name} icon={contractIcon} />
      <p className="mb-2 text-[15px] font-semibold">Guarantee level</p>
      <Segmented
        options={[
          { value: "60", label: "60%" },
          { value: "80", label: "80%" },
          { value: "90", label: "90%" },
        ]}
        value={level}
        onChange={setLevel}
      />
      <div className="mt-6">
        <Slider label="Guarantee date" value={year} min={NOW_YEAR + 5} max={NOW_YEAR + 40} format={String} onChange={setYear} />
      </div>
      <div className="mt-6 flex items-center gap-5 rounded-2xl bg-card-solid p-4">
        <Donut
          size={112}
          parts={[
            { value: split.safety, color: "var(--safety)" },
            { value: split.growth, color: "var(--growth)" },
          ]}
          center={<span className="text-[12px] font-semibold text-muted">{years} yrs</span>}
        />
        <Legend
          items={[
            { label: "Safety part", value: percent(split.safety, 0), color: "var(--safety)" },
            { label: "Growth part", value: percent(split.growth, 0), color: "var(--growth)" },
          ]}
        />
      </div>
      <div className="mt-3 rounded-2xl bg-[linear-gradient(135deg,var(--blue-deep),var(--blue))] p-4 text-white">
        <p className="text-[13px] text-white/75">Guaranteed in {year}</p>
        <motion.p key={Math.round(guaranteed)} initial={{ opacity: 0.4 }} animate={{ opacity: 1 }} className="tabular text-[28px] font-bold">
          {eur0(guaranteed)}
        </motion.p>
        <p className="text-[12px] text-white/70">Including your current savings plans until then.</p>
      </div>
      <p className="mt-3 px-1 text-[13px] text-muted">More guarantee means more in the safety part and less growth potential. Free of charge.</p>
      <Button
        className="mt-5 w-full"
        disabled={!changed}
        onClick={() => {
          updateContract(c.id, { guarantee: Number(level), guaranteeDate: `${year}-03-01` }, `Guarantee changed to ${level}% until ${year}`);
          haptic(20);
          setDone(true);
        }}
      >
        Confirm change
      </Button>
    </div>
  );
}

// --- Strategy (Life) ----------------------------------------------------------------------------

export function StrategySheet({ contract, open, onClose }: { contract: Contract; open: boolean; onClose: () => void }) {
  return (
    <Sheet open={open} onClose={onClose}>
      <StrategyFlow contract={contract} onClose={onClose} />
    </Sheet>
  );
}

const STRATEGIES: { value: Strategy; title: string; by: string; text: string; icon: typeof Gauge }[] = [
  {
    value: "Active",
    title: "Active",
    by: "Allianz Global Investors",
    text: "Actively managed funds. Experts pick the investments and aim to beat the market.",
    icon: Zap,
  },
  {
    value: "Passive",
    title: "Passive",
    by: "Allianz Investment Management",
    text: "ETFs and index funds that follow the market at low cost.",
    icon: Gauge,
  },
];

function StrategyFlow({ contract: c, onClose }: { contract: Contract; onClose: () => void }) {
  const { updateContract } = useStore();
  const [pick, setPick] = useState<Strategy>(c.strategy);
  const [done, setDone] = useState(false);
  if (done) return <Done title="Strategy switched" text={<>Your growth part now follows the {pick.toLowerCase()} strategy.</>} onClose={onClose} />;
  return (
    <div>
      <StepHeader title="Investment strategy" subtitle="Switch anytime, free of charge" icon={contractIcon} />
      <div className="space-y-3">
        {STRATEGIES.map((s) => (
          <motion.button
            key={s.value}
            whileTap={{ scale: 0.98 }}
            onClick={() => {
              haptic(5);
              setPick(s.value);
            }}
            className={cx("w-full rounded-2xl p-4 text-left ring-2 transition-colors", pick === s.value ? "bg-blue-wash ring-blue" : "glass ring-transparent")}
          >
            <span className="flex items-center gap-2 text-[17px] font-semibold">
              <s.icon size={18} className="text-blue" /> {s.title}
              {c.strategy === s.value && <span className="ml-auto rounded-full bg-ink/[0.06] px-2 py-0.5 text-[12px] text-muted">Current</span>}
            </span>
            <span className="mt-0.5 block text-[13px] font-semibold text-blue-deep">{s.by}</span>
            <span className="mt-1 block text-[14px] text-muted">{s.text}</span>
          </motion.button>
        ))}
      </div>
      <Button
        className="mt-5 w-full"
        disabled={pick === c.strategy}
        onClick={() => {
          updateContract(c.id, { strategy: pick }, `Strategy switched to ${pick.toLowerCase()}`);
          setDone(true);
        }}
      >
        Switch to {pick.toLowerCase()}
      </Button>
    </div>
  );
}

// --- Profile (Wealth) ---------------------------------------------------------------------------

export function ProfileSheet({ contract, open, onClose }: { contract: Contract; open: boolean; onClose: () => void }) {
  return (
    <Sheet open={open} onClose={onClose}>
      <ProfileFlow contract={contract} onClose={onClose} />
    </Sheet>
  );
}

function ProfileFlow({ contract: c, onClose }: { contract: Contract; onClose: () => void }) {
  const { updateContract } = useStore();
  const [profile, setProfile] = useState<Profile>(c.profile!);
  const [strategy, setStrategy] = useState<Strategy>(c.strategy);
  const [done, setDone] = useState(false);
  const split = PROFILE_SPLIT[profile];
  const changed = profile !== c.profile || strategy !== c.strategy;
  if (done)
    return (
      <Done title="Profile updated" text={<>Your portfolio is being rebalanced to {profile.toLowerCase()}, {strategy.toLowerCase()}.</>} onClose={onClose} />
    );
  return (
    <div>
      <StepHeader title="Adjust profile" subtitle={c.name} icon={contractIcon} />
      <p className="mb-2 text-[15px] font-semibold">Risk profile</p>
      <Segmented options={PROFILES} value={profile} onChange={setProfile} />
      <p className="mt-5 mb-2 text-[15px] font-semibold">Strategy</p>
      <Segmented options={["Passive", "Active"] as const} value={strategy} onChange={setStrategy} />
      <div className="mt-6 flex items-center gap-5 rounded-2xl bg-card-solid p-4">
        <Donut
          size={112}
          parts={[
            { value: split.bonds, color: "var(--safety)" },
            { value: split.equities, color: "var(--growth)" },
          ]}
        />
        <Legend
          items={[
            { label: "Bonds", value: percent(split.bonds, 0), color: "var(--safety)" },
            { label: "Equities", value: percent(split.equities, 0), color: "var(--growth)" },
          ]}
        />
      </div>
      <p className="mt-3 px-1 text-[13px] text-muted">
        Free of charge. Total costs {percent(wealthCost(strategy) * 100)} p. a. with the {strategy.toLowerCase()} strategy.
      </p>
      <Button
        className="mt-5 w-full"
        disabled={!changed}
        onClick={() => {
          updateContract(c.id, { profile, strategy }, `Profile changed to ${profile}, ${strategy.toLowerCase()}`);
          setDone(true);
        }}
      >
        Confirm change
      </Button>
    </div>
  );
}

// --- Personalise with AI (Wealth) -----------------------------------------------------------------

export function PersonaliseSheet({ contract, open, onClose }: { contract: Contract; open: boolean; onClose: () => void }) {
  return (
    <Sheet open={open} onClose={onClose}>
      <PersonaliseFlow contract={contract} onClose={onClose} />
    </Sheet>
  );
}

// Freitext wird auf bekannte Vorlieben abgebildet (kein echtes LLM im statischen Export)
const KEYWORDS: [RegExp, (typeof PREFERENCES)[number]][] = [
  [/fossil|oil|coal|gas|climate/i, "No fossil fuels"],
  [/asia|china|japan|india/i, "More Asia"],
  [/tech|ai|software|digital/i, "Tech focus"],
  [/esg|sustain|green|ethic/i, "Only ESG funds"],
  [/usa|us |america/i, "Less USA"],
];

function PersonaliseFlow({ contract: c, onClose }: { contract: Contract; onClose: () => void }) {
  const { updateContract } = useStore();
  const [prefs, setPrefs] = useState<string[]>(c.preferences ?? []);
  const [text, setText] = useState("");
  const [phase, setPhase] = useState<"edit" | "working" | "done">("edit");
  const toggle = (p: string) => setPrefs((x) => (x.includes(p) ? x.filter((y) => y !== p) : [...x, p]));
  const changed = prefs.slice().sort().join() !== (c.preferences ?? []).slice().sort().join();

  if (phase === "working")
    return (
      <div className="flex flex-col items-center py-14 text-center">
        <motion.span
          className="flex size-16 items-center justify-center rounded-full bg-blue-wash text-blue"
          animate={{ rotate: [0, 15, -15, 0], scale: [1, 1.08, 1] }}
          transition={{ repeat: Infinity, duration: 1.2 }}
        >
          <Sparkles size={28} />
        </motion.span>
        <p className="mt-4 text-[18px] font-bold">Adjusting your portfolio…</p>
        <p className="mt-1 text-[14px] text-muted">Checking 1,240 holdings against your preferences</p>
      </div>
    );
  if (phase === "done")
    return <Done title="Portfolio personalised" text={<>Your holdings, regions and sectors now reflect your preferences.</>} onClose={onClose} />;

  return (
    <div>
      <StepHeader title="Personalise with AI" subtitle="Tell us what matters to you" icon={contractIcon} />
      <form
        onSubmit={(e) => {
          e.preventDefault();
          const hits = KEYWORDS.filter(([re]) => re.test(text)).map(([, p]) => p);
          setPrefs((x) => Array.from(new Set([...x, ...hits])));
          setText("");
        }}
        className="glass flex h-14 items-center gap-3 rounded-full px-5"
      >
        <Sparkles size={20} className="shrink-0 text-blue" />
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="e.g. “I don’t want oil companies”"
          aria-label="Describe your preference"
          className="min-w-0 flex-1 bg-transparent outline-none placeholder:text-faint"
        />
      </form>
      <div className="mt-4 flex flex-wrap gap-2">
        {PREFERENCES.map((p) => (
          <Chip key={p} active={prefs.includes(p)} onClick={() => toggle(p)}>
            {p}
          </Chip>
        ))}
      </div>
      <Button
        className="mt-6 w-full"
        disabled={!changed}
        onClick={() => {
          setPhase("working");
          setTimeout(() => {
            updateContract(c.id, { preferences: prefs }, prefs.length ? `Personalised: ${prefs.join(", ")}` : "Personalisation removed");
            haptic(20);
            setPhase("done");
          }, 1400);
        }}
      >
        Apply to my portfolio
      </Button>
    </div>
  );
}

// --- Private markets: Rückruf (Wealth) ------------------------------------------------------------

export function CallbackSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  return (
    <Sheet open={open} onClose={onClose}>
      <CallbackFlow onClose={onClose} />
    </Sheet>
  );
}

function CallbackFlow({ onClose }: { onClose: () => void }) {
  const { logEvent } = useStore();
  const slots = ["Today, 4:00 pm", "Tomorrow, 10:00 am", "Tomorrow, 2:30 pm", "Friday, 11:00 am"];
  const [slot, setSlot] = useState(slots[1]);
  const [done, setDone] = useState(false);
  if (done) return <Done title="Call booked" text={<>A private markets specialist will call you {slot.toLowerCase()}.</>} onClose={onClose} />;
  return (
    <div>
      <StepHeader
        title="Talk to our team"
        subtitle="Private markets specialists"
        icon={
          <span className="flex size-10 items-center justify-center rounded-full bg-orange-wash text-orange">
            <Phone size={18} />
          </span>
        }
      />
      <Checklist
        items={["Infrastructure, private equity and private credit", "Minimum investment and liquidity explained", "No obligation"]}
      />
      <p className="mt-6 mb-2 flex items-center gap-2 text-[15px] font-semibold">
        <CalendarClock size={18} className="text-blue" /> Pick a time
      </p>
      <div className="grid grid-cols-2 gap-2">
        {slots.map((s) => (
          <button
            key={s}
            onClick={() => {
              haptic(5);
              setSlot(s);
            }}
            className={cx("h-12 rounded-2xl text-[14px] font-semibold", slot === s ? "bg-blue-deep text-white" : "glass")}
          >
            {s}
          </button>
        ))}
      </div>
      <Button
        className="mt-6 w-full"
        onClick={() => {
          logEvent({ contractId: "wealth", kind: "callback", title: `Call booked with private markets team: ${slot}` });
          setDone(true);
        }}
      >
        Book call
      </Button>
    </div>
  );
}

// --- Broker: Fonds wählen, dann Kauf oder Verkauf -------------------------------------------------

function FundPicker({ title, funds, onPick, heldFirst }: { title: string; funds: Fund[]; onPick: (f: Fund) => void; heldFirst?: boolean }) {
  const { state, positionValue } = useStore();
  const groups = heldFirst
    ? [
        { label: "In your portfolio", list: funds.filter((f) => state.positions[f.id]) },
        { label: "All funds", list: funds.filter((f) => !state.positions[f.id]) },
      ]
    : [{ label: "", list: funds }];
  return (
    <div>
      <StepHeader
        title={title}
        subtitle="Allianz Invest Broker"
        icon={
          <span className="flex size-10 items-center justify-center rounded-full bg-blue-wash text-blue">
            <Building2 size={18} />
          </span>
        }
      />
      {groups.map(
        (g) =>
          g.list.length > 0 && (
            <div key={g.label} className="mb-5">
              {g.label && <p className="mb-2 px-1 text-[13px] font-semibold tracking-wide text-muted uppercase">{g.label}</p>}
              <div className="space-y-2">
                {g.list.map((f) => (
                  <motion.button
                    key={f.id}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => {
                      haptic(5);
                      onPick(f);
                    }}
                    className="glass flex w-full items-center gap-3 rounded-2xl p-3 text-left"
                  >
                    <FundAvatar fund={f} size={40} />
                    <span className="min-w-0 flex-1">
                      <span className="block text-[15px] leading-snug font-semibold">{shortName(f)}</span>
                      <span className="block text-[13px] text-muted">
                        {state.positions[f.id] ? eur(positionValue(f.id)) : `${f.provider} · ${f.assetClass}`}
                      </span>
                    </span>
                    <DeltaBadge value={f.delta5y} />
                  </motion.button>
                ))}
              </div>
            </div>
          ),
      )}
    </div>
  );
}

export function BrokerBuySheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  return (
    <Sheet open={open} onClose={onClose}>
      <BrokerTradeFlow kind="buy" onClose={onClose} />
    </Sheet>
  );
}

export function BrokerSellSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  return (
    <Sheet open={open} onClose={onClose}>
      <BrokerTradeFlow kind="sell" onClose={onClose} />
    </Sheet>
  );
}

function BrokerTradeFlow({ kind, onClose }: { kind: "buy" | "sell"; onClose: () => void }) {
  const { data, state, fund } = useStore();
  const [picked, setPicked] = useState<Fund | null>(null);
  const funds = useMemo(
    () =>
      kind === "buy"
        ? [...data.funds].sort((a, b) => b.delta5y - a.delta5y)
        : Object.keys(state.positions).map(fund),
    // Liste beim Öffnen festhalten, damit sie sich nach dem Kauf nicht umsortiert
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [kind],
  );
  return (
    <AnimatePresence mode="popLayout" initial={false}>
      <motion.div key={picked?.id ?? "pick"} initial={{ x: 60, opacity: 0 }} animate={{ x: 0, opacity: 1 }} exit={{ x: -60, opacity: 0 }}>
        {!picked ? (
          <FundPicker title={kind === "buy" ? "Buy more" : "Sell"} funds={funds} onPick={setPicked} heldFirst={kind === "buy"} />
        ) : kind === "buy" ? (
          <BuyFlow fund={picked} onClose={onClose} />
        ) : (
          <SellFlow fund={picked} onClose={onClose} />
        )}
      </motion.div>
    </AnimatePresence>
  );
}

// --- Broker: Sparplan bearbeiten ------------------------------------------------------------------

export function PlanEditSheet({ planId, onClose }: { planId: string | null; onClose: () => void }) {
  return (
    <Sheet open={planId !== null} onClose={onClose}>
      {planId && <PlanEditFlow planId={planId} onClose={onClose} />}
    </Sheet>
  );
}

function PlanEditFlow({ planId, onClose }: { planId: string; onClose: () => void }) {
  const { state, fund, updatePlan, removePlan } = useStore();
  const plan = state.plans.find((p) => p.id === planId);
  const [amount, setAmount] = useState(plan ? String(plan.amount) : "");
  if (!plan) return null;
  const value = parseAmount(amount);
  const f = plan.fundId ? fund(plan.fundId) : null;
  return (
    <div>
      <StepHeader
        title="Edit savings plan"
        subtitle={f ? f.name : "Savings plan"}
        icon={f ? <FundAvatar fund={f} size={40} /> : contractIcon}
      />
      <AmountDisplay value={amount} hint={`${plan.rhythm}${plan.paused ? " · paused" : ""}`} />
      <Keypad value={amount} onChange={setAmount} max={10000} />
      <Button
        className="mt-4 w-full"
        disabled={value < MIN || value === plan.amount}
        onClick={() => {
          updatePlan(plan.id, { amount: value });
          onClose();
        }}
      >
        Save amount
      </Button>
      <div className="mt-3 grid grid-cols-2 gap-3">
        <Button
          variant="secondary"
          onClick={() => {
            updatePlan(plan.id, { paused: !plan.paused });
            onClose();
          }}
        >
          {plan.paused ? "Resume" : "Pause"}
        </Button>
        <Button
          variant="secondary"
          className="text-negative"
          onClick={() => {
            removePlan(plan.id);
            onClose();
          }}
        >
          Delete
        </Button>
      </div>
    </div>
  );
}
