"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ContractAddress } from "./ContractAddress";
import { StatsBar } from "./StatsBar";
import { WalletButton } from "./WalletButton";
import { Marquee } from "./Marquee";

const nav = [
  { href: "/", label: "HOME" },
  { href: "/wheel", label: "WHEEL" },
  { href: "/flip", label: "FLIP" },
  { href: "/race", label: "RACE" },
];

export function SiteHeader() {
  const pathname = usePathname();
  return (
    <header className="sticky top-0 z-30 bg-arena-bg/95 backdrop-blur border-b-4 border-arena-ink">
      <div className="max-w-6xl mx-auto px-3 md:px-6 pt-3 pb-2 flex flex-col gap-2">
        <div className="flex flex-wrap items-center gap-2 justify-between">
          <Link href="/" className="flex items-center gap-2">
            <span className="inline-block w-8 h-8 bg-arena-rose border-4 border-arena-ink shadow-pixelSm" />
            <span className="text-[14px] md:text-[16px] tracking-widest text-arena-rose">
              ARENA
            </span>
          </Link>
          <nav className="flex items-center gap-1">
            {nav.map((n) => {
              const active = pathname === n.href;
              return (
                <Link
                  key={n.href}
                  href={n.href}
                  className={`pixel-btn !py-2 !px-3 ${
                    active ? "!bg-arena-gold" : "!bg-arena-aqua"
                  }`}
                >
                  {n.label}
                </Link>
              );
            })}
          </nav>
          <div className="flex items-center gap-2">
            <ContractAddress />
            <WalletButton />
          </div>
        </div>
        <StatsBar />
      </div>
      <Marquee
        items={[
          "WIN 95% OF THE POT",
          "5% BUYS BACK + BURNS $ARENA",
          "WHEEL — $2 TICKETS, EQUAL ODDS",
          "1v1 COIN FLIP ROOMS",
          "DOG RACE — 8 LANES, 0.1 SOL BETS",
          "CHAT COMING SOON",
        ]}
      />
    </header>
  );
}
