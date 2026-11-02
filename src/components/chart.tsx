"use client";

import { motion } from "motion/react";
import { useEffect, useId, useMemo, useRef, useState } from "react";
import { RANGES, type Range, type Series } from "@/lib/series";
import { cx } from "@/lib/cx";
import { haptic } from "./ui";

type Props = {
  series: Series;
  height?: number;
  showCompare?: boolean;
  /** Index beim Scrubben, null beim Loslassen */
  onScrub?: (i: number | null) => void;
  tone?: "blue" | "light";
};

/** Linienchart mit Verlauf, Scrubbing per Finger und optionaler Vergleichslinie (Benchmark) */
export function Chart({ series, height = 200, showCompare, onScrub, tone = "blue" }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(0);
  const [scrub, setScrub] = useState<number | null>(null);
  const gid = useId();

  useEffect(() => {
    const el = ref.current!;
    const ro = new ResizeObserver(([e]) => setWidth(e.contentRect.width));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const geo = useMemo(() => {
    const { values, compare } = series;
    const all = showCompare && compare ? [...values, ...compare] : values;
    let min = Math.min(...all);
    let max = Math.max(...all);
    const pad = (max - min) * 0.12 || 1;
    min -= pad;
    max += pad;
    const top = 16;
    const h = height - top - 8;
    const x = (i: number) => (i / (values.length - 1)) * width;
    const y = (v: number) => top + (1 - (v - min) / (max - min)) * h;
    const line = (arr: number[]) => arr.map((v, i) => `${i ? "L" : "M"}${x(i).toFixed(1)},${y(v).toFixed(1)}`).join("");
    const main = line(values);
    return {
      x,
      y,
      main,
      area: `${main}L${width},${height}L0,${height}Z`,
      compare: showCompare && compare ? line(compare) : null,
    };
  }, [series, width, height, showCompare]);

  const stroke = tone === "light" ? "#ffffff" : "var(--blue)";

  function pick(clientX: number) {
    const rect = ref.current!.getBoundingClientRect();
    const t = Math.min(1, Math.max(0, (clientX - rect.left) / rect.width));
    const i = Math.round(t * (series.values.length - 1));
    if (i !== scrub) {
      setScrub(i);
      onScrub?.(i);
      haptic(3);
    }
  }
  function end() {
    setScrub(null);
    onScrub?.(null);
  }

  return (
    <div
      ref={ref}
      className="relative touch-pan-y select-none"
      style={{ height }}
      onPointerDown={(e) => {
        (e.target as Element).setPointerCapture?.(e.pointerId);
        pick(e.clientX);
      }}
      onPointerMove={(e) => (e.buttons || e.pointerType === "touch") && scrub !== null && pick(e.clientX)}
      onPointerUp={end}
      onPointerCancel={end}
      onPointerLeave={(e) => e.pointerType === "mouse" && end()}
    >
      {width > 0 && (
        <svg width={width} height={height} className="overflow-visible">
          <defs>
            <linearGradient id={gid} x1="0" x2="0" y1="0" y2="1">
              <stop offset="0%" stopColor={stroke} stopOpacity={tone === "light" ? 0.25 : 0.18} />
              <stop offset="100%" stopColor={stroke} stopOpacity={0} />
            </linearGradient>
          </defs>
          <motion.path
            key={geo.area}
            d={geo.area}
            fill={`url(#${gid})`}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5 }}
          />
          {geo.compare && (
            <motion.path
              d={geo.compare}
              fill="none"
              stroke="var(--ink-faint)"
              strokeWidth={1.5}
              strokeDasharray="4 4"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
            />
          )}
          <motion.path
            key={geo.main}
            d={geo.main}
            fill="none"
            stroke={stroke}
            strokeWidth={2.25}
            strokeLinejoin="round"
            strokeLinecap="round"
            initial={{ pathLength: 0 }}
            animate={{ pathLength: 1 }}
            transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
          />
          {scrub !== null && (
            <g>
              <line
                x1={geo.x(scrub)}
                x2={geo.x(scrub)}
                y1={0}
                y2={height}
                stroke={tone === "light" ? "rgb(255 255 255 / 0.5)" : "var(--ink-faint)"}
                strokeWidth={1}
              />
              {geo.compare && series.compare && (
                <circle cx={geo.x(scrub)} cy={geo.y(series.compare[scrub])} r={4} fill="var(--ink-faint)" />
              )}
              <circle cx={geo.x(scrub)} cy={geo.y(series.values[scrub])} r={6} fill={stroke} stroke="#fff" strokeWidth={2.5} />
            </g>
          )}
        </svg>
      )}
    </div>
  );
}

export function RangeChips({
  value,
  onChange,
  light,
}: {
  value: Range;
  onChange: (r: Range) => void;
  light?: boolean;
}) {
  return (
    <div className="flex justify-between gap-1">
      {RANGES.map((r) => (
        <button
          key={r}
          onClick={() => {
            haptic(5);
            onChange(r);
          }}
          className={cx(
            "relative h-9 flex-1 rounded-full text-[14px] font-semibold transition-colors",
            value === r ? (light ? "text-blue-deep" : "text-white") : light ? "text-white/70" : "text-muted",
          )}
        >
          {value === r && (
            <motion.span
              layoutId={light ? "range-light" : "range"}
              transition={{ type: "spring", stiffness: 500, damping: 38 }}
              className={cx("absolute inset-0 rounded-full", light ? "bg-white" : "bg-blue-deep")}
            />
          )}
          <span className="relative">{r}</span>
        </button>
      ))}
    </div>
  );
}
