"use client";

import { AnimatePresence, motion } from "motion/react";
import { ArrowDownToLine, ArrowUpFromLine, ChevronRight, Gift, MessageCircle, Mic, Repeat, Sparkles, X } from "lucide-react";
import { useMemo, useRef, useState } from "react";
import { Screen } from "@/components/shell";
import { Chart, RangeChips } from "@/components/chart";
import { Card, CountUp, Delta, IconButton, SectionTitle, haptic } from "@/components/ui";
import { Sheet } from "@/components/sheet";
import { Logo } from "@/components/logo";
import { useRouter } from "@/lib/router";
import { useStore } from "@/lib/store";
import { RANGE_LABEL, slice, syntheticHistory, type Range } from "@/lib/series";
import { eur, pct, shortDate, signedEur } from "@/lib/format";

export const AI_CHIPS = ["How much should I save for retirement?", "Is my portfolio balanced?", "What is the Pension Depot?"];

export function HomeScreen() {
  const { total, contracts, broker, reset, state } = useStore();
  const { go } = useRouter();
  const [range, setRange] = useState<Range>("1Y");
  const [scrub, setScrub] = useState<number | null>(null);
  const [hint, setHint] = useState(true);
  const [toast, setToast] = useState<string | null>(null);
  const [soon, setSoon] = useState<string | null>(null);
  const press = useRef<ReturnType<typeof setTimeout> | null>(null);

  const series = useMemo(() => slice(syntheticHistory("cockpit", total, 0.064, 0.07), range), [total, range]);
  const i = scrub ?? series.values.length - 1;
  const value = series.values[i];
  const diff = value - series.values[0];

  // Versteckter Demo-Reset: Logo 1,2 s gedrückt halten
  const startPress = () => {
    press.current = setTimeout(() => {
      haptic(40);
      reset();
      setHint(true);
      setToast("Demo reset");
      setTimeout(() => setToast(null), 1600);
    }, 1200);
  };
  const endPress = () => press.current && clearTimeout(press.current);

  const items = [
    ...contracts.map((c) => ({ id: c.id, name: c.name, sub: c.subtitle, value: c.value, to: `/products/${c.product}` })),
    {
      id: "broker",
      name: "Allianz Invest Broker",
      sub: `${Object.keys(state.positions).length} funds${state.plans.length ? ` · ${state.plans.length} savings plan${state.plans.length > 1 ? "s" : ""}` : ""}`,
      value: broker.value,
      to: "/broker",
    },
  ];

  return (
    <Screen>
      <div className="flex items-center justify-between pt-[max(env(safe-area-inset-top),14px)]">
        <button
          onPointerDown={startPress}
          onPointerUp={endPress}
          onPointerLeave={endPress}
          onContextMenu={(e) => e.preventDefault()}
          className="select-none [-webkit-touch-callout:none]"
          aria-label="Allianz Invest"
        >
          <Logo className="text-[17px]" />
        </button>
        <IconButton label="Open chat" onClick={() => go("/chat")}>
          <MessageCircle size={20} />
        </IconButton>
      </div>

      <section className="mt-6 px-1">
        <p className="text-[15px] text-muted">Value of your contracts</p>
        {scrub === null ? (
          <CountUp value={total} format={eur} className="headline block text-[42px] leading-tight font-bold tracking-tight" />
        ) : (
          <p className="headline tabular text-[42px] leading-tight font-bold tracking-tight">{eur(value)}</p>
        )}
        <p className="text-[15px]">
          <Delta value={diff} format={signedEur} /> <Delta value={(diff / series.values[0]) * 100} format={(n) => `(${pct(n)})`} />{" "}
          <span className="text-muted">{scrub !== null ? shortDate(series.dates[i]) : RANGE_LABEL[range]}</span>
        </p>
      </section>
      <div className="-mx-4 mt-2">
        <Chart series={series} onScrub={setScrub} height={150} />
      </div>
      <div className="mt-1">
        <RangeChips value={range} onChange={setRange} />
      </div>

      <AnimatePresence>
        {hint && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0, marginTop: 0 }}
            className="mt-6 overflow-hidden"
          >
            <Card onClick={() => go("/products/pension")} className="flex items-center gap-3 p-4">
              <span className="flex size-11 shrink-0 items-center justify-center rounded-full bg-orange-wash text-orange">
                <Gift size={20} />
              </span>
              <span className="flex-1">
                <span className="block text-[15px] font-semibold">Your government top-up for 2026 has arrived</span>
                <span className="block text-[13px] text-muted">See what the Pension Depot adds on top</span>
              </span>
              <button
                aria-label="Dismiss"
                onClick={(e) => {
                  e.stopPropagation();
                  setHint(false);
                }}
                className="p-1 text-faint"
              >
                <X size={18} />
              </button>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="mt-6 grid grid-cols-3 gap-3">
        {[
          { label: "Deposit", icon: ArrowDownToLine, onClick: () => setSoon("Deposit") },
          { label: "Withdraw", icon: ArrowUpFromLine, onClick: () => setSoon("Withdraw") },
          { label: "Savings plan", icon: Repeat, onClick: () => go("/broker") },
        ].map(({ label, icon: Icon, onClick }) => (
          <Card key={label} onClick={onClick} className="flex flex-col items-center gap-2 py-4">
            <span className="flex size-11 items-center justify-center rounded-full bg-blue-wash text-blue">
              <Icon size={20} />
            </span>
            <span className="text-[14px] font-semibold">{label}</span>
          </Card>
        ))}
      </div>

      <section className="mt-8">
        <SectionTitle>Your contracts</SectionTitle>
        <div className="space-y-3">
          {items.map((c, n) => (
            <motion.div key={c.id} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0, transition: { delay: 0.1 + n * 0.06 } }}>
              <Card onClick={() => go(c.to)} className="flex items-center gap-3 p-4">
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[16px] font-semibold">{c.name}</span>
                  <span className="block truncate text-[13px] text-muted">{c.sub}</span>
                </span>
                <span className="tabular text-[16px] font-bold">{eur(c.value)}</span>
                <ChevronRight size={18} className="text-faint" />
              </Card>
            </motion.div>
          ))}
        </div>
      </section>

      <section className="mt-8">
        <AskField onAsk={() => go("/chat")} />
      </section>

      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            role="status"
            className="absolute inset-x-6 bottom-28 z-30 rounded-full bg-blue-deep px-5 py-3 text-center text-[15px] font-semibold text-white shadow-float"
          >
            {toast}
          </motion.div>
        )}
      </AnimatePresence>

      <Sheet open={soon !== null} onClose={() => setSoon(null)}>
        <h2 className="headline text-[26px] font-bold">{soon}</h2>
        <p className="mt-2 text-[15px] text-muted">
          Choose a contract to {soon?.toLowerCase()} in the next build step. Free of charge, anytime, in the Allianz Invest Cockpit.
        </p>
        <button onClick={() => setSoon(null)} className="mt-6 h-14 w-full rounded-full bg-ink/[0.05] font-semibold">
          Close
        </button>
      </Sheet>
    </Screen>
  );
}

/** KI-Eingabefeld wie in Vision: Funkel-Icon, Mikro, Vorschlags-Chips */
export function AskField({ onAsk }: { onAsk: (q?: string) => void }) {
  return (
    <div>
      <button onClick={() => onAsk()} className="glass flex h-14 w-full items-center gap-3 rounded-full px-5 text-left">
        <Sparkles size={20} className="text-blue" />
        <span className="flex-1 text-[16px] text-faint">Ask me anything…</span>
        <Mic size={20} className="text-muted" />
      </button>
      <div className="no-scrollbar -mx-4 mt-3 flex gap-2 overflow-x-auto px-4">
        {AI_CHIPS.map((c) => (
          <button key={c} onClick={() => onAsk(c)} className="glass h-9 shrink-0 rounded-full px-4 text-[14px] font-medium text-blue-deep">
            {c}
          </button>
        ))}
      </div>
    </div>
  );
}
