"use client";

import { AnimatePresence, motion } from "motion/react";
import { Bell, BellRing, CalendarDays, FileText, Info, Newspaper, ShieldCheck, Star } from "lucide-react";
import { useMemo, useState } from "react";
import { Screen } from "@/components/shell";
import { Chart, RangeChips } from "@/components/chart";
import { Button, Card, Chip, Delta, IconButton, Placeholder, Segmented, Stars } from "@/components/ui";
import { DeltaBadge, FundAvatar } from "@/components/fund-bits";
import { Bars } from "@/components/viz";
import { BuySheet, SellSheet } from "./trade";
import { useStore } from "@/lib/store";
import { AS_OF, RANGE_LABEL, fundHistory, slice, type Range } from "@/lib/series";
import { eur, num, pct, percent, shortDate, signedEur } from "@/lib/format";
import { hash, rng } from "@/lib/random";
import type { Fund } from "@/lib/types";
import { cx } from "@/lib/cx";

type TabName = "Overview" | "Key figures" | "Feed";

export function FundScreen({ id }: { id: string }) {
  const { fund, state, toggle } = useStore();
  const f = fund(id);
  const [tab, setTab] = useState<TabName>("Overview");
  const [sheet, setSheet] = useState<"buy" | "sell" | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  if (!f) return <Screen back title="Fund">Fund not found.</Screen>;

  const watching = state.watchlist.includes(id);
  const alerting = state.alerts.includes(id);
  const owned = Boolean(state.positions[id]);

  const flash = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast((t) => (t === msg ? null : t)), 1800);
  };

  return (
    <Screen
      back
      bottomPad={false}
      actions={
        <>
          <IconButton
            label={alerting ? "Remove price alert" : "Set price alert"}
            active={alerting}
            onClick={() => {
              toggle("alerts", id);
              flash(alerting ? "Price alert removed" : `We’ll notify you on moves of ±${percent(5, 0)}`);
            }}
          >
            {alerting ? <BellRing size={20} className="text-blue" /> : <Bell size={20} />}
          </IconButton>
          <IconButton
            label={watching ? "Remove from watchlist" : "Add to watchlist"}
            active={watching}
            onClick={() => {
              toggle("watchlist", id);
              flash(watching ? "Removed from watchlist" : "Added to watchlist");
            }}
          >
            <motion.span key={String(watching)} initial={{ scale: 0.6 }} animate={{ scale: 1 }}>
              <Star size={20} className={watching ? "fill-orange text-orange" : ""} />
            </motion.span>
          </IconButton>
        </>
      }
      footer={
        <div className="glass absolute inset-x-0 bottom-0 z-20 flex gap-3 rounded-t-[28px] px-4 pt-3 pb-[max(env(safe-area-inset-bottom),16px)]">
          <Button variant="secondary" className="flex-1" disabled={!owned} onClick={() => setSheet("sell")}>
            Sell
          </Button>
          <Button className="flex-1" onClick={() => setSheet("buy")}>
            Buy
          </Button>
        </div>
      }
    >
      <div className="pb-36">
        <div className="flex items-start gap-3 px-1 pt-2">
          <FundAvatar fund={f} size={52} />
          <div className="min-w-0">
            <h1 className="text-[24px] leading-tight font-bold tracking-tight">{f.name}</h1>
            <p className="mt-1 flex flex-wrap items-center gap-x-2 text-[14px] text-muted">
              <span>{f.provider === "PIMCO" ? "PIMCO" : "Allianz Global Investors"}</span>·<span>{f.assetClass}</span>
              <Stars n={f.facts.stars} />
            </p>
          </div>
        </div>

        <Segmented
          className="mt-5"
          options={["Overview", "Key figures", "Feed"] as const}
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
          >
            {tab === "Overview" && <Overview f={f} />}
            {tab === "Key figures" && <KeyFigures f={f} />}
            {tab === "Feed" && <Feed f={f} />}
          </motion.div>
        </AnimatePresence>
      </div>

      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            role="status"
            className="absolute inset-x-6 bottom-28 z-30 rounded-full bg-blue-deep px-5 py-3 text-center text-[15px] font-semibold text-white shadow-float"
          >
            {toast}
          </motion.div>
        )}
      </AnimatePresence>

      <BuySheet fund={f} open={sheet === "buy"} onClose={() => setSheet(null)} />
      <SellSheet fund={f} open={sheet === "sell"} onClose={() => setSheet(null)} />
    </Screen>
  );
}

