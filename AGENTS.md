# AGENTS.md

This file provides guidance to AI coding agents working with code in this repository.

## Project

Hexlet course project "Календарь звонков": a calendar call-booking service, built together with AI. It is a pnpm workspaces monorepo (Node 22.13+, pnpm 9, TypeScript 7, ESM throughout) with four packages: `packages/api`, `apps/backend`, `apps/frontend` and `e2e`. The UI text is in English; the README is in Russian.

Do not delete, edit, or rename `.github/workflows/hexlet-check.yml`. Hexlet's automated grading depends on it.

## Commands

Run these from the repo root:

```bash
pnpm dev            # backend :3000 (tsx watch) + frontend :5173 (vite), in parallel
pnpm test           # vitest run in both apps
pnpm test:e2e       # Playwright e2e in e2e/ (starts its own servers; `make e2e` wraps it)
pnpm lint           # oxlint --deny-warnings (warnings fail)
pnpm typecheck      # tsc in both apps and e2e
pnpm build          # backend: tsc -> dist/; frontend: tsc -b && vite build
pnpm format         # prettier --write . (pnpm format:check runs in CI)
pnpm generate       # TypeSpec -> packages/api/generated/{openapi.yaml,api.d.ts}
```

The root `Makefile` wraps these: `make` (or `make dev`) installs dependencies and regenerates the contract only when their inputs changed, then starts dev; `make check` runs the CI steps; `make docker` builds the production image and runs it on :8080. Keep its targets in sync when adding a pnpm script.

To run a single package or test:

```bash
pnpm --filter backend test
pnpm --filter frontend test -- src/App.test.tsx   # single file
pnpm --filter frontend test -- -t "shows ok"      # by test name
pnpm --filter backend exec vitest                 # watch mode
```

CI (`.github/workflows/ci.yml`) first regenerates the contract and fails on any diff, then runs `format:check`, `lint`, `typecheck`, `test`, and `build`, in that order. A parallel `e2e` job installs Chromium and runs `pnpm test:e2e`, and a `docker` job builds the image and curls it. All must pass.

## Architecture

- **Contract** (`packages/api`, ADR 0003): the API is contract-first. Change `main.tsp`, run `pnpm generate`, and commit the regenerated files with the code that implements them. Never edit `generated/` by hand; Prettier skips it so the CI diff check stays exact. The package pins TypeScript 5 because `openapi-typescript` needs the JS compiler API that TypeScript 7 lacks.
- **Backend** (`apps/backend`): Express 5. `src/app.ts` exports `createApp({ db, now })`, which takes a `node:sqlite` `DatabaseSync` and an optional clock (default: the system clock), and builds the app without listening. `src/index.ts` opens `DB_PATH` (default `apps/backend/data/calendar.db`, gitignored) and only calls `listen` on `PORT` (default 3000). Tests use Supertest on `createApp({ db: new DatabaseSync(':memory:'), now })` directly, so new routes go into the app factory and never into `index.ts`. `express-openapi-validator` checks every request and response against the contract, so a route or response shape missing from `main.tsp` fails. `src/errors.ts` maps every error into the `{ code, message, details? }` envelope. `src/store.ts` is the only module that runs SQL; the schema is `src/schema.sql` (`CREATE TABLE IF NOT EXISTS`, no migrations), and the build copies it into `dist/`. All routes live under `/api`. The backend uses `NodeNext` module resolution, so relative imports need the `.js` extension (`import { createApp } from './app.js'`). `tsconfig.build.json` excludes `*.test.ts` from the build. `createApp` also takes an optional `staticDir`, which `index.ts` sets from `STATIC_DIR`: with it, the backend serves the built frontend and answers any non-`/api` GET with `index.html`.
- **Frontend** (`apps/frontend`): Vite + React 19 + Tailwind CSS v4 (through `@tailwindcss/vite`, so there is no tailwind config file; the theme is in `src/index.css`). The Vite dev server proxies `/api` to `http://localhost:3000`, so the frontend calls the backend through the typed `openapi-fetch` client `api` from `@/lib/api`, never with hand-written `fetch` calls. The `@/` alias points to `src/` and is set in both `vite.config.ts` and `tsconfig.app.json`. Vitest uses jsdom with globals, and `src/test/setup.ts` loads jest-dom matchers. Tests stub `fetch` with `vi.stubGlobal` instead of calling the real backend.
- **E2E** (`e2e/`, ADR 0005): Playwright specs (`*.spec.ts`) that drive the real app in Chromium. `playwright.config.ts` starts its own backend on :3100 with `DB_PATH=:memory:` (empty every run) and a Vite dev server on :5174 whose proxy points there through `API_URL`, so a running `pnpm dev` is untouched. Specs seed data through `request` on `/api` (the same proxy) and find elements by role and label, never by CSS class. Keep e2e to whole user journeys; edge cases belong in the Testing Library tests. The first local run needs `pnpm --filter e2e exec playwright install chromium`. `.mcp.json` sets up the `playwright` and `chrome-devtools` MCP servers for exploring the running app while writing or debugging a spec.
- **Deploy** (ADR 0006): the root `Dockerfile` builds both apps and runs only the backend, which serves the SPA from `STATIC_DIR` and listens on `PORT`. Hexlet's check builds and runs this image, and Render deploys it from `render.yaml`. CI's `docker` job builds the image and smoke-tests it.
- **UI components**: shadcn/ui (style `base-nova`, built on `@base-ui/react` rather than Radix, with lucide icons). Generated components go in `src/components/ui/`, and oxlint's `only-export-components` rule is turned off there. Add components with the shadcn CLI (`pnpm --filter frontend exec shadcn add <name>`) or the `shadcn` MCP server set up in `.mcp.json`. Use `cn()` from `@/lib/utils` to merge class names.

## Conventions

- Commit messages must follow Conventional Commits (`feat:`, `fix:`, `chore:`, ...). A husky `commit-msg` hook enforces this with commitlint.
- Releases go through release-please. It bumps the version in the root `package.json` and in both app `package.json` files together, so don't edit versions or `CHANGELOG.md` by hand.
- Prettier and `.editorconfig` set formatting. Existing code uses single quotes.

## Agent skills

### Issue tracker

Issues are tracked in GitHub Issues for `arkadiy93/ai-for-developers-project-386`, through the `gh` CLI. See `docs/agents/issue-tracker.md`.

### Triage labels

Uses the five default labels: `needs-triage`, `needs-info`, `ready-for-agent`, `ready-for-human`, `wontfix`. See `docs/agents/triage-labels.md`.

### Domain docs

Single-context: one `GLOSSARY.md` and one `docs/adr/` at the repo root. See `docs/agents/domain.md`.
