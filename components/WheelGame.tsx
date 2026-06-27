"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import { WHEEL_COLORS } from "@/lib/colors";
import {
  WHEEL_MAX_PLAYERS,
  TOKEN_TICKER,
  RAFFLE_TICKET_PRICE,
} from "@/lib/config";
import { useStats } from "@/lib/stats-store";

type Player = {
  id: string;
  name: string;
  colorIdx: number;
  isMe?: boolean;
};

type Phase = "lobby" | "spinning" | "result";

const SLOT_COUNT = WHEEL_COLORS.length; // always 15

const BOT_NAMES = [
  "pixL_kid", "ape0x", "neonNyx", "0xMochi", "sunny.sol",
  "gumdrop", "rugRanger", "blockyBea", "lemonLad", "candyCat",
  "wagerWiz", "pasteller", "bubblez", "byteBoi", "marshmal",
];

function shortAddress(addr?: string) {
  if (!addr) return "you";
  return `${addr.slice(0, 4)}…${addr.slice(-4)}`;
}

function polarToCart(cx: number, cy: number, r: number, deg: number) {
  const a = ((deg - 90) * Math.PI) / 180;
  return { x: cx + r * Math.cos(a), y: cy + r * Math.sin(a) };
}

function arcPath(cx: number, cy: number, r: number, startDeg: number, endDeg: number) {
  if (endDeg - startDeg >= 360) {
    return `M ${cx - r} ${cy} a ${r} ${r} 0 1 0 ${2 * r} 0 a ${r} ${r} 0 1 0 ${-2 * r} 0 Z`;
  }
  const start = polarToCart(cx, cy, r, endDeg);
  const end = polarToCart(cx, cy, r, startDeg);
  const large = endDeg - startDeg <= 180 ? 0 : 1;
  return `M ${cx} ${cy} L ${start.x} ${start.y} A ${r} ${r} 0 ${large} 0 ${end.x} ${end.y} Z`;
}

function genBots(count: number, taken: Set<number>): Player[] {
  const available: number[] = [];
  for (let i = 0; i < SLOT_COUNT; i++) {
    if (!taken.has(i)) available.push(i);
  }
  available.sort(() => Math.random() - 0.5);
  const names = [...BOT_NAMES].sort(() => Math.random() - 0.5);
  const n = Math.min(count, available.length);
  const bots: Player[] = [];
  for (let i = 0; i < n; i++) {
    const colorIdx = available[i];
    taken.add(colorIdx);
    bots.push({
      id: `bot-${i}-${Math.random().toString(36).slice(2, 7)}`,
      name: names[i % names.length],
      colorIdx,
    });
  }
  return bots;
}

