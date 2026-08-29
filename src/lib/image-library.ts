/**
 * Teacher image library (local for now).
 * Tomorrow this can move to Postgres; keep the same id + title + src shape.
 */

const KEY = "vocablab.imageLibrary.v1";
const MAX_EDGE = 960;
const JPEG_QUALITY = 0.82;

export type LibraryImage = {
  id: string;
  title: string;
  /** Public path, data URL, or future CDN URL — never shown raw to teachers. */
  src: string;
  /** Built-in pack vs teacher upload. */
  kind: "builtin" | "upload";
  createdAt: number;
};

const BUILTIN: LibraryImage[] = [
  {
    id: "builtin-eiffel-tower",
    title: "Eiffel Tower",
    src: "/vocab-images/year8/eiffel-tower.jpg",
    kind: "builtin",
    createdAt: 0,
  },
  {
    id: "builtin-notre-dame",
    title: "Notre-Dame",
    src: "/vocab-images/year8/notre-dame.png",
    kind: "builtin",
    createdAt: 0,
  },
  {
    id: "builtin-arc-de-triomphe",
    title: "Arc de Triomphe",
    src: "/vocab-images/year8/arc-de-triomphe.png",
    kind: "builtin",
    createdAt: 0,
  },
  {
    id: "builtin-louvre",
    title: "Louvre",
    src: "/vocab-images/year8/louvre.jpg",
    kind: "builtin",
    createdAt: 0,
  },
  {
    id: "builtin-moulin-rouge",
    title: "Moulin Rouge",
    src: "/vocab-images/year8/moulin-rouge.jpg",
    kind: "builtin",
    createdAt: 0,
  },
];

function readUploads(): LibraryImage[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (x): x is LibraryImage =>
        !!x &&
        typeof x === "object" &&
        typeof (x as LibraryImage).id === "string" &&
        typeof (x as LibraryImage).title === "string" &&
        typeof (x as LibraryImage).src === "string",
    );
  } catch {
    return [];
  }
}

function writeUploads(list: LibraryImage[]) {
  if (typeof window === "undefined") return;
  localStorage.setItem(KEY, JSON.stringify(list.filter((i) => i.kind === "upload")));
}

export function listLibraryImages(): LibraryImage[] {
  const uploads = readUploads();
  const byId = new Map<string, LibraryImage>();
  for (const b of BUILTIN) byId.set(b.id, b);
  for (const u of uploads) byId.set(u.id, u);
  return [...byId.values()].sort((a, b) => {
    if (a.kind !== b.kind) return a.kind === "builtin" ? -1 : 1;
    return a.title.localeCompare(b.title);
  });
}

export function getLibraryImage(id: string | undefined | null): LibraryImage | null {
  if (!id) return null;
  return listLibraryImages().find((i) => i.id === id) ?? null;
}

/**
 * Resolve whatever a word stores (library id, legacy path, or data URL)
 * into a displayable src for <img>.
 */
export function resolveImageSrc(ref: string | undefined | null): string | undefined {
  if (!ref) return undefined;
  if (ref.startsWith("/") || ref.startsWith("data:") || /^https?:\/\//i.test(ref)) {
    return ref;
  }
  return getLibraryImage(ref)?.src;
}

/** Friendly label for UI — never show raw paths. */
export function imageLabel(ref: string | undefined | null): string | null {
  if (!ref) return null;
  const hit = getLibraryImage(ref);
  if (hit) return hit.title;
  if (ref.startsWith("data:")) return "Uploaded image";
  // Legacy path → pretty name from filename
  const file = ref.split("/").pop()?.replace(/\.[^.]+$/, "") ?? "";
  if (!file) return "Image";
  return file
    .replace(/[-_]+/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

/** Map a legacy public path onto a builtin library id when possible. */
export function coerceToLibraryRef(ref: string | undefined | null): string | undefined {
  if (!ref) return undefined;
  if (getLibraryImage(ref)) return ref;
  const match = BUILTIN.find((b) => b.src === ref);
  if (match) return match.id;
  if (ref.startsWith("data:") || ref.startsWith("/")) return ref;
  return ref;
}

export function deleteLibraryImage(id: string): boolean {
  const uploads = readUploads();
  const next = uploads.filter((i) => i.id !== id);
  if (next.length === uploads.length) return false;
  writeUploads(next);
  return true;
}

export function renameLibraryImage(id: string, title: string): LibraryImage | null {
  const tidy = title.replace(/\s+/g, " ").trim().slice(0, 48);
  if (!tidy) return null;
  const uploads = readUploads();
  const idx = uploads.findIndex((i) => i.id === id);
  if (idx < 0) return null;
  const updated = { ...uploads[idx]!, title: tidy };
  uploads[idx] = updated;
  writeUploads(uploads);
  return updated;
}

function fileToCompressedDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("Could not read image"));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error("Could not decode image"));
      img.onload = () => {
        const scale = Math.min(1, MAX_EDGE / Math.max(img.width, img.height));
        const w = Math.max(1, Math.round(img.width * scale));
        const h = Math.max(1, Math.round(img.height * scale));
        const canvas = document.createElement("canvas");
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          reject(new Error("No canvas"));
          return;
        }
        ctx.drawImage(img, 0, 0, w, h);
        resolve(canvas.toDataURL("image/jpeg", JPEG_QUALITY));
      };
      img.src = String(reader.result);
    };
    reader.readAsDataURL(file);
  });
}

export async function uploadLibraryImage(file: File, title?: string): Promise<LibraryImage> {
  if (!file.type.startsWith("image/")) {
    throw new Error("Please choose an image file");
  }
  const src = await fileToCompressedDataUrl(file);
  const base =
    title?.trim() ||
    file.name.replace(/\.[^.]+$/, "").replace(/[-_]+/g, " ").trim() ||
    "Image";
  const entry: LibraryImage = {
    id: `upload-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`,
    title: base.slice(0, 48),
    src,
    kind: "upload",
    createdAt: Date.now(),
  };
  writeUploads([...readUploads(), entry]);
  return entry;
}
