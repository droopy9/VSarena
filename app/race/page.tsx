import { RaceGame } from "@/components/RaceGame";

export default function RacePage() {
  return (
    <div className="flex flex-col gap-5">
      <header className="flex flex-col gap-2">
        <span className="pixel-chip bg-arena-lavender w-fit">
          ROOM 03 · DOG RACE
        </span>
        <h1 className="text-[20px] md:text-[28px] tracking-wider">
          15 DOGS. ONE FINISH LINE.
        </h1>
        <p className="text-[10px] md:text-[11px] opacity-80 max-w-2xl leading-relaxed">
          Pick a dog, buy a 0.1 SOL ticket. One bettor per dog, one ticket per
          wallet per round. Race auto-starts every 2 minutes. Winner takes 95%,
          5% buys back $ARENA. If an empty lane wins, the entire pot is sent to
          the treasury for buybacks.
        </p>
      </header>
      <RaceGame />
    </div>
  );
}
