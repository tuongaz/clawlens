---
name: claude-code-session-detail
description: Use when working with Claude Code CLI session internals - session lifecycle, transcript storage, compaction, resume, subagents, hooks, remote/bridge sessions, worktrees, context collapse, or debugging session-related issues. Comprehensive reference for the session architecture across 100+ source files.
---

# Claude Code Session Architecture

Complete reference for how the Claude Code CLI manages sessions — from creation through compaction, resume, and cleanup.

## Quick Orientation

Sessions are **append-only JSONL transcript files** stored under `~/.claude/projects/`. Each session is identified by a UUID and contains a linked list of messages (via `uuid`/`parentUuid` chains), metadata entries, compaction boundaries, and snapshot data.

**Session types:** Local interactive, Remote (WebSocket), SSH, Background (Ctrl+B), Subagent, Teammate/swarm, Worktree, Direct connect (IDE)

## Reference Files

Each file below covers a specific area. Read only the file relevant to your task.

### directory-structure.md
On-disk layout under `~/.claude/` — project directories, session subdirectories (subagents, tool-results, outputs), session-env scripts, file-history backups, concurrent session PID files. Path sanitization rules and session ID validation regex.

### file-schemas.md
All JSONL entry types: message entries (user, assistant, attachment, system), metadata entries (titles, tags, agent settings, PR links, worktree state), snapshot entries (file-history, attribution, content-replacement, context-collapse). SerializedMessage schema, subagent metadata, remote agent metadata, PID file schema, session memory template.

### lifecycle.md
Session creation flow (UUID generation, hook execution, lazy transcript creation). Write flow (serialization, dedup, batched flush). Read flow (candidate discovery, lite metadata). Session end (hooks, flush, cleanup). `/clear` command (30+ caches cleared). In-memory AppState (85 properties across core, file/attribution, task, agent/team, bridge/remote groups). Session state machine: idle → running → requires_action.

### storage-and-resume.md
Core persistence via `sessionStorage.ts` (80+ functions). Write operations (recordTranscript, batched 100ms flush, 0o600 permissions). Read operations (loadTranscriptFile, readSessionLite 64KB head+tail, buildConversationChain). Resume flow (/resume, --resume, --continue) with turn interruption detection, state/metadata/worktree/agent/cost restoration. File history (two-level tracking, SHA-256 hash paths, max 100 snapshots). Tool result storage (per-tool persistence, three-tier budget: mustReapply/frozen/fresh).

### compaction.md
Four compaction strategies: Auto-compaction (token threshold trigger, circuit breaker), API-based (9-step pipeline with PTL retry), Session-memory compaction (experimental, pre-extracted memory), Micro-compaction (time-based, cache-editing). Context Collapse system (marble-origami) — staged queueing vs destructive summarization, three thresholds (90% commit, 95% blocking spawn, autocompact suppression), commit/snapshot entry schemas, processing flow.

### session-memory.md
Background subagent extracts session notes to markdown. Trigger thresholds (10K tokens init, 5K between updates, 3 tool calls). 10-section template (~2000 tokens/section, ~12000 total). Custom config via `~/.claude/session-memory/config/`. Feature-gated: `tengu_session_memory`.

### multi-session.md
Subagent transcripts (isolated JSONL + metadata sidecar). Teammate/swarm sessions (in-process spawn, team context). Remote sessions (WebSocket, session ID format conversion cse_*/session_*, bridge lifecycle, ingress API with UUID-based optimistic concurrency). Worktree sessions (hook-based or git-based creation, post-setup config copy, cleanup). Concurrent session management (PID files, process liveness checks, session kinds: interactive/bg/daemon/daemon-worker).

### hooks-and-telemetry.md
11 hook events (SessionStart, SessionEnd, PreToolUse, PostToolUse, Stop, SubagentStop, UserPromptSubmit, PreCompact, Notification, Setup, CwdChanged, FileChanged). Session hooks storage (Map-based, command/prompt/function types). File access hooks (analytics tracking). Cleanup targets (10+ directories, 30-day retention). OpenTelemetry spans (interaction → llm_request/tool/hook hierarchy). Beta tracing (hash dedup, content truncation at 60KB).

### auxiliary-and-sdk.md
Statistics & cost tracking (4-layer persistence: STATE/project-config/stats-cache/JSONL). VCR recording/replay. Away summary (5min blur trigger). Auto-dream (4-phase memory consolidation, 24h/5-session gates). Memory extraction (end-of-query-loop, cursor tracking). Session title generation (Haiku model). Agentic session search (3-stage pipeline). Paste store (content-addressable). Command history (100 max, file locking). SDK events and direct connect integration.

## Key Source Files

| File | Role |
|------|------|
| `utils/sessionStorage.ts` | Core persistence (80+ exports) |
| `utils/sessionState.ts` | State machine + listeners |
| `utils/sessionStart.ts` | Startup hook execution |
| `utils/sessionRestore.ts` | Resume from transcript |
| `utils/sessionActivity.ts` | Keep-alive heartbeat |
| `utils/sessionEnvironment.ts` | Shell env scripts |
| `services/tools/toolOrchestration.ts` | Tool batching + concurrency |
| `bridge/sessionRunner.ts` | Child process spawning |
| `assistant/sessionHistory.ts` | Event history pagination |
