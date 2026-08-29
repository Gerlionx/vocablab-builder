# VocabLab — production Node (Nitro) image for Cerberus
FROM node:22-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

FROM node:22-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
# Explicit Node server preset — Lovable defaults lean Cloudflare.
ENV NITRO_PRESET=node-server
RUN npm run build

FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV HOST=0.0.0.0
ENV PORT=3000
ENV NITRO_HOST=0.0.0.0
ENV NITRO_PORT=3000

RUN addgroup -S vocablab && adduser -S vocablab -G vocablab \
  && mkdir -p /app/uploads && chown -R vocablab:vocablab /app/uploads

COPY --from=builder --chown=vocablab:vocablab /app/.output ./.output

USER vocablab
EXPOSE 3000
CMD ["node", ".output/server/index.mjs"]
