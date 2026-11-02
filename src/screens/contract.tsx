"use client";

import { AnimatePresence, motion } from "motion/react";
import { ArrowDownLeft, ArrowUpRight, FileText, Percent, Repeat, RefreshCw, Settings2, Phone, type LucideIcon } from "lucide-react";
import { useMemo, useState, type ReactNode } from "react";
import { Screen } from "@/components/shell";
import { Chart, RangeChips } from "@/components/chart";
import { Card, Chip, CountUp, Delta, IconButton, Segmented, haptic } from "@/components/ui";
import { Sheet } from "@/components/sheet";
import { CONTRACT_RANGES, CONTRACT_RANGE_LABEL, sliceContract, type ContractRange } from "@/lib/contract-series";
import { AS_OF } from "@/lib/series";
import { eur, pct, shortDate, signedEur } from "@/lib/format";
import { useStore, type DemoEvent } from "@/lib/store";
import { cx } from "@/lib/cx";
import { LifeScreen } from "./contract-life";
import { WealthScreen } from "./contract-wealth";
import { BrokerContractScreen } from "./contract-broker";

// Detailseiten der Kundenverträge (Anforderungen 5.3): /home/life, /home/wealth, /home/broker

export function ContractScreen({ id }: { id: string }) {
  if (id === "life") return <LifeScreen />;
  if (id === "wealth") return <WealthScreen />;
  if (id === "broker") return <BrokerContractScreen />;
  return <Screen back>Contract not found.</Screen>;
}

export type Tab = "Overview" | "Holdings" | "Activity" | "Documents";
export type Action = { label: string; icon: LucideIcon; onClick: () => void; primary?: boolean };

/** Gemeinsames Gerüst: Kopf, Wert, Kurve mit Einzahlungen, Aktionen, Tabs */
export function ContractLayout({
  title,
  subtitle,
  value,
  paidIn,
  history,
  hline,
  chartToggles,
  actions,
  tabs,
}: {
  title: string;
  subtitle: string;
  value: number;
  paidIn: number;
  history: { dates: number[]; values: number[]; deposits: number[] };
  hline?: { value: number; label: string };
  chartToggles?: ReactNode;
  actions: Action[];
  tabs: Record<Tab, ReactNode>;
}) {
  const [range, setRange] = useState<ContractRange>("1Y");
  const [scrub, setScrub] = useState<number | null>(null);
  const [tab, setTab] = useState<Tab>("Overview");
  const series = useMemo(() => sliceContract(history, range), [history, range]);

  const i = scrub ?? series.values.length - 1;
  const shown = scrub === null ? value : series.values[i];
  const deposits = scrub === null ? paidIn : series.compare![i];
  const gain = shown - deposits;

  return (
    <Screen
      back
      title={title}
      actions={
        <IconButton label="Documents" onClick={() => setTab("Documents")}>
          <FileText size={20} />
        </IconButton>
      }
    >
      <p className="px-1 text-[14px] text-muted">{subtitle}</p>
      <div className="mt-2 px-1">
        {scrub === null ? (
          <CountUp value={value} format={eur} className="headline block text-[40px] leading-tight font-bold tracking-tight" />
        ) : (
          <p className="headline tabular text-[40px] leading-tight font-bold tracking-tight">{eur(shown)}</p>
        )}
        <p className="text-[15px]">
          <Delta value={gain} format={signedEur} /> <Delta value={(gain / deposits) * 100} format={(n) => `(${pct(n)})`} />{" "}
          <span className="text-muted">{scrub !== null ? `on ${shortDate(series.dates[i])}` : "on your payments"}</span>
        </p>
        <p className="mt-0.5 flex items-center gap-2 text-[13px] text-muted">
          <span className="w-5 border-t-2 border-dashed border-faint" aria-hidden /> Payments {eur(deposits)}
        </p>
      </div>

      <div className="-mx-4 mt-2">
        <Chart series={series} showCompare onScrub={setScrub} height={180} hline={hline} />
      </div>
      <RangeChips ranges={CONTRACT_RANGES} value={range} onChange={setRange} />
      {chartToggles && <div className="mt-3 flex gap-2">{chartToggles}</div>}
      {scrub === null && <span className="sr-only">{CONTRACT_RANGE_LABEL[range]}</span>}

      <div className="mt-6 grid grid-cols-4 gap-2">
        {actions.map((a) => (
          <motion.button
            key={a.label}
            whileTap={{ scale: 0.92 }}
            onClick={() => {
              haptic();
              a.onClick();
            }}
            className="flex flex-col items-center gap-1.5"
          >
            <span className={cx("flex size-14 items-center justify-center rounded-full", a.primary ? "cta" : "glass text-blue-deep")}>
              <a.icon size={22} />
            </span>
            <span className={cx("text-[13px] font-semibold", a.primary && "text-orange")}>{a.label}</span>
          </motion.button>
        ))}
      </div>

      <Segmented
        className="mt-6"
        size="sm"
        options={["Overview", "Holdings", "Activity", "Documents"] as const}
        value={tab}
        onChange={setTab}
      />
      <AnimatePresence mode="wait" initial={false}>
        <motion.div
          key={tab}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.18 }}
          className="mt-5 space-y-4"
        >
          {tabs[tab]}
        </motion.div>
      </AnimatePresence>
    </Screen>
  );
}

