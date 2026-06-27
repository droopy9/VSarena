import { RaceGame } from "@/components/RaceGame";

export default function RacePage() {
  return (
    <div className="flex flex-col gap-5">
      <header className="flex flex-col gap-2">
        <span className="pixel-chip bg-arena-lavender w-fit">
          ROOM 03 · DOG RACE
        </span>
        <h1 className="text-[20px] md:text-[28px] tracking-wider">
          8 DOGS. ONE FINISH LINE.
        </h1>
        <p className="text-[10px] md:text-[11px] opacity-80 max-w-2xl leading-relaxed">
          Pick a dog, drop 0.1 SOL. Stack as many bets on as many dogs as you
          like. Winners split 95% of the pool by their share of bets on the
          winning dog. The other 5% buys back $ARENA and burns it forever.
        </p>
      </header>
      <RaceGame />
    </div>
  );
}
