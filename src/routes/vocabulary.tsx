import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { AppChrome } from "@/components/AppChrome";
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
  const [words, setWords] = useState<Word[]>(SEED_WORDS);
  const [years, setYears] = useState<string[]>(YEARS);
  const [terms, setTerms] = useState<string[]>(TERMS);
  const [topics, setTopics] = useState<string[]>(TOPICS);

  const [year, setYear] = useState("Year 7");
  const [selectedTerm, setSelectedTerm] = useState<string | null>(null);
  const [difficulty, setDifficulty] = useState(ALL);

  const [draft, setDraft] = useState<Draft | null>(null);
  const [confirmYear, setConfirmYear] = useState(false);
  const [manage, setManage] = useState<null | "year" | "term" | "topic">(null);
  const [editingName, setEditingName] = useState<string | null>(null);
  const [editNameValue, setEditNameValue] = useState("");
  const [newName, setNewName] = useState("");
  const [download, setDownload] = useState(false);
  const [upload, setUpload] = useState<null | { year: string; exists: boolean }>(
    null,
  );
  const fileRef = useRef<HTMLInputElement>(null);

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
      setWords((prev) =>
        prev.map((word) => (word.year === from ? { ...word, year: trimmed } : word)),
      );
      if (year === from) setYear(trimmed);
      return true;
    }

    if (kind === "term") {
      if (terms.includes(trimmed)) return false;
      setTerms((prev) => prev.map((name) => (name === from ? trimmed : name)));
      setWords((prev) =>
        prev.map((word) => (word.term === from ? { ...word, term: trimmed } : word)),
      );
      if (selectedTerm === from) setSelectedTerm(trimmed);
      return true;
    }

    if (topics.includes(trimmed)) return false;
    setTopics((prev) => prev.map((name) => (name === from ? trimmed : name)));
    setWords((prev) =>
      prev.map((word) => (word.topic === from ? { ...word, topic: trimmed } : word)),
    );
    return true;
  }

  function saveDraft(d: Draft) {
    const image = d.image?.trim() || undefined;
    const payload = { ...d, image };
    if (d.id) {
      setWords((prev) =>
        prev.map((w) =>
          w.id === d.id ? ({ ...w, ...payload, id: d.id } as Word) : w,
        ),
      );
    } else {
      setWords((prev) => [...prev, { ...payload, id: nextId() } as Word]);
      if (d.year !== year) setYear(d.year);
      if (d.term) setSelectedTerm(d.term);
    }
    setDraft(null);
  }

  return (
    <AppChrome>
      <main className="mx-auto max-w-3xl px-6 pb-32 pt-8">
        <Link
          to="/home"
          className="mb-3 inline-block text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground transition-colors hover:text-foreground"
        >
          &larr; Back to home
        </Link>

        <header className="flex flex-wrap items-end justify-between gap-4">
          <h1 className="text-4xl font-medium tracking-tight">Vocabulary</h1>
          <div className="flex gap-2">
            <GhostButton onClick={() => setDownload(true)}>
              Download vocabulary
            </GhostButton>
            <GhostButton onClick={() => fileRef.current?.click()}>
              Upload vocabulary
            </GhostButton>
            <input
              ref={fileRef}
              type="file"
              className="hidden"
              onChange={(e) => {
                e.target.value = "";
                const exists = Math.random() > 0.5;
                setUpload({ year: exists ? "Year 8" : "Year 10", exists });
              }}
            />
          </div>
        </header>

        {/* Filters */}
        <div className="sticky top-0 z-20 -mx-6 mt-8 bg-background/95 px-6 py-4 backdrop-blur-sm">
          <div className="flex flex-wrap items-center gap-2 border-b border-line pb-4">
            <Select label="Year" value={year} onChange={setYear} options={years} />
            <Select
              label="Difficulty"
              value={difficulty}
              onChange={setDifficulty}
              options={[ALL, ...DIFFICULTIES]}
            />
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
              className="ml-auto rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90 active:scale-[0.98]"
            >
              Add word
            </button>
          </div>

          <div className="flex flex-wrap items-center gap-x-5 gap-y-2 pt-3 text-xs text-muted-foreground">
            <span>
              <span className="font-semibold text-foreground">Bold</span> = Low
            </span>
            <span>Regular = Medium</span>
            <span>
              <span className="text-foreground">*</span> = High
            </span>
            <span className="ml-auto flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={() => setManage("year")}
                className="underline-offset-4 hover:text-foreground hover:underline"
              >
                Years
              </button>
              <button
                type="button"
                onClick={() => setManage("term")}
                className="underline-offset-4 hover:text-foreground hover:underline"
              >
                Terms
              </button>
              <button
                type="button"
                onClick={() => setManage("topic")}
                className="underline-offset-4 hover:text-foreground hover:underline"
              >
                Topics
              </button>
            </span>
          </div>
        </div>

        {selectedTerm ? (
          <div className="mt-8">
            <button
              type="button"
              onClick={() => setSelectedTerm(null)}
              className="mb-6 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
            >
              &larr; All terms
            </button>

            <article className="rounded-3xl bg-surface/80 px-8 py-10 shadow-sm ring-1 ring-border sm:px-12">
              <header className="border-b border-line pb-6 text-center">
                <p className="text-xs font-semibold uppercase tracking-[0.28em] text-muted-foreground">
                  {year}
                </p>
                <h2 className="mt-2 font-serif text-3xl font-medium tracking-tight">
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
                <div className="mt-10 space-y-10">
                  {bookletTopics.map(({ topic: topicName, words: list }) => (
                    <section key={topicName}>
                      <h3 className="border-b border-line pb-2 font-serif text-xl font-semibold tracking-tight">
                        {topicName}
                      </h3>
                      <ul className="mt-4">
                        {list.map((item) => (
                          <VocabRow
                            key={item.id}
                            item={item}
                            onEdit={() => setDraft({ ...item })}
                            onDelete={() =>
                              setWords((prev) => prev.filter((x) => x.id !== item.id))
                            }
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
          <div className="mt-20 rounded-3xl bg-surface/60 px-8 py-16 text-center ring-1 ring-border">
            <p className="text-lg font-medium">Nothing here yet</p>
            <p className="mx-auto mt-2 max-w-sm text-sm text-muted-foreground">
              No words match these filters. Try another difficulty, or add your
              first word for {year}.
            </p>
          </div>
        ) : (
          <div className="mt-10 grid gap-4 sm:grid-cols-2">
            {termCards.map(({ term: termName, count }) => (
              <button
                key={termName}
                type="button"
                onClick={() => setSelectedTerm(termName)}
                className="group rounded-2xl border border-line bg-surface/60 px-6 py-8 text-left transition-colors hover:border-foreground/20 hover:bg-surface active:scale-[0.99]"
              >
                <p className="text-xs font-semibold uppercase tracking-[0.22em] text-muted-foreground">
                  {year}
                </p>
                <p className="mt-2 text-2xl font-medium tracking-tight group-hover:text-foreground">
                  {termName}
                </p>
                <p className="mt-2 text-sm text-muted-foreground">
                  {count} {count === 1 ? "word" : "words"}
                </p>
              </button>
            ))}
          </div>
        )}

        <div className="mt-20 border-t border-line pt-6">
          <button
            type="button"
            onClick={() => setConfirmYear(true)}
            className="text-sm font-medium text-destructive hover:opacity-80"
          >
            Delete {year}
          </button>
        </div>
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
            <div className="grid grid-cols-2 gap-3">
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
                value={draft.french}
                onChange={(e) => setDraft({ ...draft, french: e.target.value })}
                className="w-full rounded-xl bg-surface px-4 py-2.5 font-serif text-base italic ring-1 ring-input focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </Field>
            <Field label="English">
              <input
                required
                value={draft.english}
                onChange={(e) => setDraft({ ...draft, english: e.target.value })}
                className="w-full rounded-xl bg-surface px-4 py-2.5 text-base ring-1 ring-input focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </Field>
            <Field label="Image (optional)">
              <input
                value={draft.image ?? ""}
                onChange={(e) => setDraft({ ...draft, image: e.target.value })}
                placeholder="/vocab-images/year8/eiffel-tower.jpg"
                className="w-full rounded-xl bg-surface px-4 py-2.5 text-sm ring-1 ring-input focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </Field>
            <div className="flex justify-end gap-2 pt-2">
              <GhostButton onClick={() => setDraft(null)}>Cancel</GhostButton>
              <button
                type="submit"
                className="rounded-lg bg-primary px-5 py-2 text-sm font-medium text-primary-foreground"
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
                  className="flex items-center justify-between gap-3 border-b border-line py-2.5 text-sm"
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
                      className="min-w-0 flex-1 rounded-lg bg-surface px-3 py-1.5 text-sm ring-1 ring-input focus:outline-none focus:ring-2 focus:ring-ring"
                    />
                  ) : (
                    <span className="min-w-0 flex-1 truncate">{name}</span>
                  )}
                  <div className="flex shrink-0 gap-3">
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
                          className="text-xs font-medium text-foreground hover:opacity-80"
                        >
                          Save
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setEditingName(null);
                            setEditNameValue("");
                          }}
                          className="text-xs font-medium text-muted-foreground hover:text-foreground"
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
                        className="text-xs font-medium text-muted-foreground hover:text-foreground"
                      >
                        Edit
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => {
                        if (manage === "year") {
                          setYears((p) => p.filter((x) => x !== name));
                          setWords((p) => p.filter((w) => w.year !== name));
                          if (year === name) {
                            const left = years.filter((x) => x !== name);
                            setYear(left[0] ?? "");
                          }
                        } else if (manage === "term") {
                          setTerms((p) => p.filter((x) => x !== name));
                          setWords((p) => p.filter((w) => w.term !== name));
                          if (selectedTerm === name) setSelectedTerm(null);
                        } else {
                          setTopics((p) => p.filter((x) => x !== name));
                          setWords((p) => p.filter((w) => w.topic !== name));
                        }
                        if (editingName === name) {
                          setEditingName(null);
                          setEditNameValue("");
                        }
                      }}
                      className="text-xs font-medium text-destructive/70 hover:text-destructive"
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

      {/* Delete year confirmation */}
      {confirmYear ? (
        <Modal title={`Delete ${year}?`} onClose={() => setConfirmYear(false)}>
          <p className="text-sm text-muted-foreground">
            This will delete all words in this year. This cannot be undone.
          </p>
          <div className="mt-8 flex justify-end gap-2">
            <GhostButton onClick={() => setConfirmYear(false)}>Cancel</GhostButton>
            <button
              type="button"
              onClick={() => {
                const left = years.filter((y) => y !== year);
                setWords((p) => p.filter((w) => w.year !== year));
                setYears(left);
                setYear(left[0] ?? "");
                setConfirmYear(false);
              }}
              className="rounded-lg bg-destructive px-5 py-2 text-sm font-medium text-destructive-foreground"
            >
              Delete {year}
            </button>
          </div>
        </Modal>
      ) : null}

      {/* Download */}
      {download ? (
        <Modal title="Download vocabulary" onClose={() => setDownload(false)}>
          <p className="text-sm text-muted-foreground">
            Your vocabulary file for {year} has been prepared. In this preview no
            file is actually saved.
          </p>
          <div className="mt-8 flex justify-end">
            <button
              type="button"
              onClick={() => setDownload(false)}
              className="rounded-lg bg-primary px-5 py-2 text-sm font-medium text-primary-foreground"
            >
              Done
            </button>
          </div>
        </Modal>
      ) : null}

      {/* Upload */}
      {upload ? (
        <Modal title="Upload vocabulary" onClose={() => setUpload(null)}>
          {upload.exists ? (
            <>
              <p className="text-sm text-muted-foreground">
                {upload.year} already exists. What would you like to do with the
                words in your file?
              </p>
              <div className="mt-8 flex justify-end gap-2">
                <GhostButton onClick={() => setUpload(null)}>Keep mine</GhostButton>
                <button
                  type="button"
                  onClick={() => setUpload(null)}
                  className="rounded-lg bg-primary px-5 py-2 text-sm font-medium text-primary-foreground"
                >
                  Replace whole year
                </button>
              </div>
            </>
          ) : (
            <>
              <p className="text-sm text-muted-foreground">
                {upload.year} will be added to your vocabulary.
              </p>
              <div className="mt-8 flex justify-end gap-2">
                <GhostButton onClick={() => setUpload(null)}>Cancel</GhostButton>
                <button
                  type="button"
                  onClick={() => {
                    setYears((p) =>
                      p.includes(upload.year) ? p : [...p, upload.year],
                    );
                    setUpload(null);
                  }}
                  className="rounded-lg bg-primary px-5 py-2 text-sm font-medium text-primary-foreground"
                >
                  Add {upload.year}
                </button>
              </div>
            </>
          )}
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
    <li className="group flex items-start justify-between gap-4 border-b border-line py-3 last:border-b-0">
      <div className="flex min-w-0 flex-1 gap-4">
        {item.image ? (
          <img
            src={item.image}
            alt=""
            className="mt-0.5 h-16 w-16 shrink-0 rounded-lg object-cover ring-1 ring-border"
          />
        ) : null}
        <div
          className={`flex min-w-0 flex-wrap items-baseline gap-x-6 gap-y-1 ${
            item.difficulty === "Low"
              ? "font-semibold text-foreground"
              : "font-normal text-muted-foreground"
          }`}
        >
          <span className="font-serif text-lg italic">
            {item.difficulty === "High" ? "* " : ""}
            {item.french}
          </span>
          <span className="text-base">{item.english}</span>
        </div>
      </div>
      <div className="flex shrink-0 gap-3 opacity-0 transition-opacity focus-within:opacity-100 group-hover:opacity-100">
        <button
          type="button"
          onClick={onEdit}
          className="text-xs font-medium text-muted-foreground hover:text-foreground"
        >
          Edit
        </button>
        <button
          type="button"
          onClick={onDelete}
          className="text-xs font-medium text-destructive/70 hover:text-destructive"
        >
          Delete
        </button>
      </div>
    </li>
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
      className="rounded-lg bg-surface px-4 py-2 text-sm font-medium text-foreground ring-1 ring-border transition-colors hover:bg-accent active:scale-[0.98]"
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
    <label className="flex items-center gap-2 rounded-lg bg-surface px-3 py-1.5 text-sm ring-1 ring-border">
      <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
        {label}
      </span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="bg-transparent text-sm font-medium focus:outline-none"
      >
        {options.map((o) => (
          <option key={o} value={o}>
            {o}
          </option>
        ))}
      </select>
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
      className="w-full rounded-xl bg-surface px-3 py-2.5 text-sm ring-1 ring-input focus:outline-none focus:ring-2 focus:ring-ring"
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
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-background/80 px-6 backdrop-blur-sm">
      <div className="max-h-[85vh] w-full max-w-lg overflow-y-auto rounded-3xl bg-popover p-8 shadow-2xl ring-1 ring-border">
        <div className="mb-6 flex items-start justify-between gap-4">
          <h2 className="text-xl font-medium tracking-tight">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            className="text-sm text-muted-foreground hover:text-foreground"
          >
            Close
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
