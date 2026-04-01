# Session Hooks, Cleanup & Telemetry

## Session Hooks & Lifecycle Events

### Hook Events (from hookEvents.ts)

| Event | When |
|-------|------|
| `SessionStart` | Session begins or resumes |
| `SessionEnd` | Session ends |
| `PreToolUse` | Before tool execution |
| `PostToolUse` | After tool execution |
| `Stop` | Model stops generating |
| `SubagentStop` | Subagent completes |
| `UserPromptSubmit` | User submits prompt |
| `PreCompact` | Before compaction |
| `Notification` | Notification sent |
| `Setup` | Initial setup |
| `CwdChanged` | Working directory changed |
| `FileChanged` | Watched file changed |

### Session Hooks (sessionHooks.ts)

- Map-based storage: `Map<string, SessionStore>`
- Three hook types: command hooks, prompt hooks, function hooks
- Function hooks: TypeScript callbacks with auto-generated IDs
- Cleared when session ends via `clearSessionHooks()`

### File Access Hooks (sessionFileAccessHooks.ts)

- PostToolUse hooks monitoring Read/Grep/Glob/Edit/Write
- Track access to: session memory, session transcript, auto-memory, team memory
- Analytics events: `tengu_session_memory_accessed`, `tengu_transcript_accessed`, etc.

---

## Session Cleanup & Housekeeping

### Automatic Cleanup (backgroundHousekeeping.ts)

- **10 minutes post-startup**: Old message files, old versions
- **24-hour interval (ant users)**: NPM cache, old versions

### Cleanup Targets

| Target | Location | Default Retention |
|--------|----------|-------------------|
| Error logs | `~/.claude/cache/errors/` | 30 days |
| MCP logs | `~/.claude/cache/logs/mcp-logs-*/` | 30 days |
| Session files | `~/.claude/projects/*/` | 30 days |
| Tool results | `{sessionId}/tool-results/` | 30 days |
| Plan files | `~/.claude/plans/` | 30 days |
| File history | `~/.claude/file-history/*/` | 30 days |
| Session env | `~/.claude/session-env/*/` | 30 days |
| Debug logs | `~/.claude/debug/` | 30 days |
| Paste cache | `~/.claude/paste-cache/` | 30 days |
| Agent worktrees | `~/.claude/worktrees/` | 30 days |

### Throttling

- NPM cache cleanup: once per 24 hours (marker file)
- Version cleanup: once per 24 hours (lockfile)
- Non-blocking: skips if lock held

---

## Session Telemetry & Tracing

### OpenTelemetry Spans (sessionTracing.ts)

```
interaction (root)
├─ llm_request
│   └─ [retry sub-spans]
├─ tool
│   ├─ tool.execution
│   └─ tool.blocked_on_user
└─ hook (beta-only)
```

### Captured Per Session

- User prompt (optionally redacted)
- Model, query source, speed mode
- Token counts: input, output, cache read/write
- Tool names, durations, results
- TTFT (time to first token)
- Permission decisions
- Hook execution outcomes

### Beta Tracing (betaSessionTracing.ts)

- Hash-based deduplication of system prompts/tools (SHA-256, first 12 hex chars)
- Incremental message tracking per agent
- Content truncation at 60KB (Honeycomb safety)
- Visibility rules: thinking output ant-only

## Key Source Files

- `utils/hooks/sessionHooks.ts` — Session hook registration
- `utils/hooks/hookEvents.ts` — Hook event types
- `utils/sessionFileAccessHooks.ts` — File access analytics
- `utils/cleanup.ts` — Cleanup operations
- `utils/backgroundHousekeeping.ts` — Scheduled cleanup
- `utils/sessionTracing.ts` — OTel spans
- `utils/betaSessionTracing.ts` — Beta tracing
