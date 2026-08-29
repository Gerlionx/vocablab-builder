import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { AppChrome } from "@/components/AppChrome";
import { ImagePicker } from "@/components/ImagePicker";
import {
  DIFFICULTIES,
  SEED_WORDS,
  TERMS,
  TOPICS,
  YEARS,
  nextId,
  type Difficulty,
  type Word,
} from "@/lib/vocab-data";
import { resolveImageSrc } from "@/lib/image-library";
import {
  applyVocabMerge,
  downloadVocabBackup,
  loadPersistedWordBank,
  parseVocabBackupDoc,
  planVocabMerge,
  savePersistedWordBank,
  type VocabMergePlan,
} from "@/lib/vocab-backup";
import { applyWordPatches, saveWordPatch } from "@/lib/word-patches";
import { deleteWordFn, importSeedWordsFn, listWordsFn, upsertWordFn } from "@/lib/api/words";

export const Route = createFileRoute("/vocabulary")({
  head: () => ({
    meta: [
      { title: "Vocabulary — Vocablab" },
      {
        name: "description",
        content:
          "Browse and edit French vocabulary by year and term in a booklet-style layout.",
      },
      { property: "og:title", content: "Vocabulary — Vocablab" },
      {
        property: "og:description",
        content:
          "Browse and edit French vocabulary by year and term in a booklet-style layout.",
      },
    ],
  }),
  component: VocabularyPage,
});

const ALL = "All";

type Draft = {
  id?: string;
  year: string;
  term: string;
  topic: string;
  difficulty: Difficulty;
  french: string;
  english: string;
  image?: string;
};

