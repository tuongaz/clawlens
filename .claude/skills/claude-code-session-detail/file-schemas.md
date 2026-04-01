# Session File Types & Schemas

## Main Transcript (`{sessionId}.jsonl`)

Each line is a JSON object with a `type` field.

### Message Entries (conversation chain)

| Type | Key Properties | Purpose |
|------|---------------|---------|
| `user` | `uuid`, `parentUuid`, `sessionId`, `message`, `cwd`, `timestamp`, `gitBranch`, `version` | User messages |
| `assistant` | `uuid`, `parentUuid`, `sessionId`, `message`, `cwd`, `timestamp` | Assistant responses |
| `attachment` | `uuid`, `parentUuid`, `type`, `content` | File/URL attachments |
| `system` | `uuid`, `subtype`, `compactMetadata` | System events, compact boundaries |
| `queue-operation` | `uuid`, `parentUuid` | Queue operations |

### Metadata Entries (session-level, re-appended to tail after compaction)

| Type | Key Properties | Purpose |
|------|---------------|---------|
| `custom-title` | `customTitle`, `sessionId` | User-set session name |
| `ai-title` | `aiTitle`, `sessionId` | AI-generated title (via Haiku) |
| `tag` | `tag`, `sessionId` | Searchable label |
| `agent-name` | `agentName`, `sessionId` | Agent display name |
| `agent-color` | `agentColor`, `sessionId` | Agent visual color |
| `agent-setting` | `agentSetting`, `sessionId` | Agent definition config |
| `mode` | `mode` (`coordinator`/`normal`), `sessionId` | Session mode |
| `last-prompt` | `lastPrompt`, `sessionId` | Most recent user prompt |
| `task-summary` | `summary`, `sessionId`, `timestamp` | Periodic task snapshot |
| `pr-link` | `prNumber`, `prUrl`, `prRepository`, `sessionId` | GitHub PR link |
| `worktree-state` | `worktreeSession`, `sessionId` | Git worktree state |

### Snapshot/History Entries

| Type | Key Properties | Purpose |
|------|---------------|---------|
| `file-history-snapshot` | `messageId`, `snapshot`, `isSnapshotUpdate` | File modification tracking |
| `attribution-snapshot` | (serialized) | Attribution metadata |
| `content-replacement` | `sessionId`, `agentId`, `replacements` | Tool result replacements |
| `summary` | `leafUuid`, `summary` | Collapsed context summary |
| `context-collapse-commit` | `commitId` | Context compression history |
| `context-collapse-snapshot` | | Context compression state |
| `speculation-accept` | | Speculation tracking |

### Context Collapse Entries (marble-origami)

| Type | Key Properties | Purpose |
|------|---------------|---------|
| `marble-origami-commit` | `collapseId`, `summaryUuid`, `summaryContent`, `firstArchivedUuid`, `lastArchivedUuid` | Collapse commit |
| `marble-origami-snapshot` | `staged[]`, `armed`, `lastSpawnTokens` | Collapse state snapshot |

## SerializedMessage Schema

```typescript
{
  type: 'user' | 'assistant' | 'attachment' | 'system' | 'progress',
  uuid: UUID,
  parentUuid: UUID | null,       // Linked-list for conversation threading
  sessionId: string,
  message: { role: string, content: string | ContentBlock[] },
  cwd: string,                   // Working directory at message time
  userType: string,
  entrypoint?: string,           // cli, sdk-ts, sdk-py, etc.
  timestamp: string,             // ISO 8601
  version: string,               // Claude Code version
  gitBranch?: string,
  slug?: string,                 // Session slug for plan files
  isMeta?: boolean,
  isSidechain?: boolean,
  isCompactSummary?: boolean,
  teamName?: string,
  agentName?: string,
  agentColor?: string,
  promptId?: string,             // OTel correlation ID
  logicalParentUuid?: UUID | null,
  agentId?: string,
}
```

## Subagent Metadata (`agent-{agentId}.meta.json`)

```json
{
  "agentType": "string",
  "worktreePath": "string (optional)",
  "description": "string (optional)"
}
```

## Remote Agent Metadata (`remote-agent-{taskId}.meta.json`)

```json
{
  "taskId": "string",
  "remoteTaskType": "string",
  "sessionId": "string",
  "title": "string",
  "command": "string",
  "spawnedAt": 0,
  "toolUseId": "string (optional)",
  "isLongRunning": false,
  "isUltraplan": false,
  "isRemoteReview": false,
  "remoteTaskMetadata": {}
}
```

## Concurrent Session PID File (`{pid}.json`)

```json
{
  "pid": 12345,
  "sessionId": "uuid",
  "cwd": "/path/to/project",
  "startedAt": 1700000000000,
  "kind": "interactive | bg | daemon | daemon-worker",
  "entrypoint": "cli",
  "messagingSocketPath": "/path/to/socket (optional)",
  "name": "session name (optional)",
  "bridgeSessionId": "cse_xxx (optional)",
  "status": "busy | idle | waiting",
  "waitingFor": "description (optional)"
}
```

## Session Memory (markdown file)

Template sections:
1. Session Title (5-10 words)
2. Current State (active work, pending tasks)
3. Task Specification (design decisions)
4. Files and Functions (important files)
5. Workflow (bash commands, execution order)
6. Errors & Corrections
7. Codebase and System Documentation
8. Learnings
9. Key Results
10. Worklog (step-by-step summary)

Constraints: ~2000 tokens per section, ~12000 tokens total budget.

## Key Source Files

- `types/message.ts` — Message type definitions
- `utils/sessionStorage.ts` — Entry serialization/deserialization
