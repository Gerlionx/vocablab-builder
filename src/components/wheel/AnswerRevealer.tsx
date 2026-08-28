import { buildRevealPlan, displayAnswer, maskText } from "@/lib/wheel-answer-reveal";
import { useMemo } from "react";

export function AnswerRevealer({
  answerText,
  revealStep,
  accent,
}: {
  answerText: string | null;
  revealStep: number;
  accent: string;
}) {
  const plan = useMemo(() => (answerText ? buildRevealPlan(answerText) : []), [answerText]);
  const display = useMemo(() => displayAnswer(plan, revealStep), [plan, revealStep]);

  if (!answerText) return null;

  if (!display.visible && !display.masked) return null;

  return (
    <p
      className="mt-6 font-kids font-semibold leading-tight tracking-tight"
      style={{
        fontSize: "clamp(2rem, 4.8vw, 3.6rem)",
        animation: revealStep > 0 ? "vocablab-word-in 0.45s both" : undefined,
      }}
      aria-live="polite"
    >
      {display.visible ? <span style={{ color: accent }}>{display.visible}</span> : null}
      {display.masked ? (
        <span className="text-muted-foreground/70" aria-hidden="true">
          {maskText(display.masked)}
        </span>
      ) : null}
    </p>
  );
}