/** Zuschaltbare Linie im Chart, z. B. "Guaranteed" */
export function ChartToggle({ active, onClick, children }: { active: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <Chip active={active} onClick={onClick} className="h-8 text-[13px]">
      {children}
    </Chip>
  );
}

// --- Aktivität ------------------------------------------------------------------------------------

export type ActivityItem = { id: string; title: string; sub?: string; amount?: number; sign?: 1 | -1; at: number; icon: LucideIcon; demo?: boolean };

const EVENT_ICON: Record<DemoEvent["kind"], LucideIcon> = {
  deposit: ArrowDownLeft,
  withdraw: ArrowUpRight,
  change: Settings2,
  plan: Repeat,
  callback: Phone,
};

/** Eigene Demo-Aktionen eines Vertrags als Aktivität */
export function useDemoActivity(contractId: string): ActivityItem[] {
  const { state } = useStore();
  return state.events
    .filter((e) => e.contractId === contractId)
    .map((e) => ({
      id: e.id,
      title: e.title,
      amount: e.amount,
      sign: e.kind === "withdraw" ? -1 : 1,
      at: e.at,
      icon: EVENT_ICON[e.kind],
      demo: true,
    }));
}

/** Fiktive Historie der letzten 12 Monate: Monatsbeiträge, Zinsgutschriften, Umschichtungen */
export function historyActivity(opts: { monthly: number; interest?: number; rebalancing?: boolean }): ActivityItem[] {
  const out: ActivityItem[] = [];
  const d = new Date(AS_OF);
  for (let m = 0; m < 12; m++) {
    const at = Date.UTC(d.getUTCFullYear(), d.getUTCMonth() - m, 1);
    out.push({ id: `c${m}`, title: "Monthly contribution", sub: "Direct debit", amount: opts.monthly, sign: 1, at, icon: ArrowDownLeft });
    const month = new Date(at).getUTCMonth();
    if (opts.interest && month % 3 === 0)
      out.push({ id: `i${m}`, title: "Interest credited", sub: "Safety part", amount: opts.interest, sign: 1, at: at + 86_400_000 * 2, icon: Percent });
    if (opts.rebalancing && month % 3 === 1)
      out.push({ id: `r${m}`, title: "Portfolio rebalanced", sub: "Back to target allocation", at: at + 86_400_000 * 5, icon: RefreshCw });
  }
  return out;
}

const isToday = (ts: number) => new Date(ts).toDateString() === new Date().toDateString();

export function ActivityList({ items }: { items: ActivityItem[] }) {
  const sorted = [...items].sort((a, b) => Number(Boolean(b.demo)) - Number(Boolean(a.demo)) || b.at - a.at);
  return (
    <Card className="divide-y divide-line px-4">
      {sorted.length === 0 && <p className="py-5 text-center text-[15px] text-muted">No activity yet.</p>}
      {sorted.map((it) => (
        <div key={it.id} className="flex items-center gap-3 py-3.5">
          <span className={cx("flex size-10 shrink-0 items-center justify-center rounded-full", it.demo ? "bg-orange-wash text-orange" : "bg-blue-wash text-blue")}>
            <it.icon size={18} />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-[15px] leading-snug font-semibold">{it.title}</span>
            <span className="block text-[13px] text-muted">
              {it.demo && isToday(it.at) ? "Today" : shortDate(it.at)}
              {it.sub ? ` · ${it.sub}` : ""}
            </span>
          </span>
          {it.amount !== undefined && (
            <span className={cx("tabular text-[15px] font-semibold", it.sign === -1 ? "text-ink" : "text-positive")}>
              {it.sign === -1 ? "−" : "+"}
              {eur(it.amount)}
            </span>
          )}
        </div>
      ))}
    </Card>
  );
}

// --- Dokumente ------------------------------------------------------------------------------------

export function Documents({ docs }: { docs: { title: string; date: string; size: string }[] }) {
  const [open, setOpen] = useState<(typeof docs)[number] | null>(null);
  return (
    <>
      <Card className="divide-y divide-line px-4">
        {docs.map((d) => (
          <button key={d.title} onClick={() => setOpen(d)} className="flex w-full items-center gap-3 py-3.5 text-left">
            <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-blue-wash text-blue">
              <FileText size={18} />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-[15px] font-semibold">{d.title}</span>
              <span className="block text-[13px] text-muted">
                PDF · {d.size} · {d.date}
              </span>
            </span>
          </button>
        ))}
      </Card>
      <Sheet open={open !== null} onClose={() => setOpen(null)}>
        {open && (
          <div>
            <p className="text-[20px] font-bold">{open.title}</p>
            <p className="text-[13px] text-muted">
              PDF · {open.size} · {open.date}
            </p>
            {/* Angedeutete Dokumentseite */}
            <div className="mt-5 rounded-2xl bg-card-solid p-5 shadow-card">
              <div className="mb-4 h-3 w-24 rounded bg-blue-deep/80" />
              {[90, 75, 82, 60, 88, 70, 40].map((w, i) => (
                <div key={i} className="mb-2.5 h-2 rounded bg-ink/[0.07]" style={{ width: `${w}%` }} />
              ))}
              <div className="mt-5 h-16 rounded-xl bg-blue-wash" />
            </div>
            <p className="mt-4 text-center text-[13px] text-muted">Sample document for the demo.</p>
          </div>
        )}
      </Sheet>
    </>
  );
}

export const docDate = (monthsAgo: number) => {
  const d = new Date(AS_OF);
  return shortDate(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() - monthsAgo, 3));
};
