"use client";

import { motion } from "motion/react";
import { ArrowRight, Baby, Check, Landmark, PiggyBank, ShieldCheck, TrendingUp, Umbrella, type LucideIcon } from "lucide-react";
import { Screen } from "@/components/shell";
import { Button, Card } from "@/components/ui";
import { useRouter } from "@/lib/router";
import { useStore } from "@/lib/store";
import { eur } from "@/lib/format";
import { cx } from "@/lib/cx";

type Product = {
  id: string;
  name: string;
  claim: [string, string];
  text: string;
  icon: LucideIcon;
  points: string[];
  /** Ziel, wenn das Produkt schon gebaut ist */
  to?: string;
  step?: string;
};

// Inhalte nach dem Vision-Prototyp. Konfiguratoren folgen in den nächsten Schritten (Anforderungen Abschnitt 8).
const PRODUCTS: Product[] = [
  {
    id: "broker",
    name: "Broker",
    claim: ["Only the best.", "Selected for you."],
    text: "Curated funds from PIMCO and Allianz Global Investors.",
    icon: TrendingUp,
    points: ["Top Morningstar ratings", "Ahead of their benchmark over 5 years", "No entry charges"],
    to: "/broker",
  },
  {
    id: "life",
    name: "Life",
    claim: ["Your investments.", "With a guarantee."],
    text: "Unit-linked life insurance with a guarantee of 60, 80 or 90%.",
    icon: ShieldCheck,
    points: ["Choose your guarantee level and date", "Passive or active strategy, switch for free", "Tax advantages of a pension policy"],
    step: "Configurator follows in build step 4.",
  },
  {
    id: "wealth",
    name: "Wealth",
    claim: ["Your wealth.", "Professionally managed."],
    text: "Asset management by Allianz Global Investors at institutional terms.",
    icon: Landmark,
    points: ["Defensive, Balanced or Dynamic", "Personalise with AI", "Total costs below 1% p. a."],
    step: "Configurator follows in build step 5.",
  },
  {
    id: "pension",
    name: "Pension Depot",
    claim: ["Your retirement.", "Government-supported."],
    text: "The new state-subsidised pension depot from 2027.",
    icon: PiggyBank,
    points: ["Government top-ups every year", "Extra top-up per child", "Contributions tax-deductible"],
    step: "Top-up calculator follows in build step 5.",
  },
  {
    id: "protection",
    name: "Protection",
    claim: ["Your protection.", "For your dependants."],
    text: "Term life insurance from €1.50 a month.",
    icon: Umbrella,
    points: ["Apply online in minutes", "Adjust cover as life changes", "For family, mortgage and loans"],
    step: "Premium calculator follows in build step 7.",
  },
  {
    id: "kids",
    name: "Kids",
    claim: ["Your kids.", "Their future."],
    text: "Invest for your children, from €1. Family can pay in too.",
    icon: Baby,
    points: ["With a guarantee or fully invested", "No fixed commitment", "Use your child’s tax allowance"],
    step: "Coming after the product update.",
  },
];

/** Welche Produkte der Kunde schon hat: Vertrags-ID für die Detailseite und aktueller Wert */
function useOwned() {
  const { contracts, state, broker } = useStore();
  return (productId: string): { contractId: string; value: number } | null => {
    if (productId === "broker") return Object.keys(state.positions).length ? { contractId: "broker", value: broker.value } : null;
    const c = contracts.find((x) => x.product === productId);
    return c ? { contractId: c.id, value: c.value } : null;
  };
}

/** Markierung "Yours" auf der Produktkachel */
function OwnedBadge({ dark }: { dark?: boolean }) {
  return (
    <span
      className={cx(
        "inline-flex h-6 items-center gap-1 rounded-full px-2.5 text-[12px] font-bold",
        dark ? "bg-white text-blue-deep" : "bg-positive-wash text-positive",
      )}
    >
      <Check size={12} strokeWidth={3} /> Yours
    </span>
  );
}

