import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useRef, useState, type ReactNode } from "react";
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
          "Edit French and English vocabulary by year, term, topic and difficulty in one calm, readable list.",
      },
      { property: "og:title", content: "Vocabulary — Vocablab" },
      {
        property: "og:description",
        content:
          "Edit French and English vocabulary by year, term, topic and difficulty in one calm, readable list.",
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
};

function VocabularyPage() {
  const [words, setWords] = useState<Word[]>(SEED_WORDS);
  const [years, setYears] = useState<string[]>(YEARS);
  const [terms, setTerms] = useState<string[]>(TERMS);
  const [topics, setTopics] = useState<string[]>(TOPICS);

  const [year, setYear] = useState("Year 7");
  const [term, setTerm] = useState(ALL);
  const [topic, setTopic] = useState(ALL);
  const [difficulty, setDifficulty] = useState(ALL);

  const [draft, setDraft] = useState<Draft | null>(null);
  const [confirmYear, setConfirmYear] = useState(false);
  const [manage, setManage] = useState<null | "year" | "term" | "topic">(null);
  const [newName, setNewName] = useState("");
  const [download, setDownload] = useState(false);
  const [upload, setUpload] = useState<null | { year: string; exists: boolean }>(
    null,
  );
  const fileRef = useRef<HTMLInputElement>(null);

  const filtered = useMemo(
    () =>
      words.filter(
        (word) =>
          word.year === year &&
          (term === ALL || word.term === term) &&
          (topic === ALL || word.topic === topic) &&
          (difficulty === ALL || word.difficulty === difficulty),
      ),
    [words, year, term, topic, difficulty],
  );

  const grouped = useMemo(() => {
    const map = new Map<string, Map<string, Word[]>>();
    for (const t of terms) {
      const inTerm = filtered.filter((word) => word.term === t);
      if (!inTerm.length) continue;
      const byTopic = new Map<string, Word[]>();
      for (const tp of topics) {
        const list = inTerm.filter((word) => word.topic === tp);
        if (list.length) byTopic.set(tp, list);
      }
      map.set(t, byTopic);
    }
    return map;
  }, [filtered, terms, topics]);

  function saveDraft(d: Draft) {
    if (d.id) {
      setWords((prev) =>
        prev.map((w) => (w.id === d.id ? ({ ...w, ...d, id: d.id! } as Word) : w)),
      );
    } else {
      setWords((prev) => [...prev, { ...d, id: nextId() } as Word]);
      if (d.year !== year) setYear(d.year);
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
              label="Term"
              value={term}
              onChange={setTerm}
              options={[ALL, ...terms]}
            />
            <Select
              label="Topic"
              value={topic}
              onChange={setTopic}
              options={[ALL, ...topics]}
            />
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
                  term: term === ALL ? terms[0] : term,
                  topic: topic === ALL ? topics[0] : topic,
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
            <span className="ml-auto flex gap-3">
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

        {/* List */}
        {grouped.size === 0 ? (
          <div className="mt-20 rounded-3xl bg-surface/60 px-8 py-16 text-center ring-1 ring-border">
            <p className="text-lg font-medium">Nothing here yet</p>
            <p className="mx-auto mt-2 max-w-sm text-sm text-muted-foreground">
              No words match these filters. Try another term or topic, or add
              your first word for {year}.
            </p>
          </div>
        ) : (
          <div className="mt-10 space-y-14">
            {[...grouped.entries()].map(([termName, byTopic]) => (
              <section key={termName}>
                <h2 className="text-xs font-semibold uppercase tracking-[0.22em] text-muted-foreground">
                  {year} · {termName}
                </h2>
                <div className="mt-6 space-y-10">
                  {[...byTopic.entries()].map(([topicName, list]) => (
                    <article key={topicName}>
                      <h3 className="text-lg font-semibold tracking-tight">
                        {topicName}
                      </h3>
                      <ul className="mt-3">
                        {list.map((item) => (
                          <li
                            key={item.id}
                            className="group flex items-center justify-between gap-4 border-b border-line py-3"
                          >
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
                            <div className="flex shrink-0 gap-3 opacity-0 transition-opacity focus-within:opacity-100 group-hover:opacity-100">
                              <button
                                type="button"
                                onClick={() => setDraft({ ...item })}
                                className="text-xs font-medium text-muted-foreground hover:text-foreground"
                              >
                                Edit
                              </button>
                              <button
                                type="button"
                                onClick={() =>
                                  setWords((prev) =>
                                    prev.filter((x) => x.id !== item.id),
                                  )
                                }
                                className="text-xs font-medium text-destructive/70 hover:text-destructive"
                              >
                                Delete
                              </button>
                            </div>
                          </li>
                        ))}
                      </ul>
                    </article>
                  ))}
                </div>
              </section>
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
          }}
        >
          <ul className="mb-6">
            {(manage === "year" ? years : manage === "term" ? terms : topics).map(
              (name) => (
                <li
                  key={name}
                  className="flex items-center justify-between border-b border-line py-2.5 text-sm"
                >
                  <span>{name}</span>
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
                        if (term === name) setTerm(ALL);
                      } else {
                        setTopics((p) => p.filter((x) => x !== name));
                        setWords((p) => p.filter((w) => w.topic !== name));
                        if (topic === name) setTopic(ALL);
                      }
                    }}
                    className="text-xs font-medium text-destructive/70 hover:text-destructive"
                  >
                    Delete
                  </button>
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
