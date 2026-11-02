"use client";

import { AnimatePresence, motion } from "motion/react";
import { Check, Search, Star, Users, X } from "lucide-react";
import { useMemo, useState } from "react";
import { Screen } from "@/components/shell";
import { Card, Chip, CountUp, SectionTitle, Segmented, haptic } from "@/components/ui";
import { Sheet } from "@/components/sheet";
import { ChangeText, DeltaBadge, FILTERS, FundAvatar, FundRow, change, shortName } from "@/components/fund-bits";
import { useRouter } from "@/lib/router";
import { useStore } from "@/lib/store";
import { eur, eur0, num, pct, signedEur } from "@/lib/format";
import type { AssetClass } from "@/lib/types";

export function BrokerScreen() {
  const { data, state, fund, broker, positionValue } = useStore();
  const { go } = useRouter();
  const [query, setQuery] = useState("");
  const [cls, setCls] = useState<AssetClass>("Bonds");
  const [funnelOpen, setFunnelOpen] = useState(false);

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [];
    return data.funds.filter((f) =>
      [f.name, f.provider, f.assetClass, f.facts.isin, f.esg ? "esg sustainable" : "", f.emerging ? "emerging markets" : ""]
        .join(" ")
        .toLowerCase()
        .includes(q),
    );
  }, [query, data.funds]);

  const top = useMemo(
    () => data.funds.filter((f) => f.assetClass === cls).sort((a, b) => b.delta5y - a.delta5y).slice(0, 5),
    [cls, data.funds],
  );
  const open = (id: string) => go(`/broker/fund/${id}`);
  const held = Object.keys(state.positions);
  const gainPct = broker.invested ? (broker.gain / broker.invested) * 100 : 0;

  return (
    <Screen>
      <div className="pt-[max(env(safe-area-inset-top),18px)]">
        <h1 className="headline px-1 text-[34px] font-bold tracking-tight">Broker</h1>
        <p className="px-1 text-[15px] text-muted">
          {data.funnel.selected} selected funds from PIMCO and Allianz Global Investors
        </p>

        {/* Suche */}
        <label className="glass mt-4 flex h-12 items-center gap-2 rounded-full px-4">
          <Search size={18} className="text-muted" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search funds, providers, ISIN"
            aria-label="Search funds"
            className="min-w-0 flex-1 bg-transparent outline-none placeholder:text-faint"
          />
          {query && (
            <button aria-label="Clear search" onClick={() => setQuery("")}>
              <X size={18} className="text-muted" />
            </button>
          )}
        </label>
      </div>

      <AnimatePresence mode="wait" initial={false}>
        {query ? (
          <motion.div key="results" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="mt-4">
            <Card className="p-2">
              {results.length === 0 && <p className="p-4 text-center text-muted">No fund matches “{query}”.</p>}
              {results.map((f) => (
                <FundRow key={f.id} fund={f} onClick={() => open(f.id)} right={<DeltaBadge value={f.delta5y} />} />
              ))}
            </Card>
          </motion.div>
        ) : (
          <motion.div key="home" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="mt-5 space-y-7">
            {/* Portfolio */}
            <section className="hero relative overflow-hidden rounded-card p-5 shadow-float">
              <p className="text-[14px] text-white/70">Your broker portfolio</p>
              <CountUp value={broker.value} format={eur} className="mt-1 block text-[34px] font-bold tracking-tight" />
              {held.length > 0 ? (
                <p className="tabular text-[14px] font-semibold text-white/90">
                  {signedEur(broker.gain)} ({pct(gainPct)}) since purchase
                </p>
              ) : (
                <p className="text-[14px] text-white/80">Start with as little as {eur0(25)}. No entry charges.</p>
              )}
              {held.length > 0 && (
                <div className="mt-4 space-y-1">
                  {held.map((id) => {
                    const f = fund(id);
                    return (
                      <button
                        key={id}
                        onClick={() => open(id)}
                        className="glass-dark flex w-full items-center gap-3 rounded-2xl px-3 py-2.5 text-left"
                      >
                        <FundAvatar fund={f} size={34} />
                        <span className="min-w-0 flex-1 truncate text-[15px] font-semibold">{shortName(f)}</span>
                        <span className="tabular text-[15px] font-semibold">{eur(positionValue(id))}</span>
                      </button>
                    );
                  })}
                </div>
              )}
            </section>

            {/* Vertrauen: Auswahltrichter */}
            <FunnelCard onOpen={() => setFunnelOpen(true)} />

            {/* Filter */}
            <div className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4">
              {FILTERS.map((f) => (
                <Chip key={f.id} onClick={() => go(`/broker/funds/${f.id}`)}>
                  {f.label}
                </Chip>
              ))}
            </div>

            {/* Top outperformers */}
            <section>
              <SectionTitle action="See all" onAction={() => go("/broker/funds/all")}>
                Top outperformers
              </SectionTitle>
              <Segmented options={["Bonds", "Equity", "Multi Asset"] as const} value={cls} onChange={setCls} size="sm" />
              <Card className="mt-3 p-2">
                <AnimatePresence mode="popLayout" initial={false}>
                  {top.map((f, i) => (
                    <motion.div
                      key={f.id}
                      layout
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0, transition: { delay: i * 0.03 } }}
                      exit={{ opacity: 0 }}
                    >
                      <FundRow fund={f} onClick={() => open(f.id)} right={<DeltaBadge value={f.delta5y} />} />
                    </motion.div>
                  ))}
                </AnimatePresence>
                <p className="px-2 pt-1 pb-2 text-[12px] text-faint">Outperformance vs. benchmark, p. a. over 5 years.</p>
              </Card>
            </section>

            {/* Most bought */}
            <section>
              <SectionTitle>Most bought</SectionTitle>
              <div className="no-scrollbar -mx-4 flex gap-3 overflow-x-auto px-4 pb-1">
                {data.mostBought.map(({ id, investors }) => {
                  const f = fund(id);
                  return (
                    <Card key={id} onClick={() => open(id)} className="w-40 shrink-0 p-4">
                      <FundAvatar fund={f} size={36} />
                      <p className="mt-3 line-clamp-2 h-10 text-[15px] leading-5 font-semibold">{shortName(f)}</p>
                      <p className="mt-2 flex items-center gap-1 text-[12px] text-muted">
                        <Users size={12} /> {num(investors, 0)} investors
                      </p>
                      <div className="mt-1">
                        <ChangeText value={change(f, "1Y")} /> <span className="text-[12px] text-faint">1Y</span>
                      </div>
                    </Card>
                  );
                })}
              </div>
            </section>

            {/* Recommended */}
            <section>
              <SectionTitle>Recommended for you</SectionTitle>
              <div className="space-y-3">
                {data.recommended.map(({ id, reason }) => {
                  const f = fund(id);
                  return (
                    <Card key={id} onClick={() => open(id)} className="flex items-center gap-3 p-4">
                      <FundAvatar fund={f} />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-[16px] font-semibold">{f.name}</span>
                        <span className="block text-[13px] text-muted">{reason}</span>
                      </span>
                      <DeltaBadge value={f.delta5y} />
                    </Card>
                  );
                })}
              </div>
            </section>

            {/* Watchlist */}
            <section>
              <SectionTitle>Watchlist</SectionTitle>
              <Card className="p-2">
                {state.watchlist.length === 0 ? (
                  <p className="flex items-center gap-2 p-4 text-[15px] text-muted">
                    <Star size={16} /> Tap the star on any fund to follow it here.
                  </p>
                ) : (
                  state.watchlist.map((id) => {
                    const f = fund(id);
                    return (
                      <FundRow
                        key={id}
                        fund={f}
                        onClick={() => open(id)}
                        right={
                          <span className="text-right">
                            <span className="tabular block text-[15px] font-semibold">{eur(f.facts.price)}</span>
                            <ChangeText value={change(f, "1M")} />
                          </span>
                        }
                      />
                    );
                  })
                )}
              </Card>
            </section>
          </motion.div>
        )}
      </AnimatePresence>

      <FunnelSheet open={funnelOpen} onClose={() => setFunnelOpen(false)} />
    </Screen>
  );
}

