import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { Trash2 } from "lucide-react";
import { BrandChipRow } from "@/components/BrandChipRow";
import { ImagePicker } from "@/components/ImagePicker";
import { LangFlag } from "@/components/LangFlag";
import { WordThumb } from "@/components/WordThumb";
import {
  activateBoardMode,
  applyModeSettingsToDraft,
  deactivateBoardMode,
  DEFAULT_FUSE,
  DEFAULT_MODE_SETTINGS,
  DEFAULT_WHEEL_SETTINGS,
  loadBoardModes,
  loadFuseConfig,
  loadModeSettings,
  loadWheelSettings,
  saveFuseConfig,
  saveModeSettings,
  type AskDirection,
  type BoardModesState,
  type FuseConfig,
  type WheelModeSettingsStore,
} from "@/lib/game-settings";
import { stashLessonHandout } from "@/lib/lesson-handout";
import {
  DIFFICULTIES,
  SEED_WORDS,
  TERMS,
  TOPICS,
  YEARS,
  filterWords,
  type Difficulty,
  type Word,
} from "@/lib/vocab-data";
import { facetOptionCounts } from "@/lib/vocab-filter";
import {
  abbreviateLessonTitle,
  blankLessonDraft,
  deleteWheelLesson,
  describeLesson,
  listWheelLessons,
  tidyLessonTitle,
  upsertWheelLesson,
  type WheelLesson,
} from "@/lib/wheel-lessons";
import { WHEEL_GAME_MODES, type WheelGameModeId } from "@/lib/wheel-modes";
import { wheelPlayableWords } from "@/lib/wheel-prompt";
import { applyWordPatches, loadWordPatches, saveWordPatch, type WordPatch } from "@/lib/word-patches";

