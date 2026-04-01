# Session Lifecycle & In-Memory State

## Session Creation

```
CLI Start
├─ Generate UUID session ID
├─ Bootstrap state initialization
├─ Register concurrent session PID file (~/.claude/sessions/{pid}.json)
├─ Execute SessionStart hooks (plugins, file watchers)
│   ├─ Load plugin hooks (memoized)
│   ├─ Collect hook messages, additional contexts, watch paths
│   └─ Update file watch paths
├─ Initialize session memory (if feature-gated)
├─ Initialize auto-dream (memory consolidation)
├─ Initialize memory extraction
├─ Transcript file LAZILY created (on first user/assistant message)
│   └─ Entries buffered in Project.pendingEntries until materialized
├─ Start activity tracking (refcount heartbeat for remote keep-alive)
└─ Ready for interaction
```

## Session Write Flow

```
User sends message
├─ Message serialized with: uuid, parentUuid, sessionId, cwd, timestamp, etc.
├─ Deduplication check (in-memory Set<UUID> cache)
├─ Entry enqueued to Project write queue
├─ Batched flush every 100ms via drainWriteQueue()
├─ appendEntryToFile(): JSON.stringify(entry) + '\n'
│   ├─ Sync append (appendFileSync)
│   ├─ File permissions: 0o600
│   └─ Auto mkdir with 0o700 if needed
└─ Metadata entries appended separately (title, tag, etc.)
```

## Session Read Flow (Listing)

```
List sessions (for /resume picker)
├─ Phase 1: Candidate Discovery
│   ├─ Scan ~/.claude/projects/{dir}/*.jsonl
│   ├─ Filter valid UUID filenames
│   └─ Optional: include git worktree directories
├─ Phase 2: Lite Metadata Read (64KB head+tail)
│   ├─ readHeadAndTail(): first + last 65536 bytes
│   ├─ Extract from head: createdAt, gitBranch, cwd, firstPrompt
│   ├─ Extract from tail: customTitle, lastPrompt, tag, summary
│   └─ File stat: mtime, size
├─ Phase 3: Sort by lastModified descending
└─ Return SessionInfo[]
```

## Session End

```
Session exit (Ctrl+C, /exit, process termination)
├─ Execute SessionEnd hooks
├─ Flush pending write queue
├─ Drain pending memory extraction
├─ Save current session costs to project config
├─ Worktree cleanup (if applicable)
├─ Unregister PID file (~/.claude/sessions/{pid}.json)
└─ Graceful shutdown
```

## Session Clear (/clear)

```
/clear command
├─ Execute SessionEnd hooks
├─ Log cache eviction hint
├─ Identify preserved background tasks
├─ Clear all messages
├─ Reset proactive/kairos mode
├─ Regenerate conversation ID (UUID)
├─ Clear session caches (30+ caches cleared)
│   └─ Preserve per-agent state for background tasks
├─ Restore CWD to original
├─ Kill foreground tasks; preserve background tasks
├─ Reset: attribution, file history, standalone agent context
├─ Regenerate session ID (old becomes parent for analytics)
├─ Reset session file pointer
├─ Re-point background task output symlinks to new session
├─ Re-persist mode and worktree state
├─ Execute SessionStart hooks
└─ Ready for new interaction
```

## In-Memory Session State (AppState)

AppState contains **85 distinct properties** managed via a reactive store.

### Core Session State

| Property | Type | Purpose |
|----------|------|---------|
| `settings` | SettingsJson | Application config |
| `mainLoopModel` | ModelSetting | Current model |
| `agent` | string? | Agent name |
| `remoteSessionUrl` | string? | Remote session URL |
| `remoteConnectionStatus` | enum | WS connection state |
| `foregroundedTaskId` | string? | Active background task |

### File & Attribution State

| Property | Type | Purpose |
|----------|------|---------|
| `fileHistory` | FileHistoryState | File checkpointing (snapshots, tracked files, sequence counter) |
| `attribution` | AttributionState | Commit attribution tracking |

### Task State

| Property | Type | Purpose |
|----------|------|---------|
| `tasks` | Record<string, TaskState> | All running tasks (background, dream, remote, etc.) |
| `todos` | Record<string, TodoList> | Todo lists per agent |

### Agent/Team State

| Property | Type | Purpose |
|----------|------|---------|
| `agentDefinitions` | AgentDefinitionsResult | Available agent configs |
| `standaloneAgentContext` | { name, color? } | Agent display identity |
| `teamContext` | TeamContext? | Swarm/team membership |
| `agentNameRegistry` | Map<string, AgentId> | Name→ID routing |

### Bridge/Remote State

| Property | Type | Purpose |
|----------|------|---------|
| `replBridgeEnabled` | boolean | Bridge desired state |
| `replBridgeConnected` | boolean | Bridge ready |
| `replBridgeSessionActive` | boolean | User on claude.ai |
| `replBridgeSessionId` | string? | Bridge session ID |
| `replBridgeConnectUrl` | string? | Bridge connect URL |

### Runtime Session State (sessionState.ts)

| State | Values | Purpose |
|-------|--------|---------|
| SessionState | `'idle' \| 'running' \| 'requires_action'` | Current session phase |
| SessionExternalMetadata | permission_mode, model, pending_action, task_summary | Synced to external systems |
| RequiresActionDetails | tool_name, action_description, tool_use_id, request_id, input | Blocking action context |

### Session Environment Variables (sessionEnvVars.ts)

- In-memory `Map<string, string>` for child process env vars
- Set via `/env` command, scoped to session lifetime

### Session Activity Tracking (sessionActivity.ts)

- Refcount-based heartbeat (30s interval)
- Tracks `api_call` and `tool_exec` reasons
- Gated by `CLAUDE_CODE_REMOTE_SEND_KEEPALIVES`
- Purely in-memory, not persisted

## Key Source Files

- `main.tsx` — Primary CLI entry point
- `utils/sessionStart.ts` — Session start hooks execution
- `utils/sessionState.ts` — State machine + listener callbacks
- `utils/sessionEnvironment.ts` — Shell env scripts
- `utils/sessionActivity.ts` — Keep-alive heartbeat
