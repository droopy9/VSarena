"use client";

import { useState } from "react";

export function ChatTeaser() {
  const [open, setOpen] = useState(false);
  return (
    <div className="fixed bottom-4 right-4 z-40">
      {open && (
        <div className="mb-2 w-72 pixel-card p-3 flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <span className="text-[10px]">ARENA CHAT</span>
            <span className="pixel-chip bg-arena-lemon">SOON</span>
          </div>
          <div className="bg-white border-2 border-arena-ink h-32 p-2 text-[9px] overflow-hidden">
            <p className="opacity-70">[ system ]</p>
            <p>Live chat lands in v2. Talk trash with the lobby while you bet.</p>
            <p className="mt-2 opacity-50">…</p>
          </div>
          <input
            disabled
            placeholder="Type a message…"
            className="pixel-input opacity-50"
          />
        </div>
      )}
      <button
        onClick={() => setOpen((v) => !v)}
        className="pixel-btn !bg-arena-grape"
        aria-label="Open chat preview"
      >
        {open ? "× CLOSE" : "💬 CHAT"}
      </button>
    </div>
  );
}
