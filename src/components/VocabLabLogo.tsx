const LETTERS = [
  { ch: "V", color: "var(--wheel-1)", cap: true },
  { ch: "o", color: "var(--wheel-2)" },
  { ch: "c", color: "var(--wheel-3)" },
  { ch: "a", color: "var(--wheel-4)" },
  { ch: "b", color: "var(--wheel-6)" },
  { ch: "L", color: "var(--wheel-1)", cap: true },
  { ch: "a", color: "var(--wheel-2)" },
  { ch: "b", color: "var(--wheel-3)" },
] as const;

/** Colourful text wordmark — capitals slightly larger than the rest. */
export function VocabLabLogo({ className = "" }: { className?: string }) {
  return (
    <span className={`vocablab-logo ${className}`}>
      <span className="vocablab-logo-word font-kids" aria-hidden="true">
        {LETTERS.map((letter, i) => (
          <span
            key={`${letter.ch}-${i}`}
            className={"cap" in letter && letter.cap ? "is-cap" : undefined}
            style={{ color: letter.color }}
          >
            {letter.ch}
          </span>
        ))}
      </span>
      <span className="sr-only">VocabLab</span>
    </span>
  );
}
