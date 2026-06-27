"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import { TOKEN_TICKER } from "@/lib/config";
import { useStats } from "@/lib/stats-store";

type Dog = {
  idx: number;
  name: string;
  hex: string;
};

type Bet = {
  id: string;
  dogIdx: number;
  who: string;
  isMe?: boolean;
};

type Phase = "lobby" | "racing" | "result";

type Commit = {
  seed: string;
  hash: string;
  winner: number;
};

const BET_AMOUNT = 0.1;
const DOG_COUNT = 8;
const RACE_DURATION_MS = 11000;
const RESULT_COUNTDOWN_S = 7;
const LOBBY_DURATION_S = 120;

function formatMMSS(s: number) {
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${m}:${r.toString().padStart(2, "0")}`;
}

const DOGS: Dog[] = [
  { idx: 0, name: "PINKY",  hex: "#FFB3D9" },
  { idx: 1, name: "MINTY",  hex: "#B3FFD9" },
  { idx: 2, name: "BLUEY",  hex: "#B3D9FF" },
  { idx: 3, name: "LEMON",  hex: "#FFF1A8" },
  { idx: 4, name: "GRAPE",  hex: "#C7B3FF" },
  { idx: 5, name: "PEACHY", hex: "#FFD9B3" },
  { idx: 6, name: "CORAL",  hex: "#FFB3B3" },
  { idx: 7, name: "LIMEY",  hex: "#D9FFB3" },
];

const BOT_NAMES = [
  "0xMochi", "gumdrop", "ape0x", "neonNyx",
  "blockyBea", "sunny.sol", "lemonLad", "bubblez",
  "byteBoi", "pasteller", "marshmal", "candyCat",
];

function shortAddress(addr?: string) {
  if (!addr) return "you";
  return `${addr.slice(0, 4)}…${addr.slice(-4)}`;
}

function toHex(bytes: Uint8Array) {
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}

async function makeCommit(): Promise<Commit> {
  const seedBytes = new Uint8Array(32);
  crypto.getRandomValues(seedBytes);
  const seed = toHex(seedBytes);
  const hashBuf = await crypto.subtle.digest("SHA-256", seedBytes);
  const hash = toHex(new Uint8Array(hashBuf));
  // Winner is the first 8 hex chars of the seed mod DOG_COUNT.
  const winner = parseInt(seed.slice(0, 8), 16) % DOG_COUNT;
  return { seed, hash, winner };
}

let betCounter = 0;
const newBetId = () => `b${++betCounter}`;

function seedBots(): Bet[] {
  const out: Bet[] = [];
  const count = 8 + Math.floor(Math.random() * 7);
  for (let i = 0; i < count; i++) {
    out.push({
      id: newBetId(),
      dogIdx: Math.floor(Math.random() * DOG_COUNT),
      who: BOT_NAMES[Math.floor(Math.random() * BOT_NAMES.length)],
    });
  }
  return out;
}

export function RaceGame() {
  const { publicKey } = useWallet();
  const { recordRound } = useStats();

  const [phase, setPhase] = useState<Phase>("lobby");
  const [bets, setBets] = useState<Bet[]>([]);
  const [progress, setProgress] = useState<number[]>(() =>
    Array(DOG_COUNT).fill(0),
  );
  const seededRef = useRef(false);

  // Defer randomized seeding to the client to avoid SSR/CSR hydration mismatch.
  useEffect(() => {
    if (seededRef.current) return;
    seededRef.current = true;
    setBets(seedBots());
  }, []);
  const [winnerIdx, setWinnerIdx] = useState<number | null>(null);
  const [commit, setCommit] = useState<Commit | null>(null);
  const [payoutSummary, setPayoutSummary] = useState<{
    pot: number;
    winners: { who: string; isMe: boolean; amount: number; share: number }[];
    burn: number;
    houseWin: boolean;
  } | null>(null);
  const recordedRef = useRef(false);
  const rafRef = useRef<number | null>(null);

  const myAddr = shortAddress(publicKey?.toBase58());

  // Pre-commit: compute the seed+hash+winner the moment a lobby opens,
  // so the player can see the commitment BEFORE deciding to bet.
  useEffect(() => {
    if (phase !== "lobby") return;
    let cancelled = false;
    makeCommit().then((c) => {
      if (!cancelled) setCommit(c);
    });
    return () => {
      cancelled = true;
    };
  }, [phase]);

  const totalsByDog = useMemo(() => {
    const t = Array(DOG_COUNT).fill(0);
    bets.forEach((b) => {
      t[b.dogIdx] += BET_AMOUNT;
    });
    return t;
  }, [bets]);

  const totalPot = useMemo(() => bets.length * BET_AMOUNT, [bets]);

  const myBetsByDog = useMemo(() => {
    const t = Array(DOG_COUNT).fill(0);
    bets.forEach((b) => {
      if (b.isMe) t[b.dogIdx]++;
    });
    return t;
  }, [bets]);

  const placeBet = (dogIdx: number) => {
    if (phase !== "lobby") return;
    setBets((cur) => [
      ...cur,
      {
        id: newBetId(),
        dogIdx,
        who: myAddr,
        isMe: true,
      },
    ]);
  };

  const startRaceRef = useRef<() => void>(() => {});
  const startRace = () => {
    if (phase !== "lobby" || !commit) return;
    recordedRef.current = false;

    const winner = commit.winner;
    setWinnerIdx(winner);
    setPhase("racing");
    setProgress(Array(DOG_COUNT).fill(0));

    const start = performance.now();
    const duration = RACE_DURATION_MS;
    // Losers settle between 68% and 92% so the winner is visibly first across the line.
    const targets = Array.from({ length: DOG_COUNT }, (_, i) =>
      i === winner ? 100 : 68 + Math.random() * 24,
    );
    // Each lane gets its own multi-frequency noise so dogs trade leads mid-race.
    const seeds = Array.from({ length: DOG_COUNT }, () => ({
      a: Math.random() * Math.PI * 2,
      b: Math.random() * Math.PI * 2,
      c: Math.random() * Math.PI * 2,
      speedA: 0.9 + Math.random() * 0.6,
      speedB: 2.4 + Math.random() * 1.4,
    }));

    const step = (now: number) => {
      const t = Math.min(1, (now - start) / duration);
      const ease = 1 - Math.pow(1 - t, 1.55);
      const damp = 1 - Math.pow(t, 1.2) * 0.85;
      const next = targets.map((target, i) => {
        const s = seeds[i];
        const wave1 = Math.sin(t * 6 * s.speedA + s.a) * 5;
        const wave2 = Math.sin(t * 13 * s.speedB + s.b) * 2.5;
        const wave3 = Math.sin(t * 2.4 + s.c) * 4;
        const noise = (wave1 + wave2 + wave3) * damp;
        return Math.max(0, Math.min(100, target * ease + noise));
      });
      setProgress(next);
      if (t < 1) {
        rafRef.current = requestAnimationFrame(step);
      } else {
        setProgress((p) =>
          p.map((_, i) => (i === winner ? 100 : Math.min(94, targets[i]))),
        );
        setPhase("result");
      }
    };
    rafRef.current = requestAnimationFrame(step);
  };

  useEffect(() => {
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, []);

  useEffect(() => {
    if (phase !== "result" || winnerIdx === null || recordedRef.current) return;
    recordedRef.current = true;

    const winningBets = bets.filter((b) => b.dogIdx === winnerIdx);
    const houseWin = winningBets.length === 0;
    const { winnerPayout, burn } = recordRound(totalPot, { houseWin });

    if (houseWin) {
      setPayoutSummary({
        pot: totalPot,
        winners: [],
        burn,
        houseWin: true,
      });
      return;
    }

    const totalWinningStake = winningBets.length * BET_AMOUNT;
    const grouped = new Map<string, { who: string; isMe: boolean; count: number }>();
    winningBets.forEach((b) => {
      const key = b.isMe ? "__me__" : b.who;
      const cur = grouped.get(key) ?? { who: b.who, isMe: !!b.isMe, count: 0 };
      cur.count++;
      grouped.set(key, cur);
    });

    const winnersList = Array.from(grouped.values())
      .map((g) => {
        const stake = g.count * BET_AMOUNT;
        const share = totalWinningStake > 0 ? stake / totalWinningStake : 0;
        return {
          who: g.who,
          isMe: g.isMe,
          amount: share * winnerPayout,
          share,
        };
      })
      .sort((a, b) => b.amount - a.amount);

    setPayoutSummary({
      pot: totalPot,
      winners: winnersList,
      burn,
      houseWin: false,
    });
  }, [phase, winnerIdx, totalPot, bets, recordRound]);

  const nextRound = useCallback(() => {
    setPhase("lobby");
    setWinnerIdx(null);
    setPayoutSummary(null);
    setProgress(Array(DOG_COUNT).fill(0));
    setCommit(null);
    setBets(seedBots());
  }, []);

  startRaceRef.current = startRace;

  // Lobby countdown — race auto-starts every 2 minutes.
  const [lobbyCountdown, setLobbyCountdown] = useState<number | null>(null);
  useEffect(() => {
    if (phase !== "lobby") {
      setLobbyCountdown(null);
      return;
    }
    setLobbyCountdown(LOBBY_DURATION_S);
    const startedAt = Date.now();
    const tick = window.setInterval(() => {
      const remaining =
        LOBBY_DURATION_S - Math.floor((Date.now() - startedAt) / 1000);
      if (remaining <= 0) {
        window.clearInterval(tick);
        setLobbyCountdown(0);
        startRaceRef.current?.();
      } else {
        setLobbyCountdown(remaining);
      }
    }, 250);
    return () => window.clearInterval(tick);
  }, [phase]);

  // Auto-advance to the next round after the result panel has been visible.
  const [resultCountdown, setResultCountdown] = useState<number | null>(null);
  useEffect(() => {
    if (phase !== "result") {
      setResultCountdown(null);
      return;
    }
    setResultCountdown(RESULT_COUNTDOWN_S);
    const startedAt = Date.now();
    const tick = window.setInterval(() => {
      const remaining =
        RESULT_COUNTDOWN_S - Math.floor((Date.now() - startedAt) / 1000);
      if (remaining <= 0) {
        window.clearInterval(tick);
        setResultCountdown(0);
        nextRound();
      } else {
        setResultCountdown(remaining);
      }
    }, 250);
    return () => window.clearInterval(tick);
  }, [phase, nextRound]);

  useEffect(() => {
    if (phase !== "lobby") return;
    const t = window.setInterval(() => {
      setBets((cur) => {
        if (cur.length >= 36) return cur;
        return [
          ...cur,
          {
            id: newBetId(),
            dogIdx: Math.floor(Math.random() * DOG_COUNT),
            who: BOT_NAMES[Math.floor(Math.random() * BOT_NAMES.length)],
          },
        ];
      });
    }, 4500);
    return () => window.clearInterval(t);
  }, [phase]);

  const shortHash = commit
    ? `${commit.hash.slice(0, 10)}…${commit.hash.slice(-10)}`
    : "…computing…";

  return (
    <div className="grid gap-6 lg:grid-cols-[1.2fr_1fr]">
      {/* TRACK */}
      <div className="pixel-card p-5 flex flex-col gap-3">
        <div className="flex items-center justify-between w-full">
          <span className="pixel-chip bg-arena-lavender">ROOM 03</span>
          <span className="text-[10px]">
            POT: <b>{totalPot.toFixed(1)} SOL</b>
          </span>
          <span className="pixel-chip bg-arena-mint">{bets.length} BETS</span>
        </div>

        {phase === "lobby" && lobbyCountdown !== null && (
          <div className="bg-arena-ink text-arena-lemon border-4 border-arena-ink shadow-pixelSm p-3 flex items-center justify-between gap-3">
            <span className="text-[10px] tracking-wider">RACE STARTS IN</span>
            <span className="text-[20px] tracking-widest font-bold">
              {formatMMSS(lobbyCountdown)}
            </span>
            <span className="text-[9px] opacity-70">auto-spin</span>
          </div>
        )}

        {/* Provably-fair commitment */}
        <div className="bg-white border-2 border-arena-ink p-2 text-[8px] leading-relaxed">
          <div className="flex items-center justify-between gap-2">
            <span className="opacity-70">
              FAIRNESS COMMIT (SHA-256, winner locked):
            </span>
            <span className="pixel-chip bg-arena-lemon text-[7px]">
              1/{DOG_COUNT} EACH
            </span>
          </div>
          <div className="font-bold mt-1 break-all">0x{shortHash}</div>
          <div className="opacity-70 mt-1">
            Seed is revealed after the race. Verify: sha256(seed) == hash, then
            winner = parseInt(seed[0..8], 16) mod {DOG_COUNT}.
          </div>
        </div>

        <div className="flex flex-col gap-1 bg-white border-4 border-arena-ink p-2">
          {DOGS.map((d) => {
            const pct = progress[d.idx];
            const isWinner = winnerIdx === d.idx && phase === "result";
            const total = totalsByDog[d.idx];
            const mine = myBetsByDog[d.idx];
            return (
              <div
                key={d.idx}
                className={`relative flex items-center border-2 border-arena-ink/40 h-10 overflow-hidden ${
                  isWinner ? "bg-arena-lemon" : "bg-arena-bg"
                }`}
              >
                <span className="relative z-10 h-full w-7 grid place-items-center border-r-2 border-arena-ink bg-arena-ink text-arena-lemon text-[10px]">
                  {d.idx + 1}
                </span>
                <span
                  className="relative z-10 ml-1 text-[8px] px-1.5 py-0.5 border-2 border-arena-ink"
                  style={{ background: d.hex }}
                >
                  {d.name}
                </span>
                <span className="relative z-10 ml-2 text-[8px] opacity-70">
                  {total.toFixed(1)} SOL
                  {mine > 0 && (
                    <span className="ml-1 text-arena-rose">· YOU ×{mine}</span>
                  )}
                </span>
                <span
                  className="absolute right-0 top-0 h-full w-3 z-10"
                  style={{
                    background:
                      "repeating-linear-gradient(0deg,#2A1A33 0 4px,#fff 4px 8px)",
                  }}
                />
                <div
                  className={`absolute top-1/2 -translate-y-1/2 text-2xl will-change-transform z-20 ${
                    isWinner ? "animate-bob" : ""
                  }`}
                  style={{
                    left: `calc(2px + ${pct * 0.9}%)`,
                    transition:
                      phase === "racing" ? "left 80ms linear" : "left 0s",
                    filter: isWinner
                      ? "drop-shadow(0 0 6px #FFD86B)"
                      : "none",
                  }}
                >
                  🐕
                </div>
              </div>
            );
          })}
        </div>

        <button
          disabled={phase !== "lobby" || !commit}
          onClick={startRace}
          className="pixel-btn !bg-arena-rose text-white"
        >
          START RACE NOW ▶
        </button>

        {phase === "result" && winnerIdx !== null && payoutSummary && commit && (
          <div className="bg-arena-mint border-4 border-arena-ink shadow-pixelSm p-3 text-[10px] leading-relaxed">
            <div className="flex items-center justify-between mb-1">
              <div className="text-[12px]">
                🏆 WINNER: <b>{DOGS[winnerIdx].name}</b>{" "}
                <span
                  className="pixel-chip"
                  style={{ background: DOGS[winnerIdx].hex }}
                >
                  LANE {winnerIdx + 1}
                </span>
              </div>
              {resultCountdown !== null && (
                <span className="pixel-chip bg-arena-gold text-[9px]">
                  NEXT IN {resultCountdown}s
                </span>
              )}
            </div>
            {payoutSummary.houseWin ? (
              <>
                <div className="text-arena-rose">
                  🔥 HOUSE WIN — nobody backed{" "}
                  <b>{DOGS[winnerIdx].name}</b>.
                </div>
                <div>
                  Entire pot routed to buyback + burn:{" "}
                  <b>
                    {payoutSummary.burn.toFixed(4)} {TOKEN_TICKER}
                  </b>{" "}
                  ({payoutSummary.pot.toFixed(1)} SOL)
                </div>
              </>
            ) : (
              <>
                <div>
                  POT: {payoutSummary.pot.toFixed(1)} SOL · BURN (5%):{" "}
                  {payoutSummary.burn.toFixed(4)} {TOKEN_TICKER}
                </div>
                <div className="mt-1 border-t-2 border-arena-ink pt-1">
                  PAYOUTS (95% pool):
                </div>
                {payoutSummary.winners.map((w, i) => (
                  <div key={i} className="flex justify-between">
                    <span className={w.isMe ? "text-arena-rose" : ""}>
                      {w.isMe ? "★ YOU" : w.who}
                    </span>
                    <span>
                      <b>{w.amount.toFixed(3)} SOL</b> (
                      {(w.share * 100).toFixed(0)}%)
                    </span>
                  </div>
                ))}
              </>
            )}
            <details className="mt-2 border-t-2 border-arena-ink pt-1">
              <summary className="cursor-pointer text-[10px] tracking-wider">
                VERIFY FAIRNESS ✓
              </summary>
              <div className="mt-1 break-all text-[8px] leading-relaxed">
                <div>
                  <span className="opacity-70">SEED:</span>{" "}
                  <b>0x{commit.seed}</b>
                </div>
                <div>
                  <span className="opacity-70">SHA-256(SEED):</span>{" "}
                  <b>0x{commit.hash}</b>
                </div>
                <div>
                  <span className="opacity-70">WINNER =</span>{" "}
                  parseInt(SEED[0..8], 16) % {DOG_COUNT} ={" "}
                  <b>{commit.winner + 1}</b>
                </div>
              </div>
            </details>
          </div>
        )}
      </div>

      {/* RIGHT PANEL */}
      <div className="flex flex-col gap-4">
        <div className="pixel-card p-5 flex flex-col gap-3">
          <h3 className="text-[12px] tracking-wider">PLACE YOUR BETS</h3>
          <p className="text-[9px] opacity-70 leading-relaxed">
            Each bet is <b>0.1 SOL</b>. Every dog has a flat <b>1/{DOG_COUNT}</b>{" "}
            chance — stacking bets doesn't change odds, just your share of the
            payout if your dog wins. Winners split the 95% pool in proportion to
            their bets on the winning dog. The other 5% buys back {TOKEN_TICKER}{" "}
            and burns it.
          </p>
          <div className="grid grid-cols-2 gap-2">
            {DOGS.map((d) => {
              const total = totalsByDog[d.idx];
              const mine = myBetsByDog[d.idx];
              return (
                <button
                  key={d.idx}
                  disabled={phase !== "lobby"}
                  onClick={() => placeBet(d.idx)}
                  className="border-4 border-arena-ink shadow-pixelSm p-2 flex flex-col gap-1 text-left hover:-translate-x-[1px] hover:-translate-y-[1px] hover:shadow-pixel transition disabled:opacity-50 disabled:hover:translate-x-0 disabled:hover:translate-y-0"
                  style={{ background: d.hex }}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[10px]">#{d.idx + 1} {d.name}</span>
                    <span className="text-[8px] pixel-chip">
                      1/{DOG_COUNT}
                    </span>
                  </div>
                  <div className="text-[9px] opacity-80">
                    POOL {total.toFixed(1)} SOL
                  </div>
                  <div className="text-[9px] flex items-center justify-between">
                    <span>YOU ×{mine}</span>
                    <span className="font-bold">+0.1 ▶</span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        <div className="pixel-card p-5 flex flex-col gap-2 max-h-[320px] overflow-auto">
          <h3 className="text-[12px] tracking-wider">
            RECENT BETS · {bets.length} TOTAL
          </h3>
          {[...bets]
            .reverse()
            .slice(0, 24)
            .map((b) => {
              const d = DOGS[b.dogIdx];
              return (
                <div
                  key={b.id}
                  className={`flex items-center gap-2 text-[10px] border-2 border-arena-ink p-2 ${
                    b.isMe ? "bg-arena-lemon" : "bg-white"
                  } ${
                    winnerIdx === b.dogIdx && phase === "result"
                      ? "ring-2 ring-arena-rose"
                      : ""
                  }`}
                >
                  <span
                    className="w-4 h-4 border-2 border-arena-ink"
                    style={{ background: d.hex }}
                  />
                  <span className="flex-1 truncate">
                    {b.isMe ? "★ " : ""}
                    {b.who}
                  </span>
                  <span className="opacity-70">{d.name}</span>
                  <span className="pixel-chip">0.1 SOL</span>
                </div>
              );
            })}
        </div>
      </div>
    </div>
  );
}
