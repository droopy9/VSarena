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
            <span className="inline-block w-9 h-9 md:w-10 md:h-10 border-4 border-arena-ink shadow-pixelSm bg-arena-bg">
              <svg
                viewBox="0 0 16 16"
                className="w-full h-full"
                shapeRendering="crispEdges"
                aria-hidden
              >
                {/* marquee top */}
                <rect x="3" y="1" width="10" height="2" fill="#FF8FBD" />
                {/* cabinet body */}
                <rect x="3" y="3" width="10" height="10" fill="#FFB3D9" />
                {/* screen bezel */}
                <rect x="4" y="4" width="8" height="4" fill="#2A1A33" />
                {/* screen glow */}
                <rect x="5" y="5" width="6" height="2" fill="#B3D9FF" />
                {/* tiny invader pixel */}
                <rect x="7" y="5" width="2" height="1" fill="#FF8FBD" />
                {/* control panel */}
                <rect x="4" y="9" width="8" height="3" fill="#FFD86B" />
                {/* joystick */}
                <rect x="5" y="10" width="1" height="1" fill="#2A1A33" />
                {/* buttons */}
                <rect x="9" y="10" width="1" height="1" fill="#FF8FBD" />
                <rect x="11" y="10" width="1" height="1" fill="#FFD9B3" />
                {/* legs */}
                <rect x="3" y="13" width="3" height="3" fill="#2A1A33" />
                <rect x="10" y="13" width="3" height="3" fill="#2A1A33" />
              </svg>
            </span>
            <span className="text-[14px] md:text-[16px] tracking-widest text-arena-rose">
              ARCADIA
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
          "WHEEL — 0.05 SOL TICKETS, EQUAL ODDS",
          "1v1 COIN FLIP ROOMS",
          "DOG RACE — 15 LANES, 0.1 SOL TICKETS",
          "CHAT IS LIVE — CONNECT WALLET TO JOIN",
        ]}
      />
    </header>
  );
}
