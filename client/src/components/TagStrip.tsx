interface Tag {
  label: string;
  sublabel?: string;
  muted?: boolean;
}

interface TagStripProps {
  tags: Tag[];
  variant?: "hero" | "compact";
}

/**
 * The signature motif: a row of neighborhood-category chips. Used large on
 * the Home hero (the product's actual pitch — matching by what's nearby, not
 * a filter form) and small under every result card (the literal "why this
 * matched" explanation, e.g. "카페 3곳 · 32m").
 */
export function TagStrip({ tags, variant = "compact" }: TagStripProps) {
  const isHero = variant === "hero";
  return (
    <div className={`flex flex-wrap gap-2 ${isHero ? "gap-3" : "gap-1.5"}`}>
      {tags.map((tag, i) => (
        <span
          key={`${tag.label}-${i}`}
          className={`inline-flex items-center gap-1.5 rounded-full border font-medium ${
            isHero ? "px-4 py-2 text-base" : "px-2.5 py-1 text-xs"
          } ${
            tag.muted
              ? "border-slate-light/40 bg-white/40 text-slate"
              : "border-terracotta/30 bg-terracotta/10 text-terracotta-dark"
          }`}
        >
          {tag.label}
          {tag.sublabel && <span className="font-mono text-[0.85em] opacity-70">{tag.sublabel}</span>}
        </span>
      ))}
    </div>
  );
}
