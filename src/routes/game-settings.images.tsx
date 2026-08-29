import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useId, useMemo, useRef, useState } from "react";
import {
  deleteLibraryImage,
  listLibraryImages,
  renameLibraryImage,
  uploadLibraryImage,
  type LibraryImage,
} from "@/lib/image-library";
import { SEED_WORDS, type Word } from "@/lib/vocab-data";
import { applyWordPatches, loadWordPatches, saveWordPatch } from "@/lib/word-patches";

export const Route = createFileRoute("/game-settings/images")({
  head: () => ({
    meta: [
      { title: "Images — Vocablab" },
      {
        name: "description",
        content: "Build a picture collection for vocabulary cards and Wheel lessons.",
      },
    ],
  }),
  component: ImagesPage,
});

function ImagesPage() {
  const [items, setItems] = useState(() => listLibraryImages());
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState<LibraryImage | null>(null);
  const [assigning, setAssigning] = useState<LibraryImage | null>(null);
  const [patches, setPatches] = useState(() => loadWordPatches());
  const fileRef = useRef<HTMLInputElement>(null);
  const inputId = useId();

  const words = useMemo(
    () => applyWordPatches(SEED_WORDS, patches),
    [patches],
  );

  function refresh() {
    setItems(listLibraryImages());
    setPatches(loadWordPatches());
  }

  function flash(msg: string) {
    setNote(msg);
    window.setTimeout(() => setNote(null), 2400);
  }

  async function onFile(file: File | undefined) {
    if (!file) return;
    setBusy(true);
    setError(null);
    try {
      await uploadLibraryImage(file);
      refresh();
      flash("Image added to your library");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Upload failed");
    } finally {
      setBusy(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  function remove(img: LibraryImage) {
    if (img.kind === "builtin") {
      setError("Starter images stay in the pack — you can still assign them to words.");
      return;
    }
    if (!window.confirm(`Remove “${img.title}” from your library?`)) return;
    deleteLibraryImage(img.id);
    refresh();
    flash("Image removed");
  }

  function saveTitle(img: LibraryImage, title: string) {
    if (img.kind === "builtin") {
      setEditing(null);
      return;
    }
    renameLibraryImage(img.id, title);
    refresh();
    setEditing(null);
    flash("Name updated");
  }

  function assignToWord(img: LibraryImage, word: Word) {
    saveWordPatch(word.id, { image: img.id });
    refresh();
    setAssigning(null);
    flash(`Assigned “${img.title}” to ${word.french}`);
  }

  return (
    <main className="mx-auto max-w-5xl px-6 pb-24 pt-8">
      <Link
        to="/game-settings"
        className="mb-3 inline-block text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground hover:text-foreground"
      >
        &larr; Create
      </Link>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-kids text-4xl font-semibold tracking-tight">Images</h1>
          <p className="mt-2 max-w-xl text-sm text-muted-foreground">
            Upload pictures, then tap <span className="font-semibold text-foreground">Assign</span>{" "}
            to attach one to a vocabulary word. You can also assign from Edit word on any card.
          </p>
        </div>
        <div>
          <input
            ref={fileRef}
            id={inputId}
            type="file"
            accept="image/*"
            className="sr-only"
            onChange={(e) => void onFile(e.target.files?.[0])}
          />
          <button
            type="button"
            disabled={busy}
            onClick={() => fileRef.current?.click()}
            className="rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground disabled:opacity-60"
          >
            {busy ? "Uploading…" : "Upload image"}
          </button>
        </div>
      </div>

      {note ? <p className="mt-4 text-sm font-semibold text-success">{note}</p> : null}
      {error ? <p className="mt-4 text-sm font-semibold text-destructive">{error}</p> : null}

      <ul className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {items.map((img) => (
          <li
            key={img.id}
            className="flex flex-col overflow-hidden rounded-3xl bg-card ring-1 ring-border"
          >
            <div className="flex aspect-[4/3] items-center justify-center bg-muted/40 p-4">
              <img src={img.src} alt="" className="max-h-full max-w-full object-contain" />
            </div>
            <div className="flex flex-1 flex-col gap-2 p-4">
              {editing?.id === img.id ? (
                <form
                  className="flex gap-2"
                  onSubmit={(e) => {
                    e.preventDefault();
                    const fd = new FormData(e.currentTarget);
                    saveTitle(img, String(fd.get("title") ?? ""));
                  }}
                >
                  <input
                    name="title"
                    defaultValue={img.title}
                    autoFocus
                    maxLength={48}
                    className="min-w-0 flex-1 rounded-xl bg-background px-3 py-2 text-sm font-semibold ring-1 ring-input focus:outline-none focus:ring-2 focus:ring-ring"
                  />
                  <button
                    type="submit"
                    className="rounded-full bg-primary px-3 py-2 text-xs font-semibold text-primary-foreground"
                  >
                    Save
                  </button>
                </form>
              ) : (
                <div className="min-w-0">
                  <p className="truncate font-kids text-lg font-semibold tracking-tight">
                    {img.title}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {img.kind === "builtin" ? "Starter pack" : "Your upload"}
                  </p>
                </div>
              )}
              <div className="mt-auto flex flex-wrap gap-1.5 pt-1">
                <button
                  type="button"
                  onClick={() => setAssigning(img)}
                  className="rounded-full bg-primary px-3 py-1 text-xs font-semibold text-primary-foreground"
                >
                  Assign to word
                </button>
                {img.kind === "upload" ? (
                  <>
                    <button
                      type="button"
                      onClick={() => setEditing(img)}
                      className="rounded-full px-3 py-1 text-xs font-semibold text-foreground ring-1 ring-border hover:bg-muted"
                    >
                      Rename
                    </button>
                    <button
                      type="button"
                      onClick={() => remove(img)}
                      className="rounded-full px-3 py-1 text-xs font-semibold text-destructive ring-1 ring-border hover:bg-destructive/10"
                    >
                      Delete
                    </button>
                  </>
                ) : null}
              </div>
            </div>
          </li>
        ))}
      </ul>

      {assigning ? (
        <AssignWordModal
          image={assigning}
          words={words}
          onClose={() => setAssigning(null)}
          onAssign={(word) => assignToWord(assigning, word)}
        />
      ) : null}
    </main>
  );
}

function AssignWordModal({
  image,
  words,
  onClose,
  onAssign,
}: {
  image: LibraryImage;
  words: Word[];
  onClose: () => void;
  onAssign: (word: Word) => void;
}) {
  const [q, setQ] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  const hits = useMemo(() => {
    const needle = q.trim().toLowerCase();
    const list = needle
      ? words.filter(
          (w) =>
            w.french.toLowerCase().includes(needle) ||
            w.english.toLowerCase().includes(needle) ||
            w.topic.toLowerCase().includes(needle) ||
            w.year.toLowerCase().includes(needle) ||
            w.term.toLowerCase().includes(needle),
        )
      : words;
    return list.slice(0, 80);
  }, [words, q]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/30 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="assign-image-title"
      onClick={onClose}
    >
      <div
        className="flex max-h-[min(36rem,90vh)] w-full max-w-lg flex-col overflow-hidden rounded-3xl bg-card shadow-xl ring-1 ring-border"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start gap-3 border-b border-border px-5 py-4">
          <div className="flex size-14 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-muted/50 ring-1 ring-border">
            <img src={image.src} alt="" className="max-h-full max-w-full object-contain" />
          </div>
          <div className="min-w-0 flex-1">
            <p id="assign-image-title" className="font-kids text-lg font-semibold tracking-tight">
              Assign “{image.title}”
            </p>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Search and tap a word — the picture attaches straight away.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-sm font-semibold text-muted-foreground hover:text-foreground"
          >
            Close
          </button>
        </div>

        <div className="border-b border-border px-5 py-3">
          <input
            ref={inputRef}
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search French, English, topic…"
            className="w-full rounded-2xl bg-background px-4 py-2.5 text-sm ring-1 ring-input focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>

        <ul className="min-h-0 flex-1 overflow-y-auto p-2">
          {hits.map((word) => {
            const already = word.image === image.id || word.image === image.src;
            return (
              <li key={word.id}>
                <button
                  type="button"
                  onClick={() => onAssign(word)}
                  className="flex w-full items-center gap-3 rounded-2xl px-3 py-2.5 text-left transition hover:bg-muted/80"
                >
                  <span className="min-w-0 flex-1">
                    <span className="block font-semibold text-foreground">{word.french}</span>
                    <span className="block text-sm text-muted-foreground">{word.english}</span>
                    <span className="mt-0.5 block text-[11px] text-muted-foreground/80">
                      {word.year.replace(/^Year\s+/i, "Y")} ·{" "}
                      {word.term.replace(/^Term\s+/i, "T")} · {word.topic}
                    </span>
                  </span>
                  <span
                    className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold ${
                      already
                        ? "bg-success/15 text-success"
                        : "bg-primary text-primary-foreground"
                    }`}
                  >
                    {already ? "Assigned" : "Assign"}
                  </span>
                </button>
              </li>
            );
          })}
          {!hits.length ? (
            <li className="px-4 py-10 text-center text-sm text-muted-foreground">
              No words match that search.
            </li>
          ) : null}
        </ul>
      </div>
    </div>
  );
}