function VocabularyPage() {
  const [words, setWords] = useState<Word[]>(
    () => loadPersistedWordBank() ?? applyWordPatches(SEED_WORDS),
  );
  const [years, setYears] = useState<string[]>(YEARS);
  const [terms, setTerms] = useState<string[]>(TERMS);
  const [topics, setTopics] = useState<string[]>(TOPICS);

  const [year, setYear] = useState("Year 7");
  const [selectedTerm, setSelectedTerm] = useState<string | null>(null);
  const [difficulty, setDifficulty] = useState(ALL);

  const [draft, setDraft] = useState<Draft | null>(null);
  const [manage, setManage] = useState<null | "year" | "term" | "topic">(null);
  const [editingName, setEditingName] = useState<string | null>(null);
  const [editNameValue, setEditNameValue] = useState("");
  const [newName, setNewName] = useState("");
  const [note, setNote] = useState<string | null>(null);
  const [restoreError, setRestoreError] = useState<string | null>(null);
  const [restore, setRestore] = useState<null | {
    incoming: Word[];
    plan: VocabMergePlan;
  }>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  // Prefer Postgres bank when the teacher session is valid; seed once if empty.
  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        let remote = await listWordsFn();
        if (remote.length === 0) {
          await importSeedWordsFn({
            data: {
              words: SEED_WORDS.map((w) => ({
                year: w.year,
                term: w.term,
                topic: w.topic,
                difficulty: w.difficulty,
                french: w.french,
                english: w.english,
                image: w.image,
              })),
            },
          });
          remote = await listWordsFn();
        }
        if (!cancelled && remote.length) {
          commitWords(remote);
        }
      } catch {
        /* offline / unauthenticated — keep local bank */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  function commitWords(next: Word[]) {
    setWords(next);
    savePersistedWordBank(next);
    const nextYears = [...new Set(next.map((w) => w.year))];
    const nextTerms = [...new Set(next.map((w) => w.term))];
    const nextTopics = [...new Set(next.map((w) => w.topic))];
    if (nextYears.length) {
      setYears((prev) => {
        const merged = [...prev];
        for (const y of nextYears) if (!merged.includes(y)) merged.push(y);
        return merged;
      });
      if (!nextYears.includes(year)) setYear(nextYears[0]!);
    }
    if (nextTerms.length) {
      setTerms((prev) => {
        const merged = [...prev];
        for (const t of nextTerms) if (!merged.includes(t)) merged.push(t);
        return merged;
      });
    }
    if (nextTopics.length) {
      setTopics((prev) => {
        const merged = [...prev];
        for (const t of nextTopics) if (!merged.includes(t)) merged.push(t);
        return merged;
      });
    }
  }

  function updateWords(fn: (prev: Word[]) => Word[]) {
    setWords((prev) => {
      const next = fn(prev);
      savePersistedWordBank(next);
      return next;
    });
  }

  function flash(msg: string) {
    setNote(msg);
    window.setTimeout(() => setNote(null), 2800);
  }

  async function onRestoreFile(file: File) {
    setRestoreError(null);
    try {
      const text = await file.text();
      const payload = parseVocabBackupDoc(text);
      const plan = planVocabMerge(words, payload.words);
      if (plan.duplicates.length === 0) {
        commitWords(applyVocabMerge(words, payload.words, "add_missing"));
        flash(
          `Loaded ${payload.words.length} word${payload.words.length === 1 ? "" : "s"} from backup`,
        );
        return;
      }
      setRestore({ incoming: payload.words, plan });
    } catch (err) {
      setRestoreError(err instanceof Error ? err.message : "Could not read that file.");
    }
  }

  const yearWords = useMemo(
    () =>
      words.filter(
        (word) =>
          word.year === year &&
          (difficulty === ALL || word.difficulty === difficulty),
      ),
    [words, year, difficulty],
  );

  const termCards = useMemo(() => {
    const counts = new Map<string, number>();
    for (const word of yearWords) {
      counts.set(word.term, (counts.get(word.term) ?? 0) + 1);
    }
    return terms
      .filter((termName) => counts.has(termName))
      .map((termName) => ({ term: termName, count: counts.get(termName)! }));
  }, [yearWords, terms]);

  const bookletTopics = useMemo(() => {
    if (!selectedTerm) return [];
    const inTerm = yearWords.filter((word) => word.term === selectedTerm);
    const byTopic = new Map<string, Word[]>();
    for (const word of inTerm) {
      const list = byTopic.get(word.topic) ?? [];
      list.push(word);
      byTopic.set(word.topic, list);
    }
    return topics
      .filter((topicName) => byTopic.has(topicName))
      .map((topicName) => ({ topic: topicName, words: byTopic.get(topicName)! }));
  }, [yearWords, selectedTerm, topics]);

  useEffect(() => {
    setSelectedTerm(null);
  }, [year]);

  function renameManagedItem(
    kind: "year" | "term" | "topic",
    from: string,
    to: string,
  ): boolean {
    const trimmed = to.trim();
    if (!trimmed || trimmed === from) return false;

    if (kind === "year") {
      if (years.includes(trimmed)) return false;
      setYears((prev) => prev.map((name) => (name === from ? trimmed : name)));
      updateWords((prev) =>
        prev.map((word) => (word.year === from ? { ...word, year: trimmed } : word)),
      );
      if (year === from) setYear(trimmed);
      return true;
    }

    if (kind === "term") {
      if (terms.includes(trimmed)) return false;
      setTerms((prev) => prev.map((name) => (name === from ? trimmed : name)));
      updateWords((prev) =>
        prev.map((word) => (word.term === from ? { ...word, term: trimmed } : word)),
      );
      if (selectedTerm === from) setSelectedTerm(trimmed);
      return true;
    }

    if (topics.includes(trimmed)) return false;
    setTopics((prev) => prev.map((name) => (name === from ? trimmed : name)));
    updateWords((prev) =>
      prev.map((word) => (word.topic === from ? { ...word, topic: trimmed } : word)),
    );
    return true;
  }

  async function saveDraft(d: Draft) {
    const image = d.image?.trim() || undefined;
    const payload = { ...d, image };
    try {
      const remote = await upsertWordFn({
        data: {
          id: d.id,
          word: {
            year: d.year,
            term: d.term,
            topic: d.topic,
            difficulty: d.difficulty,
            french: d.french,
            english: d.english,
            image: image ?? null,
          },
        },
      });
      if (d.id) {
        updateWords((prev) =>
          prev.map((w) => (w.id === d.id || w.id === remote.id ? remote : w)),
        );
      } else {
        updateWords((prev) => [...prev, remote]);
        if (d.year !== year) setYear(d.year);
        if (d.term) setSelectedTerm(d.term);
      }
      setDraft(null);
      flash("Word saved");
    } catch {
      if (d.id) {
        updateWords((prev) =>
          prev.map((w) =>
            w.id === d.id ? ({ ...w, ...payload, id: d.id } as Word) : w,
          ),
        );
        saveWordPatch(d.id, {
          french: d.french,
          english: d.english,
          year: d.year,
          term: d.term,
          topic: d.topic,
          difficulty: d.difficulty,
          image: image ?? "",
        });
      } else {
        updateWords((prev) => [...prev, { ...payload, id: nextId() } as Word]);
        if (d.year !== year) setYear(d.year);
        if (d.term) setSelectedTerm(d.term);
      }
      setDraft(null);
      flash("Saved on this device only — sign in to sync");
    }
  }

  async function deleteWord(id: string) {
    updateWords((prev) => prev.filter((x) => x.id !== id));
    try {
      await deleteWordFn({ data: { id } });
    } catch {
      /* local remove already applied */
    }
  }

  return (
    <AppChrome>
      <main className="vocablab-vocab-page mx-auto max-w-3xl px-4 pb-[calc(7.5rem+env(safe-area-inset-bottom,0px))] pt-4 sm:px-6 sm:pb-32 sm:pt-8">
        <Link
          to="/home"
          className="mb-3 inline-flex min-h-11 items-center text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground transition-colors hover:text-foreground"
        >
          &larr; Back to home
        </Link>

        <header className="flex flex-col gap-4 sm:flex-row sm:flex-wrap sm:items-end sm:justify-between">
          <h1 className="font-kids text-[2rem] font-semibold tracking-tight text-foreground sm:text-4xl">
            Vocabulary
          </h1>
          <div className="grid grid-cols-1 gap-2 sm:flex sm:flex-wrap sm:items-center">
            <GhostButton
              onClick={() => {
                downloadVocabBackup(words);
                flash("Vocabulary backed up");
              }}
            >
              Backup
            </GhostButton>
            <GhostButton onClick={() => fileRef.current?.click()}>
              Restore / load
            </GhostButton>
            <input
              ref={fileRef}
              type="file"
              accept=".doc,.html,.htm,text/html,application/msword"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                e.target.value = "";
                if (file) void onRestoreFile(file);
              }}
            />
          </div>
        </header>
        {note ? (
          <p className="mt-3 text-sm font-semibold text-success">{note}</p>
        ) : null}
        {restoreError ? (
          <p className="mt-3 text-sm font-semibold text-destructive">{restoreError}</p>
        ) : null}

        {/* Filters */}
        <div className="vocablab-vocab-sticky sticky top-0 z-20 -mx-4 mt-6 bg-background/95 px-4 py-3 backdrop-blur-sm sm:-mx-6 sm:mt-8 sm:px-6 sm:py-4">
          <div className="flex flex-col gap-3 border-b border-line pb-3 sm:flex-row sm:flex-wrap sm:items-center sm:gap-2 sm:pb-4">
            <div className="grid grid-cols-2 gap-2 sm:contents">
              <Select label="Year" value={year} onChange={setYear} options={years} />
              <Select
                label="Difficulty"
                value={difficulty}
                onChange={setDifficulty}
                options={[ALL, ...DIFFICULTIES]}
              />
            </div>
            <button
              type="button"
              onClick={() =>
                setDraft({
                  year,
                  term: selectedTerm ?? terms[0] ?? "Term 1",
                  topic: topics[0] ?? "Greetings",
                  difficulty: "Medium",
                  french: "",
                  english: "",
                })
              }
              className="hidden min-h-11 rounded-xl bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90 active:scale-[0.98] sm:ml-auto sm:inline-flex sm:items-center"
            >
              Add word
            </button>
          </div>

          <div className="flex flex-col gap-3 pt-3 text-xs text-muted-foreground sm:flex-row sm:flex-wrap sm:items-center sm:gap-x-5 sm:gap-y-2">
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
              <span>
                <span className="font-semibold text-foreground">Bold</span> = Low
              </span>
              <span>Regular = Medium</span>
              <span>
                <span className="text-foreground">*</span> = High
              </span>
            </div>
            <div className="flex flex-wrap items-center gap-1 sm:ml-auto">
              <button
                type="button"
                onClick={() => setManage("year")}
                className="min-h-10 rounded-lg px-3 py-2 font-medium underline-offset-4 hover:bg-muted hover:text-foreground"
              >
                Years
              </button>
              <button
                type="button"
                onClick={() => setManage("term")}
                className="min-h-10 rounded-lg px-3 py-2 font-medium underline-offset-4 hover:bg-muted hover:text-foreground"
              >
                Terms
              </button>
              <button
                type="button"
                onClick={() => setManage("topic")}
                className="min-h-10 rounded-lg px-3 py-2 font-medium underline-offset-4 hover:bg-muted hover:text-foreground"
              >
                Topics
              </button>
            </div>
          </div>
        </div>

        {selectedTerm ? (
          <div className="mt-6 sm:mt-8">
            <button
              type="button"
              onClick={() => setSelectedTerm(null)}
              className="mb-4 inline-flex min-h-11 items-center text-sm font-medium text-muted-foreground transition-colors hover:text-foreground sm:mb-6"
            >
              &larr; All terms
            </button>

            <article className="rounded-2xl bg-surface/80 px-4 py-6 shadow-sm ring-1 ring-border sm:rounded-3xl sm:px-12 sm:py-10">
              <header className="border-b border-line pb-5 text-center sm:pb-6">
                <p className="text-xs font-semibold uppercase tracking-[0.28em] text-muted-foreground">
                  {year}
                </p>
                <h2 className="mt-2 font-serif text-2xl font-medium tracking-tight sm:text-3xl">
                  {selectedTerm}
                </h2>
                <p className="mt-2 text-sm text-muted-foreground">
                  {bookletTopics.reduce((count, section) => count + section.words.length, 0)}{" "}
                  words
                </p>
              </header>

              {bookletTopics.length === 0 ? (
                <p className="mt-10 text-center text-sm text-muted-foreground">
                  No words match this filter.
                </p>
              ) : (
                <div className="mt-6 space-y-8 sm:mt-10 sm:space-y-10">
                  {bookletTopics.map(({ topic: topicName, words: list }) => (
                    <section key={topicName}>
                      <h3 className="border-b border-line pb-2 font-serif text-lg font-semibold tracking-tight sm:text-xl">
                        {topicName}
                      </h3>
                      <ul className="mt-2 sm:mt-4">
                        {list.map((item) => (
                          <VocabRow
                            key={item.id}
                            item={item}
                            onEdit={() => setDraft({ ...item })}
                            onDelete={() => void deleteWord(item.id)}
                          />
                        ))}
                      </ul>
                    </section>
                  ))}
                </div>
              )}
            </article>
          </div>
        ) : termCards.length === 0 ? (
          <div className="mt-12 rounded-2xl bg-surface/60 px-6 py-12 text-center ring-1 ring-border sm:mt-20 sm:rounded-3xl sm:px-8 sm:py-16">
            <p className="text-lg font-medium">Nothing here yet</p>
            <p className="mx-auto mt-2 max-w-sm text-sm text-muted-foreground">
              No words match these filters. Try another difficulty, or add your
              first word for {year}.
            </p>
          </div>
        ) : (
          <div className="mt-6 grid gap-3 sm:mt-10 sm:grid-cols-2 sm:gap-4">
            {termCards.map(({ term: termName, count }) => (
              <button
                key={termName}
                type="button"
                onClick={() => setSelectedTerm(termName)}
                className="group min-h-[5.5rem] rounded-2xl border border-line bg-surface/60 px-5 py-6 text-left transition-colors hover:border-foreground/20 hover:bg-surface active:scale-[0.99] sm:px-6 sm:py-8"
              >
                <p className="text-xs font-semibold uppercase tracking-[0.22em] text-muted-foreground">
                  {year}
                </p>
                <p className="mt-2 text-xl font-medium tracking-tight group-hover:text-foreground sm:text-2xl">
                  {termName}
                </p>
                <p className="mt-2 text-sm text-muted-foreground">
                  {count} {count === 1 ? "word" : "words"}
                </p>
              </button>
            ))}
          </div>
        )}

        <button
          type="button"
          onClick={() =>
            setDraft({
              year,
              term: selectedTerm ?? terms[0] ?? "Term 1",
              topic: topics[0] ?? "Greetings",
              difficulty: "Medium",
              french: "",
              english: "",
            })
          }
          className="vocablab-vocab-fab sm:hidden"
        >
          Add word
        </button>
      </main>

      {/* Add / edit word */}
      {draft ? (
        <Modal title={draft.id ? "Edit word" : "Add word"} onClose={() => setDraft(null)}>
          <form
            className="space-y-4"
            onSubmit={(e) => {
              e.preventDefault();
              saveDraft(draft);
            }}
          >
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <Field label="Year">
                <NativeSelect
                  value={draft.year}
                  onChange={(v) => setDraft({ ...draft, year: v })}
                  options={years}
                />
              </Field>
              <Field label="Term">
                <NativeSelect
                  value={draft.term}
                  onChange={(v) => setDraft({ ...draft, term: v })}
                  options={terms}
                />
              </Field>
              <Field label="Topic">
                <NativeSelect
                  value={draft.topic}
                  onChange={(v) => setDraft({ ...draft, topic: v })}
                  options={topics}
                />
              </Field>
              <Field label="Difficulty">
                <NativeSelect
                  value={draft.difficulty}
                  onChange={(v) =>
                    setDraft({ ...draft, difficulty: v as Difficulty })
                  }
                  options={DIFFICULTIES}
                />
              </Field>
            </div>
            <Field label="French">
              <input
                required
                autoComplete="off"
                enterKeyHint="next"
                value={draft.french}
                onChange={(e) => setDraft({ ...draft, french: e.target.value })}
                className="w-full rounded-xl bg-surface px-4 py-3 font-serif text-base italic ring-1 ring-input focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </Field>
            <Field label="English">
              <input
                required
                autoComplete="off"
                enterKeyHint="done"
                value={draft.english}
                onChange={(e) => setDraft({ ...draft, english: e.target.value })}
                className="w-full rounded-xl bg-surface px-4 py-3 text-base ring-1 ring-input focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </Field>
            <Field label="Image">
              <ImagePicker
                value={draft.image}
                onChange={(image) => setDraft({ ...draft, image })}
              />
            </Field>
            <div className="flex flex-col-reverse gap-2 pt-2 sm:flex-row sm:justify-end">
              <GhostButton onClick={() => setDraft(null)}>Cancel</GhostButton>
              <button
                type="submit"
                className="min-h-12 rounded-xl bg-primary px-5 py-3 text-base font-medium text-primary-foreground sm:min-h-11 sm:py-2 sm:text-sm"
              >
                Save word
              </button>
            </div>
          </form>
        </Modal>
      ) : null}

      {/* Manage year / term / topic */}
      {manage ? (
        <Modal
          title={
            manage === "year"
              ? "Years"
              : manage === "term"
                ? "Terms"
                : "Topics"
          }
          onClose={() => {
            setManage(null);
            setNewName("");
            setEditingName(null);
            setEditNameValue("");
          }}
        >
          <ul className="mb-6">
            {(manage === "year" ? years : manage === "term" ? terms : topics).map(
              (name) => (
                <li
                  key={name}
                  className="flex items-center justify-between gap-3 border-b border-line py-3 text-sm"
                >
                  {editingName === name ? (
                    <input
                      autoFocus
                      value={editNameValue}
                      onChange={(e) => setEditNameValue(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          if (manage && renameManagedItem(manage, name, editNameValue)) {
                            setEditingName(null);
                            setEditNameValue("");
                          }
                        }
                        if (e.key === "Escape") {
                          setEditingName(null);
                          setEditNameValue("");
                        }
                      }}
                      className="min-h-11 min-w-0 flex-1 rounded-lg bg-surface px-3 py-2 text-base ring-1 ring-input focus:outline-none focus:ring-2 focus:ring-ring sm:text-sm"
                    />
                  ) : (
                    <span className="min-w-0 flex-1 truncate py-1">{name}</span>
                  )}
                  <div className="flex shrink-0 gap-1">
                    {editingName === name ? (
                      <>
                        <button
                          type="button"
                          onClick={() => {
                            if (manage && renameManagedItem(manage, name, editNameValue)) {
                              setEditingName(null);
                              setEditNameValue("");
                            }
                          }}
                          className="min-h-11 rounded-lg px-3 text-sm font-medium text-foreground hover:bg-muted"
                        >
                          Save
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setEditingName(null);
                            setEditNameValue("");
                          }}
                          className="min-h-11 rounded-lg px-3 text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground"
                        >
                          Cancel
                        </button>
                      </>
                    ) : (
                      <button
                        type="button"
                        onClick={() => {
                          setEditingName(name);
                          setEditNameValue(name);
                        }}
                        className="min-h-11 rounded-lg px-3 text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground"
                      >
                        Edit
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => {
                        if (manage === "year") {
                          setYears((p) => p.filter((x) => x !== name));
                          updateWords((p) => p.filter((w) => w.year !== name));
                          if (year === name) {
                            const left = years.filter((x) => x !== name);
                            setYear(left[0] ?? "");
                          }
                        } else if (manage === "term") {
                          setTerms((p) => p.filter((x) => x !== name));
                          updateWords((p) => p.filter((w) => w.term !== name));
                          if (selectedTerm === name) setSelectedTerm(null);
                        } else {
                          setTopics((p) => p.filter((x) => x !== name));
                          updateWords((p) => p.filter((w) => w.topic !== name));
                        }
                        if (editingName === name) {
                          setEditingName(null);
                          setEditNameValue("");
                        }
                      }}
                      className="min-h-11 rounded-lg px-3 text-sm font-medium text-destructive/80 hover:bg-destructive/10 hover:text-destructive"
                    >
                      Delete
                    </button>
                  </div>
                </li>
              ),
            )}
          </ul>
          <form
            className="flex gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              const name = newName.trim();
              if (!name) return;
              if (manage === "year") setYears((p) => [...p, name]);
              else if (manage === "term") setTerms((p) => [...p, name]);
              else setTopics((p) => [...p, name]);
              setNewName("");
            }}
          >
            <input
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder={
                manage === "year"
                  ? "Year 10"
                  : manage === "term"
                    ? "Term 4"
                    : "Holidays"
              }
              className="flex-1 rounded-xl bg-surface px-4 py-2.5 text-sm ring-1 ring-input focus:outline-none focus:ring-2 focus:ring-ring"
            />
            <button
              type="submit"
              className="rounded-xl bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground"
            >
              Add
            </button>
          </form>
        </Modal>
      ) : null}

      {restore ? (
        <Modal title="Restore / load vocabulary" onClose={() => setRestore(null)}>
          <p className="text-sm text-muted-foreground">
            This backup has {restore.incoming.length} word
            {restore.incoming.length === 1 ? "" : "s"}.{" "}
            <span className="font-semibold text-foreground">
              {restore.plan.duplicates.length} duplicate
              {restore.plan.duplicates.length === 1 ? "" : "s"}
            </span>{" "}
            already exist
            {restore.plan.missing.length
              ? `, and ${restore.plan.missing.length} new word${restore.plan.missing.length === 1 ? "" : "s"} can be added`
              : ""}
            .
          </p>
          <div className="mt-8 flex flex-wrap justify-end gap-2">
            <GhostButton onClick={() => setRestore(null)}>Cancel</GhostButton>
            <GhostButton
              onClick={() => {
                commitWords(applyVocabMerge(words, restore.incoming, "add_missing"));
                setRestore(null);
                flash(
                  restore.plan.missing.length
                    ? `Added ${restore.plan.missing.length} missing word${restore.plan.missing.length === 1 ? "" : "s"}`
                    : "No new words to add",
                );
              }}
            >
              Add just the missing
            </GhostButton>
            <button
              type="button"
              onClick={() => {
                commitWords(applyVocabMerge(words, restore.incoming, "overwrite_all"));
                setRestore(null);
                flash("Vocabulary replaced from backup");
              }}
              className="rounded-lg bg-primary px-5 py-2 text-sm font-medium text-primary-foreground"
            >
              Overwrite all
            </button>
          </div>
        </Modal>
      ) : null}
    </AppChrome>
  );
}

