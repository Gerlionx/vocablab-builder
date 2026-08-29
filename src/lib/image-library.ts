/**
 * Teacher image library — starter pack (static) + uploads (Postgres when signed in,
 * localStorage fallback offline).
 */

import {
  deleteImageFn,
  listImagesFn,
  renameImageFn,
  uploadImageFn,
} from "@/lib/api/images";

const KEY = "vocablab.imageLibrary.v1";
const MAX_EDGE = 960;
const JPEG_QUALITY = 0.82;

export type LibraryImage = {
  id: string;
  title: string;
  /** Public path, data URL, or /api/uploads/:id — never shown raw to teachers. */
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

/** In-memory server uploads for the current session (merged on every list). */
let serverUploads: LibraryImage[] = [];

function isUuid(id: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    id,
  );
}

function readLocalUploads(): LibraryImage[] {
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

function writeLocalUploads(list: LibraryImage[]) {
  if (typeof window === "undefined") return;
  // Keep only offline/local entries (data URLs or non-uuid ids). Server-backed live in memory.
  const localOnly = list.filter(
    (i) => i.kind === "upload" && (!isUuid(i.id) || i.src.startsWith("data:")),
  );
  localStorage.setItem(KEY, JSON.stringify(localOnly));
}

function mergeLibrary(): LibraryImage[] {
  const byId = new Map<string, LibraryImage>();
  for (const b of BUILTIN) byId.set(b.id, b);
  for (const u of readLocalUploads()) byId.set(u.id, { ...u, kind: "upload" });
  for (const u of serverUploads) byId.set(u.id, u);
  return [...byId.values()].sort((a, b) => {
    if (a.kind !== b.kind) return a.kind === "builtin" ? -1 : 1;
    return a.title.localeCompare(b.title);
  });
}

export function listLibraryImages(): LibraryImage[] {
  return mergeLibrary();
}

/** Pull teacher uploads from Postgres into the session cache. */
export async function syncLibraryFromServer(): Promise<LibraryImage[]> {
  try {
    const rows = await listImagesFn();
    serverUploads = rows.map((r) => ({
      id: r.id,
      title: r.title || "Image",
      src: r.src,
      kind: "upload" as const,
      createdAt: Date.now(),
    }));
  } catch {
    /* offline / unauthenticated — keep local + builtins */
  }
  return mergeLibrary();
}

export function getLibraryImage(id: string | undefined | null): LibraryImage | null {
  if (!id) return null;
  return listLibraryImages().find((i) => i.id === id || i.src === id) ?? null;
}

/**
 * Resolve whatever a word stores (library id, legacy path, upload URL, or data URL)
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
  if (ref.includes("/api/uploads/")) return "Uploaded image";
  const file = ref.split("/").pop()?.replace(/\.[^.]+$/, "") ?? "";
  if (!file) return "Image";
  return file
    .replace(/[-_]+/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

/** Map a legacy public path onto a builtin library id when possible. */
export function coerceToLibraryRef(ref: string | undefined | null): string | undefined {
  if (!ref) return undefined;
  if (getLibraryImage(ref)) {
    const hit = getLibraryImage(ref)!;
    return hit.id;
  }
  const match = BUILTIN.find((b) => b.src === ref);
  if (match) return match.id;
  if (ref.startsWith("data:") || ref.startsWith("/")) return ref;
  return ref;
}

/** Value to store on a Word when assigning this library image. */
export function wordImageValue(img: LibraryImage): string {
  if (img.kind === "upload") return img.src.startsWith("/api/uploads/") ? img.src : img.id;
  return img.id;
}

export async function deleteLibraryImage(id: string): Promise<boolean> {
  const entry = getLibraryImage(id);
  if (!entry || entry.kind === "builtin") return false;

  if (isUuid(id)) {
    try {
      await deleteImageFn({ data: { id } });
      serverUploads = serverUploads.filter((i) => i.id !== id);
    } catch {
      return false;
    }
  }

  const local = readLocalUploads();
  const next = local.filter((i) => i.id !== id);
  if (next.length !== local.length) writeLocalUploads(next);
  return true;
}

export async function renameLibraryImage(
  id: string,
  title: string,
): Promise<LibraryImage | null> {
  const tidy = title.replace(/\s+/g, " ").trim().slice(0, 48);
  if (!tidy) return null;

  if (isUuid(id)) {
    try {
      await renameImageFn({ data: { id, title: tidy } });
      serverUploads = serverUploads.map((i) =>
        i.id === id ? { ...i, title: tidy } : i,
      );
      return getLibraryImage(id);
    } catch {
      return null;
    }
  }

  const uploads = readLocalUploads();
  const idx = uploads.findIndex((i) => i.id === id);
  if (idx < 0) return null;
  const updated = { ...uploads[idx]!, title: tidy };
  uploads[idx] = updated;
  writeLocalUploads(uploads);
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

function dataUrlToBase64(dataUrl: string): { mimeType: string; dataBase64: string } {
  const match = dataUrl.match(/^data:([^;]+);base64,(.+)$/);
  if (!match) throw new Error("Invalid image data");
  return { mimeType: match[1]!, dataBase64: match[2]! };
}

export async function uploadLibraryImage(file: File, title?: string): Promise<LibraryImage> {
  if (!file.type.startsWith("image/")) {
    throw new Error("Please choose an image file");
  }
  const dataUrl = await fileToCompressedDataUrl(file);
  const base =
    title?.trim() ||
    file.name.replace(/\.[^.]+$/, "").replace(/[-_]+/g, " ").trim() ||
    "Image";
  const tidyTitle = base.slice(0, 48);

  try {
    const { mimeType, dataBase64 } = dataUrlToBase64(dataUrl);
    const remote = await uploadImageFn({
      data: { title: tidyTitle, mimeType, dataBase64 },
    });
    const entry: LibraryImage = {
      id: remote.id,
      title: remote.title || tidyTitle,
      src: remote.src,
      kind: "upload",
      createdAt: Date.now(),
    };
    serverUploads = [entry, ...serverUploads.filter((i) => i.id !== entry.id)];
    return entry;
  } catch {
    // Offline / unauthenticated — keep a local copy so the teacher can still work.
    const entry: LibraryImage = {
      id: `upload-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`,
      title: tidyTitle,
      src: dataUrl,
      kind: "upload",
      createdAt: Date.now(),
    };
    writeLocalUploads([...readLocalUploads(), entry]);
    return entry;
  }
}
