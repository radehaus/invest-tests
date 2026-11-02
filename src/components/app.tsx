"use client";

import { AnimatePresence, motion } from "motion/react";
import { useEffect, useState } from "react";
import { cached, resume } from "@/lib/vault";
import type { BrokerData } from "@/lib/types";
import { RouterProvider } from "@/lib/router";
import { StoreProvider } from "@/lib/store";
import { PasswordGate, SplashLogin } from "./entry";
import { Shell } from "./shell";

type Phase = "boot" | "locked" | "login" | "app";
const LOGGED_IN = "ai-logged-in";

export function App() {
  const [phase, setPhase] = useState<Phase>("boot");
  const [data, setData] = useState<BrokerData | null>(null);

  useEffect(() => {
    let alive = true;
    (async () => {
      // 1. Sitzung: Daten liegen schon entschlüsselt vor (kein Krypto)
      // 2. Früherer Besuch: gemerkter Schlüssel (AES, ~1 ms, kein PBKDF2)
      // 3. Sonst Passwort
      const d = cached() ?? (await resume());
      if (!alive) return;
      setData(d);
      setPhase(!d ? "locked" : sessionStorage.getItem(LOGGED_IN) ? "app" : "login");
    })();
    return () => {
      alive = false;
    };
  }, []);

  return (
    <AnimatePresence mode="wait">
      {phase === "boot" && <motion.div key="boot" className="h-full" exit={{ opacity: 0 }} />}
      {phase === "locked" && (
        <PasswordGate
          key="locked"
          onUnlock={(d) => {
            setData(d);
            setPhase("login");
          }}
        />
      )}
      {phase === "login" && (
        <SplashLogin
          key="login"
          onDone={() => {
            sessionStorage.setItem(LOGGED_IN, "1");
            setPhase("app");
          }}
        />
      )}
      {phase === "app" && data && (
        <motion.div key="app" className="h-full" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
          <RouterProvider>
            <StoreProvider data={data}>
              <Shell
                onLogout={() => {
                  sessionStorage.removeItem(LOGGED_IN);
                  setPhase("login");
                }}
                onLock={() => {
                  sessionStorage.removeItem(LOGGED_IN);
                  setData(null);
                  setPhase("locked");
                }}
              />
            </StoreProvider>
          </RouterProvider>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
