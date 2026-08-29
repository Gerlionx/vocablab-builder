import { createFileRoute } from "@tanstack/react-router";
import { createReadStream } from "node:fs";
import { stat } from "node:fs/promises";
import path from "node:path";
import { Readable } from "node:stream";
import { getCookie } from "@tanstack/react-start/server";
import { sha256Token } from "@/backend/crypto";
import { sql } from "@/backend/db";
import { SESSION_COOKIE } from "@/backend/session";

function uploadRoot() {
  return process.env.UPLOAD_DIR || path.join(process.cwd(), "uploads");
}

export const Route = createFileRoute("/api/uploads/$imageId")({
  server: {
    handlers: {
      GET: async ({ params }) => {
        const token = getCookie(SESSION_COOKIE);
        if (!token) {
          return new Response("Unauthorized", { status: 401 });
        }
        const tokenHash = sha256Token(token);
        const sessions = await sql`
          SELECT 1 FROM teacher_sessions
          WHERE token_hash = ${tokenHash} AND expires_at > now()
          LIMIT 1
        `;
        if (!sessions[0]) {
          return new Response("Unauthorized", { status: 401 });
        }

        const rows = await sql<{ storage_key: string; mime_type: string }[]>`
          SELECT storage_key, mime_type FROM images WHERE id = ${params.imageId}::uuid LIMIT 1
        `;
        const row = rows[0];
        if (!row) return new Response("Not found", { status: 404 });

        const abs = path.join(uploadRoot(), row.storage_key);
        try {
          await stat(abs);
        } catch {
          return new Response("Not found", { status: 404 });
        }

        const stream = Readable.toWeb(createReadStream(abs)) as ReadableStream;
        return new Response(stream, {
          headers: {
            "content-type": row.mime_type || "application/octet-stream",
            "cache-control": "private, max-age=3600",
          },
        });
      },
    },
  },
});
