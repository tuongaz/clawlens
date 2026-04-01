# On-Disk Directory Structure

## Base Path

```
~/.claude/                              # CLAUDE_CONFIG_DIR override supported
├── projects/                           # All session transcripts
│   └── {sanitized-project-path}/       # Per-project directory
│       ├── {sessionId}.jsonl           # Main conversation transcript
│       └── {sessionId}/               # Session subdirectory
│           ├── subagents/
│           │   ├── agent-{agentId}.jsonl       # Subagent transcript
│           │   ├── agent-{agentId}.meta.json   # Subagent metadata
│           │   └── {subdir}/                   # Grouped agents
│           │       └── agent-{agentId}.jsonl
│           ├── remote-agents/
│           │   └── remote-agent-{taskId}.meta.json
│           ├── tool-results/
│           │   ├── {toolUseId}.txt     # Persisted string tool results
│           │   └── {toolUseId}.json    # Persisted array tool results
│           └── outputs/                # BYOC file persistence
│               └── {uploaded-files}
├── sessions/                           # Concurrent session PID files
│   └── {pid}.json                      # Live session registration
├── session-env/                        # Session environment scripts
│   └── {sessionId}/
│       ├── setup-hook-0.sh
│       ├── sessionstart-hook-0.sh
│       ├── cwdchanged-hook-0.sh
│       └── filechanged-hook-0.sh
├── session-memory/                     # Session memory config
│   └── config/
│       ├── template.md                 # Custom memory template
│       └── prompt.md                   # Custom extraction prompt
├── file-history/                       # File checkpointing backups
│   └── {sessionId}/
│       └── {hash}@v{version}           # Backup file
├── plans/                              # Plan files
│   └── {slug}.md
├── paste-cache/                        # Pasted content store
│   └── {hash}.txt
├── history.jsonl                       # Global command history
├── stats-cache.json                    # Historical stats cache
├── debug/                              # Debug logs
│   └── {timestamp}.txt
└── worktrees/                          # Agent worktrees
    └── {slug}/                         # Git worktree directory
```

## Path Sanitization

- `sanitizePath()` replaces non-alphanumeric chars with hyphens
- Paths >200 chars get truncated + hash suffix for uniqueness
- Symlinks resolved via `realpath()` with NFC unicode normalization
- Session IDs validated: `/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i`

## File Permissions

| Target | Permission | Notes |
|--------|-----------|-------|
| Transcript files | `0o600` | Owner read/write only |
| Directories | `0o700` | Owner full access only |
| Session memory | `0o600` | Owner read/write only |

## Key Source Files

- `utils/sessionStorage.ts` — Path construction, file operations
- `utils/sessionStoragePortable.ts` — Pure Node.js utilities (shared with VS Code extension)