function VocabRow({
  item,
  onEdit,
  onDelete,
}: {
  item: Word;
  onEdit: () => void;
  onDelete: () => void;
}) {
  return (
    <li className="border-b border-line last:border-b-0">
      <div className="flex items-stretch gap-1 py-1 sm:gap-2">
        <button
          type="button"
          onClick={onEdit}
          className="flex min-h-[3.75rem] min-w-0 flex-1 items-start gap-3 rounded-xl px-1 py-2.5 text-left transition hover:bg-muted/40 focus:outline-none focus-visible:bg-muted/50 focus-visible:ring-2 focus-visible:ring-ring sm:gap-4 sm:px-2"
        >
          {resolveImageSrc(item.image) ? (
            <img
              src={resolveImageSrc(item.image)}
              alt=""
              className="mt-0.5 h-14 w-14 shrink-0 rounded-lg object-contain ring-1 ring-border sm:h-16 sm:w-16"
            />
          ) : null}
          <div
            className={`flex min-w-0 flex-1 flex-col gap-0.5 sm:flex-row sm:flex-wrap sm:items-baseline sm:gap-x-6 sm:gap-y-1 ${
              item.difficulty === "Low"
                ? "font-semibold text-foreground"
                : "font-normal text-muted-foreground"
            }`}
          >
            <span className="font-serif text-base italic sm:text-lg">
              {item.difficulty === "High" ? "* " : ""}
              {item.french}
            </span>
            <span className="text-sm sm:text-base">{item.english}</span>
          </div>
        </button>
        <button
          type="button"
          aria-label={`Delete ${item.french}`}
          onClick={(e) => {
            e.stopPropagation();
            onDelete();
          }}
          className="my-auto mr-0.5 flex size-11 shrink-0 items-center justify-center rounded-full text-destructive/80 transition hover:bg-destructive/10 hover:text-destructive focus:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:size-10"
        >
          <TrashIcon />
        </button>
      </div>
    </li>
  );
}

