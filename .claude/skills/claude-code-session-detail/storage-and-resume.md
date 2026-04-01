# Session Storage, Resume, File History & Tool Results

## Storage & Persistence Layer

### Core Files

- `utils/sessionStorage.ts` — 80+ exported functions, core transcript persistence
- `utils/sessionStoragePortable.ts` — Pure Node.js utilities shared with VS Code extension
- `utils/listSessionsImpl.ts` — Standalone session listing for SDK

### Key Write Operations

| Operation | Function | Mechanism |
|-----------|----------|-----------|
| Message append | `recordTranscript()` | Batched queue, 100ms flush |
| Sidechain append | `recordSidechainTranscript()` | Direct append for subagents |
| File history | `recordFileHistorySnapshot()` | Async snapshot recording |
| Attribution | `recordAttributionSnapshot()` | EOF-appended snapshot |
| Content replacement | `recordContentReplacement()` | Serializable replacement records |
| Custom title | `saveCustomTitle()` | Metadata entry append |
| AI title | `saveAiGeneratedTitle()` | Generated via Haiku model |
| Tag | `saveTag()` | Metadata entry append |
| Agent metadata | `saveAgentName/Color/Setting()` | Metadata entries |
| Mode | `saveMode()` | coordinator/normal mode |
| PR link | `linkSessionToPR()` | GitHub PR association |
| Worktree state | `saveWorktreeState()` | Worktree session persistence |

### Key Read Operations

| Operation | Function | Strategy |
|-----------|----------|----------|
| Full transcript | `loadTranscriptFile()` | Chunked forward read, returns Maps |
| Lite metadata | `readSessionLite()` | Head+tail 64KB read |
| Session listing | `listSessionsImpl()` | Two-phase: discovery + lite reads |
| Conversation chain | `buildConversationChain()` | Walk parentUuid links from leaf |
| Session search | `searchSessionsByCustomTitle()` | Title substring match |
| Subagent transcripts | `loadSubagentTranscripts()` | Scan subagents/ directory |

### Performance Characteristics

| Metric | Value | Purpose |
|--------|-------|---------|
| LITE_READ_BUF_SIZE | 65536 bytes | Fast metadata reads |
| MAX_TRANSCRIPT_READ_BYTES | 50 MB | OOM guard |
| SKIP_PRECOMPACT_THRESHOLD | 5 MB | Large file optimization |
| Write batch interval | 100 ms | Reduce I/O syscalls |
| File permissions | 0o600 | Owner read/write only |
| Directory permissions | 0o700 | Owner full access only |

---

## Conversation Recovery & Resume

### Entry Points

1. **`/resume` command** — Interactive picker or direct UUID/title
2. **`--resume` CLI flag** — Direct session ID
3. **`--continue` CLI flag** — Continue most recent session

### Resume Flow

```
Resume requested
├─ Source Resolution
│   ├─ No args → Interactive picker (LogSelector component)
│   ├─ UUID arg → Direct session lookup
│   └─ Title arg → searchSessionsByCustomTitle()
├─ Cross-Project Detection
│   ├─ Same project → resume directly
│   ├─ Same-repo worktree → resume directly (ant users)
│   └─ Different project → generate cd && claude --resume command
├─ Full Transcript Load (loadTranscriptFile)
│   ├─ Parse JSONL line-by-line into Maps by UUID
│   ├─ Handle compact boundaries (clear pre-boundary data)
│   └─ Returns: messages, summaries, titles, tags, agent metadata,
│              PR links, file history, attribution, context collapse
├─ Conversation Chain Reconstruction (buildConversationChain)
│   ├─ Find most recent leaf message
│   ├─ Walk parentUuid links back to root
│   └─ Handle fork branches and compact boundaries
├─ Deserialization (deserializeMessagesWithInterruptDetection)
│   ├─ Migrate legacy attachment types
│   ├─ Validate permission modes
│   ├─ Filter orphaned/invalid messages
│   ├─ Detect turn interruptions
│   │   ├─ kind: 'none' — clean state
│   │   ├─ kind: 'interrupted_prompt' — user message without response
│   │   └─ kind: 'interrupted_turn' — mid-assistant response
│   └─ Append synthetic continuation if interrupted
├─ State Restoration (restoreSessionStateFromLog)
│   ├─ Restore file history from snapshots
│   ├─ Restore attribution state
│   ├─ Restore context-collapse commit log
│   └─ Extract todos from transcript (SDK mode)
├─ Metadata Restoration (restoreSessionMetadata)
│   └─ Title, tag, agent info, mode, worktree, PR link
├─ Worktree Restoration (restoreWorktreeForResume)
│   └─ chdir to worktree path if still exists
├─ Agent Restoration (restoreAgentFromSession)
│   └─ Restore agent definition and model overrides
├─ Cost Restoration (restoreCostStateForSession)
│   └─ Restore token counts and costs from project config
├─ Session Start Hooks (source: 'resume')
└─ Ready for interaction
```

### Turn Interruption Detection

- **Interrupted prompt**: Last message is plain user text → preserve original message
- **Interrupted turn**: Last message is tool result → append "Continue from where you left off"
- **Terminal tool results**: SendUserMessage, Brief → legitimately end turns (no false positives)

---

## File History & Attribution

### File History (fileHistory.ts)

Two-level tracking:
1. **Immediate tracking** (`fileHistoryTrackEdit`): Called BEFORE modification, creates v1 backup
2. **Snapshot creation** (`fileHistoryMakeSnapshot`): Called after turn, creates versioned backups

Storage: `~/.claude/file-history/{sessionId}/{hash}@v{version}`
- Hash: first 16 chars of SHA-256 of file path
- Max snapshots: 100 (evicts oldest)
- Backup comparison: mtime → content (optimization)

### Attribution (attribution.ts)

- Tracks AI contribution percentage for commits/PRs
- Format: "Generated with Claude Code (93% 3-shotted by model)"
- Snapshot entries stored at EOF of transcript
- Feature-gated: COMMIT_ATTRIBUTION

---

## Tool Result Storage

### Per-Tool Persistence (toolResultStorage.ts)

Large tool results persisted to disk instead of truncating:
- Storage: `{sessionId}/tool-results/{toolUseId}.txt` or `.json`
- Write mode: `'wx'` (write-exclusive, idempotent)
- Preview: first 2000 bytes at newline boundary
- Wrapped in `<persisted-output>` XML tags

### Per-Message Budget

Three-tier decision state:
1. **mustReapply** — Previously replaced, cached string re-applied (zero I/O)
2. **frozen** — Previously seen, left unchanged (locked for cache stability)
3. **fresh** — Never seen, eligible for new replacement decisions

Feature flags: `tengu_satin_quoll` (per-tool), `tengu_hawthorn_window` (per-message budget)
