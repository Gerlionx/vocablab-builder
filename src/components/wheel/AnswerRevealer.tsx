import { buildRevealPlan, canRevealMore, displayAnswer, maskText } from "@/lib/wheel-answer-reveal";
import { useMemo } from "react";

export function AnswerRevealer({
  answerText,
  revealStep,
  onReveal,
  accent,
  ink,
}: {
  answerText: string | null;
  revealStep: number;
  onReveal: () => void;
  accent: string;
  ink: string;
}) {
  const plan = useMemo(() => (answerText ? buildRevealPlan(answerText) : []), [answerText]);
  const display = useMemo(() => displayAnswer(plan, revealStep), [plan, revealStep]);
  const more = canRevealMore(revealStep, plan);

  if (!answerText) return null;

  return (
    <div className="mt-6">
      {display.visible || display.masked ? (
        <p
          className="font-kids font-semibold leading-tight tracking-tight"
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
      ) : (
        <p className="font-kids text-2xl font-semibold text-muted-foreground">
          Answer hidden — tap Reveal hint when needed
        </p>
      )}

      {more ? (
        <button
          type="button"
          onClick={onReveal}
          className="mt-5 rounded-full px-8 py-3 font-kids text-2xl font-semibold shadow-md transition hover:brightness-105 active:scale-[0.98]"
          style={{ background: accent, color: ink }}
        >
          Reveal hint
        </button>
      ) : display.complete && revealStep > 0 ? (
        <p className="mt-4 font-kids text-xl font-semibold text-muted-foreground">
          Full answer shown
        </p>
      ) : null}
    </div>
  );
}
