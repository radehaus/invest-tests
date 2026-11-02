"use client";

import { AnimatePresence, motion } from "motion/react";
import { useMemo, useState } from "react";
import { Screen } from "@/components/shell";
import { Card, Chip, Segmented } from "@/components/ui";
import { ChangeText, DeltaBadge, FILTERS, FundRow, change, matches } from "@/components/fund-bits";
import { useRouter } from "@/lib/router";
import { useStore } from "@/lib/store";
import { percent } from "@/lib/format";

type Sort = "vs. benchmark" | "1Y return" | "Costs";

/** Alle Fonds mit Filter-Chips und Sortierung */
export function FundListScreen({ filter = "all" }: { filter?: string }) {
  const { data } = useStore();
  const { go } = useRouter();
  const [active, setActive] = useState(filter);
  const [sort, setSort] = useState<Sort>("vs. benchmark");

  const list = useMemo(() => {
    const l = data.funds.filter((f) => matches(f, active));
    if (sort === "1Y return") return l.sort((a, b) => change(b, "1Y") - change(a, "1Y"));
    if (sort === "Costs") return l.sort((a, b) => a.facts.ter - b.facts.ter);
    return l.sort((a, b) => b.delta5y - a.delta5y);
  }, [data.funds, active, sort]);

  return (
    <Screen back title="All funds">
      <div className="no-scrollbar -mx-4 mt-1 flex gap-2 overflow-x-auto px-4 pb-1">
        {FILTERS.map((f) => (
          <Chip key={f.id} active={active === f.id} onClick={() => setActive(f.id)}>
            {f.label}
          </Chip>
        ))}
      </div>
      <Segmented
        className="mt-4"
        size="sm"
        options={["vs. benchmark", "1Y return", "Costs"] as const}
        value={sort}
        onChange={setSort}
      />
      <p className="mt-4 px-1 text-[13px] text-muted">
        {list.length} {list.length === 1 ? "fund" : "funds"}
      </p>
      <Card className="mt-2 p-2">
        <AnimatePresence initial={false} mode="popLayout">
          {list.map((f) => (
            <motion.div key={f.id} layout initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <FundRow
                fund={f}
                onClick={() => go(`/broker/fund/${f.id}`)}
                right={
                  sort === "vs. benchmark" ? (
                    <DeltaBadge value={f.delta5y} />
                  ) : sort === "1Y return" ? (
                    <ChangeText value={change(f, "1Y")} />
                  ) : (
                    <span className="tabular text-[13px] font-semibold text-muted">{percent(f.facts.ter)}</span>
                  )
                }
              />
            </motion.div>
          ))}
        </AnimatePresence>
      </Card>
    </Screen>
  );
}
