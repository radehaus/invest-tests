"use client";

import { AnimatePresence, motion } from "motion/react";
import { CalendarDays, ChevronLeft } from "lucide-react";
import type { ReactNode } from "react";
import { SuccessCheck, inputAsEur } from "./sheet";
import { Button, Segmented, haptic } from "./ui";
import { AS_OF } from "@/lib/series";
import { shortDate } from "@/lib/format";
import { cx } from "@/lib/cx";

// Gemeinsame Bausteine für Flows in Bottom Sheets (Kaufen, Verkaufen, Sparplan, später Ein- und Auszahlen).

export type Rhythm = "Monthly" | "Quarterly";
export type StartDay = 1 | 15;

/** Erste Ausführung: im Folgemonat des Demo-Stichtags am 1. oder 15. */
export const firstExecution = (day: StartDay) => {
  const d = new Date(AS_OF);
  return Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, day);
};

/** Schritt-Container mit seitlichem Schieben zwischen den Schritten */
export function Steps({ step, dir, children }: { step: string; dir: number; children: ReactNode }) {
  return (
    <AnimatePresence mode="popLayout" initial={false} custom={dir}>
      <motion.div
        key={step}
        custom={dir}
        initial={{ x: dir > 0 ? 60 : -60, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        exit={{ x: dir > 0 ? -60 : 60, opacity: 0 }}
        transition={{ type: "spring", stiffness: 420, damping: 38 }}
      >
        {children}
      </motion.div>
    </AnimatePresence>
  );
}

/** Kopf eines Schritts: links Zurück oder ein Icon, daneben Titel und Untertitel */
export function StepHeader({
  title,
  subtitle,
  icon,
  onBack,
}: {
  title: string;
  subtitle?: string;
  icon?: ReactNode;
  onBack?: () => void;
}) {
  return (
    <div className="mb-5 flex items-center gap-3">
      {onBack ? (
        <button onClick={onBack} aria-label="Back" className="flex size-10 shrink-0 items-center justify-center rounded-full bg-ink/[0.05]">
          <ChevronLeft size={22} />
        </button>
      ) : (
        icon
      )}
      <div className="min-w-0">
        <p className="text-[20px] leading-tight font-bold">{title}</p>
        {subtitle && <p className="truncate text-[13px] text-muted">{subtitle}</p>}
      </div>
    </div>
  );
}

export function AmountDisplay({ value, hint, error }: { value: string; hint: string; error?: boolean }) {
  return (
    <div className="py-4 text-center">
      <motion.p
        key={value}
        initial={{ scale: 0.97 }}
        animate={{ scale: 1 }}
        className={cx("tabular text-[52px] leading-none font-bold tracking-tight", !value && "text-faint")}
      >
        {inputAsEur(value)}
      </motion.p>
      <p className={cx("mt-2 text-[14px]", error ? "text-negative" : "text-muted")}>{hint}</p>
    </div>
  );
}

export function ReviewRows({ rows }: { rows: [string, ReactNode][] }) {
  return (
    <div className="divide-y divide-line rounded-2xl bg-card-solid px-4">
      {rows.map(([k, v]) => (
        <div key={k} className="flex justify-between gap-4 py-3 text-[15px]">
          <span className="text-muted">{k}</span>
          <span className="tabular text-right font-semibold">{v}</span>
        </div>
      ))}
    </div>
  );
}

/** Rhythmus und erste Ausführung eines Sparplans */
export function ScheduleFields({
  rhythm,
  onRhythm,
  startDay,
  onStartDay,
}: {
  rhythm: Rhythm;
  onRhythm: (r: Rhythm) => void;
  startDay: StartDay;
  onStartDay: (d: StartDay) => void;
}) {
  return (
    <>
      <p className="mb-2 text-[15px] font-semibold">Rhythm</p>
      <Segmented options={["Monthly", "Quarterly"] as const} value={rhythm} onChange={onRhythm} />
      <p className="mt-6 mb-2 text-[15px] font-semibold">First execution</p>
      <div className="grid grid-cols-2 gap-3">
        {([1, 15] as const).map((d) => (
          <motion.button
            key={d}
            whileTap={{ scale: 0.97 }}
            onClick={() => {
              haptic(5);
              onStartDay(d);
            }}
            className={cx("rounded-2xl p-4 text-left transition-colors", startDay === d ? "bg-blue-deep text-white" : "glass")}
          >
            <CalendarDays size={20} className={startDay === d ? "text-white/80" : "text-blue"} />
            <span className="mt-2 block text-[16px] font-semibold">{shortDate(firstExecution(d))}</span>
            <span className={cx("text-[13px]", startDay === d ? "text-white/70" : "text-muted")}>
              then every {d === 1 ? "1st" : "15th"}
            </span>
          </motion.button>
        ))}
      </div>
    </>
  );
}

export function Done({ title, text, onClose }: { title: string; text: ReactNode; onClose: () => void }) {
  return (
    <div className="flex flex-col items-center pt-6 pb-2 text-center">
      <SuccessCheck />
      <motion.h2
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0, transition: { delay: 0.5 } }}
        className="headline mt-6 text-[28px] font-bold tracking-tight"
      >
        {title}
      </motion.h2>
      <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1, transition: { delay: 0.65 } }} className="mt-2 text-[15px] text-muted">
        {text}
      </motion.p>
      <Button className="mt-8 w-full" onClick={onClose}>
        Done
      </Button>
    </div>
  );
}
