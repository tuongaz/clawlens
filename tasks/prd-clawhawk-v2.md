# PRD: ClawHawk v2 — Python Backend + HeroUI Frontend

## Introduction

ClawHawk is a real-time dashboard for monitoring Claude Code sessions. It reads JSONL session files from `~/.claude/projects/`, parses them, and pushes grouped data to a React frontend over WebSocket.

ClawHawk v2 rewrites the backend from Go to Python (FastAPI + uv) and migrates the frontend from hand-rolled CSS to HeroUI v3 (Tailwind CSS v4). The backend migration happens first to minimize risk, followed by the frontend migration. All existing functionality is preserved.

## Goals

- Replace the Go backend with Python (FastAPI) for easier maintenance and contribution
- Distribute via `uv run clawhawk` for simple local usage
- Replace ~530 lines of custom CSS with HeroUI v3 components and Tailwind utilities
- Follow HeroUI best practices for UI — no need to pixel-match the current design
- Maintain the same WebSocket protocol so frontend/backend remain decoupled
- Ensure core parsing and WebSocket functionality is tested

## User Stories

### Phase 1: Python Backend Migration

---

### US-001: Initialize Python project with uv
**Description:** As a developer, I want the project scaffolded with uv so that dependencies and the CLI entry point are configured.

**Acceptance Criteria:**
- [ ] `pyproject.toml` exists with: name=`clawhawk`, dependencies (`fastapi>=0.115`, `uvicorn[standard]>=0.34`, `websockets>=15.0`), dev dependency `pytest>=8.0`, CLI entry point `clawhawk = "clawhawk.app:main"`, python `>=3.11`
- [ ] `uv sync` creates lockfile and venv without errors
- [ ] `src/clawhawk/__init__.py` and `src/clawhawk/__main__.py` exist
- [ ] `uv run clawhawk` starts without import errors (can exit immediately if no app logic yet)

---

### US-002: Create Pydantic data models
**Description:** As a developer, I need Pydantic models matching the Go structs so that JSONL data can be parsed and serialized to camelCase JSON for the frontend.

**Acceptance Criteria:**
- [ ] `src/clawhawk/models.py` contains: `Session` (all fields from Go struct), `ProjectGroup`, `TokenPeriod`, `TokenStats`, `DashboardMessage`
- [ ] Internal models for JSONL parsing: `Message`, `MessageContent`, `MessageUsage`
- [ ] All models use `model_config = ConfigDict(alias_generator=to_camel, populate_by_name=True)` for camelCase JSON output
- [ ] `DashboardMessage.model_dump_json(by_alias=True)` produces JSON matching the current Go output format

---

### US-003: Port IDE detection
**Description:** As a developer, I need IDE lock file detection ported from Go so that sessions show which IDE is being used.

**Acceptance Criteria:**
- [ ] `src/clawhawk/ide.py` contains `load_ide_map(ide_dir: str) -> dict[str, str]`
- [ ] Reads `~/.claude/ide/*.lock` JSON files and returns `{folder_path: ide_name}` mapping
- [ ] Malformed lock files are skipped with a warning (not a crash)

---

### US-004: Port session parsing
**Description:** As a developer, I need JSONL session parsing ported from Go so that session data is available for the dashboard.

**Acceptance Criteria:**
- [ ] `src/clawhawk/sessions.py` contains `parse_session(fpath: str) -> Session | None`
- [ ] File-level cache using `dict[str, CachedSession]` with mod-time invalidation
- [ ] Parses JSONL line-by-line: tracks first/last user prompt, last action, tokens, model, active status
- [ ] Helper functions: `extract_user_text`, `extract_action`, `clean_command_text`, `get_model_context_limit`, `decode_project_path`, `truncate`
- [ ] `load_grouped_sessions(limit: int = 0) -> list[ProjectGroup]` globs `~/.claude/projects/*/*.jsonl`, skips `subagents/`, groups by project, sorts by timestamp desc
- [ ] IDE map and memory file detection integrated into session loading

---

### US-005: Port token stats aggregation
**Description:** As a developer, I need token usage stats ported from Go so that the header shows today/week/month usage.

**Acceptance Criteria:**
- [ ] `src/clawhawk/stats.py` contains `load_token_stats() -> TokenStats`
- [ ] File-level cache with mod-time invalidation
- [ ] `parse_file_token_stats(fpath: str) -> dict[str, TokenPeriod]` extracts assistant message usage grouped by date
- [ ] Aggregates into today / this_week (Monday-based) / this_month periods

---

### US-006: Create FastAPI app with static file serving
**Description:** As a user, I want to run `uv run clawhawk` and have the dashboard served on a local port.

