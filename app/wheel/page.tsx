import { WheelGame } from "@/components/WheelGame";

export default function WheelPage() {
  return (
    <div className="flex flex-col gap-5">
      <header className="flex flex-col gap-2">
        <span className="pixel-chip bg-arena-pink w-fit">ROOM 01 · WHEEL OF FORTUNE</span>
        <h1 className="text-[20px] md:text-[28px] tracking-wider">ONE TICKET. ONE SHOT. STEAL THE POT.</h1>
        <p className="text-[10px] md:text-[11px] opacity-80 max-w-2xl leading-relaxed">
          Up to 15 players. Every ticket is $2 and every slice is equal —
          flat 1/N odds. One spin, one winner takes 95% of the pot. The
          remaining 5% buys back $ARENA and burns it.
        </p>
      </header>
      <WheelGame />
    </div>
  );
}
