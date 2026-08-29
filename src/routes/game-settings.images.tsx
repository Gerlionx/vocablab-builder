import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useId, useMemo, useRef, useState } from "react";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { LangFlag } from "@/components/LangFlag";
import { listWordsFn, upsertWordFn } from "@/lib/api/words";
import {
  deleteLibraryImage,
  hiddenBuiltinCount,
  listLibraryImages,
  renameLibraryImage,
  restoreHiddenBuiltins,
  syncLibraryFromServer,
  uploadLibraryImage,
  wordImageValue,
  type LibraryImage,
} from "@/lib/image-library";
import { SEED_WORDS, type Word } from "@/lib/vocab-data";
import { loadPersistedWordBank, savePersistedWordBank } from "@/lib/vocab-backup";

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

function wordsLinkedToImage(img: LibraryImage, words: readonly Word[]): Word[] {
  const value = wordImageValue(img);
  return words.filter(
    (w) =>
      w.image === img.id ||
      w.image === img.src ||
      w.image === value ||
      (img.src.startsWith("/api/uploads/") && w.image === img.src),
  );
}

function ImagesPage() {
  const [items, setItems] = useState(() => listLibraryImages());
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState<LibraryImage | null>(null);
  const [assigning, setAssigning] = useState<LibraryImage | null>(null);
  const [pendingDelete, setPendingDelete] = useState<LibraryImage | null>(null);
  const [hiddenCount, setHiddenCount] = useState(() =>
    typeof window === "undefined" ? 0 : hiddenBuiltinCount(),
  );
  const [bankWords, setBankWords] = useState<Word[]>(
    () => loadPersistedWordBank() ?? SEED_WORDS,
  );
  const fileRef = useRef<HTMLInputElement>(null);
  const inputId = useId();

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const [library, remote] = await Promise.all([
        syncLibraryFromServer(),
        listWordsFn().catch(() => [] as Word[]),
      ]);
      if (cancelled) return;
      setItems(library);
      if (remote.length) {
        setBankWords(remote);
        savePersistedWordBank(remote);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const words = bankWords.length ? bankWords : SEED_WORDS;

  const linkedByImageId = useMemo(() => {
    const map = new Map<string, Word[]>();
    for (const img of items) {
      map.set(img.id, wordsLinkedToImage(img, words));
    }
    return map;
  }, [items, words]);

  function refreshLibrary() {
    setItems(listLibraryImages());
    setHiddenCount(hiddenBuiltinCount());
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
      refreshLibrary();
      flash("Image added to your library");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Upload failed");
    } finally {
      setBusy(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  function remove(img: LibraryImage) {
    setPendingDelete(img);
  }

  const pendingLinked = pendingDelete
    ? (linkedByImageId.get(pendingDelete.id) ?? wordsLinkedToImage(pendingDelete, words))
    : [];

  async function confirmRemove() {
    const img = pendingDelete;
    setPendingDelete(null);
    if (!img) return;
    const linked = linkedByImageId.get(img.id) ?? wordsLinkedToImage(img, words);
    for (const word of linked) {
      await persistWordImage(word, null).catch(() => null);
    }
    const ok = await deleteLibraryImage(img.id);
    if (!ok) {
      setError("Could not remove that image. Try again while signed in.");
      return;
    }
    refreshLibrary();
    flash(
      linked.length
        ? `Image removed · unlinked from ${linked.length} word${linked.length === 1 ? "" : "s"}`
        : img.kind === "builtin"
          ? "Starter image removed from your library"
          : "Image removed",
    );
  }

  async function saveTitle(img: LibraryImage, title: string) {
    if (img.kind === "builtin") {
      setEditing(null);
      return;
    }
    const updated = await renameLibraryImage(img.id, title);
    refreshLibrary();
    setEditing(null);
    flash(updated ? "Name updated" : "Could not rename image");
  }

  async function persistWordImage(word: Word, image: string | null) {
    const remote = await upsertWordFn({
      data: {
        id: word.id,
        word: {
          year: word.year,
          term: word.term,
          topic: word.topic,
          difficulty: word.difficulty,
          french: word.french,
          english: word.english,
          image,
        },
      },
    });
    setBankWords((prev) => {
      const next = prev.map((w) => (w.id === word.id || w.id === remote.id ? remote : w));
      savePersistedWordBank(next);
      return next;
    });
    return remote;
  }

  async function assignToWord(img: LibraryImage, word: Word) {
    setBusy(true);
    setError(null);
    try {
      // One image per word: clear the same image from other words first is optional;
      // assigning replaces this word's picture.
      await persistWordImage(word, wordImageValue(img));
      setAssigning(null);
      flash(`Assigned “${img.title}” to ${word.french}`);
    } catch {
      setError("Could not assign image. Check you are signed in and try again.");
    } finally {
      setBusy(false);
    }
  }

  async function unlinkWord(img: LibraryImage, word: Word) {
    setBusy(true);
    setError(null);
    try {
      await persistWordImage(word, null);
      flash(`Removed picture from ${word.french}`);
    } catch {
      setError("Could not unlink image. Try again while signed in.");
    } finally {
      setBusy(false);
    }
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
            to attach one to a vocabulary word. Tap <span className="font-semibold text-foreground">Delete</span>{" "}
            to remove any picture from this page (linked words are unlinked first).
          </p>
          {hiddenCount > 0 ? (
            <button
              type="button"
              onClick={() => {
                const n = restoreHiddenBuiltins();
                refreshLibrary();
                flash(
                  n === 1
                    ? "Restored 1 starter image"
                    : `Restored ${n} starter images`,
                );
              }}
              className="mt-2 text-sm font-semibold text-primary underline-offset-4 hover:underline"
            >
              Restore removed starter images ({hiddenCount})
            </button>
          ) : null}
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
            {busy ? "Working…" : "Upload image"}
          </button>
        </div>
      </div>

      {note ? <p className="mt-4 text-sm font-semibold text-success">{note}</p> : null}
      {error ? <p className="mt-4 text-sm font-semibold text-destructive">{error}</p> : null}

      <ul className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {items.map((img) => {
          const linked = linkedByImageId.get(img.id) ?? [];
          return (
            <li
              key={img.id}
              className="flex flex-col overflow-hidden rounded-3xl bg-card ring-1 ring-border"
            >
              <div className="relative flex aspect-[4/3] items-center justify-center bg-muted/40 p-4">
                <img src={img.src} alt="" className="max-h-full max-w-full object-contain" />
                <button
                  type="button"
                  onClick={() => remove(img)}
                  className="absolute right-3 top-3 rounded-full bg-card/95 px-3 py-1.5 text-xs font-semibold text-destructive shadow-sm ring-1 ring-border hover:bg-destructive/10"
                >
                  Delete
                </button>
              </div>
              <div className="flex flex-1 flex-col gap-2 p-4">
                {editing?.id === img.id ? (
                  <form
                    className="flex gap-2"
                    onSubmit={(e) => {
                      e.preventDefault();
                      const fd = new FormData(e.currentTarget);
                      void saveTitle(img, String(fd.get("title") ?? ""));
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

                {linked.length ? (
                  <ul className="flex flex-col gap-2 rounded-2xl bg-muted/45 px-3 py-2.5 ring-1 ring-border/70">
                    {linked.map((word) => (
                      <li
                        key={word.id}
                        className="flex items-start justify-between gap-2"
                      >
                        <div className="min-w-0">
                          <p className="flex items-center gap-1.5 font-kids text-sm font-semibold tracking-tight text-foreground">
                            <LangFlag lang="fr" className="size-3.5 shrink-0" />
                            <span className="truncate">{word.french}</span>
                          </p>
                          <p className="mt-0.5 flex items-center gap-1.5 text-xs text-muted-foreground">
                            <LangFlag lang="en" className="size-3.5 shrink-0" />
                            <span className="truncate">{word.english}</span>
                          </p>
                        </div>
                        <button
                          type="button"
                          disabled={busy}
                          onClick={() => void unlinkWord(img, word)}
                          className="shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold text-muted-foreground ring-1 ring-border hover:text-destructive disabled:opacity-60"
                        >
                          Unlink
                        </button>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-xs text-muted-foreground">Not assigned to a word yet</p>
                )}

                <div className="mt-auto flex flex-wrap gap-1.5 pt-1">
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => setAssigning(img)}
                    className="rounded-full bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground disabled:opacity-60"
                  >
                    {linked.length ? "Change word" : "Assign to word"}
                  </button>
                  {img.kind === "upload" ? (
                    <button
                      type="button"
                      onClick={() => setEditing(img)}
                      className="rounded-full px-4 py-2.5 text-sm font-semibold text-foreground ring-1 ring-border hover:bg-muted"
                    >
                      Rename
                    </button>
                  ) : null}
                  <button
                    type="button"
                    onClick={() => remove(img)}
                    className="rounded-full px-4 py-2.5 text-sm font-semibold text-destructive ring-1 ring-border hover:bg-destructive/10"
                  >
                    Delete
                  </button>
                </div>
              </div>
            </li>
          );
        })}
      </ul>

      {assigning ? (
        <AssignWordModal
          image={assigning}
          words={words}
          onClose={() => setAssigning(null)}
          onAssign={(word) => void assignToWord(assigning, word)}
        />
      ) : null}

      <ConfirmDialog
        open={pendingDelete != null}
        title={
          pendingDelete?.kind === "builtin"
            ? "Remove this starter image?"
            : "Delete this image?"
        }
        description={
          pendingLinked.length > 0 ? (
            <>
              <p>
                “{pendingDelete?.title}” is linked to{" "}
                <span className="font-semibold text-foreground">
                  {pendingLinked.length} word{pendingLinked.length === 1 ? "" : "s"}
                </span>
                . Removing it will unlink the picture from those words too.
              </p>
              <ul className="mt-3 max-h-40 space-y-1.5 overflow-y-auto rounded-2xl bg-muted/50 px-3 py-2.5 ring-1 ring-border">
                {pendingLinked.slice(0, 12).map((word) => (
                  <li key={word.id} className="text-sm text-foreground">
                    <span className="font-semibold">{word.french}</span>
                    <span className="text-muted-foreground"> — {word.english}</span>
                  </li>
                ))}
                {pendingLinked.length > 12 ? (
                  <li className="text-xs text-muted-foreground">
                    +{pendingLinked.length - 12} more
                  </li>
                ) : null}
              </ul>
              <p className="mt-3">
                {pendingDelete?.kind === "builtin"
                  ? "You can restore starter images later from this page."
                  : "This cannot be undone."}
              </p>
            </>
          ) : pendingDelete?.kind === "builtin" ? (
            <>
              “{pendingDelete?.title}” will be removed from your Images library. You can restore
              starter images later if you change your mind.
            </>
          ) : (
            <>
              “{pendingDelete?.title}” is not linked to any vocabulary words. It will be permanently
              removed from your library. This cannot be undone.
            </>
          )
        }
        confirmLabel={
          pendingLinked.length > 0
            ? "Remove and unlink"
            : pendingDelete?.kind === "builtin"
              ? "Remove from library"
              : "Delete image"
        }
        onCancel={() => setPendingDelete(null)}
        onConfirm={() => void confirmRemove()}
      />
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
      onPointerDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="flex max-h-[min(36rem,90vh)] w-full max-w-lg flex-col overflow-hidden rounded-3xl bg-card shadow-xl ring-1 ring-border"
        onPointerDown={(e) => e.stopPropagation()}
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
            const value = wordImageValue(image);
            const already =
              word.image === image.id || word.image === image.src || word.image === value;
            return (
              <li key={word.id}>
                <button
                  type="button"
                  onClick={() => onAssign(word)}
                  className="flex w-full items-center gap-3 rounded-2xl px-3 py-2.5 text-left transition hover:bg-muted/80"
                >
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center gap-1.5 font-semibold text-foreground">
                      <LangFlag lang="fr" className="size-3.5 shrink-0" />
                      <span className="truncate">{word.french}</span>
                    </span>
                    <span className="mt-0.5 flex items-center gap-1.5 text-sm text-muted-foreground">
                      <LangFlag lang="en" className="size-3.5 shrink-0" />
                      <span className="truncate">{word.english}</span>
                    </span>
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
