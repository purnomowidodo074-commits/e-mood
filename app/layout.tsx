import type { Metadata } from "next";
import { Plus_Jakarta_Sans, JetBrains_Mono } from "next/font/google";
import "./globals.css";

// Plus Jakarta Sans: warmer, rounder terminals than the previous Inter — the
// friendlier voice the yellow/black redesign asks for, still disciplined
// enough for dense dashboard UI (Operate mode: legibility over expression).
const displaySans = Plus_Jakarta_Sans({
  variable: "--font-display-sans",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
});

// Kept from the previous system: tabular figures for confidence/time/noreg
// columns are a real functional need here, not a "technical" costume.
const monoNum = JetBrains_Mono({
  variable: "--font-mono-num",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
});

export const metadata: Metadata = {
  title: "Happiness — Emotion Attendance Monitoring",
  description: "Dashboard & admin absen emosi Casting Division",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="id" className={`${displaySans.variable} ${monoNum.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col bg-background text-foreground">{children}</body>
    </html>
  );
}
