import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { hashPassword, verifyPassword } from "@/backend/crypto";
import { sql } from "@/backend/db";
import {
  createTeacherSession,
  destroyTeacherSession,
  getTeacherFromSession,
  requireTeacher,
} from "@/backend/session";

const loginSchema = z.object({
  email: z.string().email().max(320),
  password: z.string().min(1).max(200),
});

const changePasswordSchema = z.object({
  currentPassword: z.string().min(1).max(200),
  newPassword: z.string().min(8).max(200),
});

const changeEmailSchema = z.object({
  newEmail: z.string().email().max(320),
  currentPassword: z.string().min(1).max(200),
});

export const getSessionFn = createServerFn({ method: "GET" }).handler(async () => {
  return getTeacherFromSession();
});

export const loginFn = createServerFn({ method: "POST" })
  .validator(loginSchema)
  .handler(async ({ data }) => {
    const email = data.email.trim().toLowerCase();
    const rows = await sql<
      { id: string; email: string; display_name: string; password_hash: string }[]
    >`
      SELECT id, email, display_name, password_hash
      FROM teachers
      WHERE lower(email) = ${email}
      LIMIT 1
    `;
    const row = rows[0];
    if (!row || !(await verifyPassword(row.password_hash, data.password))) {
      throw new Response(JSON.stringify({ error: "Invalid email or password" }), {
        status: 401,
        headers: { "content-type": "application/json" },
      });
    }
    await createTeacherSession(row.id);
    return {
      id: row.id,
      email: row.email,
      displayName: row.display_name,
    };
  });

export const logoutFn = createServerFn({ method: "POST" }).handler(async () => {
  await destroyTeacherSession();
  return { ok: true as const };
});

export const changePasswordFn = createServerFn({ method: "POST" })
  .validator(changePasswordSchema)
  .handler(async ({ data }) => {
    const teacher = await requireTeacher();
    const rows = await sql<{ password_hash: string }[]>`
      SELECT password_hash FROM teachers WHERE id = ${teacher.id}::uuid LIMIT 1
    `;
    const row = rows[0];
    if (!row || !(await verifyPassword(row.password_hash, data.currentPassword))) {
      throw new Response(JSON.stringify({ error: "Current password is wrong" }), {
        status: 400,
        headers: { "content-type": "application/json" },
      });
    }
    const nextHash = await hashPassword(data.newPassword);
    await sql`
      UPDATE teachers
      SET password_hash = ${nextHash}, updated_at = now()
      WHERE id = ${teacher.id}::uuid
    `;
    return { ok: true as const };
  });

export const changeEmailFn = createServerFn({ method: "POST" })
  .validator(changeEmailSchema)
  .handler(async ({ data }) => {
    const teacher = await requireTeacher();
    const nextEmail = data.newEmail.trim().toLowerCase();
    if (nextEmail === teacher.email.trim().toLowerCase()) {
      throw new Response(JSON.stringify({ error: "That is already your email" }), {
        status: 400,
        headers: { "content-type": "application/json" },
      });
    }
    const rows = await sql<{ password_hash: string }[]>`
      SELECT password_hash FROM teachers WHERE id = ${teacher.id}::uuid LIMIT 1
    `;
    const row = rows[0];
    if (!row || !(await verifyPassword(row.password_hash, data.currentPassword))) {
      throw new Response(JSON.stringify({ error: "Current password is wrong" }), {
        status: 400,
        headers: { "content-type": "application/json" },
      });
    }
    const taken = await sql<{ id: string }[]>`
      SELECT id FROM teachers
      WHERE lower(email) = ${nextEmail} AND id <> ${teacher.id}::uuid
      LIMIT 1
    `;
    if (taken[0]) {
      throw new Response(JSON.stringify({ error: "Email already in use" }), {
        status: 409,
        headers: { "content-type": "application/json" },
      });
    }
    await sql`
      UPDATE teachers
      SET email = ${nextEmail}, updated_at = now()
      WHERE id = ${teacher.id}::uuid
    `;
    return { ok: true as const, email: nextEmail };
  });
