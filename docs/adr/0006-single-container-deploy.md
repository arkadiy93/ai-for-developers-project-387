# 6. Single-container deploy on Render

Date: 2026-10-15

## Status

Accepted.

## Context

Hexlet's check builds an image from a root `Dockerfile`, runs it, and expects the app to answer on the port in `PORT`. The project also needs a public URL. Until now production was two processes: the backend on :3000 and `vite preview` on :4173, proxying `/api` to it. A container gets one `PORT`.

## Decision

The image runs a single process, the Express backend. `createApp` takes an optional `staticDir` (from `STATIC_DIR`, set in the Dockerfile). With it, the backend serves the built frontend after the `/api` routers and answers every other non-`/api` GET with `index.html`, so client routes like `/admin` survive a reload. Unknown `/api` paths still get the JSON 404 envelope. The Dockerfile builds both apps in one stage and installs only the backend's production dependencies in the runtime stage. We deploy to Render's free web service from `render.yaml`, because it builds from the Dockerfile, sets `PORT` itself, and needs no card.

## Consequences

Dev and tests don't change: without `STATIC_DIR` the backend serves only `/api`, and Vite still proxies to it. The SQLite file lives in the container, so Render resets the data on every deploy and restart. That is fine for a course project, but real use would need a persistent disk or a hosted database. The free service sleeps when idle, so the first request after a pause is slow. CI's `docker` job builds the image and curls it, so a broken image fails before Hexlet's check sees it.
