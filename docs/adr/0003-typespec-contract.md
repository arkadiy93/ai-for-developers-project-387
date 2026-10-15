# 3. TypeSpec contract with committed generated files

Date: 2026-10-15

## Status

Accepted

## Context

The API is contract-first: the contract is written before the backend and frontend code that implements it. We could write it as hand-written OpenAPI YAML, which is verbose and hard to review, as Zod schemas that emit OpenAPI, which in practice makes it code-first, or in TypeSpec, a compact DSL that compiles to OpenAPI. Both apps need the same types, and the backend has to be held to the contract without a separate kind of test.

## Decision

The contract is written in TypeSpec in the workspace package `packages/api`. It compiles to `openapi.yaml`, and `openapi-typescript` generates TypeScript types from that. Both generated files are committed, and CI fails if regenerating them changes anything. Both apps depend on the package: the frontend calls the API through `openapi-fetch`, and the backend validates every request and response against `openapi.yaml` with `express-openapi-validator`. There is no mock server.

## Consequences

Contract changes show up as diffs in `openapi.yaml` in PRs, and an off-contract response fails the regular Supertest tests. Changing the contract means editing TypeSpec and regenerating, and generated files sit in git. Validating responses costs a little runtime on every request, which is fine at this scale.
