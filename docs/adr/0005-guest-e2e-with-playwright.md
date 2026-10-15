# 5. Guest e2e test with Playwright

Date: 2026-10-15

## Status

Accepted. Supersedes point 4 ("No e2e tests") of [issue #23](https://github.com/arkadiy93/ai-for-developers-project-386/issues/23).

## Context

The unit and Testing Library tests stub `fetch`, and the Supertest tests never render the UI, so nothing proves that a Guest can actually book a call through the real frontend and backend together. The project now requires that the whole Guest scenario passes: choosing an Event Type, the calendar, booking a free Slot, and the confirmation.

## Decision

One Playwright spec in the workspace package `e2e/` drives Chromium through the booking wizard. Playwright starts its own backend (port 3100, `DB_PATH=:memory:`) and Vite dev server (port 5174, proxying `/api` there via `API_URL`), so every run starts from an empty database and never touches a running `pnpm dev`. The spec seeds its Event Type through the API, picks whatever start the calendar offers first, so it passes at any time of day, and then checks both the confirmation screen and `GET /bookings`. CI runs it in a separate `e2e` job. We picked Playwright over Cypress for its built-in `webServer` handling, role-based locators, and the Playwright MCP server, which agents also use to explore the UI.

## Consequences

E2E stays limited to whole user journeys. Edge cases (409s, empty and error states) stay in the faster Testing Library and Supertest tests. CI downloads Chromium on every run. The spec uses the system clock, so it depends on the Booking Window always containing a free start, which an empty database guarantees.
