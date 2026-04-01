# Statistics, Auxiliary Services & SDK Integration

## Session Statistics & Cost Tracking

### Layered Persistence

| Layer | Storage | Scope | Lifetime |
|-------|---------|-------|----------|
| STATE (in-memory) | Process memory | Per-session | Session duration |
| Project config | `~/.claude/projects/{dir}/.config` | Per-session | Resume capability |
| Stats cache | `~/.claude/stats-cache.json` | Multi-session | Indefinite |
| Session files | JSONL transcripts | Per-session | Until cleanup |

### Per-Session Metrics (STATE)

- Token counts: input, output, cache-read, cache-creation (per model)
- Cost: USD per model + total
- Duration: API, tool, wall-clock
- Code changes: lines added/removed
- Web search request count

### Historical Stats Cache

```json
{
  "version": 3,
  "lastComputedDate": "YYYY-MM-DD",
  "dailyActivity": [{ "date", "messageCount", "sessionCount", "toolCallCount" }],
  "dailyModelTokens": [{ "date", "tokensByModel": {} }],
  "modelUsage": {},
  "totalSessions": 0,
  "totalMessages": 0,
  "longestSession": null,
  "hourCounts": {},
  "totalSpeculationTimeSavedMs": 0
}
```

### Cost Tracking Flow

1. API response → `addToTotalSessionCost()` → update STATE + OTel meters
2. Session exit → `saveCurrentSessionCosts()` → project config
3. Resume → `restoreCostStateForSession()` → rehydrate STATE

---

## Auxiliary Session Services

### VCR (vcr.ts)

- Records/replays API interactions for testing
- Fixture files: `fixtures/{sha1-hash}.json`
- Dehydration: normalizes variable data (timestamps, paths, costs)
- Activation: `NODE_ENV=test` or `FORCE_VCR`

### Away Summary (awaySummary.ts)

- Generates "while you were away" summary after 5 minutes of terminal blur
- Uses small/fast model, non-streaming, disabled thinking
- Appended as `SystemAwaySummaryMessage` (subtype: `away_summary`)

### Auto-Dream (autoDream.ts)

- Background memory consolidation via forked `/dream` subagent
- Gates: time (24h), sessions (5 touched), lock acquisition
- 4-phase prompt: Orient → Gather → Consolidate → Prune
- Lock file: `.consolidate-lock` in memory directory (PID-based, 1h stale guard)

### Memory Extraction (extractMemories.ts)

- Runs at end of each query loop (no tool calls in final response)
- Forked agent with restricted tools (read-only except auto-memory)
- Cursor tracking via `lastMemoryMessageUuid`
- Coalescing: stashes context during in-progress extraction
- Feature-gated: `tengu_passport_quail`

### Session Title Generation (sessionTitle.ts)

- Uses Haiku model for 3-7 word sentence-case titles
- Max 1000 chars of conversation text
- Validates via Zod schema: `{ title: string }`

### Agentic Session Search (agenticSessionSearch.ts)

- 3-stage pipeline: keyword pre-filter → transcript loading → AI ranking
- Max 100 sessions searched
- Priority: tag > title > branch > summary > transcript > semantic
- Uses `sideQuery()` with structured JSON response

### Paste Store (pasteStore.ts)

- Content-addressable storage: SHA-256 hash, first 16 hex chars
- Path: `~/.claude/paste-cache/{hash}.txt`
- Permissions: 0o600
- Time-based garbage collection

### Command History (history.ts)

- Global JSONL file: `~/.claude/history.jsonl`
- Max 100 entries (per-project deduped)
- Pasted content: inline (<1KB) or hash reference
- File locking for concurrent session support

---

## SDK & External Integration

### SDK Session Events

The SDK exposes session management through typed events:
- `SDKMessage` types: user, assistant, system, stream_event, result, tool_progress, auth_status, control_request/response
- Session lifecycle: init → messages → result (success/error)
- Permission flow: control_request → control_response

### Direct Connect (server/)

- IDE/extension connects directly to CLI process
- Session creation via HTTP POST
- Real-time message streaming

### Session URL Parsing (sessionUrl.ts)

Three input formats:
1. JSONL file path (`.jsonl` suffix) → random sessionId + file path
2. Plain UUID → direct session ID
3. URL → random sessionId + ingress URL

## Key Source Files

- `utils/stats.ts` — Statistics computation
- `utils/vcr.ts` — VCR recording/replay
- `utils/awaySummary.ts` — Away summary generation
- `utils/autoDream.ts` — Memory consolidation
- `utils/extractMemories.ts` — Memory extraction
- `utils/sessionTitle.ts` — Title generation
- `utils/agenticSessionSearch.ts` — Session search
- `utils/pasteStore.ts` — Paste store
- `utils/history.ts` — Command history
- `utils/sessionUrl.ts` — URL parsing
