"use client";

import { motion } from "motion/react";
import { Check } from "lucide-react";
import { useEffect, useRef, useState, type ReactNode } from "react";
import type { Weight } from "@/lib/types";
import { eur0, percent } from "@/lib/format";
import { cx } from "@/lib/cx";
import { Card, haptic } from "./ui";

// Visualisierungen im Vision-Stil: Balken, Donut, Slider, Prognose mit drei Szenarien, Checkliste.

export function Bars({ title, items }: { title: string; items: Weight[] }) {
  const max = Math.max(...items.map((i) => i.weight), 1);
  return (
    <Card className="p-5">
      <p className="mb-3 text-[15px] font-semibold">{title}</p>
      <div className="space-y-3">
        {items.map((it, i) => (
          <div key={it.name}>
            <div className="flex justify-between text-[14px]">
              <span className="truncate pr-3">{it.name}</span>
              <span className="tabular font-semibold">{percent(it.weight, 1)}</span>
            </div>
            <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-ink/[0.05]">
              <motion.div
                className="h-full rounded-full bg-[linear-gradient(90deg,var(--blue-light),var(--blue))]"
                initial={{ width: 0 }}
                animate={{ width: `${(it.weight / max) * 100}%` }}
                transition={{ delay: 0.05 * i, duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
              />
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}

/** Donut wie in Vision: Blau = Sicherheit/Anleihen, Orange = Rendite/Aktien. Animiert bei Änderungen. */
export function Donut({
  parts,
  size = 132,
  center,
}: {
  parts: { value: number; color: string }[];
  size?: number;
  center?: ReactNode;
}) {
  const stroke = size * 0.14;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const total = parts.reduce((a, p) => a + p.value, 0) || 1;
  const gap = 3;
  // Startpunkt jedes Segments = Summe der vorherigen
  const offsets = parts.map((_, i) => parts.slice(0, i).reduce((a, p) => a + (p.value / total) * c, 0));
  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgb(12 27 51 / 0.05)" strokeWidth={stroke} />
        {parts.map((p, i) => {
          const len = Math.max(0, (p.value / total) * c - gap);
          return (
            <motion.circle
              key={i}
              cx={size / 2}
              cy={size / 2}
              r={r}
              fill="none"
              stroke={p.color}
              strokeWidth={stroke}
              strokeLinecap="round"
              initial={false}
              animate={{ strokeDasharray: `${len} ${c - len}`, strokeDashoffset: -offsets[i] }}
              transition={{ type: "spring", stiffness: 120, damping: 20 }}
            />
          );
        })}
      </svg>
      {center && <div className="absolute inset-0 flex flex-col items-center justify-center text-center">{center}</div>}
    </div>
  );
}

export function Legend({ items }: { items: { label: string; value: ReactNode; color: string; note?: string }[] }) {
  return (
    <div className="min-w-0 flex-1 space-y-3">
      {items.map((it) => (
        <div key={it.label} className="flex gap-2.5">
          <span className="mt-1.5 size-2.5 shrink-0 rounded-full" style={{ background: it.color }} />
          <div className="min-w-0">
            <p className="text-[14px] text-muted">{it.label}</p>
            <p className="tabular text-[17px] font-bold">{it.value}</p>
            {it.note && <p className="text-[12px] text-muted">{it.note}</p>}
          </div>
        </div>
      ))}
    </div>
  );
}

/** Slider mit Wertefeld, große Daumenfläche */
export function Slider({
  label,
  value,
  min,
  max,
  step = 1,
  format,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  format: (n: number) => string;
  onChange: (n: number) => void;
}) {
  const pctPos = ((value - min) / (max - min)) * 100;
  return (
    <div>
      <div className="mb-2 flex items-baseline justify-between">
        <span className="text-[15px] font-semibold">{label}</span>
        <span className="tabular rounded-full bg-blue-wash px-3 py-1 text-[15px] font-bold text-blue-deep">{format(value)}</span>
      </div>
      {/* Spur und Daumen gezeichnet, darüber der unsichtbare native Regler (Touch, Tastatur, Screenreader).
          Pseudo-Elemente wie ::-webkit-slider-thumb überleben den Turbopack-CSS-Build nicht. */}
      <div className="relative h-8">
        <div className="absolute inset-x-0 top-1/2 h-1.5 -translate-y-1/2 overflow-hidden rounded-full bg-ink/[0.08]">
          <div className="h-full rounded-full bg-blue" style={{ width: `${pctPos}%` }} />
        </div>
        <div
          className="pointer-events-none absolute top-1/2 size-7 -translate-x-1/2 -translate-y-1/2 rounded-full bg-white shadow-[0_2px_10px_rgb(12_27_51/0.25),inset_0_0_0_1px_rgb(12_27_51/0.06)]"
          style={{ left: `calc(14px + (100% - 28px) * ${pctPos / 100})` }}
        />
        <input
          type="range"
          aria-label={label}
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={(e) => {
            haptic(2);
            onChange(Number(e.target.value));
          }}
          className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
        />
      </div>
      <div className="flex justify-between text-[12px] text-faint">
        <span>{format(min)}</span>
        <span>{format(max)}</span>
      </div>
    </div>
  );
}

const SCENARIOS = [
  { key: "good", label: "Favourable", color: "var(--positive)" },
  { key: "mid", label: "Medium", color: "var(--blue)" },
  { key: "bad", label: "Unfavourable", color: "var(--berry)" },
] as const;

/** Prognose wie im Vision-Simulator: drei Szenarien, Beiträge gestrichelt, Wert-Badges am Ende */
export function ScenarioChart({
  data,
  startYear,
  endYear,
}: {
  data: { good: number[]; mid: number[]; bad: number[]; contributions: number[]; years: number };
  startYear: number;
  /** Beschriftung rechts, z. B. das Jahr des Garantiedatums; sonst Startjahr plus Laufzeit */
  endYear?: number;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(0);
  useEffect(() => {
    const ro = new ResizeObserver(([e]) => setWidth(e.contentRect.width));
    ro.observe(ref.current!);
    return () => ro.disconnect();
  }, []);

  const h = 170;
  const max = Math.max(...data.good) * 1.05;
  const n = data.years;
  const x = (i: number) => (i / n) * (width - 4) + 2;
  const y = (v: number) => 8 + (1 - v / max) * (h - 16);
  const line = (arr: number[]) => arr.map((v, i) => `${i ? "L" : "M"}${x(i).toFixed(1)},${y(v).toFixed(1)}`).join("");

  return (
    <div>
      <div ref={ref} style={{ height: h }}>
        {width > 0 && (
          <svg width={width} height={h}>
            <motion.path
              d={line(data.contributions)}
              fill="none"
              stroke="var(--ink-faint)"
              strokeWidth={1.5}
              strokeDasharray="4 4"
              initial={false}
              animate={{ d: line(data.contributions) }}
            />
            {SCENARIOS.map((s) => (
              <motion.path
                key={s.key}
                fill="none"
                stroke={s.color}
                strokeWidth={2.5}
                strokeLinecap="round"
                initial={{ pathLength: 0, d: line(data[s.key]) }}
                animate={{ pathLength: 1, d: line(data[s.key]) }}
                transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
              />
            ))}
          </svg>
        )}
      </div>
      <div className="mt-1 flex justify-between text-[12px] text-faint">
        <span>Today</span>
        <span>{endYear ?? startYear + n}</span>
      </div>
      <div className="mt-4 grid grid-cols-2 gap-2">
        {SCENARIOS.map((s) => (
          <div key={s.key} className="rounded-2xl bg-card-solid p-3">
            <p className="flex items-center gap-1.5 text-[12px] font-semibold" style={{ color: s.color }}>
              <span className="size-2 rounded-full" style={{ background: s.color }} /> {s.label}
            </p>
            <p className="tabular text-[17px] font-bold">{eur0(data[s.key][n])}</p>
          </div>
        ))}
        <div className="rounded-2xl bg-card-solid p-3">
          <p className="text-[12px] font-semibold text-muted">Your contributions</p>
          <p className="tabular text-[17px] font-bold text-muted">{eur0(data.contributions[n])}</p>
        </div>
      </div>
    </div>
  );
}

/** Checkliste mit blauen Haken wie in Vision */
export function Checklist({ items, className }: { items: string[]; className?: string }) {
  return (
    <div className={cx("space-y-3", className)}>
      {items.map((it) => (
        <p key={it} className="flex items-start gap-3 text-[15px]">
          <span className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full bg-blue text-white">
            <Check size={12} strokeWidth={3} />
          </span>
          {it}
        </p>
      ))}
    </div>
  );
}
