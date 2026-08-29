import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { sql } from "@/backend/db";
import { requireTeacher } from "@/backend/session";
import type { AskDirection, WinMode } from "@/lib/game-settings";
import type { WheelGameModeId } from "@/lib/wheel-modes";
import type { WheelLesson } from "@/lib/wheel-lessons";

type LessonRow = {
  id: string;
  title: string;
  game_mode: string;
  filters: {
    years?: string[];
    terms?: string[];
    topics?: string[];
    difficulties?: string[];
  };
  excluded_word_ids: string[];
  ask_direction: string;
  score_to_win: number | null;
  seconds_per_team: number | null;
  extra: Record<string, unknown>;
  updated_at: Date;
};

function rowToLesson(row: LessonRow): WheelLesson {
  const f = row.filters ?? {};
  const extra = row.extra ?? {};
  return {
    id: row.id,
    title: row.title,
    savedAt: new Date(row.updated_at).getTime(),
    years: f.years ?? [],
    terms: f.terms ?? [],
    topics: f.topics ?? [],
    difficulties: f.difficulties ?? [],
    excludedWordIds: row.excluded_word_ids ?? [],
    gameMode: (row.game_mode === "time" ? "time" : "basic") as WheelGameModeId,
    askDirection: (["french", "english", "random"].includes(row.ask_direction)
      ? row.ask_direction
      : "random") as AskDirection,
    winMode: (extra.winMode === "time" ? "time" : "score") as WinMode,
    scoreToWin: row.score_to_win ?? 50,
    pointsCorrect: typeof extra.pointsCorrect === "number" ? extra.pointsCorrect : 10,
    pointsRevealed: typeof extra.pointsRevealed === "number" ? extra.pointsRevealed : 5,
    pointsSkip: typeof extra.pointsSkip === "number" ? extra.pointsSkip : 0,
    secondsPerTeam: row.seconds_per_team ?? 120,
    bufferSeconds: typeof extra.bufferSeconds === "number" ? extra.bufferSeconds : 15,
    skipPenaltySeconds: typeof extra.skipPenaltySeconds === "number" ? extra.skipPenaltySeconds : 0,
  };
}

export const listLessonsFn = createServerFn({ method: "GET" }).handler(async () => {
  const teacher = await requireTeacher();
  const rows = await sql<LessonRow[]>`
    SELECT id, title, game_mode, filters, excluded_word_ids, ask_direction,
           score_to_win, seconds_per_team, extra, updated_at
    FROM lessons
    WHERE teacher_id = ${teacher.id}::uuid
    ORDER BY updated_at DESC
  `;
  return rows.map(rowToLesson);
});

const lessonSchema = z.object({
  id: z.string().uuid().optional(),
  title: z.string().min(1).max(200),
  gameMode: z.enum(["basic", "time"]).default("basic"),
  years: z.array(z.string()).default([]),
  terms: z.array(z.string()).default([]),
  topics: z.array(z.string()).default([]),
  difficulties: z.array(z.string()).default([]),
  excludedWordIds: z.array(z.string()).default([]),
  askDirection: z.enum(["french", "english", "random"]).default("random"),
  winMode: z.enum(["score", "time"]).default("score"),
  scoreToWin: z.number().int().default(50),
  pointsCorrect: z.number().default(10),
  pointsRevealed: z.number().default(5),
  pointsSkip: z.number().default(0),
  secondsPerTeam: z.number().int().default(120),
  bufferSeconds: z.number().default(15),
  skipPenaltySeconds: z.number().default(0),
});

export const upsertLessonFn = createServerFn({ method: "POST" })
  .validator(lessonSchema)
  .handler(async ({ data }) => {
    const teacher = await requireTeacher();
    const filters = {
      years: data.years,
      terms: data.terms,
      topics: data.topics,
      difficulties: data.difficulties,
    };
    const extra = {
      winMode: data.winMode,
      pointsCorrect: data.pointsCorrect,
      pointsRevealed: data.pointsRevealed,
      pointsSkip: data.pointsSkip,
      bufferSeconds: data.bufferSeconds,
      skipPenaltySeconds: data.skipPenaltySeconds,
    };
    if (data.id) {
      const rows = await sql<LessonRow[]>`
        UPDATE lessons SET
          title = ${data.title},
          game_mode = ${data.gameMode},
          filters = ${sql.json(filters)},
          excluded_word_ids = ${data.excludedWordIds},
          ask_direction = ${data.askDirection},
          score_to_win = ${data.scoreToWin},
          seconds_per_team = ${data.secondsPerTeam},
          extra = ${sql.json(extra)},
          updated_at = now()
        WHERE id = ${data.id}::uuid AND teacher_id = ${teacher.id}::uuid
        RETURNING id, title, game_mode, filters, excluded_word_ids, ask_direction,
                  score_to_win, seconds_per_team, extra, updated_at
      `;
      if (!rows[0]) throw new Response("Not found", { status: 404 });
      return rowToLesson(rows[0]);
    }
    const rows = await sql<LessonRow[]>`
      INSERT INTO lessons (
        teacher_id, title, game_mode, filters, excluded_word_ids,
        ask_direction, score_to_win, seconds_per_team, extra
      ) VALUES (
        ${teacher.id}::uuid, ${data.title}, ${data.gameMode}, ${sql.json(filters)},
        ${data.excludedWordIds}, ${data.askDirection},
        ${data.scoreToWin}, ${data.secondsPerTeam}, ${sql.json(extra)}
      )
      RETURNING id, title, game_mode, filters, excluded_word_ids, ask_direction,
                score_to_win, seconds_per_team, extra, updated_at
    `;
    return rowToLesson(rows[0]!);
  });

export const deleteLessonFn = createServerFn({ method: "POST" })
  .validator(z.object({ id: z.string().uuid() }))
  .handler(async ({ data }) => {
    const teacher = await requireTeacher();
    await sql`
      DELETE FROM lessons
      WHERE id = ${data.id}::uuid AND teacher_id = ${teacher.id}::uuid
    `;
    return { ok: true as const };
  });