**Acceptance Criteria:**
- [ ] `src/clawhawk/app.py` creates a FastAPI app
- [ ] Static files served from `web/dist/` for frontend assets
- [ ] SPA fallback: catch-all route returns `index.html` for non-API/non-asset paths
- [ ] `main()` parses `--port` CLI arg (default 3333), runs `uvicorn.run()`
- [ ] `__main__.py` calls `main()` so `python -m clawhawk` works
- [ ] `uv run clawhawk` starts server and serves the frontend

---

### US-007: Create WebSocket endpoint
**Description:** As a user, I want the dashboard to receive real-time session updates over WebSocket.

**Acceptance Criteria:**
- [ ] `src/clawhawk/ws.py` contains WebSocket endpoint at `/ws`
- [ ] Polling loop with adaptive interval: 10ms when active sessions exist, 2s when idle
- [ ] Change detection: compare JSON output, skip send if unchanged
- [ ] `WebSocketDisconnect` handled gracefully (no crash/traceback)
- [ ] Frontend connects and receives session data updates

---

### US-008: Write core tests
**Description:** As a developer, I want minimal tests ensuring core parsing and WebSocket functionality works.

**Acceptance Criteria:**
- [ ] `tests/test_sessions.py` — test session parsing with sample JSONL, text extraction, model context limit lookup
- [ ] `tests/test_stats.py` — test token aggregation and period boundaries
- [ ] Tests use `tmp_path` fixture for file isolation
- [ ] `uv run pytest` passes

---

### US-009: Update build system and clean up Go code
**Description:** As a developer, I want the Makefile updated for Python and Go code removed after verifying the Python backend works.

**Acceptance Criteria:**
- [ ] `Makefile` updated: `build` runs `cd frontend && bun install && bun run build && uv sync`, `run` runs `uv run clawhawk`, `clean` removes `web/dist`, `frontend/node_modules`, `.venv`
- [ ] `CLAUDE.md` updated with new build/run commands
- [ ] Go files deleted: `main.go`, `go.mod`, `go.sum`, `internal/` directory, `web/embed.go`, `web/handler.go`
- [ ] `make build && make run` works end-to-end: frontend builds, server starts on :3333, WebSocket delivers session data
- [ ] Verified with an active Claude Code session running

---

### Phase 2: HeroUI Frontend Migration

---

### US-010: Install HeroUI and Tailwind CSS v4
**Description:** As a developer, I need HeroUI v3 and Tailwind CSS v4 installed so that components and utility classes are available.

**Acceptance Criteria:**
- [ ] `@heroui/react`, `@heroui/styles`, `tailwindcss`, `@tailwindcss/vite` added to `frontend/package.json`
- [ ] Tailwind Vite plugin configured in `frontend/vite.config.ts`
- [ ] Dev server starts without errors (`cd frontend && bun run dev`)

---

### US-011: Configure dark theme
**Description:** As a developer, I need a dark theme configured so the app has a polished dark appearance using HeroUI's theming system.

**Acceptance Criteria:**
- [ ] `frontend/index.html` has `class="dark"` and `data-theme="dark"` on `<html>`
- [ ] Tailwind and HeroUI CSS imports added to the main CSS entry point
- [ ] Dark theme applied — HeroUI components render with dark styling
- [ ] Verify in browser: page renders with dark background, no white flash

---

### US-012: Migrate SessionCard to HeroUI
**Description:** As a user, I want session cards to use polished HeroUI components for a better visual experience.

**Acceptance Criteria:**
- [ ] `SessionCard.tsx` uses HeroUI `Card` component (or equivalent)
- [ ] Status badges use HeroUI `Chip` components
- [ ] Context usage displayed with HeroUI progress/meter component (or best available alternative)
- [ ] Tooltips use HeroUI `Tooltip`
- [ ] Active/waiting/idle states visually distinct
- [ ] IDE badges with deep links still work
- [ ] Git branch and memory indicators display correctly
- [ ] Verify in browser using dev server

---

### US-013: Migrate ProjectBox to HeroUI
**Description:** As a user, I want project sections to use HeroUI layout components for consistent styling.

**Acceptance Criteria:**
- [ ] `ProjectBox.tsx` uses HeroUI container/card component for the project section
- [ ] Show more/less uses HeroUI `Button`
- [ ] Responsive grid layout works (1-4 columns depending on viewport)
- [ ] Session count and active indicator display correctly
- [ ] Verify in browser using dev server

---

### US-014: Migrate Header to HeroUI
**Description:** As a user, I want the header to use HeroUI components for a polished, consistent look.

**Acceptance Criteria:**
- [ ] Header uses HeroUI container component
- [ ] Filter toggle uses HeroUI button/toggle component
- [ ] Connection status indicator uses HeroUI badge/chip
- [ ] Token stats (today/week/month) display correctly
- [ ] Session/project counts display correctly
- [ ] Verify in browser using dev server

