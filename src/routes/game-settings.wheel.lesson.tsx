import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import {
  ArrowDown,
  ArrowUp,
  Eye,
  EyeOff,
  FileText,
  LayoutGrid,
  List,
  Printer,
  Trash2,
} from "lucide-react";
import { LangFlag } from "@/components/LangFlag";
import { WordThumb } from "@/components/WordThumb";
import {
  downloadLessonAsWord,
  handoutVisibleWords,
  loadLessonHandout,
  printLessonHandout,
  saveLessonHandout,
  type LessonHandout,
  type LessonHandoutWord,
} from "@/lib/lesson-handout";

export const Route = createFileRoute("/game-settings/wheel/lesson")({
  head: () => ({
    meta: [
      { title: "Lesson preview — Vocablab" },
      {
        name: "description",
        content: "Edit, rearrange and print your Wheel lesson handout.",
      },
    ],
  }),
  component: LessonHandoutPage,
});

type LayoutMode = "list" | "cards" | "columns";

function LessonHandoutPage() {
  const [handout, setHandout] = useState<LessonHandout | null>(null);
  const [layout, setLayout] = useState<LayoutMode>("list");
  const [showFrench, setShowFrench] = useState(true);
  const [showEnglish, setShowEnglish] = useState(true);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setHandout(loadLessonHandout());
    setReady(true);
  }, []);

  const words = useMemo(
    () => (handout ? handoutVisibleWords(handout) : []),
    [handout],
  );

  function update(next: LessonHandout) {
    setHandout(next);
    saveLessonHandout(next);
  }

  function setTitle(title: string) {
    if (!handout) return;
    update({ ...handout, title });
  }

  function exclude(id: string) {
    if (!handout) return;
    update({
      ...handout,
      excludedWordIds: [...new Set([...handout.excludedWordIds, id])],
    });
  }

  function move(id: string, dir: -1 | 1) {
    if (!handout) return;
    const ids = handout.words.map((w) => w.id);
    const from = ids.indexOf(id);
    const to = from + dir;
    if (from < 0 || to < 0 || to >= ids.length) return;
    const nextWords = [...handout.words];
    const tmp = nextWords[from]!;
    nextWords[from] = nextWords[to]!;
    nextWords[to] = tmp;
    update({ ...handout, words: nextWords });
  }

  function swapFrEn(word: LessonHandoutWord) {
    if (!handout) return;
    update({
      ...handout,
      words: handout.words.map((w) =>
        w.id === word.id ? { ...w, french: w.english, english: w.french } : w,
      ),
    });
  }

  function editField(id: string, field: "french" | "english", value: string) {
    if (!handout) return;
    update({
      ...handout,
      words: handout.words.map((w) => (w.id === id ? { ...w, [field]: value } : w)),
    });
  }

  if (!ready) {
    return (
      <main className="mx-auto max-w-4xl px-6 py-16 text-center text-muted-foreground">
        Loading lesson…
      </main>
    );
  }

  if (!handout || !words.length) {
    return (
      <main className="mx-auto max-w-lg px-6 py-20 text-center">
        <h1 className="font-kids text-3xl font-semibold tracking-tight">No lesson ready</h1>
        <p className="mt-3 text-sm text-muted-foreground">
          Build filters on the Wheel lesson page, then open Lesson preview from the sidebar.
        </p>
        <Link
          to="/game-settings/wheel"
          className="mt-8 inline-flex rounded-full bg-primary px-6 py-2.5 text-sm font-semibold text-primary-foreground"
        >
          Back to lesson builder
        </Link>
      </main>
    );
  }

  return (
    <main className="lesson-handout-page mx-auto max-w-5xl px-4 pb-24 pt-6 sm:px-6">
      <div className="print:hidden mb-6 flex flex-wrap items-center justify-between gap-3">
        <Link
          to="/game-settings/wheel"
          className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground hover:text-foreground"
        >
          &larr; Lesson builder
        </Link>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => printLessonHandout()}
            className="inline-flex items-center gap-1.5 rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground"
            title="Opens print dialog — choose Save as PDF if you want a PDF file"
          >
            <Printer className="size-4" />
            Print / PDF
          </button>
          <button
            type="button"
            onClick={() => downloadLessonAsWord(handout, words)}
            className="inline-flex items-center gap-1.5 rounded-full bg-secondary px-4 py-2 text-sm font-semibold text-secondary-foreground ring-1 ring-border"
            title="Free .doc HTML — opens in Microsoft Word or LibreOffice"
          >
            <FileText className="size-4" />
            Save Word
          </button>
        </div>
      </div>

      <header className="print:hidden mb-6 rounded-3xl bg-card p-5 ring-1 ring-border sm:p-6">
        <label className="block">
          <span className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
            Lesson title
          </span>
          <input
            value={handout.title}
            onChange={(e) => setTitle(e.target.value)}
            className="mt-1.5 w-full rounded-2xl bg-background px-4 py-3 font-kids text-2xl font-semibold tracking-tight ring-1 ring-input focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </label>
        <p className="mt-2 text-sm text-muted-foreground">
          {words.length} word{words.length === 1 ? "" : "s"}
          {handout.excludedWordIds.length
            ? ` · ${handout.excludedWordIds.length} removed`
            : ""}
        </p>

        <div className="mt-5 flex flex-wrap gap-2">
          <ToolbarToggle
            on={layout === "list"}
            onClick={() => setLayout("list")}
            icon={<List className="size-4" />}
            label="List"
          />
          <ToolbarToggle
            on={layout === "cards"}
            onClick={() => setLayout("cards")}
            icon={<LayoutGrid className="size-4" />}
            label="Cards"
          />
          <ToolbarToggle
            on={layout === "columns"}
            onClick={() => setLayout("columns")}
            icon={<FileText className="size-4" />}
            label="Two columns"
          />
          <span className="mx-1 hidden h-8 w-px bg-border sm:block" />
          <ToolbarToggle
            on={showFrench}
            onClick={() => setShowFrench((v) => !v)}
            icon={showFrench ? <Eye className="size-4" /> : <EyeOff className="size-4" />}
            label="French"
          />
          <ToolbarToggle
            on={showEnglish}
            onClick={() => setShowEnglish((v) => !v)}
            icon={showEnglish ? <Eye className="size-4" /> : <EyeOff className="size-4" />}
            label="English"
          />
        </div>
      </header>

      {/* Printable sheet */}
      <article className="lesson-handout-sheet rounded-[1.75rem] bg-[radial-gradient(120%_80%_at_10%_0%,#f4faf6_0%,#fbfaf6_45%,#f7f3ea_100%)] p-6 ring-1 ring-border sm:p-10 print:rounded-none print:bg-white print:p-0 print:ring-0">
        <div className="mb-8 border-b border-[#1f3d2f]/15 pb-6 print:mb-6 print:border-[#333]/30 print:pb-4">
          <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[#3d6b52]">
            VocabLab · Lesson handout
          </p>
          <h1 className="mt-2 font-kids text-4xl font-semibold tracking-tight text-[#1a2e24] sm:text-5xl print:text-3xl">
            {handout.title || "Untitled lesson"}
          </h1>
          <p className="mt-3 flex flex-wrap items-center gap-2 text-sm text-[#1a2e24]/70">
            <span>{words.length} words</span>
            <span aria-hidden>·</span>
            <span className="inline-flex items-center gap-1">
              <LangFlag lang="fr" />
              <span className="opacity-60">↔</span>
              <LangFlag lang="en" />
            </span>
          </p>
        </div>

        {layout === "list" ? (
          <ol className="space-y-2">
            {words.map((word, i) => (
              <WordRow
                key={word.id}
                index={i}
                word={word}
                showFrench={showFrench}
                showEnglish={showEnglish}
                canUp={i > 0}
                canDown={i < words.length - 1}
                onUp={() => move(word.id, -1)}
                onDown={() => move(word.id, 1)}
                onExclude={() => exclude(word.id)}
                onSwap={() => swapFrEn(word)}
                onEdit={editField}
              />
            ))}
          </ol>
        ) : null}

        {layout === "cards" ? (
          <ul className="grid gap-3 sm:grid-cols-2">
            {words.map((word, i) => (
              <li
                key={word.id}
                className="group relative flex items-center gap-3 rounded-2xl bg-white/80 p-4 shadow-sm ring-1 ring-[#1f3d2f]/10 print:bg-white print:shadow-none"
              >
                <div className="min-w-0 flex-1">
                  <span className="text-[11px] font-semibold tabular-nums text-[#3d6b52]/80">
                    {i + 1}
                  </span>
                  {showFrench ? (
                    <input
                      value={word.french}
                      onChange={(e) => editField(word.id, "french", e.target.value)}
                      className="mt-1 w-full bg-transparent font-kids text-xl font-semibold text-[#1a2e24] outline-none print:pointer-events-none"
                    />
                  ) : null}
                  {showEnglish ? (
                    <input
                      value={word.english}
                      onChange={(e) => editField(word.id, "english", e.target.value)}
                      className="mt-1 w-full bg-transparent text-sm text-[#1a2e24]/70 outline-none print:pointer-events-none"
                    />
                  ) : null}
                </div>
                <WordThumb src={word.image} className="mr-1" />
                <div className="print:hidden absolute right-2 top-2 flex gap-1 opacity-0 transition group-hover:opacity-100">
                  <IconBtn label="Move up" onClick={() => move(word.id, -1)} disabled={i === 0}>
                    <ArrowUp className="size-3.5" />
                  </IconBtn>
                  <IconBtn
                    label="Move down"
                    onClick={() => move(word.id, 1)}
                    disabled={i === words.length - 1}
                  >
                    <ArrowDown className="size-3.5" />
                  </IconBtn>
                  <IconBtn label="Remove" onClick={() => exclude(word.id)}>
                    <Trash2 className="size-3.5" />
                  </IconBtn>
                </div>
              </li>
            ))}
          </ul>
        ) : null}

        {layout === "columns" ? (
          <div className="grid gap-x-8 gap-y-2 sm:grid-cols-2">
            {words.map((word, i) => (
              <div
                key={word.id}
                className="group flex items-center gap-3 border-b border-[#1f3d2f]/10 py-2"
              >
                <span className="w-6 shrink-0 text-xs tabular-nums text-[#3d6b52]/70">{i + 1}</span>
                <div className="min-w-0 flex-1">
                  {showFrench ? (
                    <input
                      value={word.french}
                      onChange={(e) => editField(word.id, "french", e.target.value)}
                      className="w-full bg-transparent font-semibold text-[#1a2e24] outline-none print:pointer-events-none"
                    />
                  ) : null}
                  {showEnglish ? (
                    <input
                      value={word.english}
                      onChange={(e) => editField(word.id, "english", e.target.value)}
                      className="w-full bg-transparent text-sm text-[#1a2e24]/65 outline-none print:pointer-events-none"
                    />
                  ) : null}
                </div>
                <WordThumb src={word.image} size="sm" />
                <button
                  type="button"
                  aria-label="Remove"
                  onClick={() => exclude(word.id)}
                  className="print:hidden rounded-full p-1 text-muted-foreground opacity-0 transition group-hover:opacity-100 hover:text-destructive"
                >
                  <Trash2 className="size-3.5" />
                </button>
              </div>
            ))}
          </div>
        ) : null}
      </article>

      <p className="print:hidden mt-4 text-center text-xs text-muted-foreground">
        Print / PDF uses your browser (free). Save Word downloads an HTML .doc that opens in Word or
        LibreOffice — no paid plugins.
      </p>
    </main>
  );
}

