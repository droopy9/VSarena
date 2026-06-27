"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { FEE_BPS, PAYOUT_BPS } from "./config";

export type Stats = {
  totalWagered: number;
  totalBurned: number;
  totalBuybacks: number;
  roundsPlayed: number;
};

type StatsContextValue = Stats & {
  recordRound: (
    pot: number,
    opts?: { houseWin?: boolean },
  ) => { winnerPayout: number; burn: number };
};

const StatsContext = createContext<StatsContextValue | null>(null);

const SEED: Stats = {
  totalWagered: 18420.5,
  totalBurned: 921.025,
  totalBuybacks: 921.025,
  roundsPlayed: 1342,
};

export function StatsProvider({ children }: { children: ReactNode }) {
  const [stats, setStats] = useState<Stats>(SEED);

  const recordRound = useCallback(
    (pot: number, opts?: { houseWin?: boolean }) => {
      // House-win: nobody bet on the winning slot/dog, so the whole pot is
      // routed to buyback+burn instead of a player payout.
      const winnerPayout = opts?.houseWin ? 0 : (pot * PAYOUT_BPS) / 10000;
      const burn = opts?.houseWin ? pot : (pot * FEE_BPS) / 10000;
      setStats((prev) => ({
        totalWagered: prev.totalWagered + pot,
        totalBurned: prev.totalBurned + burn,
        totalBuybacks: prev.totalBuybacks + burn,
        roundsPlayed: prev.roundsPlayed + 1,
      }));
      return { winnerPayout, burn };
    },
    [],
  );

  const value = useMemo<StatsContextValue>(
    () => ({ ...stats, recordRound }),
    [stats, recordRound],
  );

  return <StatsContext.Provider value={value}>{children}</StatsContext.Provider>;
}

export function useStats() {
  const ctx = useContext(StatsContext);
  if (!ctx) throw new Error("useStats must be used inside StatsProvider");
  return ctx;
}