---

### US-015: Update App.tsx and remove legacy CSS
**Description:** As a developer, I want the root App component using Tailwind classes and the old CSS removed so there's no dead code.

**Acceptance Criteria:**
- [ ] `App.tsx` uses Tailwind utility classes for layout (no custom CSS class names)
- [ ] `App.css` reduced to: Tailwind/HeroUI imports, CSS custom properties (for arbitrary value references), base body styles, and any custom animations
- [ ] No unused CSS rules remain
- [ ] Empty states ("No sessions found", "Connecting...") styled with Tailwind
- [ ] TypeScript build passes (`bun run build` or `npm run build`)
- [ ] Verify in browser: full app renders, all functionality works

---

### US-016: Final integration verification
**Description:** As a user, I want the complete app (Python backend + HeroUI frontend) working end-to-end.

**Acceptance Criteria:**
- [ ] `make build` succeeds (frontend + Python deps)
- [ ] `make run` starts server on :3333
- [ ] WebSocket connects and delivers live session data
- [ ] Header: title, stats, token usage, filter toggle, connection status all display
- [ ] Project boxes: session counts, active indicators
- [ ] Session cards: slug, time ago, prompt, action, context meter, git branch, memory, IDE badge
- [ ] Active sessions: green indicator + pulse animation
- [ ] Waiting sessions: yellow indicator
- [ ] Show more/less toggles work
- [ ] Active-only filter works
- [ ] Responsive layout works at mobile/tablet/desktop widths
- [ ] Dark theme consistent throughout

---

## Functional Requirements

- FR-1: The Python backend must parse JSONL session files from `~/.claude/projects/*/` and detect active sessions (activity within last 5 minutes)
- FR-2: The backend must serve a WebSocket endpoint at `/ws` that pushes `DashboardMessage` JSON (groups + token stats) to connected clients
- FR-3: The WebSocket must use adaptive polling: 10ms interval when active sessions exist, 2s when all idle
- FR-4: The backend must only send data when it has changed (JSON byte comparison)
- FR-5: The backend must serve the frontend as static files from `web/dist/` with SPA fallback
- FR-6: The backend must detect IDE usage from `~/.claude/ide/*.lock` files and include client info in session data
- FR-7: The backend must aggregate token usage into today/this_week/this_month periods
- FR-8: The backend must use file-level caching with modification-time invalidation for session parsing and token stats
- FR-9: The frontend must use HeroUI v3 components following HeroUI best practices (not pixel-matching the current UI)
- FR-10: The frontend must maintain all current functionality: session display, project grouping, filtering, IDE deep links, memory indicators, context usage display
- FR-11: All JSON serialization must use camelCase field names to maintain frontend compatibility
- FR-12: The CLI must accept `--port` flag (default 3333) and be runnable via `uv run clawhawk`

## Non-Goals

- No PyPI publishing — local `uv run clawhawk` is sufficient
- No new features beyond what the Go version provides
- No authentication or multi-user support
- No database — continues reading JSONL files directly
- No server-side rendering
- No mobile app
- No backward compatibility with the Go binary — clean replacement
- No comprehensive test suite — just core parsing and stats tests

## Technical Considerations

- **Migration order:** Backend (Python) first, then frontend (HeroUI). This keeps one moving part at a time and lets us verify the WebSocket protocol hasn't changed before touching the frontend.
- **Go code removal:** Delete Go files only after the Python backend is verified working end-to-end.
- **Frontend restructuring:** Components may be restructured if HeroUI best practices suggest different patterns (not locked to current component boundaries).
- **HeroUI v3 API stability:** Some components (`Meter`, `ToggleButton`, `Surface`) may have different APIs or not exist. Fall back to alternatives: `Progress` for `Meter`, `Button` with state for `ToggleButton`, `div` with Tailwind for `Surface`.
- **Caching:** Python uses module-level dicts for caching (single-threaded async, no mutex needed — unlike Go's `sync.Mutex`).
- **File reading:** Python's `open().readline()` replaces Go's `bufio.Scanner` with 1MB buffer.
- **Static files:** FastAPI's `StaticFiles` + catch-all route replaces Go's `//go:embed` + `http.FileServer`.

## Success Metrics

- `uv run clawhawk` starts the server and serves a functional dashboard
- All current dashboard features work: live updates, filtering, IDE links, token stats
- Frontend uses HeroUI components — no custom CSS class-based styling for components
- `App.css` reduced from ~530 lines to under 50 lines
- Core tests pass via `uv run pytest`
- `make build && make run` works from a clean checkout

## Open Questions

- Should we add a `--dev` flag for development mode (CORS headers, auto-reload)?
- Should the frontend dev proxy be updated to target the Python server port?
- Are there any JSONL edge cases in the Go parser that aren't covered by the porting notes?