function TrashIcon() {
  return (
    <svg viewBox="0 0 20 20" width="16" height="16" fill="none" aria-hidden>
      <path
        d="M7.5 4.5V3.75A1.25 1.25 0 0 1 8.75 2.5h2.5a1.25 1.25 0 0 1 1.25 1.25v.75M4 5.5h12M8.25 8.5v5M11.75 8.5v5M5.75 5.5l.6 9.1A1.5 1.5 0 0 0 7.85 16h4.3a1.5 1.5 0 0 0 1.5-1.4l.6-9.1"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function GhostButton({
  children,
  onClick,
}: {
  children: ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="min-h-11 w-full rounded-xl bg-surface px-4 py-2.5 text-sm font-medium text-foreground ring-1 ring-border transition-colors hover:bg-accent active:scale-[0.98] sm:w-auto"
    >
      {children}
    </button>
  );
}

function Select({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: string[];
}) {
  return (
    <label className="relative inline-flex min-h-12 w-full min-w-0 cursor-pointer items-stretch overflow-hidden rounded-2xl bg-card ring-1 ring-border transition hover:ring-primary/40 focus-within:ring-2 focus-within:ring-ring sm:min-h-0 sm:min-w-[9.5rem] sm:w-auto">
      <span className="pointer-events-none flex min-w-0 flex-1 flex-col justify-center py-2.5 pl-3.5 pr-1">
        <span className="text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
          {label}
        </span>
        <span className="mt-0.5 truncate text-sm font-semibold text-foreground">{value}</span>
      </span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        aria-label={label}
        className="absolute inset-0 cursor-pointer opacity-0"
      >
        {options.map((o) => (
          <option key={o} value={o}>
            {o}
          </option>
        ))}
      </select>
      <span className="pointer-events-none ml-auto flex items-center pr-3 text-muted-foreground" aria-hidden>
        <svg viewBox="0 0 12 8" width="12" height="8" fill="none">
          <path d="M1 1.5 L6 6.5 L11 1.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
        </svg>
      </span>
    </label>
  );
}

function NativeSelect({
  value,
  onChange,
  options,
}: {
  value: string;
  onChange: (v: string) => void;
  options: string[];
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="min-h-12 w-full rounded-xl bg-surface px-3 py-3 text-base ring-1 ring-input focus:outline-none focus:ring-2 focus:ring-ring sm:min-h-0 sm:py-2.5 sm:text-sm"
    >
      {options.map((o) => (
        <option key={o} value={o}>
          {o}
        </option>
      ))}
    </select>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 ml-1 block text-xs font-medium uppercase tracking-wider text-muted-foreground">
        {label}
      </span>
      {children}
    </label>
  );
}

function Modal({
  title,
  onClose,
  children,
}: {
  title: string;
  onClose: () => void;
  children: ReactNode;
}) {
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
    <div className="vocablab-modal-shell fixed inset-0 z-50 grid place-items-end bg-background/80 px-0 backdrop-blur-sm sm:place-items-center sm:px-6">
      <div
        ref={panelRef}
        className="vocablab-modal-panel max-h-[92dvh] w-full max-w-lg overflow-y-auto rounded-t-3xl bg-popover p-5 pb-[calc(1.25rem+env(safe-area-inset-bottom,0px))] shadow-2xl ring-1 ring-border sm:max-h-[85vh] sm:rounded-3xl sm:p-8 sm:pb-8"
      >
        <div className="mb-5 flex items-start justify-between gap-4 sm:mb-6">
          <h2 className="text-xl font-medium tracking-tight">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-full text-sm text-muted-foreground hover:bg-muted hover:text-foreground"
          >
            Close
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
