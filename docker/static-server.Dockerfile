FROM node:22-alpine

RUN corepack enable && corepack prepare pnpm@10.33.0 --activate

WORKDIR /app/static-server

COPY static-server/package.json static-server/pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile

COPY static-server/ ./
COPY public ../public

ENV PORT=3001
EXPOSE 3001

CMD ["node", "index.mjs"]
