import { cx } from "@/lib/cx";

// Platzhalter-Logo bis zum Branding. Finales Allianz-Invest-Logo nur hier einsetzen.
export function Logo({ className, light }: { className?: string; light?: boolean }) {
  return (
    <span className={cx("inline-flex items-center gap-2 font-bold tracking-tight", className)}>
      <svg viewBox="0 0 32 32" className="size-[1.4em]" aria-hidden>
        <defs>
          <linearGradient id="logo-g" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor={light ? "#ffffff" : "var(--blue-light)"} />
            <stop offset="1" stopColor={light ? "#ffffff" : "var(--blue-deep)"} />
          </linearGradient>
        </defs>
        <circle cx="16" cy="16" r="15" fill="none" stroke="url(#logo-g)" strokeWidth="2.5" />
        <path d="M10 22 L16 8 L22 22 M12.5 17 H19.5" fill="none" stroke="url(#logo-g)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      <span className={light ? "text-white" : "text-blue-deep"}>
        Allianz <span className="font-medium">Invest</span>
      </span>
    </span>
  );
}
