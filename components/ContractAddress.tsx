"use client";

import { useState } from "react";
import { CONTRACT_ADDRESS, TOKEN_TICKER } from "@/lib/config";

export function ContractAddress() {
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(CONTRACT_ADDRESS);
      setCopied(true);
      setTimeout(() => setCopied(false), 1400);
    } catch {
      /* ignore */
    }
  };

  const short = `${CONTRACT_ADDRESS.slice(0, 6)}…${CONTRACT_ADDRESS.slice(-6)}`;

  return (
    <button
      onClick={copy}
      className="group flex items-center gap-2 bg-arena-lemon border-4 border-arena-ink shadow-pixelSm px-3 py-2 hover:-translate-x-[1px] hover:-translate-y-[1px] hover:shadow-pixel transition"
      title="Copy contract address"
    >
      <span className="pixel-chip bg-arena-pink text-[8px]">${TOKEN_TICKER}</span>
      <span className="text-[10px] tracking-wider">CA</span>
      <span className="text-[10px] tracking-tighter font-bold hidden sm:inline">
        {short}
      </span>
      <span className="text-[10px] tracking-tighter font-bold sm:hidden">
        {CONTRACT_ADDRESS.slice(0, 4)}…
      </span>
      <span
        className={`text-[9px] px-2 py-1 border-2 border-arena-ink ${
          copied ? "bg-arena-mint" : "bg-white group-hover:bg-arena-sky"
        }`}
      >
        {copied ? "COPIED!" : "COPY"}
      </span>
    </button>
  );
}
