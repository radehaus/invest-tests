/* eslint-disable @next/next/no-img-element -- statischer Export, Bildoptimierung ist aus */
import { cx } from "@/lib/cx";

// Offizielles Allianz-Invest-Logo (public/brand/allianz-invest-logo.png, 428 × 64, transparent).
// Auf dunklem Grund per Filter komplett weiß. Ein SVG wäre auf Retina-Displays noch schärfer.
const BASE = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

export function Logo({ className, light }: { className?: string; light?: boolean }) {
  return (
    <img
      src={`${BASE}/brand/allianz-invest-logo.png`}
      alt="Allianz Invest"
      width={428}
      height={64}
      draggable={false}
      className={cx("w-auto max-w-none shrink-0 self-start select-none", light && "brightness-0 invert", className ?? "h-5")}
    />
  );
}
