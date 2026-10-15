# One container: the backend serves the API and the built frontend on $PORT (ADR 0006).
FROM node:22-slim AS base
RUN npm install --global pnpm@9.6.0
WORKDIR /app

FROM base AS build
COPY . .
RUN pnpm install --frozen-lockfile
# The contract in packages/api/generated is committed, so TypeSpec doesn't run here.
RUN pnpm --filter backend --filter frontend build

FROM base AS runtime
ENV NODE_ENV=production
# Every workspace manifest, so the frozen lockfile still matches.
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/backend/package.json apps/backend/
COPY apps/frontend/package.json apps/frontend/
COPY e2e/package.json e2e/
COPY packages/api/package.json packages/api/
COPY packages/api/generated packages/api/generated
RUN pnpm install --frozen-lockfile --prod --ignore-scripts --filter backend...
COPY --from=build /app/apps/backend/dist apps/backend/dist
COPY --from=build /app/apps/frontend/dist apps/frontend/dist
ENV STATIC_DIR=/app/apps/frontend/dist
EXPOSE 3000
CMD ["node", "apps/backend/dist/index.js"]
