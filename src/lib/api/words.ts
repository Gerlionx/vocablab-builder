import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { sql } from "@/backend/db";
import { requireTeacher } from "@/backend/session";
import type { Difficulty, Word } from "@/lib/vocab-data";
import { formatWordImage, parseWordImage } from "@/lib/word-image";

type WordRow = {
  id: string;
  year: string;
  term: string;
  topic: string;
  difficulty: string;
  french: string;
  english: string;
  image_id: string | null;
  image_ref: string | null;
  sort_order: number;
};

function rowToWord(row: WordRow): Word {
  const image = formatWordImage(row.image_id, row.image_ref);
  return {
    id: row.id,
    year: row.year,
    term: row.term,
    topic: row.topic,
    difficulty: row.difficulty as Difficulty,
    french: row.french,
    english: row.english,
    ...(image ? { image } : {}),
  };
}

const wordInput = z.object({
  year: z.string().min(1),
  term: z.string().min(1),
  topic: z.string().min(1),
  difficulty: z.string().min(1),
  french: z.string().min(1),
  english: z.string().min(1),
  image: z.string().optional().nullable(),
});

function isUuid(id: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    id,
  );
}

export const listWordsFn = createServerFn({ method: "GET" }).handler(async () => {
  const teacher = await requireTeacher();
  const rows = await sql<WordRow[]>`
    SELECT id, year, term, topic, difficulty, french, english, image_id, image_ref, sort_order
    FROM words
    WHERE teacher_id = ${teacher.id}::uuid
    ORDER BY year, term, topic, sort_order, french
  `;
  return rows.map((row) => rowToWord(row));
});

export const upsertWordFn = createServerFn({ method: "POST" })
  .validator(
    z.object({
      id: z.string().min(1).max(80).optional(),
      word: wordInput,
    }),
  )
  .handler(async ({ data }) => {
    const teacher = await requireTeacher();
    const w = data.word;
    const { imageId, imageRef } = parseWordImage(w.image);
    const id = data.id && isUuid(data.id) ? data.id : undefined;
    if (id) {
      const rows = await sql<WordRow[]>`
        UPDATE words SET
          year = ${w.year},
          term = ${w.term},
          topic = ${w.topic},
          difficulty = ${w.difficulty},
          french = ${w.french},
          english = ${w.english},
          image_id = ${imageId},
          image_ref = ${imageRef},
          updated_at = now()
        WHERE id = ${id}::uuid AND teacher_id = ${teacher.id}::uuid
        RETURNING id, year, term, topic, difficulty, french, english, image_id, image_ref, sort_order
      `;
      if (rows[0]) return rowToWord(rows[0]);
      const inserted = await sql<WordRow[]>`
        INSERT INTO words (
          id, teacher_id, year, term, topic, difficulty, french, english, image_id, image_ref
        ) VALUES (
          ${id}::uuid, ${teacher.id}::uuid, ${w.year}, ${w.term}, ${w.topic},
          ${w.difficulty}, ${w.french}, ${w.english}, ${imageId}, ${imageRef}
        )
        RETURNING id, year, term, topic, difficulty, french, english, image_id, image_ref, sort_order
      `;
      return rowToWord(inserted[0]!);
    }
    const rows = await sql<WordRow[]>`
      INSERT INTO words (
        teacher_id, year, term, topic, difficulty, french, english, image_id, image_ref
      )
      VALUES (
        ${teacher.id}::uuid, ${w.year}, ${w.term}, ${w.topic},
        ${w.difficulty}, ${w.french}, ${w.english}, ${imageId}, ${imageRef}
      )
      RETURNING id, year, term, topic, difficulty, french, english, image_id, image_ref, sort_order
    `;
    return rowToWord(rows[0]!);
  });

export const deleteWordFn = createServerFn({ method: "POST" })
  .validator(z.object({ id: z.string().min(1).max(80) }))
  .handler(async ({ data }) => {
    const teacher = await requireTeacher();
    if (!isUuid(data.id)) return { ok: true as const };
    await sql`
      DELETE FROM words
      WHERE id = ${data.id}::uuid AND teacher_id = ${teacher.id}::uuid
    `;
    return { ok: true as const };
  });

export const importSeedWordsFn = createServerFn({ method: "POST" })
  .validator(z.object({ words: z.array(wordInput) }))
  .handler(async ({ data }) => {
    const teacher = await requireTeacher();
    const existing = await sql<{ count: string }[]>`
      SELECT count(*)::text AS count FROM words WHERE teacher_id = ${teacher.id}::uuid
    `;
    if (Number(existing[0]?.count ?? 0) > 0) {
      return { imported: 0, skipped: true as const };
    }
    let imported = 0;
    for (const [i, w] of data.words.entries()) {
      const { imageId, imageRef } = parseWordImage(w.image);
      await sql`
        INSERT INTO words (
          teacher_id, year, term, topic, difficulty, french, english,
          image_id, image_ref, sort_order
        )
        VALUES (
          ${teacher.id}::uuid, ${w.year}, ${w.term}, ${w.topic},
          ${w.difficulty}, ${w.french}, ${w.english},
          ${imageId}, ${imageRef}, ${i}
        )
      `;
      imported += 1;
    }
    return { imported, skipped: false as const };
  });