function ToolbarToggle({
  on,
  onClick,
  icon,
  label,
}: {
  on: boolean;
  onClick: () => void;
  icon: ReactNode;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold transition ${
        on
          ? "bg-primary text-primary-foreground"
          : "bg-muted text-foreground ring-1 ring-border hover:bg-accent"
      }`}
    >
      {icon}
      {label}
    </button>
  );
}

function IconBtn({
  label,
  onClick,
  disabled,
  children,
}: {
  label: string;
  onClick: () => void;
  disabled?: boolean;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      disabled={disabled}
      onClick={onClick}
      className="rounded-full bg-background p-1.5 text-muted-foreground ring-1 ring-border hover:text-foreground disabled:opacity-30"
    >
      {children}
    </button>
  );
}

function WordRow({
  index,
  word,
  showFrench,
  showEnglish,
  canUp,
  canDown,
  onUp,
  onDown,
  onExclude,
  onSwap,
  onEdit,
}: {
  index: number;
  word: LessonHandoutWord;
  showFrench: boolean;
  showEnglish: boolean;
  canUp: boolean;
  canDown: boolean;
  onUp: () => void;
  onDown: () => void;
  onExclude: () => void;
  onSwap: () => void;
  onEdit: (id: string, field: "french" | "english", value: string) => void;
}) {
  return (
    <li className="group relative flex items-center gap-3 rounded-2xl bg-white/70 px-3 py-3 ring-1 ring-[#1f3d2f]/8 print:bg-transparent print:px-0 print:ring-0">
      <span className="w-7 shrink-0 text-right text-xs font-semibold tabular-nums text-[#3d6b52]/75">
        {index + 1}
      </span>
      <div className="min-w-0 flex-1">
        {showFrench ? (
          <input
            value={word.french}
            onChange={(e) => onEdit(word.id, "french", e.target.value)}
            className="w-full bg-transparent font-kids text-lg font-semibold text-[#1a2e24] outline-none print:pointer-events-none"
          />
        ) : null}
        {showEnglish ? (
          <input
            value={word.english}
            onChange={(e) => onEdit(word.id, "english", e.target.value)}
            className="mt-0.5 w-full bg-transparent text-sm text-[#1a2e24]/65 outline-none print:pointer-events-none"
          />
        ) : null}
        <p className="print:hidden mt-1 text-[10px] tracking-wide text-[#1a2e24]/45">
          {word.year.replace(/^Year\s+/i, "Y")} · {word.term.replace(/^Term\s+/i, "T")} ·{" "}
          {word.topic}
        </p>
      </div>
      <WordThumb src={word.image} />
      <div className="print:hidden flex shrink-0 flex-col gap-0.5 opacity-0 transition group-hover:opacity-100 focus-within:opacity-100">
        <IconBtn label="Move up" onClick={onUp} disabled={!canUp}>
          <ArrowUp className="size-3.5" />
        </IconBtn>
        <IconBtn label="Move down" onClick={onDown} disabled={!canDown}>
          <ArrowDown className="size-3.5" />
        </IconBtn>
        <IconBtn label="Swap French and English" onClick={onSwap}>
          <span className="px-0.5 text-[10px] font-bold">⇄</span>
        </IconBtn>
        <IconBtn label="Remove from lesson" onClick={onExclude}>
          <Trash2 className="size-3.5" />
        </IconBtn>
      </div>
    </li>
  );
}
