import { useEffect, useId, useRef, useState } from "react";
import {
  coerceToLibraryRef,
  getLibraryImage,
  imageLabel,
  listLibraryImages,
  resolveImageSrc,
  uploadLibraryImage,
  type LibraryImage,
} from "@/lib/image-library";

export function ImagePicker({
  value,
  onChange,
}: {
  /** Library id, legacy path, data URL, or empty. */
  value?: string;
  onChange: (next: string | undefined) => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = coerceToLibraryRef(value);
  const src = resolveImageSrc(ref);
  const label = imageLabel(ref);

  return (
    <div className="space-y-2">
      <p className="text-sm font-medium">Image</p>
      <div className="flex items-center gap-3 rounded-2xl bg-background px-3 py-3 ring-1 ring-input">
        <div className="flex size-16 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-muted/60 ring-1 ring-border">
          {src ? (
            <img src={src} alt="" className="max-h-full max-w-full object-contain" />
          ) : (
            <span className="px-1 text-center text-[10px] leading-tight text-muted-foreground">
              No image
            </span>
          )}
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-foreground">
            {label ?? "None chosen"}
          </p>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Pick from your library or upload a new one.
          </p>
          <div className="mt-2 flex flex-wrap gap-1.5">
            <button
              type="button"
              onClick={() => setOpen(true)}
              className="rounded-full bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground"
            >
              {src ? "Change" : "Choose"}
            </button>
            {src ? (
              <button
                type="button"
                onClick={() => onChange(undefined)}
                className="rounded-full px-4 py-2.5 text-sm font-semibold text-muted-foreground ring-1 ring-border hover:text-destructive"
              >
                Remove
              </button>
            ) : null}
          </div>
        </div>
      </div>

      {open ? (
        <LibraryModal
          selected={ref}
          onClose={() => setOpen(false)}
          onPick={(img) => {
            onChange(img.id);
            setOpen(false);
          }}
        />
      ) : null}
    </div>
  );
}

function LibraryModal({
  selected,
  onClose,
  onPick,
}: {
  selected?: string;
  onClose: () => void;
  onPick: (img: LibraryImage) => void;
}) {
  const [items, setItems] = useState(() => listLibraryImages());
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputId = useId();
  const fileRef = useRef<HTMLInputElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  async function onFile(file: File | undefined) {
    if (!file) return;
    setBusy(true);
    setError(null);
    try {
      const entry = await uploadLibraryImage(file);
      setItems(listLibraryImages());
      onPick(entry);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Upload failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-foreground/30 p-4"
      role="dialog"
      aria-modal="true"
      aria-label="Image library"
      onPointerDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        ref={panelRef}
        className="flex max-h-[min(36rem,88vh)] w-full max-w-2xl flex-col overflow-hidden rounded-3xl bg-card shadow-xl ring-1 ring-border"
        onPointerDown={(e) => e.stopPropagation()}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between gap-3 border-b border-border px-5 py-4">
          <div>
            <p className="font-kids text-lg font-semibold tracking-tight">Image library</p>
            <p className="text-xs text-muted-foreground">
              Choose a picture or upload one for your collection.
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

        <div className="flex flex-wrap items-center gap-2 border-b border-border px-5 py-3">
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
            className="rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-60"
          >
            {busy ? "Uploading…" : "Upload image"}
          </button>
          {error ? <p className="text-sm font-medium text-destructive">{error}</p> : null}
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto p-4">
          <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {items.map((img) => {
              const on = selected === img.id || selected === img.src;
              return (
                <li key={img.id}>
                  <button
                    type="button"
                    onClick={() => onPick(img)}
                    className={`flex w-full flex-col overflow-hidden rounded-2xl text-left ring-1 transition ${
                      on
                        ? "bg-primary/10 ring-primary"
                        : "bg-muted/40 ring-border hover:bg-muted"
                    }`}
                  >
                    <div className="flex aspect-[4/3] items-center justify-center bg-background/70 p-2">
                      <img
                        src={img.src}
                        alt=""
                        className="max-h-full max-w-full object-contain"
                      />
                    </div>
                    <span className="truncate px-2.5 py-2 text-xs font-semibold">{img.title}</span>
                  </button>
                </li>
              );
            })}
          </ul>
          {!items.length ? (
            <p className="py-10 text-center text-sm text-muted-foreground">
              No images yet — upload your first one.
            </p>
          ) : null}
        </div>
      </div>
    </div>
  );
}

/** Optional helper if a parent only has a ref and needs the library entry. */
export function libraryImageOrNull(ref?: string) {
  return getLibraryImage(coerceToLibraryRef(ref) ?? "");
}
