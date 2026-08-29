/** Tiny FR / EN flags for ask-direction chips and reveal screens. */
export function LangFlag({ lang, className = "" }: { lang: "en" | "fr"; className?: string }) {
  const label = lang === "en" ? "English" : "French";
  return (
    <span
      className={`inline-flex shrink-0 items-center overflow-hidden rounded-[0.15em] shadow-[0_0_0_1px_oklch(0.55_0.02_255_/_0.22)] ${className}`}
      title={label}
      aria-label={label}
      role="img"
    >
      {lang === "en" ? (
        <svg viewBox="0 0 60 40" width="1.15em" height="0.77em" aria-hidden>
          <rect width="60" height="40" fill="#012169" />
          <path d="M0 0 L60 40 M60 0 L0 40" stroke="#fff" strokeWidth="8" />
          <path d="M0 0 L60 40 M60 0 L0 40" stroke="#C8102E" strokeWidth="5" />
          <path d="M30 0 V40 M0 20 H60" stroke="#fff" strokeWidth="13" />
          <path d="M30 0 V40 M0 20 H60" stroke="#C8102E" strokeWidth="7" />
        </svg>
      ) : (
        <svg viewBox="0 0 60 40" width="1.15em" height="0.77em" aria-hidden>
          <rect width="20" height="40" fill="#002395" />
          <rect x="20" width="20" height="40" fill="#fff" />
          <rect x="40" width="20" height="40" fill="#ED2939" />
        </svg>
      )}
    </span>
  );
}