export const Route = createFileRoute("/game-settings/wheel/")({
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
  const navigate = useNavigate();
  const [lessons, setLessons] = useState<WheelLesson[]>([]);
  const [draft, setDraft] = useState<Draft>(() => blankLessonDraft(DEFAULT_WHEEL_SETTINGS));
  const [note, setNote] = useState<string | null>(null);
  const [fuse, setFuse] = useState<FuseConfig>(DEFAULT_FUSE);
  const [board, setBoard] = useState<BoardModesState>({
    enabled: [DEFAULT_WHEEL_SETTINGS.gameMode],
    active: DEFAULT_WHEEL_SETTINGS.gameMode,
  });
  const [modeSettings, setModeSettings] =
    useState<WheelModeSettingsStore>(DEFAULT_MODE_SETTINGS);
  const [patches, setPatches] = useState<Record<string, WordPatch>>({});
  const [editWord, setEditWord] = useState<Word | null>(null);
  const [pendingDelete, setPendingDelete] = useState<WheelLesson | null>(null);
  const [ready, setReady] = useState(false);
  const titleTouched = useRef(false);
  const defaultsRef = useRef(DEFAULT_WHEEL_SETTINGS);

  useEffect(() => {
    defaultsRef.current = loadWheelSettings();
    const modes = loadModeSettings();
    const boardState = loadBoardModes();
    setLessons(listWheelLessons());
    setFuse(loadFuseConfig());
    setModeSettings(modes);
    setBoard(boardState);
    setPatches(loadWordPatches());
    setDraft(
      applyModeSettingsToDraft(
        blankLessonDraft(defaultsRef.current),
        boardState.active,
        modes,
      ),
    );
    setReady(true);
  }, []);

  const words = useMemo(() => applyWordPatches(SEED_WORDS, patches), [patches]);

  /** Gap-fill stems excluded — same deck the wheel actually plays. */
  const playableWords = useMemo(() => wheelPlayableWords(words), [words]);

  const filterSelection = useMemo(
    () => ({
      years: draft.years,
      terms: draft.terms,
      topics: draft.topics,
      difficulties: draft.difficulties,
    }),
    [draft.years, draft.terms, draft.topics, draft.difficulties],
  );

  const yearCounts = useMemo(
    () => facetOptionCounts(playableWords, filterSelection, "years", YEARS),
    [playableWords, filterSelection],
  );
  const termCounts = useMemo(
    () => facetOptionCounts(playableWords, filterSelection, "terms", TERMS),
    [playableWords, filterSelection],
  );
  const topicCounts = useMemo(
    () => facetOptionCounts(playableWords, filterSelection, "topics", TOPICS),
    [playableWords, filterSelection],
  );
  const levelCounts = useMemo(
    () => facetOptionCounts(playableWords, filterSelection, "difficulties", DIFFICULTIES),
    [playableWords, filterSelection],
  );

  const pool = useMemo(() => {
    const { years, terms, topics, difficulties } = filterSelection;
    if (!years.length && !terms.length && !topics.length && !difficulties.length) {
      return [];
    }
    const matched = filterWords(playableWords, filterSelection, { emptyMeansAll: true });
    const excluded = new Set(draft.excludedWordIds ?? []);
    return matched.filter((w) => !excluded.has(w.id));
  }, [playableWords, filterSelection, draft.excludedWordIds]);

  // Drop selections that no longer have any playable vocabulary.
  useEffect(() => {
    setDraft((d) => {
      const years = d.years.filter((y) => (yearCounts[y] ?? 0) > 0);
      const terms = d.terms.filter((t) => (termCounts[t] ?? 0) > 0);
      const topics = d.topics.filter((t) => (topicCounts[t] ?? 0) > 0);
      const difficulties = d.difficulties.filter((lv) => (levelCounts[lv] ?? 0) > 0);
      if (
        years.length === d.years.length &&
        terms.length === d.terms.length &&
        topics.length === d.topics.length &&
        difficulties.length === d.difficulties.length
      ) {
        return d;
      }
      return { ...d, years, terms, topics, difficulties };
    });
  }, [yearCounts, termCounts, topicCounts, levelCounts]);

  useEffect(() => {
    if (titleTouched.current) return;
    const next = abbreviateLessonTitle({
      years: draft.years,
      terms: draft.terms,
      topics: draft.topics,
      difficulties: draft.difficulties,
    });
    setDraft((d) => (d.title === next ? d : { ...d, title: next }));
  }, [draft.years, draft.terms, draft.topics, draft.difficulties]);

  function flash(msg: string) {
    setNote(msg);
    window.setTimeout(() => setNote(null), 2200);
  }

  function refresh() {
    setLessons(listWheelLessons());
  }

  function selectMode(modeId: WheelGameModeId) {
    const nextBoard = activateBoardMode(modeId);
    setBoard(nextBoard);
    setDraft((d) => applyModeSettingsToDraft(d, modeId, modeSettings));
  }

  function toggleMode(modeId: WheelGameModeId, turnOn: boolean) {
    if (turnOn) {
      selectMode(modeId);
      return;
    }
    const nextBoard = deactivateBoardMode(modeId);
    setBoard(nextBoard);
    if (draft.gameMode === modeId) {
      setDraft((d) => applyModeSettingsToDraft(d, nextBoard.active, modeSettings));
    }
  }

  function patchBasicSettings(patch: Partial<WheelModeSettingsStore["basic"]>) {
    const basic = { ...modeSettings.basic, ...patch };
    const next = { ...modeSettings, basic };
    setModeSettings(next);
    saveModeSettings(next);
    setDraft((d) =>
      d.gameMode === "basic"
        ? {
            ...d,
            askDirection: basic.askDirection,
            scoreToWin: basic.scoreToWin,
            pointsCorrect: basic.pointsCorrect,
            pointsRevealed: basic.pointsRevealed,
            pointsSkip: basic.pointsSkip,
          }
        : d,
    );
  }

  function patchTimeSettings(patch: Partial<WheelModeSettingsStore["time"]>) {
    const time = { ...modeSettings.time, ...patch };
    const next = { ...modeSettings, time };
    setModeSettings(next);
    saveModeSettings(next);
    setDraft((d) =>
      d.gameMode === "time"
        ? {
            ...d,
            askDirection: time.askDirection,
            secondsPerTeam: time.secondsPerTeam,
            bufferSeconds: time.bufferSeconds,
            skipPenaltySeconds: time.skipPenaltySeconds,
          }
        : d,
    );
  }

  function loadLesson(lesson: WheelLesson) {
    titleTouched.current = true;
    const nextBoard = activateBoardMode(lesson.gameMode);
    setBoard(nextBoard);
    setDraft({
      id: lesson.id,
      title: lesson.title,
      years: [...lesson.years],
      terms: [...lesson.terms],
      topics: [...lesson.topics],
      difficulties: [...lesson.difficulties],
      excludedWordIds: [...(lesson.excludedWordIds ?? [])],
      gameMode: lesson.gameMode,
      askDirection: lesson.askDirection,
      winMode: lesson.winMode,
      scoreToWin: lesson.scoreToWin,
      pointsCorrect: lesson.pointsCorrect,
      pointsRevealed: lesson.pointsRevealed,
      pointsSkip: lesson.pointsSkip,
      secondsPerTeam: lesson.secondsPerTeam,
      bufferSeconds: lesson.bufferSeconds ?? 10,
      skipPenaltySeconds: lesson.skipPenaltySeconds ?? 0,
    });
  }

  function newLesson() {
    titleTouched.current = false;
    setDraft(
      applyModeSettingsToDraft(
        blankLessonDraft(defaultsRef.current),
        board.active,
        modeSettings,
      ),
    );
  }

  function clearFilters() {
    titleTouched.current = false;
    setDraft((d) => ({
      ...d,
      years: [],
      terms: [],
      topics: [],
      difficulties: [],
      excludedWordIds: [],
    }));
  }

  function excludeWord(id: string) {
    setDraft((d) => ({
      ...d,
      excludedWordIds: [...new Set([...(d.excludedWordIds ?? []), id])],
    }));
  }

  async function openLessonPreview() {
    if (!pool.length) {
      flash("Choose filters so the lesson includes at least one word");
      return;
    }
    const title =
      tidyLessonTitle(draft.title) ||
      abbreviateLessonTitle({
        years: draft.years,
        terms: draft.terms,
        topics: draft.topics,
        difficulties: draft.difficulties,
      });
    stashLessonHandout({
      title,
      years: draft.years,
      terms: draft.terms,
      topics: draft.topics,
      difficulties: draft.difficulties,
      gameMode: draft.gameMode,
      askDirection: draft.askDirection,
      scoreToWin: draft.scoreToWin,
      words: pool.map((w) => ({
        id: w.id,
        french: w.french,
        english: w.english,
        year: w.year,
        term: w.term,
        topic: w.topic,
        difficulty: w.difficulty,
        ...(w.image ? { image: w.image } : {}),
      })),
      excludedWordIds: [],
      savedAt: Date.now(),
    });
    await navigate({ to: "/game-settings/wheel/lesson" });
  }

  function save() {
    if (pool.length === 0) {
      flash("Choose filters so the lesson includes at least one word");
      return;
    }
    const saved = upsertWheelLesson({
      ...draft,
      title:
        tidyLessonTitle(draft.title) ||
        abbreviateLessonTitle({
          years: draft.years,
          terms: draft.terms,
          topics: draft.topics,
          difficulties: draft.difficulties,
        }),
    });
    setDraft({ ...draft, id: saved.id, title: saved.title });
    titleTouched.current = true;
    refresh();
    flash(`Saved “${saved.title}”`);
  }

  function remove(id: string) {
    deleteWheelLesson(id);
    refresh();
    if (draft.id === id) newLesson();
    setPendingDelete(null);
    flash("Lesson deleted");
  }

  function saveWordEdit(next: Word) {
    saveWordPatch(next.id, {
      french: next.french,
      english: next.english,
      year: next.year,
      term: next.term,
      topic: next.topic,
      difficulty: next.difficulty,
      image: next.image || "",
    });
    setPatches(loadWordPatches());
    setEditWord(null);
    flash("Word updated");
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

      <div className="mt-8 grid items-stretch gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(18rem,22rem)]">
        <section className="flex flex-col rounded-3xl bg-card p-6 ring-1 ring-border sm:p-8">
          {ready && lessons.length ? (
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
                        onClick={() => setPendingDelete(lesson)}
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
              {ready
                ? "No lessons yet — set the filters below and save your first one."
                : "Loading lessons…"}
            </p>
          )}

          <label className="block">
            <span className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
              Lesson name
            </span>
            <input
              value={draft.title}
              onChange={(e) => {
                titleTouched.current = true;
                setDraft((d) => ({ ...d, title: e.target.value }));
              }}
              placeholder="Auto-fills from filters — edit anytime"
              maxLength={48}
              className="mt-1.5 w-full rounded-2xl bg-background px-4 py-3 text-lg font-semibold ring-1 ring-input focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </label>

          <div className="mt-6 rounded-2xl bg-muted/35 p-4 ring-1 ring-border sm:p-5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                  Filters
                </p>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  Only complete phrases count — gap-fill stems stay out of this game.
                </p>
              </div>
              <button
                type="button"
                onClick={clearFilters}
                className="rounded-full px-3 py-1 text-xs font-semibold text-muted-foreground ring-1 ring-border transition hover:bg-background hover:text-foreground"
              >
                Clear filters
              </button>
            </div>

            <div className="mt-4 space-y-4">
              <BrandChipRow
                label="Year"
                options={YEARS}
                values={draft.years}
                counts={yearCounts}
                hideCounts
                onChange={(years) => setDraft((d) => ({ ...d, years }))}
              />
              <BrandChipRow
                label="Term"
                options={TERMS}
                values={draft.terms}
                counts={termCounts}
                hideCounts
                onChange={(terms) => setDraft((d) => ({ ...d, terms }))}
              />
              <BrandChipRow
                label="Level"
                options={[...DIFFICULTIES]}
                values={draft.difficulties}
                counts={levelCounts}
                onChange={(difficulties) => setDraft((d) => ({ ...d, difficulties }))}
              />
            </div>

            <div className="mt-4 border-t border-border/70 pt-4">
              <BrandChipRow
                label="Topic"
                options={TOPICS}
                values={draft.topics}
                counts={topicCounts}
                dense
                scrollable
                onChange={(topics) => setDraft((d) => ({ ...d, topics }))}
              />
            </div>
          </div>

          <div className="mt-8">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
              Game mode
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              Activate or deactivate each mode for the Activity board. Turn one on to set its
              options — each mode keeps its own settings.
            </p>
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              {WHEEL_GAME_MODES.map((mode) => {
                const enabled = board.enabled.includes(mode.id);
                const selected = draft.gameMode === mode.id;
                return (
                  <ModeToggleRow
                    key={mode.id}
                    title={mode.label}
                    hint={mode.blurb}
                    on={enabled}
                    selected={selected}
                    onSelect={() => {
                      if (enabled) selectMode(mode.id);
                      else toggleMode(mode.id, true);
                    }}
                    onToggle={(active) => toggleMode(mode.id, active)}
                  />
                );
              })}
            </div>
          </div>

          {draft.gameMode === "basic" && board.enabled.includes("basic") ? (
            <div className="mt-8 rounded-2xl bg-muted/40 p-4 ring-1 ring-border">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                Standard options
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                How this Standard lesson asks words. The match ends at the score to win.
              </p>

              <p className="mt-4 text-sm font-medium">Ask</p>
              <div className="mt-2 grid grid-cols-3 gap-2">
                {(
                  [
                    ["french", "Fr → En", "fr", "en"],
                    ["english", "En → Fr", "en", "fr"],
                    ["random", "Mix", null, null],
                  ] as const
                ).map(([id, label, from, to]) => (
                  <button
                    key={id}
                    type="button"
                    onClick={() =>
                      patchBasicSettings({ askDirection: id satisfies AskDirection })
                    }
                    className={`flex items-center justify-center gap-1.5 rounded-2xl py-3 text-sm font-semibold transition ${
                      draft.askDirection === id
                        ? "bg-primary text-primary-foreground"
                        : "bg-background text-foreground ring-1 ring-border"
                    }`}
                  >
                    {from && to ? (
                      <>
                        <LangFlag lang={from} />
                        <span className="mx-0.5 opacity-80">→</span>
                        <LangFlag lang={to} />
                      </>
                    ) : (
                      label
                    )}
                  </button>
                ))}
              </div>

              <label className="mt-4 block text-sm font-medium">
                Score to win
                <input
                  type="number"
                  min={5}
                  max={200}
                  value={draft.scoreToWin}
                  onChange={(e) => patchBasicSettings({ scoreToWin: Number(e.target.value) })}
                  className="mt-1.5 w-full rounded-xl bg-background px-4 py-2.5 ring-1 ring-input focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </label>

              <label className="mt-3 block text-sm font-medium">
                Points for a correct answer
                <input
                  type="number"
                  min={1}
                  max={20}
                  value={draft.pointsCorrect}
                  onChange={(e) =>
                    patchBasicSettings({ pointsCorrect: Number(e.target.value) })
                  }
                  className="mt-1.5 w-full rounded-xl bg-background px-4 py-2.5 ring-1 ring-input focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </label>

              <div className="mt-5 rounded-2xl bg-background/80 p-3 ring-1 ring-border">
                <div className="flex items-center justify-between gap-3">
                  <span className="text-sm font-medium">Detonating wire</span>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={fuse.enabled}
                    onClick={() => {
                      const next = { ...fuse, enabled: !fuse.enabled };
                      setFuse(next);
                      saveFuseConfig(next);
                    }}
                    className={`relative h-8 w-14 shrink-0 rounded-full transition ${
                      fuse.enabled ? "bg-primary" : "bg-muted ring-1 ring-border"
                    }`}
                  >
                    <span
                      className={`absolute top-1 size-6 rounded-full bg-white shadow transition ${
                        fuse.enabled ? "left-7" : "left-1"
                      }`}
                    />
                  </button>
                </div>
                <label className="mt-3 block text-sm font-medium">
                  Seconds
                  <input
                    type="number"
                    min={1}
                    max={600}
                    disabled={!fuse.enabled}
                    value={fuse.seconds}
                    onChange={(e) => {
                      const next = { ...fuse, seconds: Number(e.target.value) };
                      setFuse(next);
                      saveFuseConfig(next);
                    }}
                    className="mt-1.5 w-full rounded-xl bg-background px-4 py-2.5 ring-1 ring-input focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-40"
                  />
                </label>
                <p className="mt-1.5 text-xs text-muted-foreground">
                  Applies to every Standard lesson. Off = no wire on the question.
                </p>
              </div>
            </div>
          ) : null}

          {draft.gameMode === "time" && board.enabled.includes("time") ? (
            <div className="mt-8 rounded-2xl bg-muted/40 p-4 ring-1 ring-border">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                Time bank options
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                Starting bank for each player or team. Round clock uses remaining bank — or the
                buffer after an escape leaves less than the buffer. Missed or clock expiry
                eliminates. Skip re-spins the same side; optional Skip penalty below.
              </p>

              <p className="mt-4 text-sm font-medium">Ask</p>
              <div className="mt-2 grid grid-cols-3 gap-2">
                {(
                  [
                    ["french", "Fr → En", "fr", "en"],
                    ["english", "En → Fr", "en", "fr"],
                    ["random", "Mix", null, null],
                  ] as const
                ).map(([id, label, from, to]) => (
                  <button
                    key={id}
                    type="button"
                    onClick={() =>
                      patchTimeSettings({ askDirection: id satisfies AskDirection })
                    }
                    className={`flex items-center justify-center gap-1.5 rounded-2xl py-3 text-sm font-semibold transition ${
                      draft.askDirection === id
                        ? "bg-primary text-primary-foreground"
                        : "bg-background text-foreground ring-1 ring-border"
                    }`}
                  >
                    {from && to ? (
                      <>
                        <LangFlag lang={from} />
                        <span className="mx-0.5 opacity-80">→</span>
                        <LangFlag lang={to} />
                      </>
                    ) : (
                      label
                    )}
                  </button>
                ))}
              </div>

              <label className="mt-4 block text-sm font-medium">
                Starting time bank (seconds)
                <input
                  type="number"
                  min={15}
                  max={600}
                  value={draft.secondsPerTeam}
                  onChange={(e) =>
                    patchTimeSettings({ secondsPerTeam: Number(e.target.value) })
                  }
                  className="mt-1.5 w-full rounded-xl bg-background px-4 py-2.5 ring-1 ring-input focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </label>

              <label className="mt-3 block text-sm font-medium">
                Buffer (seconds)
                <input
                  type="number"
                  min={1}
                  max={120}
                  value={draft.bufferSeconds}
                  onChange={(e) =>
                    patchTimeSettings({ bufferSeconds: Number(e.target.value) })
                  }
                  className="mt-1.5 w-full rounded-xl bg-background px-4 py-2.5 ring-1 ring-input focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </label>
              <p className="mt-1.5 text-xs text-muted-foreground">
                After escaping with less than this left, the next round clock starts from the
                buffer — not the leftover seconds.
              </p>

              <div className="mt-5 rounded-2xl bg-background/80 p-3 ring-1 ring-border">
                <div className="flex items-center justify-between gap-3">
                  <span className="text-sm font-medium">Skip penalty</span>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={draft.skipPenaltySeconds > 0}
                    onClick={() =>
                      patchTimeSettings({
                        skipPenaltySeconds: draft.skipPenaltySeconds > 0 ? 0 : 5,
                      })
                    }
                    className={`relative h-8 w-14 shrink-0 rounded-full transition ${
                      draft.skipPenaltySeconds > 0
                        ? "bg-primary"
                        : "bg-muted ring-1 ring-border"
                    }`}
                  >
                    <span
                      className={`absolute top-1 size-6 rounded-full bg-white shadow transition ${
                        draft.skipPenaltySeconds > 0 ? "left-7" : "left-1"
                      }`}
                    />
                  </button>
                </div>
                <label className="mt-3 block text-sm font-medium">
                  Seconds removed on Skip
                  <input
                    type="number"
                    min={0}
                    max={120}
                    disabled={draft.skipPenaltySeconds <= 0}
                    value={draft.skipPenaltySeconds}
                    onChange={(e) =>
                      patchTimeSettings({ skipPenaltySeconds: Number(e.target.value) })
                    }
                    className="mt-1.5 w-full rounded-xl bg-background px-4 py-2.5 ring-1 ring-input focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-40"
                  />
                </label>
                <p className="mt-1.5 text-xs text-muted-foreground">
                  Off = free Skip (same player/team spins again). On = deduct this many seconds
                  from their bank, then spin again for them.
                </p>
              </div>
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

        <aside className="flex h-full min-h-[32rem] flex-col overflow-hidden rounded-3xl bg-card ring-1 ring-border lg:min-h-full">
          <button
            type="button"
            onClick={() => void openLessonPreview()}
            disabled={!pool.length}
            className="group relative z-10 w-full shrink-0 cursor-pointer border-b border-border px-5 py-4 text-left transition hover:bg-muted/50 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:bg-transparent"
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="font-kids text-lg font-semibold tracking-tight group-hover:text-primary">
                  Lesson preview
                </p>
                <p className="mt-0.5 text-sm text-muted-foreground">
                  {pool.length} word{pool.length === 1 ? "" : "s"} · {describeLesson(draft)}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {pool.length
                    ? "Open the full lesson page — edit, rearrange, print or save."
                    : "Pick filters to build the lesson first."}
                </p>
              </div>
              <span className="mt-1 text-lg text-muted-foreground transition group-hover:translate-x-0.5 group-hover:text-primary">
                →
              </span>
            </div>
          </button>
          <div className="min-h-0 flex-1 overflow-y-auto px-3 py-3">
            {pool.length === 0 ? (
              <p className="px-2 py-8 text-center text-sm text-muted-foreground">
                Clear filters for an empty preview — each chip you pick narrows the list.
              </p>
            ) : (
              <ul className="space-y-1.5">
                {pool.map((word) => (
                  <li key={word.id} className="group relative">
                    <button
                      type="button"
                      onClick={() => setEditWord(word)}
                      className="flex w-full items-center gap-2.5 rounded-2xl px-3.5 py-3 pr-10 text-left transition hover:bg-muted/80 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    >
                      <span className="min-w-0 flex-1">
                        <span className="block font-semibold leading-snug text-foreground">
                          {word.french}
                        </span>
                        <span className="mt-0.5 block text-sm leading-snug text-muted-foreground">
                          {word.english}
                        </span>
                        <span className="mt-1.5 block text-[11px] tracking-wide text-muted-foreground/80">
                          {word.year.replace(/^Year\s+/i, "Y")} ·{" "}
                          {word.term.replace(/^Term\s+/i, "T")} · {word.topic} · {word.difficulty}
                        </span>
                      </span>
                      <WordThumb src={word.image} size="sm" />
                    </button>
                    <button
                      type="button"
                      aria-label={`Remove ${word.french} from this lesson`}
                      title="Remove from this lesson"
                      onClick={(e) => {
                        e.stopPropagation();
                        excludeWord(word.id);
                      }}
                      className="absolute right-2 top-2 rounded-full p-1.5 text-muted-foreground/0 transition group-hover:bg-background/90 group-hover:text-muted-foreground group-hover:ring-1 group-hover:ring-border hover:!text-destructive focus:outline-none focus-visible:text-destructive focus-visible:ring-2 focus-visible:ring-ring"
                    >
                      <Trash2 className="size-3.5" strokeWidth={2} />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
          {(draft.excludedWordIds?.length ?? 0) > 0 ? (
            <div className="border-t border-border px-4 py-2.5">
              <button
                type="button"
                onClick={() => setDraft((d) => ({ ...d, excludedWordIds: [] }))}
                className="text-xs font-semibold text-muted-foreground underline-offset-2 hover:text-foreground hover:underline"
              >
                Restore {draft.excludedWordIds.length} removed word
                {draft.excludedWordIds.length === 1 ? "" : "s"}
              </button>
            </div>
          ) : null}
        </aside>
      </div>

      {pendingDelete ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/25 p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="delete-lesson-title"
          onClick={() => setPendingDelete(null)}
        >
          <div
            className="w-full max-w-md rounded-3xl bg-card p-6 shadow-lg ring-1 ring-border"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 id="delete-lesson-title" className="font-kids text-xl font-semibold tracking-tight">
              Remove this lesson?
            </h2>
            <p className="mt-2 text-sm text-muted-foreground">
              “{pendingDelete.title}” will be permanently removed from Your lessons. This cannot be
              undone.
            </p>
            <div className="mt-6 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setPendingDelete(null)}
                className="rounded-full px-4 py-2 text-sm font-semibold text-muted-foreground ring-1 ring-border hover:bg-muted"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => remove(pendingDelete.id)}
                className="rounded-full bg-destructive px-4 py-2 text-sm font-semibold text-destructive-foreground"
              >
                Remove lesson
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {editWord ? (
        <WordEditModal
          word={editWord}
          onClose={() => setEditWord(null)}
          onSave={saveWordEdit}
        />
      ) : null}
    </main>
  );
}

function ModeToggleRow({
  title,
  hint,
  on,
  selected,
  onToggle,
  onSelect,
}: {
  title: string;
  hint: string;
  on: boolean;
  selected: boolean;
  onToggle: (active: boolean) => void;
  onSelect: () => void;
}) {
  return (
    <div
      className={`flex h-full min-h-[9.5rem] flex-col rounded-2xl px-4 py-4 ring-1 transition ${
        on
          ? selected
            ? "bg-primary/8 ring-primary/35"
            : "bg-primary/5 ring-primary/20"
          : "bg-muted/50 ring-border"
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <button type="button" onClick={onSelect} className="min-w-0 flex-1 text-left">
          <p className="font-kids text-base font-semibold tracking-tight">{title}</p>
        </button>
        <button
          type="button"
          role="switch"
          aria-checked={on}
          aria-label={`${on ? "Deactivate" : "Activate"} ${title}`}
          onClick={() => onToggle(!on)}
          className={`relative h-8 w-14 shrink-0 rounded-full transition ${
            on ? "bg-primary" : "bg-muted ring-1 ring-border"
          }`}
        >
          <span
            className={`absolute top-1 size-6 rounded-full bg-white shadow transition ${
              on ? "left-7" : "left-1"
            }`}
          />
        </button>
      </div>
      <button type="button" onClick={onSelect} className="mt-2 min-w-0 flex-1 text-left">
        <p className="text-xs leading-snug text-muted-foreground">{hint}</p>
        {on && selected ? (
          <p className="mt-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-primary">
            Editing options
          </p>
        ) : (
          <p className="mt-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-transparent">
            Editing options
          </p>
        )}
      </button>
    </div>
  );
}

function WordEditModal({
  word,
  onClose,
  onSave,
}: {
  word: Word;
  onClose: () => void;
  onSave: (next: Word) => void;
}) {
  const [french, setFrench] = useState(word.french);
  const [english, setEnglish] = useState(word.english);
  const [year, setYear] = useState(word.year);
  const [term, setTerm] = useState(word.term);
  const [topic, setTopic] = useState(word.topic);
  const [difficulty, setDifficulty] = useState<Difficulty>(word.difficulty);
  const [image, setImage] = useState<string | undefined>(word.image);
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onDown = (e: PointerEvent) => {
      if (!panelRef.current?.contains(e.target as Node)) onClose();
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("pointerdown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-background/75 px-6 backdrop-blur-sm">
      <div
        ref={panelRef}
        className="max-h-[min(40rem,92vh)] w-full max-w-md overflow-y-auto rounded-3xl bg-popover p-6 shadow-2xl ring-1 ring-border sm:p-8"
      >
        <h2 className="font-kids text-xl font-semibold tracking-tight">Edit word</h2>
        <p className="mt-1 text-sm text-muted-foreground">Changes apply to this vocabulary entry.</p>
        <div className="mt-5 space-y-3">
          <label className="block text-sm font-medium">
            French
            <input
              value={french}
              onChange={(e) => setFrench(e.target.value)}
              className="mt-1.5 w-full rounded-xl bg-background px-3 py-2.5 ring-1 ring-input focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </label>
          <label className="block text-sm font-medium">
            English
            <input
              value={english}
              onChange={(e) => setEnglish(e.target.value)}
              className="mt-1.5 w-full rounded-xl bg-background px-3 py-2.5 ring-1 ring-input focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </label>
          <div className="grid grid-cols-2 gap-3">
            <label className="block text-sm font-medium">
              Year
              <select
                value={year}
                onChange={(e) => setYear(e.target.value)}
                className="mt-1.5 w-full rounded-xl bg-background px-3 py-2.5 ring-1 ring-input focus:outline-none focus:ring-2 focus:ring-ring"
              >
                {YEARS.map((y) => (
                  <option key={y} value={y}>
                    {y}
                  </option>
                ))}
              </select>
            </label>
            <label className="block text-sm font-medium">
              Term
              <select
                value={term}
                onChange={(e) => setTerm(e.target.value)}
                className="mt-1.5 w-full rounded-xl bg-background px-3 py-2.5 ring-1 ring-input focus:outline-none focus:ring-2 focus:ring-ring"
              >
                {TERMS.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <label className="block text-sm font-medium">
            Topic
            <select
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              className="mt-1.5 w-full rounded-xl bg-background px-3 py-2.5 ring-1 ring-input focus:outline-none focus:ring-2 focus:ring-ring"
            >
              {TOPICS.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </label>
          <label className="block text-sm font-medium">
            Level
            <select
              value={difficulty}
              onChange={(e) => setDifficulty(e.target.value as Difficulty)}
              className="mt-1.5 w-full rounded-xl bg-background px-3 py-2.5 ring-1 ring-input focus:outline-none focus:ring-2 focus:ring-ring"
            >
              {DIFFICULTIES.map((d) => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
            </select>
          </label>
          <ImagePicker value={image} onChange={setImage} />
        </div>
        <div className="mt-6 flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded-full px-4 py-2 text-sm font-semibold text-muted-foreground ring-1 ring-border"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() =>
              onSave({
                ...word,
                french: french.trim(),
                english: english.trim(),
                year,
                term,
                topic,
                difficulty,
                image: image || "",
              })
            }
            className="rounded-full bg-primary px-5 py-2 text-sm font-semibold text-primary-foreground"
          >
            Save word
          </button>
        </div>
      </div>
    </div>
  );
}
