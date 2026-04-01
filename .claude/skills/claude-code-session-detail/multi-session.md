# Multi-Session: Subagents, Teams, Remote, Worktrees & Concurrency

## Subagent & Teammate Sessions

### Subagent Transcripts

- Path: `{sessionId}/subagents/[{subdir}/]agent-{agentId}.jsonl`
- Same JSONL format as main transcript
- Metadata sidecar: `agent-{agentId}.meta.json`
- Isolated from parent session (separate transcript file)

### Teammate/Swarm Sessions

- Each teammate gets its own session via `spawnInProcess()`
- Team context tracked in AppState.teamContext
- Teammates cannot rename themselves (leader controls naming)
- Concurrent registration skipped for subagents/teammates

---

## Remote & Bridge Sessions

### Session ID Formats

- **CCR v2**: `cse_*` prefix (worker/infrastructure endpoints)
- **Compat v1**: `session_*` prefix (client-facing endpoints)
- Translation: `sessionIdCompat.ts` handles conversion

### Remote Session Manager

- WebSocket to `/v1/sessions/ws/{id}/subscribe`
- Reconnection: exponential backoff, max 5 attempts from connected state
- Keep-alive: ping every 30 seconds
- Permanent close codes: 4003 (session ended)
- Session not found retries: max 3 (for server compaction)

### Bridge Session Lifecycle

1. `createCodeSession()` → POST `/v1/code/sessions` → `cse_*` ID
2. `createSessionSpawner().spawn()` → child CLI process with access token
3. `updateBridgeSessionTitle()` → PATCH with compat ID
4. `archiveBridgeSession()` → POST `/archive`

### Session Ingress (API upload)

- Optimistic concurrency control via UUID chain
- Per-session sequential writes (prevent race conditions)
- Retry: max 10, exponential backoff (500ms base)
- Auth: JWT Bearer token or session key cookie

---

## Worktree Sessions

### PersistedWorktreeSession Type

```typescript
{
  originalCwd: string,
  worktreePath: string,
  worktreeName: string,          // User-provided slug
  worktreeBranch?: string,       // Git-based only
  originalBranch?: string,
  originalHeadCommit?: string,
  sessionId: string,
  tmuxSessionName?: string,
  hookBased?: boolean,
}
```

### Worktree Lifecycle

1. **Create**: Hook-based (priority) or `git worktree add`
2. **Post-setup**: Copy settings, configure hooks, symlink dirs, copy gitignored files
3. **Keep**: Preserve directory, clear session state
4. **Cleanup**: Remove worktree + delete temporary branch

### Agent Worktrees

- Lightweight, no global state impact
- Stale cleanup: periodic, only ephemeral patterns, fail-closed (skip if dirty)

---

## Concurrent Session Management

### Registration

- PID file: `~/.claude/sessions/{pid}.json`
- Created with 0o700 permissions
- Contains: pid, sessionId, cwd, startedAt, kind, entrypoint
- Cleanup handler registered for process exit

### Detection

- Enumerate `~/.claude/sessions/*.json`
- Validate filename regex: `/^\d+\.json$/`
- Check process liveness via `isProcessRunning(pid)`
- Delete stale PID files (skip on WSL)

### Session Kinds

| Kind | Description |
|------|-------------|
| `interactive` | Normal terminal session |
| `bg` | Background session (tmux) |
| `daemon` | Daemon process |
| `daemon-worker` | Daemon worker |

### Activity Updates

- `updateSessionActivity({ status, waitingFor })` — fire-and-forget
- `updateSessionName(name)` — for `claude ps` display
- `updateSessionBridgeId(id)` — for deduplication

## Key Source Files

- `bridge/types.ts` — Bridge config, handle, API client
- `bridge/sessionRunner.ts` — Child process spawning
- `bridge/sessionIdCompat.ts` — ID re-tagging
- `services/api/sessionIngress.ts` — API calls + UUID idempotency
