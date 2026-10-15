# Календарь звонков

[![hexlet-check](https://github.com/arkadiy93/ai-for-developers-project-386/actions/workflows/hexlet-check.yml/badge.svg)](https://github.com/arkadiy93/ai-for-developers-project-386/actions)

Разработайте совместно с ИИ сервис для бронирования календаря

Учебный проект Хекслета: https://ru.hexlet.io/programs/ai-for-developers
Как это должно работать: https://files.hexlet.app/a/2ipc5m

## Стек

- Монорепозиторий на pnpm workspaces, TypeScript 7
- Backend (`apps/backend`): Express 5, tsx, Vitest + Supertest
- Frontend (`apps/frontend`): Vite, React 19, Tailwind CSS v4, shadcn/ui, Vitest + Testing Library
- E2E (`e2e`): Playwright, сквозной сценарий гостя против настоящего backend
- Инструменты: oxlint, Prettier, commitlint + husky (Conventional Commits), GitHub Actions, release-please

## Установка

Требуется Node.js 22.13+ и pnpm 9+.

```bash
git clone https://github.com/arkadiy93/ai-for-developers-project-386.git
cd ai-for-developers-project-386
make              # установит зависимости, сгенерирует контракт API и запустит dev
```

`make` сам вызывает `pnpm install`, когда меняются `package.json` или lockfile, и `pnpm generate`, когда меняется `packages/api/main.tsp`.

| Команда       | Что делает                                                                 |
| ------------- | -------------------------------------------------------------------------- |
| `make dev`    | dev-режим: backend на :3000, frontend на :5173                             |
| `make start`  | production-сборка и запуск: backend на :3000, frontend на :4173            |
| `make check`  | все проверки CI: актуальность контракта, формат, линт, типы, тесты, сборка |
| `make e2e`    | e2e-тесты Playwright на своих портах (:3100, :5174)                        |
| `make docker` | собрать production-образ и запустить его на :8080                          |

## Использование

```bash
pnpm dev          # backend на http://localhost:3000, frontend на http://localhost:5173
pnpm generate     # контракт API: TypeSpec -> OpenAPI и TypeScript-типы
pnpm test         # тесты всех пакетов
pnpm test:e2e     # e2e-тесты Playwright (в первый раз: pnpm --filter e2e exec playwright install chromium)
pnpm lint         # oxlint
pnpm typecheck    # проверка типов
pnpm build        # сборка всех пакетов
pnpm format       # форматирование Prettier
```

Frontend проксирует запросы `/api/*` на backend (см. `apps/frontend/vite.config.ts`).

## Деплой

Приложение собирается в один Docker-образ по `Dockerfile` в корне: backend отдаёт и API (`/api`), и собранный frontend, и слушает порт из переменной окружения `PORT` (по умолчанию 3000).

```bash
docker build -t calendar .
docker run --rm -e PORT=8080 -p 8080:8080 calendar   # http://localhost:8080
```

Production развёрнут на [Render](https://render.com) по `render.yaml` (бесплатный web service, автодеплой из `main`): https://ai-for-developers-project-386.onrender.com. База SQLite лежит в контейнере и сбрасывается при каждом деплое, а бесплатный сервис засыпает без трафика, поэтому первый запрос может занять до минуты.

### Коммиты и релизы

Сообщения коммитов должны соответствовать [Conventional Commits](https://www.conventionalcommits.org/) (`feat:`, `fix:`, `chore:` …) — это проверяет хук `commit-msg`. На каждый пуш в `main` [release-please](https://github.com/googleapis/release-please-action) обновляет release PR с новой версией и `CHANGELOG.md`; после его мержа создаются тег и GitHub Release.

---

<details>
<summary>Автоматические тесты Хекслета</summary>

Тесты запускаются на каждый коммит. За запуск отвечает файл `.github/workflows/hexlet-check.yml` — не удаляйте и не переименовывайте ни его, ни репозиторий.

</details>

## О Хекслете

[Хекслет](https://ru.hexlet.io/) — школа программирования: авторские программы обучения с практикой, поддержкой наставников и реальными проектами, которые остаются в резюме. Этот репозиторий — один из таких проектов.
