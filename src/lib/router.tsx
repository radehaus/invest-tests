"use client";

import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";

// Hash-Router: funktioniert auf GitHub Pages ohne Server, Zurück-Taste des Browsers inklusive.
// Pfade: /home, /products, /broker, /broker/fund/<id>, /chat, /profile ...

export const TABS = ["home", "products", "broker", "chat", "profile"] as const;
export type Tab = (typeof TABS)[number];

const read = () => {
  const h = typeof window === "undefined" ? "" : window.location.hash.replace(/^#/, "");
  return h.startsWith("/") && h.length > 1 ? h : "/home";
};
const depth = (p: string) => p.split("/").filter(Boolean).length;
// Wie viele Schritte wir selbst in die Browser-Historie gelegt haben (für "Zurück")
let pushed = 0;

type Nav = {
  path: string;
  segments: string[];
  /** 1 = tiefer (von rechts rein), -1 = zurück, 0 = Tab-Wechsel */
  direction: number;
  go: (path: string) => void;
  back: () => void;
};

const Ctx = createContext<Nav | null>(null);

export function RouterProvider({ children }: { children: ReactNode }) {
  const [nav, setNav] = useState(() => ({ path: read(), direction: 0 }));

  useEffect(() => {
    const onHash = () =>
      setNav((prev) => {
        const next = read();
        const d = Math.sign(depth(next) - depth(prev.path));
        return { path: next, direction: d };
      });
    window.addEventListener("hashchange", onHash);
    return () => window.removeEventListener("hashchange", onHash);
  }, []);

  const go = useCallback((path: string) => {
    if (path === read()) return;
    pushed++;
    window.location.hash = path;
  }, []);

  const back = useCallback(() => {
    if (pushed > 0) {
      pushed--;
      window.history.back();
      return;
    }
    // Direkt auf eine tiefe Seite gekommen (Link, Reload): zur übergeordneten Seite
    const parent = read().split("/").slice(0, -1).join("/") || "/home";
    window.location.replace("#" + (TABS.includes(parent.slice(1) as Tab) || depth(parent) > 1 ? parent : "/home"));
  }, []);

  const value: Nav = { ...nav, segments: nav.path.split("/").filter(Boolean), go, back };
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useRouter() {
  const r = useContext(Ctx);
  if (!r) throw new Error("useRouter außerhalb von RouterProvider");
  return r;
}
