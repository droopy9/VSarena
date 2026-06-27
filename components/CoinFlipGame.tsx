"use client";

import { useEffect, useRef, useState } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import { TOKEN_TICKER } from "@/lib/config";
import { useStats } from "@/lib/stats-store";

type Side = "HEADS" | "TAILS";

type Room = {
  id: string;
  host: string;
  bet: number;
  hostSide: Side;
  status: "open" | "playing" | "settled";
  opponent?: string;
  winner?: "host" | "opponent";
  flipResult?: Side;
  isMine?: boolean;
};

const HOSTS = [
  "0xMochi", "gumdrop", "ape0x", "neonNyx",
  "blockyBea", "sunny.sol", "lemonLad", "bubblez",
];

let idCounter = 1000;
const newId = () => `r${idCounter++}`;

function shortAddress(addr?: string) {
  if (!addr) return "you";
  return `${addr.slice(0, 4)}…${addr.slice(-4)}`;
}

function seedRooms(): Room[] {
  const out: Room[] = [];
  const bets = [0.25, 0.5, 1, 2, 5, 10];
  for (let i = 0; i < 5; i++) {
    out.push({
      id: newId(),
      host: HOSTS[i % HOSTS.length],
      bet: bets[Math.floor(Math.random() * bets.length)],
      hostSide: Math.random() < 0.5 ? "HEADS" : "TAILS",
      status: "open",
    });
  }
  return out;
}

