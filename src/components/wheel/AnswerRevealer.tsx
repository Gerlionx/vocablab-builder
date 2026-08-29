import { LangFlag } from "@/components/LangFlag";
import { displayAnswer } from "@/lib/wheel-answer-reveal";
import { useMemo } from "react";

export function AnswerRevealer({
  answerText,
  revealStep,
  accent,
  answerLang,
  unlocked = false,
  onUnlock,
}: {
  answerText: string | null;
  revealStep: number;
  accent: string;
  answerLang: "en" | "fr";
  /** Full answer after the teacher clicks the reveal zone. */
  unlocked?: boolean;
  onUnlock?: () => void;
}) {
  const shown = useMemo(() => {
    if (!answerText) return "";
    if (unlocked) return answerText;
    return displayAnswer(answerText, revealStep).shown;
  }, [answerText, revealStep, unlocked]);

  if (!answerText || !shown) return null;

  if (unlocked) {
    return (
      <p
        className="vocablab-result-copy vocablab-result-answer vocablab-answer-mask vocablab-answer-unlocked vocablab-result-pair font-kids font-semibold leading-[1.12] tracking-tight"
        style={{ color: accent }}
        aria-live="polite"
      >
        <LangFlag lang={answerLang} />
        <span>{shown}</span>
      </p>
    );
  }

  return (
    <button
      type="button"
      className="vocablab-reveal-zone vocablab-result-answer"
      onClick={onUnlock}
      aria-label="Reveal answer"
    >
      <p
        className="vocablab-result-copy vocablab-answer-mask vocablab-result-pair font-kids font-semibold leading-[1.12] tracking-tight"
        style={{ color: accent }}
        aria-hidden="true"
      >
        <LangFlag lang={answerLang} />
        <span className="vocablab-answer-dots">{shown}</span>
      </p>
      <span
        className="vocablab-reveal-cue font-kids font-semibold tracking-tight"
        style={{ color: accent }}
      >
        reveal
      </span>
    </button>
  );
}
