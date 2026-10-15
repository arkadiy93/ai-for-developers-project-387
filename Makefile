# Thin wrapper over the pnpm scripts. `make` installs what's missing and starts dev.

# Generated last by `pnpm generate`, so it stands for both generated files (macOS make has no grouped targets).
API_GENERATED := packages/api/generated/api.d.ts
INSTALL_STAMP := node_modules/.modules.yaml

.DEFAULT_GOAL := dev
.PHONY: install generate dev build start test lint typecheck e2e docker format check

# Reinstall only when a manifest or the lockfile changes.
$(INSTALL_STAMP): package.json pnpm-lock.yaml pnpm-workspace.yaml apps/*/package.json packages/*/package.json
	pnpm install
	@touch $@

install: $(INSTALL_STAMP)

# Regenerate only when the TypeSpec source changes.
$(API_GENERATED): packages/api/main.tsp packages/api/tspconfig.yaml $(INSTALL_STAMP)
	pnpm generate
	@touch $@

generate: $(API_GENERATED)

dev: install generate
	pnpm dev

build: install generate
	pnpm build

# Production build: backend on :3000, built frontend on :4173 (proxies /api like dev).
start: build
	pnpm -r --parallel start

test lint typecheck: install generate
	pnpm $@

# Browser e2e (Playwright) on its own ports, so `make dev` can keep running.
e2e: install generate
	pnpm test:e2e

# The production image (as Hexlet's check and Render build it), served on :8080.
docker:
	docker build -t calendar .
	docker run --rm -e PORT=8080 -p 8080:8080 calendar

format: install
	pnpm format

# The same steps CI runs, in the same order.
check: install
	pnpm generate
	git add --intent-to-add packages/api/generated
	git diff --exit-code -- packages/api/generated
	pnpm format:check
	pnpm lint
	pnpm typecheck
	pnpm test
	pnpm build
