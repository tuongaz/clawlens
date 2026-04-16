.PHONY: build run dev clean release

build:
	cd frontend && bun install && bun run build
	uv sync

run: build
	uv run clawview

dev:
	@echo "Run in two terminals:"
	@echo "  Terminal 1: cd frontend && bun run dev"
	@echo "  Terminal 2: uv run clawview"

release:
	@# Bump patch version (0.2.0 -> 0.2.1 -> 0.2.2 ...)
	@CURRENT=$$(grep '^version' pyproject.toml | sed 's/.*"\(.*\)"/\1/'); \
	MAJOR=$$(echo $$CURRENT | cut -d. -f1); \
	MINOR=$$(echo $$CURRENT | cut -d. -f2); \
	PATCH=$$(echo $$CURRENT | cut -d. -f3); \
	NEW_PATCH=$$((PATCH + 1)); \
	NEW_VERSION="$$MAJOR.$$MINOR.$$NEW_PATCH"; \
	sed -i '' "s/^version = \"$$CURRENT\"/version = \"$$NEW_VERSION\"/" pyproject.toml; \
	echo "Bumped version: $$CURRENT -> $$NEW_VERSION"; \
	git add pyproject.toml && \
	git commit -m "chore: bump version to $$NEW_VERSION" && \
	git push origin main
	@$(MAKE) build
	rm -rf dist
	uv build
	uv publish --token $(PYPI_TOKEN)

clean:
	rm -rf src/clawview/web
	rm -rf frontend/node_modules
	rm -rf .venv
	rm -rf dist
