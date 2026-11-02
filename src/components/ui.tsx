"use client";

import { animate, motion } from "motion/react";
import { Star } from "lucide-react";
import { useEffect, useId, useRef, type ButtonHTMLAttributes, type ReactNode } from "react";
import { cx } from "@/lib/cx";

/** Kurzes Vibrieren, wo unterstützt (Android). iOS ignoriert es still. */
export const haptic = (ms = 8) => {
  if (typeof navigator !== "undefined" && "vibrate" in navigator) navigator.vibrate(ms);
};

export function Card({ className, children, onClick }: { className?: string; children: ReactNode; onClick?: () => void }) {
  const Tag = onClick ? motion.button : motion.div;
  return (
    <Tag
      onClick={onClick}
      whileTap={onClick ? { scale: 0.985 } : undefined}
      className={cx("glass block w-full rounded-card text-left", className)}
    >
      {children}
    </Tag>
  );
}

type BtnProps = ButtonHTMLAttributes<HTMLButtonElement> & { variant?: "primary" | "secondary" | "info" | "ghost" };

export function Button({ variant = "primary", className, children, disabled, onClick, ...rest }: BtnProps) {
  const styles = {
    primary: "cta",
    secondary: "bg-card-solid text-ink ring-1 ring-inset ring-ink/15",
    info: "bg-blue text-white",
    ghost: "text-blue",
  }[variant];
  return (
    <motion.button
      whileTap={disabled ? undefined : { scale: 0.97 }}
      disabled={disabled}
      onClick={(e) => {
        haptic();
        onClick?.(e);
      }}
      className={cx(
        "flex h-14 items-center justify-center gap-2 rounded-full px-6 text-[17px] font-semibold transition-opacity disabled:opacity-35 disabled:shadow-none",
        styles,
        className,
      )}
      {...(rest as object)}
    >
      {children}
    </motion.button>
  );
}

export function IconButton({
  label,
  children,
  onClick,
  active,
  className,
}: {
  label: string;
  children: ReactNode;
  onClick?: () => void;
  active?: boolean;
  className?: string;
}) {
  return (
    <motion.button
      aria-label={label}
      aria-pressed={active}
      whileTap={{ scale: 0.9 }}
      onClick={() => {
        haptic();
        onClick?.();
      }}
      className={cx("glass flex size-11 items-center justify-center rounded-full text-ink", className)}
    >
      {children}
    </motion.button>
  );
}

/** Segment-Schalter wie in Vision (60/80/90 %, Defensive/Balanced/Dynamic) */
export function Segmented<T extends string>({
  options,
  value,
  onChange,
  className,
  size = "md",
}: {
  options: readonly T[] | { value: T; label: string }[];
  value: T;
  onChange: (v: T) => void;
  className?: string;
  size?: "sm" | "md";
}) {
  const id = useId();
  const items = (options as (T | { value: T; label: string })[]).map((o) =>
    typeof o === "string" ? { value: o, label: o } : o,
  );
  return (
    <div className={cx("flex rounded-full bg-ink/[0.05] p-1", className)}>
      {items.map((o) => (
        <button
          key={o.value}
          onClick={() => {
            haptic(5);
            onChange(o.value);
          }}
          className={cx(
            "relative flex-1 rounded-full font-semibold transition-colors",
            size === "sm" ? "h-8 px-3 text-[13px]" : "h-10 px-4 text-[15px]",
            value === o.value ? "text-ink" : "text-muted",
          )}
        >
          {value === o.value && (
            <motion.span
              layoutId={id}
              transition={{ type: "spring", stiffness: 500, damping: 38 }}
              className="absolute inset-0 rounded-full bg-card-solid shadow-[0_2px_8px_rgb(12_27_51/0.12)]"
            />
          )}
          <span className="relative">{o.label}</span>
        </button>
      ))}
    </div>
  );
}

export function Chip({
  children,
  active,
  onClick,
  className,
}: {
  children: ReactNode;
  active?: boolean;
  onClick?: () => void;
  className?: string;
}) {
  // Aktiven Chip in horizontalen Leisten sichtbar halten
  const ref = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    if (active) ref.current?.scrollIntoView({ inline: "center", block: "nearest", behavior: "smooth" });
  }, [active]);
  return (
    <motion.button
      ref={ref}
      whileTap={{ scale: 0.95 }}
      onClick={() => {
        haptic(5);
        onClick?.();
      }}
      className={cx(
        "h-9 shrink-0 rounded-full px-4 text-[14px] font-semibold whitespace-nowrap transition-colors",
        active ? "bg-blue-deep text-white" : "glass text-ink",
        className,
      )}
    >
      {children}
    </motion.button>
  );
}

export function Stars({ n, className }: { n: number; className?: string }) {
  return (
    <span className={cx("inline-flex gap-0.5", className)} aria-label={`${n} of 5 Morningstar stars`}>
      {Array.from({ length: 5 }, (_, i) => (
        <Star key={i} size={12} className={i < n ? "fill-orange text-orange" : "text-faint"} strokeWidth={2} />
      ))}
    </span>
  );
}

export function SectionTitle({ children, action, onAction }: { children: ReactNode; action?: string; onAction?: () => void }) {
  return (
    <div className="mb-3 flex items-end justify-between px-1">
      <h2 className="text-[20px] font-bold tracking-tight">{children}</h2>
      {action && (
        <button onClick={onAction} className="text-[15px] font-semibold text-blue">
          {action}
        </button>
      )}
    </div>
  );
}

/** Zahl zählt beim ersten Erscheinen hoch und gleitet bei Änderungen zum neuen Wert */
export function CountUp({ value, format, className }: { value: number; format: (n: number) => string; className?: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const last = useRef<number | null>(null);
  useEffect(() => {
    const from = last.current ?? value * 0.92;
    last.current = value;
    const ctrl = animate(from, value, {
      duration: 0.9,
      ease: [0.16, 1, 0.3, 1],
      onUpdate: (v) => {
        if (ref.current) ref.current.textContent = format(v);
      },
    });
    return () => ctrl.stop();
  }, [value, format]);
  return (
    <span ref={ref} className={cx("tabular", className)}>
      {format(value)}
    </span>
  );
}

export function Delta({ value, format, className }: { value: number; format: (n: number) => string; className?: string }) {
  return (
    <span className={cx("tabular font-semibold", value >= 0 ? "text-positive" : "text-negative", className)}>
      {format(value)}
    </span>
  );
}

export function Placeholder({ className }: { className?: string }) {
  return <span className={cx("text-[12px] text-faint", className)}>Indicative figures, for illustration only.</span>;
}
