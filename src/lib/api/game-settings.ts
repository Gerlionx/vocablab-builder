import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { sql } from "@/backend/db";
import { requireTeacher } from "@/backend/session";

export const getGameSettingsFn = createServerFn({ method: "GET" }).handler(async () => {
  const teacher = await requireTeacher();
  const rows = await sql<
    { board_modes: unknown; mode_settings: unknown; fuse: unknown; wheel: unknown }[]
  >`
    SELECT board_modes, mode_settings, fuse, wheel
    FROM game_settings
    WHERE teacher_id = ${teacher.id}::uuid
    LIMIT 1
  `;
  return (
    rows[0] ?? {
      board_modes: {},
      mode_settings: {},
      fuse: {},
      wheel: {},
    }
  );
});

export const saveGameSettingsFn = createServerFn({ method: "POST" })
  .validator(
    z.object({
      board_modes: z.unknown().default({}),
      mode_settings: z.unknown().default({}),
      fuse: z.unknown().default({}),
      wheel: z.unknown().default({}),
    }),
  )
  .handler(async ({ data }) => {
    const teacher = await requireTeacher();
    await sql`
      INSERT INTO game_settings (teacher_id, board_modes, mode_settings, fuse, wheel, updated_at)
      VALUES (
        ${teacher.id}::uuid,
        ${sql.json(data.board_modes as never)},
        ${sql.json(data.mode_settings as never)},
        ${sql.json(data.fuse as never)},
        ${sql.json(data.wheel as never)},
        now()
      )
      ON CONFLICT (teacher_id) DO UPDATE SET
        board_modes = EXCLUDED.board_modes,
        mode_settings = EXCLUDED.mode_settings,
        fuse = EXCLUDED.fuse,
        wheel = EXCLUDED.wheel,
        updated_at = now()
    `;
    return { ok: true as const };
  });