export function ProductsScreen() {
  const { go } = useRouter();
  const owned = useOwned();
  return (
    <Screen>
      <div className="pt-[max(env(safe-area-inset-top),18px)]">
        <h1 className="headline px-1 text-[34px] font-bold tracking-tight">Products</h1>
        <p className="px-1 text-[15px] text-muted">One platform for all your financial needs.</p>
      </div>
      <div className="mt-5 grid grid-cols-2 gap-3">
        {PRODUCTS.map((p, i) => {
          const Icon = p.icon;
          const featured = i === 0;
          const mine = owned(p.id);
          return (
            <motion.div
              key={p.id}
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0, transition: { delay: i * 0.05 } }}
              className={featured ? "col-span-2" : ""}
            >
              {featured ? (
                <motion.button
                  whileTap={{ scale: 0.985 }}
                  onClick={() => go(`/products/${p.id}`)}
                  className="hero relative w-full overflow-hidden rounded-card p-5 text-left shadow-float"
                >
                  <span className="flex items-center gap-2">
                    <span className="rounded-full bg-orange px-2.5 py-1 text-[12px] font-bold">NEW</span>
                    {mine && <OwnedBadge dark />}
                  </span>
                  <p className="mt-4 text-[26px] leading-tight font-bold tracking-tight">
                    <span className="text-white/55">{p.claim[0]}</span>
                    <br />
                    {p.claim[1]}
                  </p>
                  <p className="mt-2 text-[15px] text-white/80">{p.text}</p>
                  <span className="mt-4 flex items-center gap-1 text-[15px] font-semibold">
                    Allianz Invest {p.name} <ArrowRight size={16} />
                  </span>
                </motion.button>
              ) : (
                <Card onClick={() => go(`/products/${p.id}`)} className="h-full p-4">
                  <span className="flex items-start justify-between">
                    <span className="flex size-11 items-center justify-center rounded-full bg-blue-wash text-blue">
                      <Icon size={20} />
                    </span>
                    {mine && <OwnedBadge />}
                  </span>
                  <p className="mt-6 text-[13px] font-semibold text-muted">Allianz Invest</p>
                  <p className="text-[19px] font-bold tracking-tight">{p.name}</p>
                  {mine ? (
                    <p className="tabular mt-1 text-[13px] leading-snug font-semibold text-ink">{eur(mine.value)}</p>
                  ) : (
                    <p className="mt-1 text-[13px] leading-snug text-muted">{p.claim[1]}</p>
                  )}
                </Card>
              )}
            </motion.div>
          );
        })}
      </div>
    </Screen>
  );
}

export function ProductDetailScreen({ id }: { id: string }) {
  const { go } = useRouter();
  const mine = useOwned()(id);
  const p = PRODUCTS.find((x) => x.id === id);
  if (!p) return <Screen back>Product not found.</Screen>;
  const Icon = p.icon;

  return (
    <Screen back>
      <div className="hero mt-2 rounded-card px-6 pt-7 pb-9 shadow-float">
        <span className="glass-dark flex size-12 items-center justify-center rounded-full">
          <Icon size={22} />
        </span>
        <p className="mt-6 text-[15px] font-semibold text-white/70">Allianz Invest {p.name}</p>
        <h1 className="mt-1 text-[36px] leading-[1.05] font-bold tracking-tight">
          <span className="text-white/55">{p.claim[0]}</span>
          <br />
          {p.claim[1]}
        </h1>
        <p className="mt-3 text-[16px] text-white/80">{p.text}</p>
      </div>

      <Card className="mt-5 space-y-3 p-5">
        {p.points.map((pt) => (
          <p key={pt} className="flex items-center gap-3 text-[16px]">
            <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-blue text-white">
              <Check size={14} strokeWidth={3} />
            </span>
            {pt}
          </p>
        ))}
      </Card>

      {mine && (
        <button
          onClick={() => go(`/home/${mine.contractId}`)}
          className="mt-4 flex w-full items-center gap-3 rounded-2xl bg-positive-wash p-4 text-left text-positive"
        >
          <Check size={18} strokeWidth={3} className="shrink-0" />
          <span className="min-w-0 flex-1 text-[15px] font-semibold">
            You already have this · <span className="tabular">{eur(mine.value)}</span>
          </span>
          <span className="flex items-center gap-1 text-[15px] font-semibold">
            Open <ArrowRight size={16} />
          </span>
        </button>
      )}

      <div className="mt-6">
        {p.to ? (
          <Button className="w-full" onClick={() => go(p.to!)}>
            Explore the {p.name}
          </Button>
        ) : (
          <>
            <Button className="w-full" disabled>
              Configure
            </Button>
            <p className="mt-3 text-center text-[13px] text-muted">{p.step}</p>
          </>
        )}
      </div>
    </Screen>
  );
}
