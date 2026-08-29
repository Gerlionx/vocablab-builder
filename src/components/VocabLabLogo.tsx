const LETTERS = [
  { ch: "V", color: "var(--wheel-1)" },
  { ch: "o", color: "var(--wheel-2)" },
  { ch: "c", color: "var(--wheel-3)" },
  { ch: "a", color: "var(--wheel-4)" },
  { ch: "b", color: "var(--wheel-6)" },
  { ch: "L", color: "var(--wheel-1)" },
  { ch: "a", color: "var(--wheel-2)" },
  { ch: "b", color: "var(--wheel-3)" },
] as const;

/** Wide speech-bubble wordmark — VocabLab lives inside the message. */
export function VocabLabLogo({ className = "" }: { className?: string }) {
  return (
    <span className={`vocablab-logo ${className}`}>
      <span className="vocablab-logo-bubble" aria-hidden="true">
        <span className="vocablab-logo-word font-kids">
          {LETTERS.map((letter, i) => (
            <span key={`${letter.ch}-${i}`} style={{ color: letter.color }}>
              {letter.ch}
            </span>
          ))}
        </span>
      </span>
      <span className="sr-only">VocabLab</span>
    </span>
  );
}
