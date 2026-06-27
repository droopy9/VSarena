import Link from "next/link";

type Props = {
  title: string;
  tag: string;
  blurb: string;
  href?: string;
  bg: string;
  comingSoon?: boolean;
  emoji: string;
};

export function RoomCard({ title, tag, blurb, href, bg, comingSoon, emoji }: Props) {
  const inner = (
    <div className={`${bg} border-4 border-arena-ink shadow-pixelLg p-5 flex flex-col gap-3 h-full`}>
      <div className="flex items-center justify-between">
        <span className="pixel-chip bg-white">{tag}</span>
        {comingSoon && <span className="pixel-chip bg-arena-ink text-arena-lemon">SOON</span>}
      </div>
      <div className="text-5xl md:text-6xl py-2 select-none animate-bob">{emoji}</div>
      <h3 className="text-[14px] tracking-wider">{title}</h3>
      <p className="text-[10px] leading-relaxed opacity-80">{blurb}</p>
      <div className="mt-auto pt-2">
        <span className="pixel-btn !bg-white">
          {comingSoon ? "COMING SOON" : "ENTER ROOM →"}
        </span>
      </div>
    </div>
  );

  if (comingSoon || !href) {
    return <div className="opacity-90 pointer-events-none">{inner}</div>;
  }
  return (
    <Link href={href} className="block focus:outline-none">
      {inner}
    </Link>
  );
}
