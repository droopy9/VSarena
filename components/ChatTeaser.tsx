"use client";

import { useEffect, useRef, useState } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import { WHEEL_COLORS } from "@/lib/colors";

type Msg = {
  id: string;
  user: string;
  text: string;
  isMe: boolean;
  isSystem?: boolean;
  color: string;
  ts: number;
};

const BOT_NAMES = [
  "0xMochi", "gumdrop", "ape0x", "neonNyx",
  "blockyBea", "sunny.sol", "lemonLad", "bubblez",
  "byteBoi", "pasteller", "marshmal", "candyCat",
  "wagerWiz", "rugRanger", "pixL_kid",
];

const BOT_MESSAGES = [
  "wagmi",
  "wheel rigged 🤬",
  "anyone in for a 1 SOL flip?",
  "wif printing 📈",
  "house won AGAIN smh",
  "doge winning streak 🐕",
  "down bad fr",
  "5th burn this hour",
  "race in 30s lmao",
  "lemme cook",
  "fr fr",
  "this room cooks",
  "bonk to da moon",
  "i love losing money",
  "scammed by chillguy",
  "next race ill ape jotchua",
  "gm chat",
  "gn losers",
  "babydoge slot just hit",
  "pepe lane is FREE rn",
  "popcat 🐱",
  "5% burn? more like 5% gm fee",
  "anyone got a phantom airdrop key",
  "shib for the win",
  "akita locked in",
];

function colorFor(name: string) {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) | 0;
  const idx = Math.abs(h) % WHEEL_COLORS.length;
  return WHEEL_COLORS[idx].hex;
}

function shortAddress(addr?: string) {
  if (!addr) return "you";
  return `${addr.slice(0, 4)}…${addr.slice(-4)}`;
}

let idCounter = 0;
const newId = (prefix: string) => `${prefix}-${++idCounter}`;

export function ChatTeaser() {
  const { publicKey, connected } = useWallet();
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [draft, setDraft] = useState("");
  const [unread, setUnread] = useState(0);
  const scrollRef = useRef<HTMLDivElement>(null);
  const seededRef = useRef(false);

  const myAddr = shortAddress(publicKey?.toBase58());
  const myColor = "#FF8FBD";

  // Seed welcome message on the client (avoids hydration mismatch).
  useEffect(() => {
    if (seededRef.current) return;
    seededRef.current = true;
    setMessages([
      {
        id: newId("sys"),
        user: "system",
        text: "Welcome to ARCADIA chat. Be nice. 🌸",
        isMe: false,
        isSystem: true,
        color: "#FFD86B",
        ts: Date.now(),
      },
    ]);
  }, []);

  // Bot trickle — keeps the lobby feeling alive.
  useEffect(() => {
    let cancelled = false;
    const schedule = () => {
      if (cancelled) return;
      const delay = 4500 + Math.random() * 5500;
      window.setTimeout(() => {
        if (cancelled) return;
        const name = BOT_NAMES[Math.floor(Math.random() * BOT_NAMES.length)];
        const text = BOT_MESSAGES[Math.floor(Math.random() * BOT_MESSAGES.length)];
        setMessages((cur) => {
          const entry: Msg = {
            id: newId("b"),
            user: name,
            text,
            isMe: false,
            color: colorFor(name),
            ts: Date.now(),
          };
          return [...cur.slice(-49), entry];
        });
        schedule();
      }, delay);
    };
    schedule();
    return () => {
      cancelled = true;
    };
  }, []);

  // Auto-scroll on new message.
  useEffect(() => {
    if (!scrollRef.current) return;
    scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages, open]);

  // Track unread when closed; clear when opened.
  useEffect(() => {
    if (open) setUnread(0);
  }, [open]);
  useEffect(() => {
    if (open) return;
    setUnread((u) => Math.min(u + 1, 99));
  }, [messages.length, open]);

  const send = () => {
    if (!connected) return;
    const trimmed = draft.trim();
    if (!trimmed) return;
    setMessages((cur) => [
      ...cur.slice(-49),
      {
        id: newId("me"),
        user: myAddr,
        text: trimmed,
        isMe: true,
        color: myColor,
        ts: Date.now(),
      },
    ]);
    setDraft("");
  };

  return (
    <div className="fixed bottom-4 right-4 z-40">
      {open && (
        <div className="mb-2 w-[320px] pixel-card p-3 flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <span className="text-[10px] tracking-wider">ARCADIA CHAT</span>
            <span className="pixel-chip bg-arena-mint text-[8px]">LIVE</span>
          </div>
          <div
            ref={scrollRef}
            className="bg-white border-2 border-arena-ink h-72 p-2 text-[9px] overflow-y-auto flex flex-col gap-1.5"
          >
            {messages.map((m) => (
              <div key={m.id} className="flex items-start gap-1.5">
                <span
                  className="px-1.5 py-0.5 border-2 border-arena-ink text-[8px] tracking-wide whitespace-nowrap"
                  style={{ background: m.isSystem ? "#FFD86B" : m.color }}
                >
                  {m.isMe ? "★ " : ""}
                  {m.user}
                </span>
                <span className="break-words flex-1 text-[10px] leading-snug pt-0.5">
                  {m.text}
                </span>
              </div>
            ))}
          </div>
          {connected ? (
            <div className="flex gap-1">
              <input
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") send();
                }}
                placeholder="Talk trash…"
                maxLength={140}
                className="pixel-input flex-1 !py-1 !text-[10px]"
              />
              <button
                onClick={send}
                disabled={!draft.trim()}
                className="pixel-btn !py-1 !px-2 !bg-arena-gold !text-[10px]"
              >
                SEND
              </button>
            </div>
          ) : (
            <div className="bg-arena-coral border-2 border-arena-ink p-2 text-[9px] text-center">
              Connect wallet to chat.
            </div>
          )}
        </div>
      )}
      <button
        onClick={() => setOpen((v) => !v)}
        className="pixel-btn !bg-arena-grape relative"
      >
        {open ? "× CLOSE" : "💬 CHAT"}
        {!open && unread > 0 && (
          <span className="absolute -top-2 -right-2 bg-arena-rose border-2 border-arena-ink text-[8px] px-1 py-0.5 leading-none">
            {unread > 99 ? "99+" : unread}
          </span>
        )}
      </button>
    </div>
  );
}
