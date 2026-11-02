"use client";

import { AnimatePresence, motion } from "motion/react";
import { ArrowRight, Lock, ScanFace } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { prefetchVault, unlock } from "@/lib/vault";
import type { BrokerData } from "@/lib/types";
import persona from "@/data/persona.json";
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
      <Logo light className="text-[20px]" />
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

/** Splash mit Logo, dann Login mit angedeuteter Face-ID. Ein Tap genügt. */
export function SplashLogin({ onDone }: { onDone: () => void }) {
  const [stage, setStage] = useState<"splash" | "login" | "scanning" | "ok">("splash");

  useEffect(() => {
    const t = setTimeout(() => setStage("login"), 1300);
    return () => clearTimeout(t);
  }, []);

  function scan() {
    if (stage !== "login") return;
    haptic();
    setStage("scanning");
    setTimeout(() => {
      haptic(20);
      setStage("ok");
    }, 1100);
    setTimeout(onDone, 1700);
  }

  return (
    <motion.div className="ambient relative flex h-full flex-col items-center" exit={{ opacity: 0, scale: 1.04 }} transition={{ duration: 0.35 }}>
      <motion.div
        layout
        className={stage === "splash" ? "flex flex-1 items-center" : "pt-[22%]"}
        transition={{ type: "spring", stiffness: 200, damping: 28 }}
      >
        <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.6 }}>
          <Logo className="text-[28px]" />
        </motion.div>
      </motion.div>

      <AnimatePresence>
        {stage !== "splash" && (
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-1 flex-col items-center px-8 pb-[max(env(safe-area-inset-bottom),32px)]"
          >
            <p className="mt-16 text-[17px] text-muted">Welcome back,</p>
            <h1 className="headline text-[40px] font-bold tracking-tight">{persona.firstName}</h1>

            <button onClick={scan} aria-label="Log in with Face ID" className="relative mt-auto mb-10 size-36">
              <motion.span
                className="absolute inset-0 rounded-[36px] border-2 border-blue/25"
                animate={stage === "login" ? { scale: [1, 1.08, 1], opacity: [0.6, 0.2, 0.6] } : { scale: 1, opacity: 0 }}
                transition={{ repeat: stage === "login" ? Infinity : 0, duration: 2 }}
              />
              <span className="glass absolute inset-3 flex items-center justify-center overflow-hidden rounded-[30px]">
                {stage === "ok" ? (
                  <motion.svg viewBox="0 0 48 48" className="size-14 text-positive" initial={{ scale: 0.6 }} animate={{ scale: 1 }}>
                    <motion.path
                      d="M12 25 L21 34 L37 15"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth={4.5}
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      initial={{ pathLength: 0 }}
                      animate={{ pathLength: 1 }}
                      transition={{ duration: 0.35 }}
                    />
                  </motion.svg>
                ) : (
                  <ScanFace size={56} strokeWidth={1.4} className="text-blue" />
                )}
                {stage === "scanning" && (
                  <motion.span
                    className="absolute inset-x-3 h-0.5 rounded-full bg-blue shadow-[0_0_14px_var(--blue)]"
                    initial={{ top: "15%" }}
                    animate={{ top: ["15%", "85%", "15%"] }}
                    transition={{ duration: 1.1, ease: "easeInOut" }}
                  />
                )}
              </span>
            </button>
            <p className="text-[15px] font-medium text-muted">
              {stage === "login" ? "Tap to log in with Face ID" : stage === "scanning" ? "Scanning…" : "Welcome back"}
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
