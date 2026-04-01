# Session Memory System

## Architecture

Session memory is an automated markdown file maintained by a background subagent. It runs periodically based on token/tool-call thresholds.

## Extraction Triggers

- Token threshold: `minimumMessageTokensToInit` (default 10K) AND `minimumTokensBetweenUpdate` (default 5K)
- Tool call threshold: `toolCallsBetweenUpdates` (default 3)
- Both thresholds must be met (token is always required)

## Extraction Process

1. Threshold check via post-sampling hook
2. Fork subagent with session memory prompt
3. Agent reads current memory file, updates sections
4. File permissions: 0o600 (read/write owner only)
5. Directory permissions: 0o700

## Template Sections

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

## Custom Configuration

- Template: `~/.claude/session-memory/config/template.md`
- Prompt: `~/.claude/session-memory/config/prompt.md`

## Section Size Management

- Per-section limit: 2000 tokens
- Total budget: 12000 tokens
- Oversized sections truncated at line boundaries for compaction

## Feature Gating

- Feature flag: `tengu_session_memory`
- Remote config for thresholds

## Key Source Files

- `services/SessionMemory/sessionMemory.ts` — Background memory extraction
- `services/SessionMemory/sessionMemoryCompact.ts` — Memory-based compaction
