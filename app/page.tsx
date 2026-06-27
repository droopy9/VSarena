import { RoomCard } from "@/components/RoomCard";

export default function Page() {
  return (
    <div className="flex flex-col gap-8">
      <section className="pixel-card p-6 md:p-10 relative scanlines overflow-hidden">
        <div className="flex flex-col gap-4">
          <span className="pixel-chip bg-arena-lemon w-fit">ON-CHAIN · SOLANA</span>
          <h1 className="text-[22px] md:text-[36px] leading-snug tracking-wider">
            PLAY. <span className="text-arena-rose">BET.</span>{" "}
            <span className="text-arena-grape">BURN.</span>
          </h1>
          <p className="text-[11px] md:text-[12px] leading-relaxed max-w-xl opacity-80">
            Pick a room. Wager $ARENA against the lobby. Winner takes 95% — the
            other 5% buys back $ARENA and burns it forever.
          </p>
        </div>
        <div className="absolute -right-6 -bottom-6 text-[120px] md:text-[180px] opacity-20 select-none">
          🎰
        </div>
      </section>

      <section className="grid gap-4 md:gap-6 grid-cols-1 md:grid-cols-3">
        <RoomCard
          title="WHEEL OF FORTUNE"
          tag="ROOM 01"
          emoji="🎡"
          bg="bg-arena-pink"
          href="/wheel"
          blurb="15 colour slots. 0.05 SOL per ticket, equal odds. One spin every 2 minutes."
        />
        <RoomCard
          title="COIN FLIP"
          tag="ROOM 02"
          emoji="🪙"
          bg="bg-arena-sky"
          href="/flip"
          blurb="1v1. Create a room with any wager. First to call wins. Heads or tails — pure entropy."
        />
        <RoomCard
          title="DOG RACE"
          tag="ROOM 03"
          emoji="🐕"
          bg="bg-arena-lavender"
          href="/race"
          blurb="15 dogs, 15 lanes. One ticket per dog. Race auto-starts every 2 minutes."
        />
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        {[
          { n: "01", t: "CONNECT", d: "Link Phantom or Solflare." },
          { n: "02", t: "WAGER", d: "Pick a room, set your bet, pick your side." },
          { n: "03", t: "WIN OR BURN", d: "95% pays the winner. 5% burns $ARENA forever." },
        ].map((s) => (
          <div key={s.n} className="bg-arena-mint border-4 border-arena-ink shadow-pixelSm p-4">
            <div className="text-[10px] opacity-60">STEP {s.n}</div>
            <div className="text-[14px] mt-1 mb-2">{s.t}</div>
            <p className="text-[10px] opacity-80 leading-relaxed">{s.d}</p>
          </div>
        ))}
      </section>
    </div>
  );
}
