import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { sql } from "@/backend/db";
import { requireTeacher } from "@/backend/session";
import type { Difficulty, Word } from "@/lib/vocab-data";

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
  return {
    id: row.id,
    year: row.year,
    term: row.term,
    topic: row.topic,
    difficulty: row.difficulty as Difficulty,
    french: row.french,
    english: row.english,
    image: row.image_ref ?? (row.image_id ? `/api/uploads/${row.image_id}` : undefined),
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

export const listWordsFn = createServerFn({ method: "GET" }).handler(async () => {
  const teacher = await requireTeacher();
  const rows = await sql<WordRow[]>`
    SELECT id, year, term, topic, difficulty, french, english, image_id,
           NULL::text AS image_ref, sort_order
    FROM words
    WHERE teacher_id = ${teacher.id}::uuid
    ORDER BY year, term, topic, sort_order, french
  `;
  // Prefer image_id URL; optional image_ref column may not exist yet.
  return rows.map((row) => ({
    id: row.id,
    year: row.year,
    term: row.term,
    topic: row.topic,
    difficulty: row.difficulty as Difficulty,
    french: row.french,
    english: row.english,
    image: row.image_id ? `/api/uploads/${row.image_id}` : undefined,
  })) satisfies Word[];
});

export const upsertWordFn = createServerFn({ method: "POST" })
  .validator(
    z.object({
      id: z.string().uuid().optional(),
      word: wordInput,
    }),
  )
  .handler(async ({ data }) => {
    const teacher = await requireTeacher();
    const w = data.word;
    if (data.id) {
      const rows = await sql<WordRow[]>`
        UPDATE words SET
          year = ${w.year},
          term = ${w.term},
          topic = ${w.topic},
          difficulty = ${w.difficulty},
          french = ${w.french},
          english = ${w.english},
          updated_at = now()
        WHERE id = ${data.id}::uuid AND teacher_id = ${teacher.id}::uuid
        RETURNING id, year, term, topic, difficulty, french, english, image_id,
                  NULL::text AS image_ref, sort_order
      `;
      if (!rows[0]) throw new Response("Not found", { status: 404 });
      return rowToWord(rows[0]);
    }
    const rows = await sql<WordRow[]>`
      INSERT INTO words (teacher_id, year, term, topic, difficulty, french, english)
      VALUES (
        ${teacher.id}::uuid, ${w.year}, ${w.term}, ${w.topic},
        ${w.difficulty}, ${w.french}, ${w.english}
      )
      RETURNING id, year, term, topic, difficulty, french, english, image_id,
                NULL::text AS image_ref, sort_order
    `;
    return rowToWord(rows[0]!);
  });

export const deleteWordFn = createServerFn({ method: "POST" })
  .validator(z.object({ id: z.string().uuid() }))
  .handler(async ({ data }) => {
    const teacher = await requireTeacher();
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
      await sql`
        INSERT INTO words (teacher_id, year, term, topic, difficulty, french, english, sort_order)
        VALUES (
          ${teacher.id}::uuid, ${w.year}, ${w.term}, ${w.topic},
          ${w.difficulty}, ${w.french}, ${w.english}, ${i}
        )
      `;
      imported += 1;
    }
    return { imported, skipped: false as const };
  });
