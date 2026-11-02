"use client";

import { AnimatePresence, motion } from "motion/react";
import { ChevronLeft, Home, LayoutGrid, MessageCircle, TrendingUp, User } from "lucide-react";
import type { ReactNode } from "react";
import { TABS, useRouter, type Tab } from "@/lib/router";
import { cx } from "@/lib/cx";
import { haptic } from "./ui";
import { HomeScreen } from "@/screens/home";
import { ProductsScreen, ProductDetailScreen } from "@/screens/products";
import { BrokerScreen } from "@/screens/broker";
import { FundListScreen } from "@/screens/fund-list";
import { FundScreen } from "@/screens/fund";
import { ChatScreen } from "@/screens/chat";
import { ProfileScreen } from "@/screens/profile";

const NAV: { tab: Tab; label: string; icon: typeof Home }[] = [
  { tab: "home", label: "Home", icon: Home },
  { tab: "products", label: "Products", icon: LayoutGrid },
  { tab: "broker", label: "Broker", icon: TrendingUp },
  { tab: "chat", label: "Chat", icon: MessageCircle },
  { tab: "profile", label: "Profile", icon: User },
];

function route(seg: string[], actions: { onLogout: () => void; onLock: () => void }): ReactNode {
  const [tab, a, b] = seg;
  switch (tab) {
    case "products":
      return a ? <ProductDetailScreen id={a} /> : <ProductsScreen />;
    case "broker":
      if (a === "fund" && b) return <FundScreen id={b} />;
      if (a === "funds") return <FundListScreen filter={b} />;
      return <BrokerScreen />;
    case "chat":
      return <ChatScreen />;
    case "profile":
      return <ProfileScreen {...actions} />;
    default:
      return <HomeScreen />;
  }
}

// Push von rechts, Pop nach rechts raus, Tab-Wechsel als kurzes Überblenden
const variants = {
  enter: (d: number) => ({ x: d > 0 ? "100%" : d < 0 ? "-28%" : 0, opacity: d === 0 ? 0 : 1, zIndex: d > 0 ? 2 : 0 }),
  center: { x: 0, opacity: 1, transition: { type: "spring" as const, stiffness: 380, damping: 40 } },
  exit: (d: number) => ({
    x: d > 0 ? "-28%" : d < 0 ? "100%" : 0,
    opacity: d === 0 ? 0 : 1,
    zIndex: d < 0 ? 2 : 0,
    transition: { type: "spring" as const, stiffness: 380, damping: 40 },
  }),
};

export function Shell(actions: { onLogout: () => void; onLock: () => void }) {
  const { path, segments, direction } = useRouter();
  const isRoot = segments.length <= 1;

  return (
    <div className="relative h-full overflow-hidden">
      <AnimatePresence initial={false} custom={direction}>
        <motion.div
          key={path}
          custom={direction}
          variants={variants}
          initial="enter"
          animate="center"
          exit="exit"
          transition={{ duration: direction === 0 ? 0.18 : undefined }}
          className="ambient absolute inset-0 shadow-[-12px_0_30px_-12px_rgb(12_27_51/0.2)]"
        >
          {route(segments, actions)}
        </motion.div>
      </AnimatePresence>
      <BottomNav visible={isRoot} current={(segments[0] as Tab) ?? "home"} />
    </div>
  );
}

function BottomNav({ visible, current }: { visible: boolean; current: Tab }) {
  const { go } = useRouter();
  return (
    <AnimatePresence>
      {visible && (
        <motion.nav
          initial={{ y: 120 }}
          animate={{ y: 0 }}
          exit={{ y: 120 }}
          transition={{ type: "spring", stiffness: 400, damping: 36 }}
          className="glass absolute inset-x-4 bottom-[max(env(safe-area-inset-bottom),14px)] z-30 flex h-[68px] items-center justify-around rounded-full px-2"
        >
          {NAV.map(({ tab, label, icon: Icon }) => {
            const active = current === tab && TABS.includes(current);
            return (
              <button
                key={tab}
                onClick={() => {
                  haptic(5);
                  go("/" + tab);
                }}
                aria-current={active ? "page" : undefined}
                className="relative flex h-14 flex-1 flex-col items-center justify-center gap-0.5"
              >
                {active && (
                  <motion.span
                    layoutId="nav-pill"
                    className="absolute inset-x-1 inset-y-0 rounded-full bg-blue-wash"
                    transition={{ type: "spring", stiffness: 500, damping: 38 }}
                  />
                )}
                <Icon size={22} strokeWidth={active ? 2.4 : 1.9} className={cx("relative", active ? "text-blue-deep" : "text-muted")} />
                <span className={cx("relative text-[11px] font-semibold", active ? "text-blue-deep" : "text-muted")}>{label}</span>
              </button>
            );
          })}
        </motion.nav>
      )}
    </AnimatePresence>
  );
}

/** Scrollbare Seite mit optionalem Kopf (Zurück, Titel, Aktionen). */
export function Screen({
  children,
  title,
  back,
  actions,
  bottomPad = true,
  footer,
}: {
  children: ReactNode;
  title?: string;
  back?: boolean;
  actions?: ReactNode;
  bottomPad?: boolean;
  footer?: ReactNode;
}) {
  const router = useRouter();
  return (
    <div className="flex h-full flex-col">
      {(back || title || actions) && (
        <header className="relative z-10 flex items-center gap-3 px-4 pt-[max(env(safe-area-inset-top),14px)] pb-2">
          {back && (
            <motion.button
              whileTap={{ scale: 0.9 }}
              onClick={() => {
                haptic(5);
                router.back();
              }}
              aria-label="Back"
              className="glass flex size-11 shrink-0 items-center justify-center rounded-full"
            >
              <ChevronLeft size={24} />
            </motion.button>
          )}
          {title && <h1 className="flex-1 truncate text-[17px] font-semibold">{title}</h1>}
          {!title && <span className="flex-1" />}
          {actions && <div className="flex gap-2">{actions}</div>}
        </header>
      )}
      <div className={cx("no-scrollbar flex-1 overflow-y-auto overscroll-contain px-4", bottomPad && "pb-32")}>{children}</div>
      {footer}
    </div>
  );
}
