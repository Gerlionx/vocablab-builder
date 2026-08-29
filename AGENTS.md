## Maintaining this file

Keep this file for knowledge useful to almost every future agent session in this project.
Do not repeat what the codebase already shows; point to the authoritative file or command instead.
Prefer rewriting or pruning existing entries over appending new ones.
When updating this file, preserve this bar for all agents and keep entries concise.

## Vocabulary data

- Canonical types and shared constants: `src/lib/vocab-data.ts` (`Word`, `YEARS`, `TERMS`, `TOPICS`, `SEED_WORDS`).
- Year-specific imports live in `src/lib/year8-vocab.ts`, `src/lib/year9-vocab.ts` (Mixed Ability), and `src/lib/year9-more-able-vocab.ts`; append new year files and spread them into `SEED_WORDS`.
- Vocabulary UI uses term cards + booklet topic view in `src/routes/vocabulary.tsx`.
- Build: `npm run build`; preview: `npm run preview`; tests: `npm test`.

## Deploy (Cerberus)

- Docker: `Dockerfile` + `docker-compose.yml` (image `vocablab`, LAN `192.168.0.3:4360`, network `ai_data`).
- Public: Caddy site `vocablab.unifiedops.cloud` → snippet in `deploy/caddy-vocablab.snippet`.
- Postgres: shared `ai-postgres`, DB/role `vocablab`; schema `deploy/schema.sql`; seed `deploy/seed-teacher.mjs`.
- Teacher API: `src/lib/api/*` + `src/backend/*` (auth, words, lessons, settings, images). Pupil names stay session-only.
