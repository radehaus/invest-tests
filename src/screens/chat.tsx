"use client";

import { Sparkles } from "lucide-react";
import { Screen } from "@/components/shell";
import { AskField } from "./home";

// Platzhalter. Der Chat mit vorbereiteten Antworten folgt in Schritt 6 (Anforderungen 5.6).
export function ChatScreen() {
  return (
    <Screen>
      <div className="flex min-h-full flex-col pt-[max(env(safe-area-inset-top),18px)]">
        <h1 className="headline px-1 text-[34px] font-bold tracking-tight">Chat</h1>
        <div className="flex flex-1 flex-col items-center justify-center py-10 text-center">
          <span className="flex size-16 items-center justify-center rounded-full bg-blue-wash text-blue">
            <Sparkles size={28} />
          </span>
          <p className="mt-4 text-[20px] font-bold">Your Allianz Invest assistant</p>
          <p className="mt-1 max-w-[280px] text-[15px] text-muted">
            Ask about your contracts, funds or retirement. Answers arrive in the next build step.
          </p>
        </div>
        <AskField onAsk={() => {}} />
      </div>
    </Screen>
  );
}
