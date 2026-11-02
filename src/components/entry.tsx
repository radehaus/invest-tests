"use client";

import { AnimatePresence, motion } from "motion/react";
import { ArrowRight, Lock } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { prefetchVault, unlock } from "@/lib/vault";
import type { BrokerData } from "@/lib/types";
import { Logo } from "./logo";
import { haptic } from "./ui";

/** Passwortsperre im Vision-Look. Lädt den verschlüsselten Block schon beim Anzeigen. */
export function PasswordGate({ onUnlock }: { onUnlock: (d: BrokerData) => void }) {
  const [pw, setPw] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(false);
  const input = useRef<HTMLInputElement>(null);

  useEffect(() => {
    prefetchVault().catch(() => {});
    input.current?.focus();
  }, []);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!pw.trim() || busy) return;
    setBusy(true);
    try {
      onUnlock(await unlock(pw));
    } catch {
      haptic(40);
      setError(true);
      setPw("");
      setBusy(false);
      input.current?.focus();
    }
  }

  return (
    <motion.div className="hero flex h-full flex-col px-7 pt-[18%]" exit={{ opacity: 0 }} transition={{ duration: 0.4 }}>
      <Logo light className="h-[20px]" />
      <h1 className="mt-auto text-[40px] leading-[1.05] font-bold tracking-tight">
        <span className="text-white/55">A preview.</span>
        <br />
        For invited guests.
      </h1>
      <p className="mt-4 text-[16px] text-white/75">Please enter the password you received with the invitation.</p>

      <motion.form
        onSubmit={submit}
        animate={error ? { x: [0, -10, 10, -6, 6, 0] } : {}}
        transition={{ duration: 0.4 }}
        className="glass-dark mt-8 mb-[max(env(safe-area-inset-bottom),28px)] flex h-16 items-center gap-3 rounded-full pr-2 pl-5"
      >
        <Lock size={20} className="shrink-0 text-white/70" />
        <input
          ref={input}
          type="password"
          autoComplete="current-password"
          placeholder="Password"
          aria-label="Password"
          aria-invalid={error}
          value={pw}
          onChange={(e) => {
            setPw(e.target.value);
            setError(false);
          }}
          className="min-w-0 flex-1 bg-transparent text-white outline-none placeholder:text-white/50"
        />
        <motion.button
          whileTap={{ scale: 0.92 }}
          type="submit"
          aria-label="Unlock"
          disabled={busy}
          className="cta flex size-12 shrink-0 items-center justify-center rounded-full"
        >
          {busy ? (
            <motion.span
              className="size-5 rounded-full border-2 border-white/40 border-t-white"
              animate={{ rotate: 360 }}
              transition={{ repeat: Infinity, duration: 0.7, ease: "linear" }}
            />
          ) : (
            <ArrowRight size={22} />
          )}
        </motion.button>
      </motion.form>
      <AnimatePresence>
        {error && (
          <motion.p
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            role="alert"
            className="absolute inset-x-0 bottom-[max(env(safe-area-inset-bottom),8px)] text-center text-[14px] text-white/80"
          >
            That password did not work. Please try again.
          </motion.p>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

/** Kurzer Splash mit Logo nach dem Entsperren, dann direkt ins Cockpit. */
export function Splash({ onDone }: { onDone: () => void }) {
  useEffect(() => {
    const t = setTimeout(onDone, 1100);
    return () => clearTimeout(t);
  }, [onDone]);

  return (
    <motion.div
      className="ambient flex h-full items-center justify-center"
      exit={{ opacity: 0, scale: 1.04 }}
      transition={{ duration: 0.35 }}
    >
      <motion.div initial={{ opacity: 0, scale: 0.92 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}>
        <Logo className="h-[30px]" />
      </motion.div>
    </motion.div>
  );
}
