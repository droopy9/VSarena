import { WheelGame } from "@/components/WheelGame";

export default function WheelPage() {
  return (
    <div className="flex flex-col gap-5">
      <header className="flex flex-col gap-2">
        <span className="pixel-chip bg-arena-pink w-fit">ROOM 01 · WHEEL OF FORTUNE</span>
        <h1 className="text-[20px] md:text-[28px] tracking-wider">ONE TICKET. ONE SHOT. STEAL THE POT.</h1>
        <p className="text-[10px] md:text-[11px] opacity-80 max-w-2xl leading-relaxed">
          15 colour slots, every spin. Tickets are 0.05 SOL — one per wallet
          per round. Wheel auto-spins every 2 minutes. Winner takes 95% of
          the pot, 5% buys back $ARENA. Empty slots route the whole pot to
          the treasury for buybacks.
        </p>
      </header>
      <WheelGame />
    </div>
  );
}