/** "27 out of 100": Trichter animiert von 100 über 39 auf 27 */
function FunnelCard({ onOpen }: { onOpen: () => void }) {
  const { data } = useStore();
  const { screened, afterStars, selected } = data.funnel;
  const steps = [screened, afterStars, selected];
  return (
    <Card
      onClick={() => {
        haptic();
        onOpen();
      }}
      className="overflow-hidden p-5"
    >
      <p className="text-[13px] font-semibold tracking-wide text-muted uppercase">Our selection</p>
      <p className="mt-1 text-[26px] leading-tight font-bold tracking-tight">
        <CountUp value={selected} format={(n) => String(Math.round(n))} className="headline" /> out of {screened}
      </p>
      <p className="text-[15px] text-muted">funds made it into the Broker.</p>
      <div className="mt-4 space-y-1.5">
        {steps.map((n, i) => (
          <div key={i} className="flex items-center gap-3">
            <motion.div
              className="h-2.5 rounded-full"
              style={{ background: i === 2 ? "var(--orange)" : i === 1 ? "var(--blue)" : "var(--blue-light)" }}
              initial={{ width: "0%" }}
              whileInView={{ width: `${(n / screened) * 100}%` }}
              viewport={{ once: true }}
              transition={{ delay: 0.15 + i * 0.25, duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
            />
            <span className="tabular text-[13px] font-semibold text-muted">{n}</span>
          </div>
        ))}
      </div>
      <p className="mt-4 text-[15px] font-semibold text-blue">How we select →</p>
    </Card>
  );
}

function FunnelSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { data } = useStore();
  const { screened, afterStars, selected, pimco, agi } = data.funnel;
  const rows = [
    { n: screened, title: `${screened} funds screened`, text: "The full range of Allianz Global Investors and PIMCO funds available to private investors." },
    {
      n: afterStars,
      title: `Filter 1: Morningstar 4 to 5 stars`,
      text: `${screened - afterStars} funds removed. Only funds with a top Morningstar rating remain.`,
    },
    {
      n: selected,
      title: `Filter 2: Beats its benchmark over 5 years`,
      text: `${afterStars - selected} funds removed. Every remaining fund outperformed its benchmark after costs.`,
    },
  ];
  return (
    <Sheet open={open} onClose={onClose}>
      <h2 className="headline text-[28px] font-bold tracking-tight">How we select</h2>
      <p className="mt-1 text-[15px] text-muted">Two strict filters. No paid placements.</p>
      <ol className="mt-6 space-y-5">
        {rows.map((r, i) => (
          <motion.li
            key={i}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0, transition: { delay: 0.1 + i * 0.12 } }}
            className="flex gap-4"
          >
            <span className="tabular flex size-12 shrink-0 items-center justify-center rounded-full bg-blue-wash text-[17px] font-bold text-blue-deep">
              {r.n}
            </span>
            <span>
              <span className="block text-[16px] font-semibold">{r.title}</span>
              <span className="block text-[15px] text-muted">{r.text}</span>
            </span>
          </motion.li>
        ))}
      </ol>
      <div className="mt-6 flex items-center gap-3 rounded-2xl bg-orange-wash p-4">
        <Check className="shrink-0 text-orange" />
        <p className="text-[15px]">
          <b>{selected} funds selected:</b> {pimco} from PIMCO, {agi} from Allianz Global Investors.
        </p>
      </div>
      <p className="mt-3 text-[12px] text-faint">Source: FNZ Bank, Morningstar. Past performance is not a reliable indicator of future results.</p>
    </Sheet>
  );
}
