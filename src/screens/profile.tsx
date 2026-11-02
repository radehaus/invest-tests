"use client";

import { ChevronRight, FileText, LogOut, RotateCcw, Settings } from "lucide-react";
import { useState } from "react";
import { Screen } from "@/components/shell";
import { Card } from "@/components/ui";
import { Sheet } from "@/components/sheet";
import { useStore } from "@/lib/store";
import { lock } from "@/lib/vault";
import persona from "@/data/persona.json";
import { monthYear } from "@/lib/format";

// Einfaches Profil. Dokumente, Steuerbescheinigung und Einstellungen folgen in Schritt 7.
export function ProfileScreen({ onLogout }: { onLogout: () => void }) {
  const { reset } = useStore();
  const [confirm, setConfirm] = useState(false);

  const rows = [
    { icon: FileText, label: "Documents", onClick: undefined },
    { icon: Settings, label: "Settings", onClick: undefined },
    { icon: RotateCcw, label: "Reset demo", onClick: () => setConfirm(true) },
    {
      // Zurück zur Passwortsperre, z. B. bevor das Handy weitergegeben wird
      icon: LogOut,
      label: "Log out",
      onClick: () => {
        lock();
        onLogout();
      },
    },
  ];

  return (
    <Screen>
      <div className="pt-[max(env(safe-area-inset-top),18px)]">
        <h1 className="headline px-1 text-[34px] font-bold tracking-tight">Profile</h1>
      </div>
      <Card className="mt-5 flex items-center gap-4 p-5">
        <span className="flex size-16 items-center justify-center rounded-full bg-[linear-gradient(135deg,var(--blue-light),var(--blue-deep))] text-[22px] font-bold text-white">
          {persona.firstName[0]}
          {persona.lastName[0]}
        </span>
        <div>
          <p className="text-[20px] font-bold">
            {persona.firstName} {persona.lastName}
          </p>
          <p className="text-[14px] text-muted">
            {persona.age}, {persona.job.toLowerCase()}, {persona.city}
          </p>
          <p className="text-[13px] text-faint">Customer since {monthYear(Date.parse(persona.customerSince))}</p>
        </div>
      </Card>

      <Card className="mt-5 divide-y divide-line px-2">
        {rows.map(({ icon: Icon, label, onClick }) => (
          <button
            key={label}
            onClick={onClick}
            disabled={!onClick}
            className="flex w-full items-center gap-3 px-3 py-4 text-left disabled:opacity-45"
          >
            <Icon size={20} className="text-blue" />
            <span className="flex-1 text-[16px] font-medium">{label}</span>
            <ChevronRight size={18} className="text-faint" />
          </button>
        ))}
      </Card>

      <Sheet open={confirm} onClose={() => setConfirm(false)}>
        <h2 className="text-[22px] font-bold">Reset the demo?</h2>
        <p className="mt-2 text-[15px] text-muted">Purchases, savings plans, watchlist and alerts go back to the starting state.</p>
        <div className="mt-6 flex gap-3">
          <button onClick={() => setConfirm(false)} className="h-14 flex-1 rounded-full bg-ink/[0.05] font-semibold">
            Cancel
          </button>
          <button
            onClick={() => {
              reset();
              setConfirm(false);
            }}
            className="cta h-14 flex-1 rounded-full font-semibold"
          >
            Reset
          </button>
        </div>
      </Sheet>
    </Screen>
  );
}
