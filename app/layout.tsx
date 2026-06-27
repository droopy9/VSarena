import type { Metadata } from "next";
import "./globals.css";
import { WalletProvider } from "@/providers/WalletProvider";
import { StatsProvider } from "@/lib/stats-store";
import { SiteHeader } from "@/components/SiteHeader";
import { ChatTeaser } from "@/components/ChatTeaser";

export const metadata: Metadata = {
  title: "ARCADIA — On-chain Social Gaming",
  description:
    "Bet, spin, flip, race. 95% to the winner. 5% buys back and burns $ARENA forever.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <WalletProvider>
          <StatsProvider>
            <SiteHeader />
            <main className="max-w-6xl mx-auto px-3 md:px-6 py-6">{children}</main>
            <ChatTeaser />
            <footer className="max-w-6xl mx-auto px-6 pb-10 pt-4 text-[9px] tracking-widest opacity-70">
              ARCADIA · ON-CHAIN · 95/5 · BUYBACK + BURN
            </footer>
          </StatsProvider>
        </WalletProvider>
      </body>
    </html>
  );
}
