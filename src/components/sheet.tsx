"use client";

import { AnimatePresence, animate, motion, useDragControls, useMotionValue, useTransform, type PanInfo } from "motion/react";
import { ChevronRight, Delete } from "lucide-react";
import { useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { cx } from "@/lib/cx";
import { haptic } from "./ui";
import { DECIMAL, eur } from "@/lib/format";

/** Bottom Sheet im Telefon-Rahmen. Schließt per Wischen nach unten oder Tap auf den Hintergrund. */
export function Sheet({
  open,
  onClose,
  children,
  className,
}: {
  open: boolean;
  onClose: () => void;
  children: ReactNode;
  className?: string;
}) {
  const drag = useDragControls();
  // Sheets erscheinen nur nach dem Entsperren, also immer im Browser
  const frame = typeof document === "undefined" ? null : document.getElementById("frame");
  if (!frame) return null;

  return createPortal(
    <AnimatePresence>
      {open && (
        <div className="absolute inset-0 z-50">
          <motion.div
            className="absolute inset-0 bg-blue-deep/35 backdrop-blur-[2px]"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />
          <motion.div
            role="dialog"
            aria-modal
            className={cx(
              "absolute inset-x-0 bottom-0 max-h-[92%] overflow-hidden rounded-t-sheet bg-bg shadow-float",
              className,
            )}
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", stiffness: 380, damping: 40 }}
            drag="y"
            dragControls={drag}
            dragListener={false}
            dragConstraints={{ top: 0, bottom: 0 }}
            dragElastic={{ top: 0.05, bottom: 0.6 }}
            onDragEnd={(_, info: PanInfo) => {
              if (info.offset.y > 120 || info.velocity.y > 600) onClose();
            }}
          >
            {/* Griff: nur hier lässt sich das Sheet ziehen, damit Scrollen und Tippen im Inhalt nicht kollidieren */}
            <div
              className="flex cursor-grab touch-none justify-center pt-2.5 pb-3"
              onPointerDown={(e) => drag.start(e)}
            >
              <span className="h-1.5 w-10 rounded-full bg-ink/15" />
            </div>
            <div className="max-h-[calc(92dvh-24px)] overflow-y-auto overscroll-contain px-5 pb-[max(env(safe-area-inset-bottom),20px)] md:max-h-[760px]">
              {children}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    frame,
  );
}

/** Großer Ziffernblock, ein Daumen. value ist ein String in Locale-Schreibweise, z. B. "250.5" */
export function Keypad({ value, onChange, max }: { value: string; onChange: (v: string) => void; max?: number }) {
  const press = (k: string) => {
    haptic(4);
    let next = value;
    if (k === "del") next = value.slice(0, -1);
    else if (k === DECIMAL) next = value.includes(DECIMAL) ? value : (value || "0") + DECIMAL;
    else {
      if (value.includes(DECIMAL) && value.split(DECIMAL)[1].length >= 2) return;
      next = value === "0" ? k : value + k;
    }
    if (next.replace(DECIMAL, "").length > 8) return;
    if (max !== undefined && parseAmount(next) > max) next = formatInput(max);
    onChange(next);
  };
  const keys = ["1", "2", "3", "4", "5", "6", "7", "8", "9", DECIMAL, "0", "del"];
  return (
    <div className="grid grid-cols-3 gap-1">
      {keys.map((k) => (
        <motion.button
          key={k}
          whileTap={{ scale: 0.9, backgroundColor: "rgb(12 27 51 / 0.06)" }}
          onClick={() => press(k)}
          aria-label={k === "del" ? "Delete" : k}
          className="flex h-14 items-center justify-center rounded-2xl text-[26px] font-medium text-ink"
        >
          {k === "del" ? <Delete size={24} /> : k}
        </motion.button>
      ))}
    </div>
  );
}

export const parseAmount = (s: string) => Number(s.replace(DECIMAL, ".")) || 0;
export const formatInput = (n: number) =>
  (Math.floor(n * 100) / 100).toFixed(2).replace(/\.00$/, "").replace(".", DECIMAL);
/** Betrag während der Eingabe, mit Währungszeichen an der richtigen Stelle */
export const inputAsEur = (s: string) => eur(1).replace(/1[.,]00/, s || "0");

/** Wischen zum Bestätigen. Wird nicht ausgelöst, wenn nicht ganz durchgezogen. */
export function SwipeToConfirm({ label, onConfirm }: { label: string; onConfirm: () => void }) {
  const [track, setTrack] = useState<HTMLDivElement | null>(null);
  const [done, setDone] = useState(false);
  const x = useMotionValue(0);
  const knob = 56;
  const max = track ? track.offsetWidth - knob - 8 : 240;
  const fade = useTransform(x, [0, max * 0.6], [1, 0]);
  const fill = useTransform(x, (v) => v + knob + 8);

  return (
    <div ref={setTrack} className="cta relative h-16 overflow-hidden rounded-full p-1">
      <motion.div className="absolute inset-y-0 left-0 rounded-full bg-white/18" style={{ width: fill }} />
      <motion.span
        style={{ opacity: fade }}
        className="pointer-events-none absolute inset-0 flex items-center justify-center pl-10 text-[17px] font-semibold"
      >
        {label}
      </motion.span>
      <motion.button
        aria-label={label}
        className="relative z-10 flex size-14 items-center justify-center rounded-full bg-white text-orange shadow-md"
        drag={done ? false : "x"}
        dragConstraints={{ left: 0, right: max }}
        dragElastic={0}
        dragMomentum={false}
        style={{ x }}
        onClick={() => {
          // Tastatur/Barrierefreiheit: Enter oder Tap bestätigt auch, mit kurzer Animation
          if (done) return;
          setDone(true);
          animate(x, max, { duration: 0.35 }).then(onConfirm);
        }}
        onDragEnd={() => {
          if (x.get() > max * 0.85) {
            setDone(true);
            haptic(20);
            animate(x, max, { duration: 0.15 }).then(onConfirm);
          } else animate(x, 0, { type: "spring", stiffness: 500, damping: 35 });
        }}
      >
        <ChevronRight size={26} strokeWidth={2.5} />
      </motion.button>
    </div>
  );
}

/** Haken, der sich zeichnet, mit kleinem Funkenkranz */
export function SuccessCheck() {
  return (
    <div className="relative mx-auto size-28">
      {Array.from({ length: 10 }, (_, i) => {
        const a = (i / 10) * Math.PI * 2;
        return (
          <motion.span
            key={i}
            className={cx("absolute top-1/2 left-1/2 size-2 rounded-full", i % 2 ? "bg-orange" : "bg-blue-light")}
            initial={{ x: -4, y: -4, opacity: 0, scale: 0.5 }}
            animate={{ x: Math.cos(a) * 70 - 4, y: Math.sin(a) * 70 - 4, opacity: [0, 1, 0], scale: 1 }}
            transition={{ delay: 0.35, duration: 0.8, ease: "easeOut" }}
          />
        );
      })}
      <motion.div
        className="absolute inset-0 rounded-full bg-positive"
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ type: "spring", stiffness: 300, damping: 18 }}
      />
      <svg viewBox="0 0 112 112" className="absolute inset-0">
        <motion.path
          d="M34 58 L50 73 L79 42"
          fill="none"
          stroke="#fff"
          strokeWidth={8}
          strokeLinecap="round"
          strokeLinejoin="round"
          initial={{ pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ delay: 0.25, duration: 0.4, ease: "easeOut" }}
        />
      </svg>
    </div>
  );
}