function Overview({ f }: { f: Fund }) {
  const { state, positionValue } = useStore();
  const [range, setRange] = useState<Range>("1Y");
  const [bench, setBench] = useState(false);
  const [scrub, setScrub] = useState<number | null>(null);

  const series = useMemo(() => slice(fundHistory({ ...f, price: f.facts.price }), range), [f, range]);
  const i = scrub ?? series.values.length - 1;
  const value = series.values[i];
  const diff = value - series.values[0];
  const rel = (value / series.values[0] - 1) * 100;
  const benchRel = series.compare ? (series.compare[i] / series.compare[0] - 1) * 100 : 0;

  const pos = state.positions[f.id];
  const posValue = positionValue(f.id);
  const plans = state.plans.filter((p) => p.fundId === f.id);

  return (
    <div className="mt-5 space-y-5">
      <div className="px-1">
        <p className="tabular text-[38px] leading-none font-bold tracking-tight">{eur(value)}</p>
        <p className="mt-2 text-[15px]">
          <Delta value={diff} format={signedEur} /> <Delta value={rel} format={(n) => `(${pct(n)})`} />{" "}
          <span className="text-muted">{scrub !== null ? shortDate(series.dates[i]) : RANGE_LABEL[range]}</span>
        </p>
        {bench && (
          <p className="mt-0.5 text-[13px] text-muted">
            Benchmark <span className="tabular font-semibold">{pct(benchRel)}</span>
          </p>
        )}
      </div>

      <div className="-mx-4">
        <Chart series={series} showCompare={bench} onScrub={setScrub} height={210} />
      </div>
      <RangeChips value={range} onChange={setRange} />
      <div className="flex items-center gap-2">
        <Chip active={bench} onClick={() => setBench((b) => !b)}>
          {bench ? "Hide benchmark" : "Compare with benchmark"}
        </Chip>
        {bench && <span className="h-0 w-6 border-t-2 border-dashed border-faint" aria-hidden />}
      </div>

      <Card className="flex items-center justify-between gap-4 p-5">
        <div>
          <p className="text-[15px] font-semibold">Beats its benchmark</p>
          <p className="text-[13px] text-muted">Per year, over the last 5 years</p>
        </div>
        <DeltaBadge value={f.delta5y} size="lg" />
      </Card>

      {pos && (
        <Card className="p-5">
          <p className="text-[13px] font-semibold tracking-wide text-muted uppercase">Your position</p>
          <div className="mt-2 flex items-end justify-between">
            <p className="tabular text-[26px] font-bold">{eur(posValue)}</p>
            <Delta value={posValue - pos.invested} format={signedEur} className="text-[15px]" />
          </div>
          <p className="tabular mt-1 text-[13px] text-muted">
            {num(pos.units, 3)} units · invested {eur(pos.invested)}
          </p>
          {plans.map((p) => (
            <p key={p.id} className="mt-3 flex items-center gap-2 rounded-xl bg-blue-wash px-3 py-2 text-[14px] text-blue-deep">
              <CalendarDays size={16} /> Savings plan: {eur(p.amount)} {p.rhythm.toLowerCase()}, from {shortDate(p.start)}
            </p>
          ))}
        </Card>
      )}

      <div className="flex gap-3 rounded-2xl bg-blue-wash p-4 text-blue-deep">
        <ShieldCheck size={20} className="mt-0.5 shrink-0" />
        <p className="text-[14px]">
          Part of our selection: rated {f.facts.stars} stars by Morningstar and ahead of its benchmark over five years.
        </p>
      </div>
      <p className="px-1 text-[12px] text-faint">
        Past performance is not a reliable indicator of future results. Prices and charts are indicative.
      </p>
    </div>
  );
}