export function WheelGame() {
  const { publicKey } = useWallet();
  const { recordRound } = useStats();

  const [phase, setPhase] = useState<Phase>("lobby");
  const [players, setPlayers] = useState<Player[]>(() => {
    const used = new Set<number>();
    return genBots(6, used);
  });
  const [spinDeg, setSpinDeg] = useState(0);
  const [winnerSlot, setWinnerSlot] = useState<number | null>(null);
  const [lastPayout, setLastPayout] = useState<{
    pot: number;
    payout: number;
    burn: number;
    houseWin: boolean;
    winner: Player | null;
  } | null>(null);
  const recordedRef = useRef(false);

  const totalPot = useMemo(
    () => players.length * RAFFLE_TICKET_PRICE,
    [players],
  );

  // Always 15 equal slices, indexed by WHEEL_COLORS[i].
  const slices = useMemo(() => {
    const perSlice = 360 / SLOT_COUNT;
    return WHEEL_COLORS.map((color, i) => {
      const owner = players.find((p) => p.colorIdx === i) ?? null;
      return {
        idx: i,
        color,
        owner,
        start: i * perSlice,
        end: (i + 1) * perSlice,
      };
    });
  }, [players]);

  const meSlots = useMemo(
    () => players.filter((p) => p.isMe).map((p) => p.colorIdx),
    [players],
  );
  const takenSlots = useMemo(
    () => new Set(players.map((p) => p.colorIdx)),
    [players],
  );

  const buySlot = (colorIdx: number) => {
    if (phase !== "lobby") return;
    if (takenSlots.has(colorIdx)) return;
    setPlayers((cur) => [
      ...cur,
      {
        id: `me-${colorIdx}-${Math.random().toString(36).slice(2, 6)}`,
        name: shortAddress(publicKey?.toBase58()),
        colorIdx,
        isMe: true,
      },
    ]);
  };

  const leaveSlot = (colorIdx: number) => {
    if (phase !== "lobby") return;
    setPlayers((cur) =>
      cur.filter((p) => !(p.isMe && p.colorIdx === colorIdx)),
    );
  };

  const addBot = () => {
    if (players.length >= WHEEL_MAX_PLAYERS) return;
    setPlayers((cur) => [
      ...cur,
      ...genBots(1, new Set(cur.map((p) => p.colorIdx))),
    ]);
  };

  const spin = () => {
    if (phase !== "lobby") return;
    recordedRef.current = false;

    // Uniform random across all 15 slots, regardless of ownership.
    const winningIdx = Math.floor(Math.random() * SLOT_COUNT);
    setWinnerSlot(winningIdx);

    const winSlice = slices[winningIdx];
    const sliceMid = (winSlice.start + winSlice.end) / 2;
    const turns = 6 + Math.floor(Math.random() * 3);
    const settle =
      360 -
      sliceMid +
      (Math.random() * 0.6 - 0.3) * (winSlice.end - winSlice.start);
    const target = turns * 360 + settle;
    setPhase("spinning");
    setSpinDeg(target);
    window.setTimeout(() => {
      setPhase("result");
    }, 3200);
  };

  useEffect(() => {
    if (phase !== "result" || winnerSlot === null || recordedRef.current) return;
    recordedRef.current = true;
    const owner = players.find((p) => p.colorIdx === winnerSlot) ?? null;
    const houseWin = !owner;
    const { winnerPayout, burn } = recordRound(totalPot, { houseWin });
    setLastPayout({
      pot: totalPot,
      payout: winnerPayout,
      burn,
      houseWin,
      winner: owner,
    });
  }, [phase, winnerSlot, totalPot, players, recordRound]);

  const nextRound = () => {
    setPhase("lobby");
    setWinnerSlot(null);
    setLastPayout(null);
    setSpinDeg(0);
    const used = new Set<number>();
    setPlayers(genBots(5 + Math.floor(Math.random() * 4), used));
  };

  const winningColor =
    winnerSlot !== null ? WHEEL_COLORS[winnerSlot] : null;
  const equalOdds = 100 / SLOT_COUNT;
  const filledSlots = players.length;
  const emptySlots = SLOT_COUNT - filledSlots;

  return (
    <div className="grid gap-6 lg:grid-cols-[1.1fr_1fr]">
      {/* WHEEL */}
      <div className="pixel-card p-5 flex flex-col items-center gap-4">
        <div className="flex items-center justify-between w-full">
          <span className="pixel-chip bg-arena-lemon">ROOM 01</span>
          <span className="text-[10px]">
            POT: <b>${totalPot.toFixed(2)}</b>
          </span>
          <span className="pixel-chip bg-arena-mint">
            {filledSlots}/{SLOT_COUNT} SOLD
          </span>
        </div>

        <div className="relative w-[320px] h-[320px] md:w-[420px] md:h-[420px]">
          {/* Pointer */}
          <div className="absolute left-1/2 -top-2 -translate-x-1/2 z-10">
            <div className="w-0 h-0 border-l-[12px] border-r-[12px] border-t-[20px] border-l-transparent border-r-transparent border-t-arena-ink" />
          </div>
          <svg
            viewBox="0 0 200 200"
            className="w-full h-full"
            style={{
              transform: `rotate(${spinDeg}deg)`,
              transition: phase === "spinning"
                ? "transform 3s cubic-bezier(0.18, 0.7, 0.2, 1)"
                : "transform 0s",
            }}
          >
            <defs>
              <pattern
                id="emptySlot"
                patternUnits="userSpaceOnUse"
                width="6"
                height="6"
                patternTransform="rotate(45)"
              >
                <rect width="6" height="6" fill="#2A1A33" opacity="0.25" />
                <line x1="0" y1="0" x2="0" y2="6" stroke="#2A1A33" strokeWidth="1.5" />
              </pattern>
            </defs>
            <circle cx="100" cy="100" r="98" fill="#2A1A33" />
            {slices.map((s) => {
              const isWinner = winnerSlot === s.idx && phase === "result";
              return (
                <g key={s.idx}>
                  <path
                    d={arcPath(100, 100, 94, s.start, s.end)}
                    fill={s.color.hex}
                    stroke="#2A1A33"
                    strokeWidth="1.5"
                  />
                  {!s.owner && (
                    <path
                      d={arcPath(100, 100, 94, s.start, s.end)}
                      fill="url(#emptySlot)"
                      stroke="none"
                    />
                  )}
                  {isWinner && (
                    <path
                      d={arcPath(100, 100, 94, s.start, s.end)}
                      fill="none"
                      stroke="#FFD86B"
                      strokeWidth="3"
                    />
                  )}
                </g>
              );
            })}
            {/* Hub */}
            <circle cx="100" cy="100" r="14" fill="#2A1A33" />
            <circle cx="100" cy="100" r="9" fill="#FFD86B" />
          </svg>
        </div>

        <div className="grid grid-cols-2 gap-2 w-full">
          <button
            disabled={phase !== "lobby"}
            onClick={spin}
            className="pixel-btn !bg-arena-rose text-white"
          >
            SPIN ▶
          </button>
          <button
            disabled={
              phase === "spinning" || players.length >= WHEEL_MAX_PLAYERS
            }
            onClick={addBot}
            className="pixel-btn !bg-arena-aqua"
          >
            + ADD BOT
          </button>
        </div>

        {phase === "result" && lastPayout && winningColor && (
          <div className="w-full bg-arena-mint border-4 border-arena-ink shadow-pixelSm p-3 text-[10px] leading-relaxed">
            <div className="text-[12px] mb-1 flex items-center gap-2">
              <span
                className="pixel-chip"
                style={{ background: winningColor.hex }}
              >
                {winningColor.name}
              </span>
              <span>
                {lastPayout.houseWin
                  ? "🔥 EMPTY SLOT"
                  : `🏆 ${lastPayout.winner!.name}`}
              </span>
            </div>
            {lastPayout.houseWin ? (
              <div className="text-arena-rose">
                Nobody bought this slot — entire pot{" "}
                <b>${lastPayout.pot.toFixed(2)}</b> routed to buyback + burn
                ({lastPayout.burn.toFixed(4)} {TOKEN_TICKER}).
              </div>
            ) : (
              <>
                <div>POT: ${lastPayout.pot.toFixed(2)}</div>
                <div>PAYOUT (95%): ${lastPayout.payout.toFixed(2)}</div>
                <div>
                  BURN (5%): {lastPayout.burn.toFixed(4)} {TOKEN_TICKER}
                </div>
              </>
            )}
            <button
              onClick={nextRound}
              className="pixel-btn !bg-arena-gold mt-2"
            >
              NEXT ROUND ↻
            </button>
          </div>
        )}
      </div>

      {/* RIGHT PANEL */}
      <div className="flex flex-col gap-4">
        <div className="pixel-card p-5 flex flex-col gap-3">
          <h3 className="text-[12px] tracking-wider">BUY A TICKET</h3>
          <p className="text-[9px] opacity-70 leading-relaxed">
            15 colour slots, every spin. Flat{" "}
            <b>1/{SLOT_COUNT} = {equalOdds.toFixed(1)}%</b> chance per slot.
            Pick an unsold colour for <b>${RAFFLE_TICKET_PRICE.toFixed(2)}</b>.
            If an empty slot wins, the entire pot goes to buyback + burn —{" "}
            currently <b>{emptySlots}/{SLOT_COUNT} empty</b> ={" "}
            {((emptySlots / SLOT_COUNT) * 100).toFixed(1)}% house odds.
          </p>
          {phase === "lobby" ? (
            <div className="grid grid-cols-5 gap-2">
              {WHEEL_COLORS.map((c, i) => {
                const owner = players.find((p) => p.colorIdx === i);
                const mine = !!owner?.isMe;
                const taken = !!owner && !mine;
                return (
                  <button
                    key={c.hex}
                    onClick={() => (mine ? leaveSlot(i) : buySlot(i))}
                    disabled={taken}
                    title={
                      mine
                        ? `${c.name} — yours (click to release)`
                        : taken
                          ? `${c.name} — taken by ${owner!.name}`
                          : `${c.name} — buy for $${RAFFLE_TICKET_PRICE.toFixed(2)}`
                    }
                    className={`h-12 border-4 border-arena-ink shadow-pixelSm relative ${
                      taken ? "opacity-40 cursor-not-allowed" : ""
                    } ${
                      mine
                        ? "ring-4 ring-arena-ink ring-offset-2 ring-offset-arena-panel"
                        : ""
                    }`}
                    style={{ background: c.hex }}
                  >
                    {mine && (
                      <span className="absolute inset-0 grid place-items-center text-[10px]">
                        ★
                      </span>
                    )}
                    {taken && (
                      <span className="absolute inset-0 grid place-items-center text-[8px] opacity-70">
                        🤖
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          ) : (
            <p className="text-[10px] opacity-70">Round in progress. Sit tight…</p>
          )}

          {meSlots.length > 0 && (
            <div className="bg-arena-lemon border-4 border-arena-ink shadow-pixelSm p-2 text-[10px] flex items-center justify-between">
              <span>
                YOUR SLOTS: <b>{meSlots.length}</b> · ODDS{" "}
                <b>{(meSlots.length * equalOdds).toFixed(1)}%</b>
              </span>
              <span>
                SPENT <b>${(meSlots.length * RAFFLE_TICKET_PRICE).toFixed(2)}</b>
              </span>
            </div>
          )}
        </div>

        <div className="pixel-card p-5 flex flex-col gap-2 max-h-[420px] overflow-auto">
          <h3 className="text-[12px] tracking-wider">
            SLOTS · 1/{SLOT_COUNT} EACH
          </h3>
          {slices.map((s) => (
            <div
              key={s.idx}
              className={`flex items-center gap-2 text-[10px] border-2 border-arena-ink p-2 ${
                s.owner?.isMe
                  ? "bg-arena-lemon"
                  : s.owner
                    ? "bg-white"
                    : "bg-arena-bg opacity-60"
              } ${winnerSlot === s.idx && phase === "result" ? "ring-4 ring-arena-rose" : ""}`}
            >
              <span
                className="w-4 h-4 border-2 border-arena-ink"
                style={{ background: s.color.hex }}
              />
              <span className="flex-1 truncate">
                {s.owner?.isMe ? "★ " : ""}
                {s.owner ? s.owner.name : "— EMPTY (house) —"}
              </span>
              <span className="opacity-70">
                {s.owner ? `$${RAFFLE_TICKET_PRICE.toFixed(2)}` : "—"}
              </span>
              <span className="pixel-chip">{equalOdds.toFixed(1)}%</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
