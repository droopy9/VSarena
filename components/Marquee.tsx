export function Marquee({ items }: { items: string[] }) {
  const doubled = [...items, ...items];
  return (
    <div className="bg-arena-ink text-arena-lemon overflow-hidden border-y-4 border-arena-ink">
      <div className="marquee-track flex gap-12 whitespace-nowrap py-2 text-[10px] tracking-widest">
        {doubled.map((t, i) => (
          <span key={i} className="flex items-center gap-3">
            <span className="text-arena-pink">◆</span>
            {t}
          </span>
        ))}
      </div>
    </div>
  );
}
