import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { BrandChipRow } from "@/components/BrandChipRow";
import {
  DEFAULT_WHEEL_SETTINGS,
  loadWheelSettings,
  type AskDirection,
  type WinMode,
} from "@/lib/game-settings";
import { DIFFICULTIES, SEED_WORDS, TERMS, TOPICS, YEARS, filterWords } from "@/lib/vocab-data";
import {
  blankLessonDraft,
  deleteWheelLesson,
  describeLesson,
  listWheelLessons,
  suggestLessonTitle,
  tidyLessonTitle,
  upsertWheelLesson,
  type WheelLesson,
} from "@/lib/wheel-lessons";
import {
  WHEEL_GAME_MODES,
  type WheelGameModeId,
} from "@/lib/wheel-modes";

export const Route = createFileRoute("/game-settings/wheel")({
  head: () => ({
    meta: [
      { title: "Wheel lessons — Vocablab" },
      {
        name: "description",
        content: "Build Wheel of names lessons with vocabulary preview and play mode.",
      },
    ],
  }),
  component: WheelLessonsPage,
});

type Draft = Omit<WheelLesson, "id" | "savedAt"> & { id?: string };

function WheelLessonsPage() {
  const defaults =
    typeof window === "undefined" ? DEFAULT_WHEEL_SETTINGS : loadWheelSettings();
  const [lessons, setLessons] = useState<WheelLesson[]>(() => listWheelLessons());
  const [draft, setDraft] = useState<Draft>(() => blankLessonDraft(defaults));
  const [note, setNote] = useState<string | null>(null);

  const pool = useMemo(
    () =>
      filterWords(SEED_WORDS, {
        years: draft.years,
        terms: draft.terms,
        topics: draft.topics,
        difficulties: draft.difficulties,
      }),
    [draft.years, draft.terms, draft.topics, draft.difficulties],
  );

  function flash(msg: string) {
    setNote(msg);
    window.setTimeout(() => setNote(null), 2200);
  }

  function refresh() {
    setLessons(listWheelLessons());
  }

  function loadLesson(lesson: WheelLesson) {
    setDraft({
      id: lesson.id,
      title: lesson.title,
      years: [...lesson.years],
      terms: [...lesson.terms],
      topics: [...lesson.topics],
      difficulties: [...lesson.difficulties],
      gameMode: lesson.gameMode,
      askDirection: lesson.askDirection,
      winMode: lesson.winMode,
      scoreToWin: lesson.scoreToWin,
      pointsCorrect: lesson.pointsCorrect,
      secondsPerTeam: lesson.secondsPerTeam,
    });
  }

  function newLesson() {
    setDraft(blankLessonDraft(defaults));
  }

  function save() {
    if (pool.length === 0) {
      flash("Pick filters that include at least one word");
      return;
    }
    const saved = upsertWheelLesson({
      ...draft,
      title:
        tidyLessonTitle(draft.title) ||
        suggestLessonTitle(draft.years, draft.topics),
    });
    setDraft({ ...draft, id: saved.id, title: saved.title });
    refresh();
    flash(`Saved “${saved.title}”`);
  }

  function remove(id: string) {
    deleteWheelLesson(id);
    refresh();
    if (draft.id === id) newLesson();
    flash("Lesson deleted");
  }

  return (
    <main className="mx-auto max-w-6xl px-6 pb-24 pt-8">
      <Link
        to="/game-settings"
        className="mb-3 inline-block text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground hover:text-foreground"
      >
        &larr; Create
      </Link>
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="font-kids text-4xl font-semibold tracking-tight">Wheel of names</h1>
            <p className="mt-2 max-w-xl text-sm text-muted-foreground">
              Build lessons here before class. Each lesson locks vocabulary and a game mode. In the
              classroom you only load a lesson and paste names.
            </p>
          </div>
          <button
            type="button"
            onClick={newLesson}
            className="rounded-full bg-secondary px-5 py-2.5 text-sm font-semibold text-secondary-foreground ring-1 ring-border"
          >
            New lesson
          </button>
        </div>

        <div className="mt-8 grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(17rem,20rem)]">
          <section className="rounded-3xl bg-card p-6 ring-1 ring-border sm:p-8">
            {lessons.length ? (
              <div className="mb-6">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                  Your lessons
                </p>
                <ul className="mt-2 flex flex-wrap gap-2">
                  {lessons.map((lesson) => {
                    const on = draft.id === lesson.id;
                    return (
                      <li key={lesson.id} className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => loadLesson(lesson)}
                          className={`rounded-full px-3.5 py-1.5 text-sm font-semibold transition ${
                            on
                              ? "bg-primary text-primary-foreground"
                              : "bg-muted text-foreground hover:bg-accent"
                          }`}
                        >
                          {lesson.title}
                        </button>
                        <button
                          type="button"
                          aria-label={`Delete ${lesson.title}`}
                          onClick={() => remove(lesson.id)}
                          className="rounded-full px-2 py-1 text-sm text-muted-foreground hover:text-destructive"
                        >
                          ×
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </div>
            ) : (
              <p className="mb-6 rounded-2xl bg-muted/70 px-4 py-3 text-sm text-muted-foreground">
                No lessons yet — set the filters below and save your first one.
              </p>
            )}

            <label className="block">
              <span className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                Lesson name
              </span>
              <input
                value={draft.title}
                onChange={(e) => setDraft((d) => ({ ...d, title: e.target.value }))}
                placeholder="e.g. 7B Thursday greetings"
                maxLength={48}
                className="mt-1.5 w-full rounded-2xl bg-background px-4 py-3 text-lg font-semibold ring-1 ring-input focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </label>

            <div className="mt-6 space-y-5">
              <BrandChipRow
                label="Year"
                options={YEARS}
                values={draft.years}
                onChange={(years) => setDraft((d) => ({ ...d, years }))}
              />
              <BrandChipRow
                label="Term"
                options={TERMS}
                values={draft.terms}
                onChange={(terms) => setDraft((d) => ({ ...d, terms }))}
                emptyMeansAll
              />
              <BrandChipRow
                label="Topic"
                options={TOPICS}
                values={draft.topics}
                onChange={(topics) => setDraft((d) => ({ ...d, topics }))}
                emptyMeansAll
              />
              <BrandChipRow
                label="Level"
                options={[...DIFFICULTIES]}
                values={draft.difficulties}
                onChange={(difficulties) => setDraft((d) => ({ ...d, difficulties }))}
                emptyMeansAll
              />
            </div>

            <div className="mt-8">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                Game mode
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                Basic is the original Wheel loop. New modes will appear here as we add them.
              </p>
              <div className="mt-2 grid gap-2 sm:grid-cols-2">
                {WHEEL_GAME_MODES.map((mode) => (
                  <ModeCard
                    key={mode.id}
                    title={mode.label}
                    hint={mode.blurb}
                    on={draft.gameMode === mode.id}
                    onClick={() =>
                      setDraft((d) => ({
                        ...d,
                        gameMode: mode.id satisfies WheelGameModeId,
                      }))
                    }
                  />
                ))}
              </div>
            </div>

            {draft.gameMode === "basic" ? (
              <div className="mt-8 rounded-2xl bg-muted/40 p-4 ring-1 ring-border">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                  Basic options
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  How this Basic lesson asks words and how the match ends.
                </p>

                <p className="mt-4 text-sm font-medium">Ask</p>
                <div className="mt-2 grid grid-cols-3 gap-2">
                  {(
                    [
                      ["french", "Fr → En"],
                      ["english", "En → Fr"],
                      ["random", "Mix"],
                    ] as const
                  ).map(([id, label]) => (
                    <button
                      key={id}
                      type="button"
                      onClick={() =>
                        setDraft((d) => ({ ...d, askDirection: id satisfies AskDirection }))
                      }
                      className={`rounded-2xl py-3 text-sm font-semibold transition ${
                        draft.askDirection === id
                          ? "bg-primary text-primary-foreground"
                          : "bg-background text-foreground ring-1 ring-border"
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>

                <p className="mt-5 text-sm font-medium">How the match ends</p>
                <div className="mt-2 grid grid-cols-2 gap-2">
                  <ModeCard
                    title="First to a score"
                    hint="Race to the target"
                    on={draft.winMode === "score"}
                    onClick={() => setDraft((d) => ({ ...d, winMode: "score" satisfies WinMode }))}
                  />
                  <ModeCard
                    title="By time"
                    hint="Banked clocks"
                    on={draft.winMode === "time"}
                    onClick={() => setDraft((d) => ({ ...d, winMode: "time" satisfies WinMode }))}
                  />
                </div>

                {draft.winMode === "score" ? (
                  <label className="mt-4 block text-sm font-medium">
                    Score to win
                    <input
                      type="number"
                      min={5}
                      max={200}
                      value={draft.scoreToWin}
                      onChange={(e) =>
                        setDraft((d) => ({ ...d, scoreToWin: Number(e.target.value) }))
                      }
                      className="mt-1.5 w-full rounded-xl bg-background px-4 py-2.5 ring-1 ring-input focus:outline-none focus:ring-2 focus:ring-ring"
                    />
                  </label>
                ) : (
                  <label className="mt-4 block text-sm font-medium">
                    Seconds per team
                    <input
                      type="number"
                      min={15}
                      max={300}
                      value={draft.secondsPerTeam}
                      onChange={(e) =>
                        setDraft((d) => ({ ...d, secondsPerTeam: Number(e.target.value) }))
                      }
                      className="mt-1.5 w-full rounded-xl bg-background px-4 py-2.5 ring-1 ring-input focus:outline-none focus:ring-2 focus:ring-ring"
                    />
                  </label>
                )}

                <label className="mt-3 block text-sm font-medium">
                  Points for a correct answer
                  <input
                    type="number"
                    min={1}
                    max={20}
                    value={draft.pointsCorrect}
                    onChange={(e) =>
                      setDraft((d) => ({ ...d, pointsCorrect: Number(e.target.value) }))
                    }
                    className="mt-1.5 w-full rounded-xl bg-background px-4 py-2.5 ring-1 ring-input focus:outline-none focus:ring-2 focus:ring-ring"
                  />
                </label>
              </div>
            ) : null}

            <div className="mt-8 flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={save}
                className="rounded-full bg-primary px-8 py-3 text-sm font-semibold text-primary-foreground"
              >
                {draft.id ? "Save lesson" : "Save new lesson"}
              </button>
              {note ? <p className="text-sm font-semibold text-success">{note}</p> : null}
            </div>
          </section>

          <aside className="flex max-h-[calc(100vh-10rem)] flex-col rounded-3xl bg-card ring-1 ring-border lg:sticky lg:top-6">
            <div className="border-b border-border px-5 py-4">
              <p className="font-kids text-lg font-semibold">Word preview</p>
              <p className="text-sm text-muted-foreground">
                {pool.length} word{pool.length === 1 ? "" : "s"} · {describeLesson(draft)}
              </p>
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto px-5 py-3">
              {pool.length === 0 ? (
                <p className="py-8 text-center text-sm text-muted-foreground">
                  No words match these filters.
                </p>
              ) : (
                <ul className="space-y-2">
                  {pool.map((word) => (
                    <li
                      key={word.id}
                      className="rounded-xl bg-muted/60 px-3 py-2.5 text-sm leading-snug"
                    >
                      <span className="font-semibold text-foreground">{word.french}</span>
                      <span className="mx-1.5 text-muted-foreground">·</span>
                      <span className="text-muted-foreground">{word.english}</span>
                      <p className="mt-0.5 text-[11px] text-muted-foreground">
                        {word.year} · {word.term} · {word.topic} · {word.difficulty}
                      </p>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </aside>
        </div>
      </main>
  );
}

function ModeCard({
  title,
  hint,
  on,
  onClick,
}: {
  title: string;
  hint: string;
  on: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-2xl px-4 py-3.5 text-left transition ${
        on ? "bg-primary text-primary-foreground" : "bg-muted text-foreground"
      }`}
    >
      <span className="block font-kids text-base font-semibold">{title}</span>
      <span className="mt-0.5 block text-xs opacity-80">{hint}</span>
    </button>
  );
}
