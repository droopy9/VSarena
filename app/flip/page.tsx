import { CoinFlipGame } from "@/components/CoinFlipGame";

export default function FlipPage() {
  return (
    <div className="flex flex-col gap-5">
      <header className="flex flex-col gap-2">
        <span className="pixel-chip bg-arena-sky w-fit">ROOM 02 · COIN FLIP</span>
        <h1 className="text-[20px] md:text-[28px] tracking-wider">1v1. ONE COIN. ONE WINNER.</h1>
        <p className="text-[10px] md:text-[11px] opacity-80 max-w-2xl leading-relaxed">
          Create a room at any wager, pick your side. The first challenger who
          matches your stake triggers the flip. Winner takes 95% of the pot.
          5% buys back $ARENA and burns it forever.
        </p>
      </header>
      <CoinFlipGame />
    </div>
  );
}
