/**
 * Normalize a word's image field for Postgres (image_id UUID vs image_ref text).
 */

const UPLOAD_PATH =
  /(?:^|\/)api\/uploads\/([0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12})/i;
const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export type StoredWordImage = {
  imageId: string | null;
  imageRef: string | null;
};

/** Split a client image value into DB columns. */
export function parseWordImage(image?: string | null): StoredWordImage {
  if (image == null) return { imageId: null, imageRef: null };
  const trimmed = String(image).trim();
  if (!trimmed) return { imageId: null, imageRef: null };

  const fromPath = trimmed.match(UPLOAD_PATH);
  if (fromPath?.[1]) return { imageId: fromPath[1].toLowerCase(), imageRef: null };

  if (UUID_RE.test(trimmed)) return { imageId: trimmed.toLowerCase(), imageRef: null };

  return { imageId: null, imageRef: trimmed };
}

/** Build the client-facing Word.image from DB columns. */
export function formatWordImage(
  imageId: string | null | undefined,
  imageRef: string | null | undefined,
): string | undefined {
  if (imageId) return `/api/uploads/${imageId}`;
  const ref = imageRef?.trim();
  return ref || undefined;
}
