"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import { TOKEN_TICKER, SOL_USD } from "@/lib/config";
import { useStats } from "@/lib/stats-store";

type Dog = {
  idx: number;
  name: string;
  hex: string;
  emoji: string;
};

type Ticket = {
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
const DOG_COUNT = 15;
const RACE_DURATION_MS = 11000;
const RESULT_COUNTDOWN_S = 7;
const LOBBY_DURATION_S = 120;
const BOT_REFILL_MS = 7000;

function formatMMSS(s: number) {
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${m}:${r.toString().padStart(2, "0")}`;
}

// Meme-coin racers — all run as dogs regardless of the underlying meme.
const DOGS: Dog[] = [
  { idx: 0,  name: "DOGE",     hex: "#FFB3D9", emoji: "🐕" },
  { idx: 1,  name: "SHIB",     hex: "#B3FFD9", emoji: "🐕" },
  { idx: 2,  name: "BONK",     hex: "#B3D9FF", emoji: "🐕" },
  { idx: 3,  name: "WIF",      hex: "#FFF1A8", emoji: "🐕" },
  { idx: 4,  name: "FLOKI",    hex: "#D9B3FF", emoji: "🐕" },
  { idx: 5,  name: "SAMO",     hex: "#FFD9B3", emoji: "🐕" },
  { idx: 6,  name: "NEIRO",    hex: "#FFB3B3", emoji: "🐕" },
  { idx: 7,  name: "CHILLGUY", hex: "#D9FFB3", emoji: "🐕" },
  { idx: 8,  name: "JOTCHUA",  hex: "#B3FFF1", emoji: "🐕" },
  { idx: 9,  name: "BABYDOGE", hex: "#C7B3FF", emoji: "🐕" },
  { idx: 10, name: "KISHU",    hex: "#FFC7E5", emoji: "🐕" },
  { idx: 11, name: "AKITA",    hex: "#E5E5FF", emoji: "🐕" },
  { idx: 12, name: "PEPE",     hex: "#FFEEAA", emoji: "🐕" },
  { idx: 13, name: "POPCAT",   hex: "#FFC7B3", emoji: "🐕" },
  { idx: 14, name: "MEW",      hex: "#C7FFE5", emoji: "🐕" },
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
  const winner = parseInt(seed.slice(0, 8), 16) % DOG_COUNT;
  return { seed, hash, winner };
}

function genBots(count: number, taken: Set<number>): Ticket[] {
  const available: number[] = [];
  for (let i = 0; i < DOG_COUNT; i++) {
    if (!taken.has(i)) available.push(i);
  }
  available.sort(() => Math.random() - 0.5);
  const names = [...BOT_NAMES].sort(() => Math.random() - 0.5);
  const n = Math.min(count, available.length);
  const out: Ticket[] = [];
  for (let i = 0; i < n; i++) {
    const dogIdx = available[i];
    taken.add(dogIdx);
    out.push({
      id: `bot-${i}-${Math.random().toString(36).slice(2, 7)}`,
      dogIdx,
      who: names[i % names.length],
    });
  }
  return out;
}

export function RaceGame() {
  const { publicKey } = useWallet();
  const { recordRound, recordWinner, recentWinners } = useStats();

  const [phase, setPhase] = useState<Phase>("lobby");
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [selected, setSelected] = useState<number | null>(null);
  const [progress, setProgress] = useState<number[]>(() =>
    Array(DOG_COUNT).fill(0),
  );
  const [winnerIdx, setWinnerIdx] = useState<number | null>(null);
  const [commit, setCommit] = useState<Commit | null>(null);
  const [payoutSummary, setPayoutSummary] = useState<{
    pot: number;
    winner: Ticket | null;
    payout: number;
    burn: number;
    houseWin: boolean;
  } | null>(null);
  const recordedRef = useRef(false);
  const rafRef = useRef<number | null>(null);
  const seededRef = useRef(false);

  const myAddr = shortAddress(publicKey?.toBase58());

  useEffect(() => {
    if (seededRef.current) return;
    seededRef.current = true;
    setTickets(genBots(5, new Set()));
  }, []);

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

  const totalPot = useMemo(() => tickets.length * BET_AMOUNT, [tickets]);
  const meHasTicket = tickets.some((t) => t.isMe);

  const buyTicket = () => {
    if (phase !== "lobby" || selected === null || !commit) return;
    if (meHasTicket) return;
    if (tickets.some((t) => t.dogIdx === selected)) {
      setSelected(null);
      return;
    }
    setTickets((cur) => [
      ...cur,
      {
        id: `me-${selected}-${Math.random().toString(36).slice(2, 6)}`,
        dogIdx: selected,
        who: myAddr,
        isMe: true,
      },
    ]);
    setSelected(null);
  };

  const releaseMyTicket = () => {
    if (phase !== "lobby") return;
    setTickets((cur) => cur.filter((t) => !t.isMe));
    setSelected(null);
  };

  const commitRef = useRef<Commit | null>(null);
  commitRef.current = commit;

  const beginRace = () => {
    if (phase !== "lobby" || !commitRef.current) return;
    recordedRef.current = false;

    const winner = commitRef.current.winner;
    setWinnerIdx(winner);
    setPhase("racing");
    setProgress(Array(DOG_COUNT).fill(0));

    const start = performance.now();
    const duration = RACE_DURATION_MS;
    const targets = Array.from({ length: DOG_COUNT }, (_, i) =>
      i === winner ? 100 : 68 + Math.random() * 24,
    );
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

  const beginRaceRef = useRef(beginRace);
  beginRaceRef.current = beginRace;

  useEffect(() => {
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, []);

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
        beginRaceRef.current?.();
      } else {
        setLobbyCountdown(remaining);
      }
    }, 250);
    return () => window.clearInterval(tick);
  }, [phase]);

  useEffect(() => {
    if (phase !== "lobby") return;
    const t = window.setInterval(() => {
      setTickets((cur) => {
        if (cur.length >= DOG_COUNT - 1) return cur;
        return [...cur, ...genBots(1, new Set(cur.map((t) => t.dogIdx)))];
      });
    }, BOT_REFILL_MS);
    return () => window.clearInterval(t);
  }, [phase]);

  useEffect(() => {
    if (phase !== "result" || winnerIdx === null || recordedRef.current) return;
    recordedRef.current = true;
    const owner = tickets.find((t) => t.dogIdx === winnerIdx) ?? null;
    const houseWin = !owner;
    const { winnerPayout, burn } = recordRound(totalPot, { houseWin });
    setPayoutSummary({
      pot: totalPot,
      winner: owner,
      payout: winnerPayout,
      burn,
      houseWin,
    });
    const dog = DOGS[winnerIdx];
    recordWinner({
      game: "race",
      pot: totalPot,
      unit: "SOL",
      winnerLabel: houseWin ? "HOUSE" : owner!.who,
      isMe: !!owner?.isMe,
      houseWin,
      badge: { name: dog.name, hex: dog.hex },
    });
  }, [phase, winnerIdx, totalPot, tickets, recordRound, recordWinner]);

  const nextRound = useCallback(() => {
    setPhase("lobby");
    setWinnerIdx(null);
    setPayoutSummary(null);
    setProgress(Array(DOG_COUNT).fill(0));
    setCommit(null);
    setSelected(null);
    setTickets(genBots(5, new Set()));
  }, []);

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

  const shortHash = commit
    ? `${commit.hash.slice(0, 10)}…${commit.hash.slice(-10)}`
    : "…computing…";

  const filledLanes = tickets.length;
  const emptyLanes = DOG_COUNT - filledLanes;
  const selectedDog = selected !== null ? DOGS[selected] : null;

  return (
    <div className="flex flex-col gap-6">
      {/* TRACK — main attraction, full width */}
      <div className="pixel-card p-4 md:p-6 flex flex-col gap-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <span className="pixel-chip bg-arena-lavender">ROOM 03</span>
          {phase === "lobby" && lobbyCountdown !== null && (
            <div className="bg-arena-ink text-arena-lemon border-4 border-arena-ink shadow-pixelSm px-3 py-2 flex items-center gap-3">
              <span className="text-[9px] tracking-wider opacity-80">
                RACE IN
              </span>
              <span className="text-[18px] tracking-widest font-bold leading-none">
                {formatMMSS(lobbyCountdown)}
              </span>
            </div>
          )}
          <div className="bg-arena-gold border-4 border-arena-ink shadow-pixelSm px-3 py-2 flex items-center gap-2">
            <span className="text-[8px] tracking-wider opacity-70">PRIZE</span>
            <span className="text-[18px] md:text-[20px] tracking-wider font-bold leading-none">
              {totalPot.toFixed(2)} SOL
            </span>
            <span className="text-[9px] opacity-80">
              ≈ ${(totalPot * SOL_USD).toFixed(2)}
            </span>
          </div>
          <span className="pixel-chip bg-arena-mint">
            {filledLanes}/{DOG_COUNT} LANES
          </span>
        </div>

        {/* THE BIG TRACK */}
        <div className="flex flex-col gap-1 bg-white border-4 border-arena-ink p-3">
          {DOGS.map((d) => {
            const pct = progress[d.idx];
            const isWinner = winnerIdx === d.idx && phase === "result";
            const owner = tickets.find((t) => t.dogIdx === d.idx);
            return (
              <div
                key={d.idx}
                className={`relative flex items-center border-2 border-arena-ink/40 h-11 overflow-hidden ${
                  isWinner
                    ? "bg-arena-lemon"
                    : owner
                      ? "bg-arena-bg"
                      : "bg-arena-bg opacity-60"
                }`}
              >
                <span className="relative z-10 h-full w-9 grid place-items-center border-r-2 border-arena-ink bg-arena-ink text-arena-lemon text-[11px]">
                  {d.idx + 1}
                </span>
                <span
                  className="relative z-10 ml-2 text-[10px] px-2 py-1 border-2 border-arena-ink font-bold"
                  style={{ background: d.hex }}
                >
                  {d.name}
                </span>
                <span className="relative z-10 ml-2 text-[9px] opacity-70 truncate max-w-[180px] hidden sm:inline">
                  {owner
                    ? owner.isMe
                      ? "★ YOU"
                      : owner.who
                    : "— empty (house) —"}
                </span>
                <span
                  className="absolute right-0 top-0 h-full w-3 z-10"
                  style={{
                    background:
                      "repeating-linear-gradient(0deg,#2A1A33 0 4px,#fff 4px 8px)",
                  }}
                />
                <div
                  className={`absolute top-1/2 -translate-y-1/2 text-3xl will-change-transform z-20 ${
                    isWinner ? "animate-bob" : ""
                  }`}
                  style={{
                    left: `calc(2px + ${pct * 0.9}%)`,
                    transition:
                      phase === "racing" ? "left 80ms linear" : "left 0s",
                    filter: isWinner
                      ? "drop-shadow(0 0 8px #FFD86B)"
                      : "none",
                  }}
                >
                  {d.emoji}
                </div>
              </div>
            );
          })}
        </div>

        <button
          disabled={phase !== "lobby" || !commit}
          onClick={beginRace}
          className="pixel-btn !bg-arena-rose text-white"
        >
          START RACE NOW ▶
        </button>

        {phase === "result" && winnerIdx !== null && payoutSummary && commit && (
          <div className="bg-arena-mint border-4 border-arena-ink shadow-pixelSm p-3 text-[10px] leading-relaxed">
            <div className="flex items-center justify-between mb-1 flex-wrap gap-2">
              <div className="text-[13px] flex items-center gap-2">
                <span className="text-2xl">{DOGS[winnerIdx].emoji}</span>
                <span
                  className="pixel-chip"
                  style={{ background: DOGS[winnerIdx].hex }}
                >
                  LANE {winnerIdx + 1} · {DOGS[winnerIdx].name}
                </span>
                <span>
                  {payoutSummary.houseWin
                    ? "🔥 EMPTY LANE"
                    : `🏆 ${payoutSummary.winner!.isMe ? "★ YOU" : payoutSummary.winner!.who}`}
                </span>
              </div>
              {resultCountdown !== null && (
                <span className="pixel-chip bg-arena-gold text-[9px]">
                  NEXT IN {resultCountdown}s
                </span>
              )}
            </div>
            {payoutSummary.houseWin ? (
              <div className="text-arena-rose">
                Nobody backed <b>{DOGS[winnerIdx].name}</b> — entire pot{" "}
                <b>
                  {payoutSummary.pot.toFixed(2)} SOL (≈ $
                  {(payoutSummary.pot * SOL_USD).toFixed(2)})
                </b>{" "}
                sent to the treasury for buybacks (
                {payoutSummary.burn.toFixed(4)} {TOKEN_TICKER}).
              </div>
            ) : (
              <>
                <div>
                  POT: {payoutSummary.pot.toFixed(2)} SOL (≈ $
                  {(payoutSummary.pot * SOL_USD).toFixed(2)}) · BURN (5%):{" "}
                  {payoutSummary.burn.toFixed(4)} {TOKEN_TICKER}
                </div>
                <div>
                  PAYOUT (95%):{" "}
                  <b>{payoutSummary.payout.toFixed(3)} SOL</b> (≈ $
                  {(payoutSummary.payout * SOL_USD).toFixed(2)}) →{" "}
                  {payoutSummary.winner!.isMe
                    ? "★ YOU"
                    : payoutSummary.winner!.who}
                </div>
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

      {/* Below the track: pick dog + winners side-by-side */}
      <div className="grid gap-6 lg:grid-cols-[1.2fr_1fr]">
        {/* PICK YOUR DOG */}
        <div className="pixel-card p-5 flex flex-col gap-3">
          <h3 className="text-[12px] tracking-wider">PICK YOUR RUNNER</h3>
          <p className="text-[9px] opacity-70 leading-relaxed">
            15 lanes, one bet per dog, one ticket per wallet at{" "}
            <b>{BET_AMOUNT.toFixed(1)} SOL</b>. Empty lanes route to the
            treasury if they win — currently{" "}
            <b>{emptyLanes}/{DOG_COUNT}</b> empty ={" "}
            {((emptyLanes / DOG_COUNT) * 100).toFixed(1)}% house odds. Race
            auto-starts every 2 minutes.
          </p>
          {phase === "lobby" ? (
            <>
              <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
                {DOGS.map((d) => {
                  const owner = tickets.find((t) => t.dogIdx === d.idx);
                  const mine = !!owner?.isMe;
                  const taken = !!owner && !mine;
                  const isSelected = selected === d.idx;
                  return (
                    <button
                      key={d.idx}
                      onClick={() => {
                        if (mine) {
                          releaseMyTicket();
                          return;
                        }
                        if (taken) return;
                        if (meHasTicket) return;
                        setSelected((cur) => (cur === d.idx ? null : d.idx));
                      }}
                      disabled={taken || (meHasTicket && !mine)}
                      title={
                        mine
                          ? `${d.name} — yours (click to release)`
                          : taken
                            ? `${d.name} — taken by ${owner!.who}`
                            : isSelected
                              ? `${d.name} — selected`
                              : `${d.name} — tap to select`
                      }
                      className={`h-16 border-4 border-arena-ink shadow-pixelSm relative flex flex-col items-center justify-center ${
                        taken || (meHasTicket && !mine)
                          ? "opacity-40 cursor-not-allowed"
                          : ""
                      } ${
                        mine || isSelected
                          ? "ring-4 ring-arena-ink ring-offset-2 ring-offset-arena-panel"
                          : ""
                      }`}
                      style={{ background: d.hex }}
                    >
                      <span className="absolute top-0 left-0 text-[7px] px-1 bg-arena-ink text-arena-lemon">
                        {d.idx + 1}
                      </span>
                      <span className="text-xl leading-none">{d.emoji}</span>
                      <span className="text-[9px] mt-0.5 font-bold">{d.name}</span>
                      {mine && (
                        <span className="absolute top-0 right-0 text-[8px] px-1 bg-arena-ink text-arena-lemon">
                          ★
                        </span>
                      )}
                      {isSelected && !mine && (
                        <span className="absolute top-0 right-0 text-[8px] px-1 bg-arena-ink text-arena-lemon">
                          ✦
                        </span>
                      )}
                      {taken && (
                        <span className="absolute bottom-0 right-0 text-[8px] px-1 opacity-70">
                          🤖
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>

              <div className="bg-arena-lemon border-4 border-arena-ink shadow-pixelSm p-2 text-[10px] flex items-center justify-between">
                <span>
                  SELECTED: <b>{selectedDog ? selectedDog.name : "—"}</b>
                </span>
                <span>
                  PRICE <b>{BET_AMOUNT.toFixed(1)} SOL</b>
                </span>
              </div>

              <button
                onClick={buyTicket}
                disabled={
                  meHasTicket ||
                  selected === null ||
                  tickets.some((t) => t.dogIdx === selected) ||
                  !commit
                }
                className="pixel-btn !bg-arena-gold"
              >
                {meHasTicket
                  ? "TICKET OWNED · 1 PER ROUND"
                  : `BUY TICKET · ${BET_AMOUNT.toFixed(1)} SOL`}
              </button>

              {meHasTicket && (
                <div className="bg-arena-mint border-4 border-arena-ink shadow-pixelSm p-2 text-[10px] flex items-center justify-between">
                  <span>
                    YOUR DOG:{" "}
                    <b>
                      {DOGS[tickets.find((t) => t.isMe)!.dogIdx].name}
                    </b>{" "}
                    · ODDS <b>{(100 / DOG_COUNT).toFixed(1)}%</b>
                  </span>
                  <button
                    onClick={releaseMyTicket}
                    className="pixel-btn !bg-arena-coral !py-1 !px-2 text-[9px]"
                  >
                    RELEASE
                  </button>
                </div>
              )}
            </>
          ) : (
            <p className="text-[10px] opacity-70">Round in progress. Sit tight…</p>
          )}
        </div>

        {/* WINNERS + COMMIT */}
        <div className="flex flex-col gap-4">
          <div className="pixel-card p-4 flex flex-col gap-2">
            <h3 className="text-[12px] tracking-wider">LAST 5 WINNERS</h3>
            {recentWinners.race.length === 0 ? (
              <p className="text-[9px] opacity-60">No races yet this session.</p>
            ) : (
              recentWinners.race.map((w) => (
                <div
                  key={w.id}
                  className={`flex items-center gap-2 text-[10px] border-2 border-arena-ink p-2 ${
                    w.isMe
                      ? "bg-arena-lemon"
                      : w.houseWin
                        ? "bg-arena-coral"
                        : "bg-white"
                  }`}
                >
                  <span
                    className="w-4 h-4 border-2 border-arena-ink"
                    style={{ background: w.badge.hex }}
                  />
                  <span className="flex-1 truncate">
                    {w.houseWin ? "🔥 HOUSE" : w.isMe ? "★ YOU" : w.winnerLabel}
                  </span>
                  <span className="opacity-70">{w.badge.name}</span>
                  <span className="pixel-chip">{w.pot.toFixed(2)} SOL</span>
                </div>
              ))
            )}
          </div>

          <div className="pixel-card p-4 text-[8px] leading-relaxed">
            <div className="flex items-center justify-between gap-2">
              <span className="opacity-70 tracking-wider">FAIRNESS COMMIT</span>
              <span className="pixel-chip bg-arena-lemon text-[7px]">
                1/{DOG_COUNT} EACH
              </span>
            </div>
            <div className="font-bold mt-1 break-all">0x{shortHash}</div>
            <div className="opacity-70 mt-1">
              SHA-256 of a 32-byte seed. Seed is revealed after the race so
              anyone can verify winner = parseInt(seed[0..8], 16) mod{" "}
              {DOG_COUNT}.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
