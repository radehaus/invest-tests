"use client";

import { motion } from "motion/react";
import { ChevronRight } from "lucide-react";
import type { ReactNode } from "react";
import { fundHistory, slice, type Range } from "@/lib/series";
import type { Fund } from "@/lib/types";
import { pct, pp } from "@/lib/format";
import { cx } from "@/lib/cx";
import { haptic } from "./ui";

export const FILTERS = [
  { id: "all", label: "All" },
  { id: "pimco", label: "PIMCO" },
  { id: "agi", label: "Allianz GI" },
  { id: "bonds", label: "Bonds" },
  { id: "equity", label: "Equity" },
  { id: "multi", label: "Multi Asset" },
  { id: "em", label: "Emerging Markets" },
  { id: "esg", label: "ESG" },
] as const;
export type FilterId = (typeof FILTERS)[number]["id"];

export function matches(f: Fund, filter: string) {
  switch (filter) {
    case "pimco":
      return f.provider === "PIMCO";
    case "agi":
      return f.provider === "Allianz GI";
    case "bonds":
      return f.assetClass === "Bonds";
    case "equity":
      return f.assetClass === "Equity";
    case "multi":
      return f.assetClass === "Multi Asset";
    case "em":
      return f.emerging;
    case "esg":
      return f.esg;
    default:
      return true;
  }
}

/** Kursveränderung in % über einen Zeitraum (Platzhalter-Kurse) */
export function change(f: Fund, range: Range) {
  const s = slice(fundHistory({ ...f, price: f.facts.price }), range);
  return (s.values[s.values.length - 1] / s.values[0] - 1) * 100;
}

export const shortName = (f: Fund) => f.name.replace(/^Allianz /, "").replace(/^PIMCO /, "");

export function FundAvatar({ fund, size = 44 }: { fund: Fund; size?: number }) {
  const pimco = fund.provider === "PIMCO";
  return (
    <span
      className={cx(
        "flex shrink-0 items-center justify-center rounded-full font-bold text-white",
        pimco ? "bg-blue-deep" : "bg-[linear-gradient(135deg,var(--blue-light),var(--blue))]",
      )}
      style={{ width: size, height: size, fontSize: size * 0.3 }}
      aria-hidden
    >
      {pimco ? "PI" : "AGI"}
    </span>
  );
}

export function DeltaBadge({ value, size = "sm" }: { value: number; size?: "sm" | "lg" }) {
  return (
    <span
      className={cx(
        "tabular inline-flex items-center rounded-full bg-positive-wash font-bold text-positive",
        size === "lg" ? "h-9 px-3.5 text-[17px]" : "h-7 px-2.5 text-[13px]",
      )}
    >
      {pp(value)}
    </span>
  );
}

export function FundRow({
  fund,
  right,
  sub,
  onClick,
}: {
  fund: Fund;
  right?: ReactNode;
  sub?: ReactNode;
  onClick: () => void;
}) {
  return (
    <motion.button
      whileTap={{ scale: 0.985, backgroundColor: "rgb(12 27 51 / 0.03)" }}
      onClick={() => {
        haptic(5);
        onClick();
      }}
      className="flex w-full items-center gap-3 rounded-2xl px-2 py-2.5 text-left"
    >
      <FundAvatar fund={fund} />
      <span className="min-w-0 flex-1">
        <span className="line-clamp-2 block text-[16px] leading-snug font-semibold">{fund.name}</span>
        <span className="block truncate text-[13px] text-muted">{sub ?? `${fund.provider} · ${fund.assetClass}`}</span>
      </span>
      {right ?? <ChevronRight size={18} className="text-faint" />}
    </motion.button>
  );
}

export function ChangeText({ value }: { value: number }) {
  return <span className={cx("tabular text-[13px] font-semibold", value >= 0 ? "text-positive" : "text-negative")}>{pct(value)}</span>;
}
