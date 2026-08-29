/**
 * Idempotent seed of the primary teacher account.
 * Usage: node --experimental-strip-types deploy/seed-teacher.mjs
 * Env: DATABASE_URL or DATABASE_URL_HOST, optional SEED_TEACHER_*
 */
import postgres from "postgres";
import { hash } from "@node-rs/argon2";

const url = process.env.DATABASE_URL_HOST || process.env.DATABASE_URL;
if (!url) {
  console.error("DATABASE_URL(_HOST) required");
  process.exit(1);
}

const email = (process.env.SEED_TEACHER_EMAIL || "dorina.crisan@gmail.com").trim().toLowerCase();
const password = process.env.SEED_TEACHER_PASSWORD || "vocablab";
const displayName = process.env.SEED_TEACHER_NAME || "Dorina";

const sql = postgres(url, { max: 1 });

const passwordHash = await hash(password, {
  memoryCost: 19456,
  timeCost: 2,
  parallelism: 1,
});

const existing = await sql`
  SELECT id FROM teachers WHERE lower(email) = ${email} LIMIT 1
`;

if (existing[0]) {
  await sql`
    UPDATE teachers
    SET password_hash = ${passwordHash}, display_name = ${displayName}, updated_at = now()
    WHERE id = ${existing[0].id}::uuid
  `;
  console.log(`Updated teacher ${email}`);
} else {
  await sql`
    INSERT INTO teachers (email, display_name, password_hash)
    VALUES (${email}, ${displayName}, ${passwordHash})
  `;
  console.log(`Created teacher ${email}`);
}

await sql.end({ timeout: 5 });
