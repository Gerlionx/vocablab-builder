import { deleteCookie, getCookie, setCookie } from "@tanstack/react-start/server";
import { sql } from "@/backend/db";
import { newSessionToken, sha256Token } from "@/backend/crypto";

export const SESSION_COOKIE = "vl_session";
export const SESSION_TTL_SECONDS = Number(process.env.SESSION_TTL_SECONDS ?? 60 * 60 * 8);

export type TeacherRow = {
  id: string;
  email: string;
  display_name: string;
};

export type PublicTeacher = {
  id: string;
  email: string;
  displayName: string;
};

function toPublic(row: TeacherRow): PublicTeacher {
  return { id: row.id, email: row.email, displayName: row.display_name };
}

function cookieOpts(maxAge: number) {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
    maxAge,
  };
}

export async function createTeacherSession(teacherId: string): Promise<string> {
  const token = newSessionToken();
  const tokenHash = sha256Token(token);
  const expiresAt = new Date(Date.now() + SESSION_TTL_SECONDS * 1000);
  await sql`
    INSERT INTO teacher_sessions (teacher_id, token_hash, expires_at)
    VALUES (${teacherId}::uuid, ${tokenHash}, ${expiresAt})
  `;
  setCookie(SESSION_COOKIE, token, cookieOpts(SESSION_TTL_SECONDS));
  return token;
}

export async function destroyTeacherSession() {
  const token = getCookie(SESSION_COOKIE);
  if (token) {
    const tokenHash = sha256Token(token);
    await sql`DELETE FROM teacher_sessions WHERE token_hash = ${tokenHash}`;
  }
  deleteCookie(SESSION_COOKIE, { path: "/" });
}

export async function getTeacherFromSession(): Promise<PublicTeacher | null> {
  const token = getCookie(SESSION_COOKIE);
  if (!token) return null;
  const tokenHash = sha256Token(token);
  const rows = await sql<TeacherRow[]>`
    SELECT t.id, t.email, t.display_name
    FROM teacher_sessions s
    JOIN teachers t ON t.id = s.teacher_id
    WHERE s.token_hash = ${tokenHash}
      AND s.expires_at > now()
    LIMIT 1
  `;
  const row = rows[0];
  if (!row) {
    deleteCookie(SESSION_COOKIE, { path: "/" });
    return null;
  }
  const nextExpiry = new Date(Date.now() + SESSION_TTL_SECONDS * 1000);
  await sql`
    UPDATE teacher_sessions
    SET last_seen_at = now(), expires_at = ${nextExpiry}
    WHERE token_hash = ${tokenHash}
  `;
  setCookie(SESSION_COOKIE, token, cookieOpts(SESSION_TTL_SECONDS));
  return toPublic(row);
}

export async function requireTeacher(): Promise<PublicTeacher> {
  const teacher = await getTeacherFromSession();
  if (!teacher) {
    throw new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { "content-type": "application/json" },
    });
  }
  return teacher;
}