export function CoinFlipGame() {
  const { publicKey } = useWallet();
  const { recordRound } = useStats();

  const [rooms, setRooms] = useState<Room[]>(() => seedRooms());
  const [bet, setBet] = useState("1");
  const [side, setSide] = useState<Side>("HEADS");
  const [flippingId, setFlippingId] = useState<string | null>(null);
  const [flipFace, setFlipFace] = useState<Side>("HEADS");
  const [flipSpin, setFlipSpin] = useState(0);
  const recordedRef = useRef<Set<string>>(new Set());

  const myAddr = shortAddress(publicKey?.toBase58());

  const createRoom = () => {
    const b = Number(bet);
    if (!Number.isFinite(b) || b <= 0) return;
    setRooms((cur) => [
      {
        id: newId(),
        host: myAddr,
        bet: b,
        hostSide: side,
        status: "open",
        isMine: true,
      },
      ...cur,
    ]);
  };

  const cancelRoom = (id: string) => {
    setRooms((cur) => cur.filter((r) => r.id !== id));
  };

  const joinRoom = (room: Room) => {
    if (room.status !== "open") return;
    const result: Side = Math.random() < 0.5 ? "HEADS" : "TAILS";
    const hostWon = result === room.hostSide;
    setRooms((cur) =>
      cur.map((r) =>
        r.id === room.id
          ? {
              ...r,
              status: "playing",
              opponent: room.isMine ? "challenger" : myAddr,
              flipResult: result,
              winner: hostWon ? "host" : "opponent",
            }
          : r,
      ),
    );
    // animate
    setFlippingId(room.id);
    setFlipFace("HEADS");
    setFlipSpin(0);
    requestAnimationFrame(() => {
      const turns = 6 + Math.floor(Math.random() * 3);
      const target = turns * 360 + (result === "HEADS" ? 0 : 180);
      setFlipSpin(target);
    });
    window.setTimeout(() => {
      setFlipFace(result);
      setRooms((cur) =>
        cur.map((r) =>
          r.id === room.id ? { ...r, status: "settled" } : r,
        ),
      );
      setFlippingId(null);
    }, 1800);
  };

  // Settle stats once per resolved room
  useEffect(() => {
    rooms.forEach((r) => {
      if (r.status === "settled" && !recordedRef.current.has(r.id)) {
        recordedRef.current.add(r.id);
        recordRound(r.bet * 2);
      }
    });
  }, [rooms, recordRound]);

  // Occasionally spawn a new bot room
  useEffect(() => {
    const t = window.setInterval(() => {
      setRooms((cur) => {
        const openBotRooms = cur.filter((r) => r.status === "open" && !r.isMine);
        if (openBotRooms.length >= 6) return cur;
        const bets = [0.1, 0.5, 1, 2, 5, 10, 25];
        return [
          {
            id: newId(),
            host: HOSTS[Math.floor(Math.random() * HOSTS.length)],
            bet: bets[Math.floor(Math.random() * bets.length)],
            hostSide: Math.random() < 0.5 ? "HEADS" : "TAILS",
            status: "open",
          },
          ...cur,
        ];
      });
    }, 9000);
    return () => window.clearInterval(t);
  }, []);

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_1.2fr]">
      {/* CREATE PANEL */}
      <div className="flex flex-col gap-4">
        <div className="pixel-card p-5 flex flex-col gap-3">
          <h3 className="text-[12px] tracking-wider">CREATE A ROOM</h3>
          <label className="text-[10px]">YOUR BET ($)</label>
          <input
            type="number"
            min="0.1"
            step="0.1"
            value={bet}
            onChange={(e) => setBet(e.target.value)}
            className="pixel-input"
          />
          <label className="text-[10px]">YOUR SIDE</label>
          <div className="grid grid-cols-2 gap-2">
            {(["HEADS", "TAILS"] as Side[]).map((s) => (
              <button
                key={s}
                onClick={() => setSide(s)}
                className={`pixel-btn ${
                  side === s ? "!bg-arena-gold" : "!bg-arena-aqua"
                }`}
              >
                {s === "HEADS" ? "👑 HEADS" : "🌀 TAILS"}
              </button>
            ))}
          </div>
          <button onClick={createRoom} className="pixel-btn !bg-arena-rose text-white">
            OPEN ROOM
          </button>
          <p className="text-[9px] opacity-70 leading-relaxed">
            Winner takes 95% of the pot. 5% buys back & burns {TOKEN_TICKER}.
          </p>
        </div>

        {/* COIN PREVIEW */}
        <div className="pixel-card p-5 flex flex-col items-center gap-3">
          <h3 className="text-[12px] tracking-wider self-start">LIVE FLIP</h3>
          <div className="w-40 h-40 perspective-[600px] grid place-items-center">
            <div
              className="w-32 h-32 rounded-full border-4 border-arena-ink relative"
              style={{
                background: flipFace === "HEADS" ? "#FFD86B" : "#C7B3FF",
                transform: `rotateY(${flipSpin}deg)`,
                transition: flippingId
                  ? "transform 1.6s cubic-bezier(0.2, 0.7, 0.2, 1)"
                  : "transform 0s",
              }}
            >
              <div className="absolute inset-0 grid place-items-center text-3xl">
                {flipFace === "HEADS" ? "👑" : "🌀"}
              </div>
            </div>
          </div>
          <p className="text-[10px] opacity-70">
            {flippingId ? "Flipping…" : "Idle. Join a room to flip."}
          </p>
        </div>
      </div>

      {/* ROOM LIST */}
      <div className="pixel-card p-5 flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <h3 className="text-[12px] tracking-wider">OPEN ROOMS</h3>
          <span className="pixel-chip bg-arena-mint">
            {rooms.filter((r) => r.status === "open").length} LIVE
          </span>
        </div>
        <div className="flex flex-col gap-2 max-h-[560px] overflow-auto pr-1">
          {rooms.map((r) => (
            <RoomRow
              key={r.id}
              room={r}
              myAddr={myAddr}
              onJoin={() => joinRoom(r)}
              onCancel={() => cancelRoom(r.id)}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

function RoomRow({
  room,
  myAddr,
  onJoin,
  onCancel,
}: {
  room: Room;
  myAddr: string;
  onJoin: () => void;
  onCancel: () => void;
}) {
  const pot = room.bet * 2;
  const payout = pot * 0.95;
  const burn = pot * 0.05;
  return (
    <div
      className={`border-4 border-arena-ink p-3 flex flex-col gap-2 ${
        room.isMine ? "bg-arena-lemon" : "bg-white"
      }`}
    >
      <div className="flex flex-wrap items-center gap-2">
        <span className="pixel-chip bg-arena-sky text-[8px]">#{room.id}</span>
        <span className="text-[10px] flex-1 truncate">
          {room.isMine ? "★ " : ""}
          HOST <b>{room.host}</b>
        </span>
        <span className="pixel-chip" style={{ background: room.hostSide === "HEADS" ? "#FFD86B" : "#C7B3FF" }}>
          {room.hostSide === "HEADS" ? "👑 H" : "🌀 T"}
        </span>
        <span className="text-[10px]">
          BET <b>${room.bet.toFixed(2)}</b>
        </span>
      </div>

      {room.status === "open" && (
        <div className="flex gap-2">
          {room.isMine ? (
            <button onClick={onCancel} className="pixel-btn !bg-arena-coral !py-2">
              CANCEL
            </button>
          ) : (
            <button onClick={onJoin} className="pixel-btn !bg-arena-mint !py-2">
              JOIN · ${room.bet.toFixed(2)} ▶
            </button>
          )}
          <span className="text-[9px] opacity-60 self-center">
            POT ${pot.toFixed(2)} · WIN ${payout.toFixed(2)}
          </span>
        </div>
      )}

      {room.status === "playing" && (
        <div className="text-[10px] flex items-center gap-2">
          <span className="pixel-chip bg-arena-gold">FLIPPING…</span>
          <span className="opacity-70">vs {room.opponent}</span>
        </div>
      )}

      {room.status === "settled" && (
        <div className="text-[10px] flex flex-col gap-1 bg-arena-mint border-2 border-arena-ink p-2">
          <div>
            RESULT: <b>{room.flipResult}</b> · WINNER:{" "}
            <b>
              {room.winner === "host"
                ? room.host
                : room.opponent === myAddr
                  ? "YOU"
                  : room.opponent ?? "?"}
            </b>
          </div>
          <div className="opacity-80">
            PAYOUT ${payout.toFixed(2)} · BURN {burn.toFixed(4)} {TOKEN_TICKER}
          </div>
        </div>
      )}
    </div>
  );
}
