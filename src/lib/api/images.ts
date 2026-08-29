import { mkdir, writeFile, unlink } from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { sql } from "@/backend/db";
import { requireTeacher } from "@/backend/session";

function uploadRoot() {
  return process.env.UPLOAD_DIR || path.join(process.cwd(), "uploads");
}

export const listImagesFn = createServerFn({ method: "GET" }).handler(async () => {
  const teacher = await requireTeacher();
  const rows = await sql<
    { id: string; title: string; storage_key: string; mime_type: string; byte_size: number | null }[]
  >`
    SELECT id, title, storage_key, mime_type, byte_size
    FROM images
    WHERE teacher_id = ${teacher.id}::uuid OR teacher_id IS NULL
    ORDER BY created_at DESC
  `;
  return rows.map((r) => ({
    id: r.id,
    title: r.title,
    src: `/api/uploads/${r.id}`,
    mimeType: r.mime_type,
    byteSize: r.byte_size,
  }));
});

export const uploadImageFn = createServerFn({ method: "POST" })
  .validator(
    z.object({
      title: z.string().max(200).default(""),
      mimeType: z.string().default("image/jpeg"),
      /** Base64 without data: prefix */
      dataBase64: z.string().min(1),
    }),
  )
  .handler(async ({ data }) => {
    const teacher = await requireTeacher();
    const id = randomUUID();
    const ext = data.mimeType.includes("png") ? "png" : "jpg";
    const storageKey = `${teacher.id}/${id}.${ext}`;
    const abs = path.join(uploadRoot(), storageKey);
    await mkdir(path.dirname(abs), { recursive: true });
    const buf = Buffer.from(data.dataBase64, "base64");
    if (buf.length > 8 * 1024 * 1024) {
      throw new Response("Image too large", { status: 413 });
    }
    await writeFile(abs, buf);
    await sql`
      INSERT INTO images (id, teacher_id, title, storage_key, mime_type, byte_size)
      VALUES (
        ${id}::uuid, ${teacher.id}::uuid, ${data.title}, ${storageKey},
        ${data.mimeType}, ${buf.length}
      )
    `;
    return { id, title: data.title, src: `/api/uploads/${id}` };
  });

export const deleteImageFn = createServerFn({ method: "POST" })
  .validator(z.object({ id: z.string().uuid() }))
  .handler(async ({ data }) => {
    const teacher = await requireTeacher();
    const rows = await sql<{ storage_key: string }[]>`
      DELETE FROM images
      WHERE id = ${data.id}::uuid AND teacher_id = ${teacher.id}::uuid
      RETURNING storage_key
    `;
    const key = rows[0]?.storage_key;
    if (key) {
      try {
        await unlink(path.join(uploadRoot(), key));
      } catch {
        /* ignore missing file */
      }
    }
    return { ok: true as const };
  });
