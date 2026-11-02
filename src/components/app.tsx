"use client";

import { AnimatePresence, motion } from "motion/react";
import { useCallback, useEffect, useState } from "react";
import { purgeLegacy } from "@/lib/vault";
import type { BrokerData } from "@/lib/types";
import { RouterProvider } from "@/lib/router";
import { StoreProvider } from "@/lib/store";
import { PasswordGate, Splash } from "./entry";
import { Shell } from "./shell";

type Phase = "boot" | "locked" | "splash" | "app";

export function App() {
  const [phase, setPhase] = useState<Phase>("boot");
  const [data, setData] = useState<BrokerData | null>(null);
  const enterApp = useCallback(() => setPhase("app"), []);

  // Passwort bei jedem Besuch (Anforderungen Abschnitt 7). Nur Altlasten früherer Versionen wegräumen.
  useEffect(() => {
    purgeLegacy();
    const t = setTimeout(() => setPhase("locked"), 0);
    return () => clearTimeout(t);
  }, []);

  return (
    <AnimatePresence mode="wait">
      {phase === "boot" && <motion.div key="boot" className="h-full" exit={{ opacity: 0 }} />}
      {phase === "locked" && (
        <PasswordGate
          key="locked"
          onUnlock={(d) => {
            setData(d);
            setPhase("splash");
          }}
        />
      )}
      {phase === "splash" && <Splash key="splash" onDone={enterApp} />}
      {phase === "app" && data && (
        <motion.div key="app" className="h-full" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
          <RouterProvider>
            <StoreProvider data={data}>
              <Shell
                onLogout={() => {
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
