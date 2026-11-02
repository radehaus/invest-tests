import type { Metadata, Viewport } from "next";
import { Figtree } from "next/font/google";
import "./globals.css";

// Runde Grotesk als Platzhalter für Allianz Neo, bis zum Branding
const figtree = Figtree({ variable: "--font-figtree", subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Allianz Invest",
  description: "Clickdummy: investing, retirement and protection in one account.",
  robots: { index: false, follow: false },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  viewportFit: "cover",
  themeColor: "#f7f7f8",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={figtree.variable}>
      <body className="stage min-h-dvh font-sans md:flex md:items-center md:justify-center md:py-6">
        {/* Auf dem Handy volle Fläche, auf dem Laptop als Telefon-Rahmen (für Präsentationen) */}
        <div
          id="frame"
          className="ambient relative isolate mx-auto h-dvh w-full max-w-[430px] overflow-hidden md:h-[min(860px,calc(100dvh-48px))] md:w-[400px] md:rounded-[52px] md:shadow-[0_40px_90px_-20px_rgb(12_27_51/0.35)] md:ring-[10px] md:ring-[#0c1b33]"
        >
          {children}
        </div>
      </body>
    </html>
  );
}