function KeyFigures({ f }: { f: Fund }) {
  const x = f.facts;
  const rows: [string, string][] = [
    ["Ongoing charges", `${percent(x.ter)} p. a.`],
    ["Entry charge", eur(0)],
    ["Fund size", x.aumEurM >= 1000 ? `€${num(x.aumEurM / 1000, 1)} bn` : `€${num(x.aumEurM, 0)} m`],
    ["Launch date", shortDate(Date.parse(x.launch))],
    ["Use of income", x.distribution],
    ["ISIN", x.isin],
  ];
  return (
    <div className="mt-5 space-y-5">
      <Card className="p-5">
        <p className="text-[15px] font-semibold">Risk class</p>
        <div className="mt-3 flex gap-1.5">
          {Array.from({ length: 7 }, (_, i) => (
            <motion.span
              key={i}
              initial={{ scaleY: 0.3, opacity: 0 }}
              animate={{ scaleY: 1, opacity: 1 }}
              transition={{ delay: i * 0.04 }}
              className={cx(
                "flex h-10 flex-1 items-center justify-center rounded-xl text-[15px] font-bold",
                i + 1 === x.srri ? "bg-blue-deep text-white" : "bg-ink/[0.05] text-faint",
              )}
            >
              {i + 1}
            </motion.span>
          ))}
        </div>
        <div className="mt-2 flex justify-between text-[12px] text-muted">
          <span>Lower risk</span>
          <span>Higher risk</span>
        </div>
      </Card>

      <Card className="divide-y divide-line px-5">
        {rows.map(([k, v]) => (
          <div key={k} className="flex justify-between gap-4 py-3.5 text-[15px]">
            <span className="text-muted">{k}</span>
            <span className="tabular text-right font-semibold">{v}</span>
          </div>
        ))}
      </Card>

      <Bars title="Top holdings" items={x.holdings} />
      <Bars title="Countries" items={x.countries} />
      <Bars title={f.assetClass === "Multi Asset" ? "Asset allocation" : "Sectors"} items={x.sectors} />
      {x.placeholder && <Placeholder className="block px-1" />}
    </div>
  );
}


// Feed: fiktive Meldungen, deterministisch je Fonds
const NEWS: Record<string, string[]> = {
  Bonds: [
    "Fund managers add duration as central banks signal further cuts",
    "Quarterly outlook: why income is back in fixed income",
    "Credit spreads tighten; the fund keeps a quality bias",
    "Portfolio update: higher allocation to securitised credit",
  ],
  Equity: [
    "Earnings season: portfolio holdings beat expectations",
    "Manager commentary: quality growth remains the core",
    "Fund trims technology after strong rally",
    "Outlook: broader market leadership expected next year",
  ],
  "Multi Asset": [
    "Allocation shifts slightly towards equities",
    "Risk overlay reduced volatility during the October sell-off",
    "Quarterly review: diversification paid off",
    "Manager commentary: balancing income and growth",
  ],
};

function Feed({ f }: { f: Fund }) {
  const items = useMemo(() => {
    const r = rng(hash(f.id + ":feed"));
    const day = 86_400_000;
    const news = NEWS[f.assetClass].map((title, i) => ({
      kind: "news" as const,
      title,
      source: ["Allianz GI Insights", "PIMCO Perspectives", "Morningstar", "Fund factsheet"][Math.floor(r() * 4)],
      at: AS_OF - Math.floor((i * 9 + r() * 6) * day),
    }));
    const events = [
      { kind: "event" as const, title: "Monthly factsheet published", source: "Documents", at: AS_OF - 2 * day },
      { kind: "event" as const, title: `Morningstar rating confirmed: ${f.facts.stars} stars`, source: "Morningstar", at: AS_OF - 23 * day },
      ...(f.facts.distribution === "Distributing"
        ? [{ kind: "event" as const, title: `Distribution of ${eur(f.facts.price * 0.012)} per unit`, source: "Ex-date", at: AS_OF - 16 * day }]
        : []),
    ];
    return [...news, ...events].sort((a, b) => b.at - a.at);
  }, [f]);

  return (
    <div className="mt-5 space-y-3">
      <Card className="flex items-center gap-3 p-4">
        <CalendarDays className="shrink-0 text-blue" />
        <div>
          <p className="text-[15px] font-semibold">Next event</p>
          <p className="text-[14px] text-muted">Quarterly report · {shortDate(AS_OF + 18 * 86_400_000)}</p>
        </div>
      </Card>
      {items.map((it, i) => (
        <motion.div key={i} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0, transition: { delay: i * 0.04 } }}>
          <Card className="flex gap-3 p-4">
            <span
              className={cx(
                "flex size-10 shrink-0 items-center justify-center rounded-full",
                it.kind === "news" ? "bg-blue-wash text-blue" : "bg-orange-wash text-orange",
              )}
            >
              {it.kind === "news" ? <Newspaper size={18} /> : it.source === "Documents" ? <FileText size={18} /> : <Info size={18} />}
            </span>
            <div className="min-w-0">
              <p className="text-[15px] leading-snug font-semibold">{it.title}</p>
              <p className="mt-1 text-[13px] text-muted">
                {it.source} · {shortDate(it.at)}
              </p>
            </div>
          </Card>
        </motion.div>
      ))}
      <p className="px-1 text-[12px] text-faint">Sample feed for illustration.</p>
    </div>
  );
}
