# Compaction & Context Collapse

## Compaction Overview

When context grows too large, compaction summarizes older messages to free context window space. Four strategies available.

## Auto-Compaction (autoCompact.ts)

- **Trigger**: Token usage >= `effectiveContextWindow - 13K buffer`
- **Guard**: Not in forked agent, context collapse mode, or reactive-only mode
- **Circuit breaker**: Max 3 consecutive failures
- **Strategy**: Tries session memory compaction first, falls back to API-based

## API-Based Compaction (compact.ts)

Full pipeline:
1. Execute pre-compact hooks
2. Strip images/reinjected attachments from messages
3. Stream summary via API (forked agent for cache sharing, or regular)
4. PTL retry: if prompt-too-long, drop oldest API-round groups (up to 3 attempts)
5. Create post-compact attachments:
   - File attachments (up to 5 files, 50K token budget)
   - Skill attachments (sorted recent-first, 5K/skill, 25K total)
   - Plan attachment
   - Async agent attachments
   - Deferred tools delta
6. Execute session-start hooks
7. Create boundary marker
8. Re-append session metadata to EOF
9. Execute post-compact hooks

## Session Memory Compaction (sessionMemoryCompact.ts)

- **Experimental**: Uses pre-extracted session memory instead of API call
- **Config**: minTokens=10K, minTextBlockMessages=5, maxTokens=40K
- **Invariant preservation**: Adjusts indices to not split tool_use/tool_result pairs or thinking blocks
- **Feature-gated**: `tengu_session_memory` + `tengu_sm_compact`

## Micro-Compaction (microCompact.ts)

Incremental compaction without full summarization:
- **Time-based**: Clears old tool results after gap >= threshold minutes
- **Cached MC**: Cache-editing via `cache_edits` at API layer (no local mutation)
- **Compactable tools**: Read, Bash, Grep, Glob, WebSearch, WebFetch, Edit, Write

## CompactionResult Structure

```typescript
{
  boundaryMarker: SystemMessage,        // Marks compaction point
  summaryMessages: UserMessage[],       // Formatted summary
  attachments: AttachmentMessage[],     // Files, skills, plans, agents
  hookResults: HookResultMessage[],     // Post-compact hook results
  messagesToKeep?: Message[],           // Preserved recent messages
  preCompactTokenCount?: number,
  postCompactTokenCount?: number,
  compactionUsage?: TokenUsage,
}
```

## Post-Compact Cleanup

Clears 20+ caches including: user/system context, file suggestions, commands/skills, microcompact state, classifier approvals, speculative checks, beta tracing state, session messages cache, etc.

---

## Context Collapse System (Marble-Origami)

### Overview

Context collapse is an advanced context management system that preserves granular conversation history while managing token budgets more efficiently than traditional compaction.

### Key Difference from Regular Compaction

| Aspect | Regular Compaction | Context Collapse |
|--------|-------------------|------------------|
| Mechanism | Destructive summarization | Staged queueing + projection |
| Message preservation | Removes permanently | Archives with UUID chain intact |
| Recovery | Lost forever | Can drain/recover via staged queue |
| Granularity | Single summary | Progressive span accumulation |
| Autocompact | Runs alongside | Completely suppresses autocompact |
| View type | Direct replacement | Projection layer (`projectView()`) |

### Three Thresholds

1. **Commit start (~90%)**: Messages staged for collapse
2. **Blocking spawn (~95%)**: Triggers marble_origami ctx-agent subagent
3. **Autocompact suppression**: Collapse owns headroom management entirely

### Commit Entry (`marble-origami-commit`)

```typescript
{
  type: 'marble-origami-commit',
  sessionId: UUID,
  collapseId: string,           // 16-digit ID, max reseeds counter
  summaryUuid: string,          // Summary placeholder UUID
  summaryContent: string,       // <collapsed id="...">text</collapsed>
  summary: string,              // Plain text for inspection
  firstArchivedUuid: string,    // Span start boundary
  lastArchivedUuid: string,     // Span end boundary
}
```

### Snapshot Entry (`marble-origami-snapshot`)

```typescript
{
  type: 'marble-origami-snapshot',
  sessionId: UUID,
  staged: Array<{
    startUuid: string,
    endUuid: string,
    summary: string,
    risk: number,
    stagedAt: number,
  }>,
  armed: boolean,               // Spawn trigger state
  lastSpawnTokens: number,      // Token clock for restoration
}
```

### Processing Flow

1. **Snip phase** → 2. **Microcompact phase** → 3. **Context collapse** (BEFORE autocompact) → 4. **Autocompact** (suppressed when collapse enabled)

### Persistence

- **Commits**: Append-only in session JSONL, replay-all semantics
- **Snapshots**: Last-wins strategy, written after each ctx-agent spawn
- **Restoration**: `restoreFromEntries()` replays commits + applies latest snapshot
