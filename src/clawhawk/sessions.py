"""JSONL session parser and helper functions."""

from __future__ import annotations

import json
import logging
import re

from clawhawk.models import Message, Session

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Model context limits
# ---------------------------------------------------------------------------

_MODEL_CONTEXT_LIMITS: dict[str, int] = {
    "claude-opus-4-6": 1_000_000,
    "claude-sonnet-4-6": 200_000,
    "claude-haiku-4-5-20251001": 200_000,
}

_DEFAULT_CONTEXT_LIMIT = 200_000


def get_model_context_limit(model: str) -> int:
    """Return the context window size for a given model name."""
    return _MODEL_CONTEXT_LIMITS.get(model, _DEFAULT_CONTEXT_LIMIT)


# ---------------------------------------------------------------------------
# Text helpers
# ---------------------------------------------------------------------------

_RE_COMMAND_NAME = re.compile(r"<command-name>\s*(.*?)\s*</command-name>")


def clean_command_text(s: str) -> str:
    """Extract slash command from XML-tagged user messages, or return as-is."""
    m = _RE_COMMAND_NAME.search(s)
    if m is None:
        return s
    cmd = m.group(1).strip()
    return cmd if cmd else s


def truncate(s: str, max_len: int) -> str:
    """Truncate string, collapsing newlines to spaces."""
    s = s.replace("\n", " ").strip()
    if len(s) <= max_len:
        return s
    if max_len <= 3:
        return s[:max_len]
    return s[: max_len - 3] + "..."


def _truncate_keep_newlines(s: str, max_len: int) -> str:
    """Truncate string, preserving newlines."""
    s = s.strip()
    if len(s) <= max_len:
        return s
    if max_len <= 3:
        return s[:max_len]
    return s[: max_len - 3] + "..."


def decode_project_path(dirname: str) -> str:
    """Decode a project directory name back into a filesystem path.

    The directory name encodes a path by replacing "/" with "-".
    e.g. "-Users-tuongaz-dev-foo" -> "/Users/tuongaz/dev/foo"
    """
    if not dirname:
        return ""
    return dirname.replace("-", "/")


# ---------------------------------------------------------------------------
# Content extraction
# ---------------------------------------------------------------------------


def extract_user_text(content: object) -> str:
    """Extract user-visible text from a message content field."""
    if content is None:
        return ""

    # User messages typically have string content.
    if isinstance(content, str):
        return clean_command_text(content)

    # Sometimes content is an array of parts.
    if isinstance(content, list):
        for part in content:
            if isinstance(part, dict):
                if part.get("type") == "text":
                    text = part.get("text")
                    if isinstance(text, str):
                        return clean_command_text(text)

    return ""


def _extract_tool_detail(tool_name: str, tool_input: object) -> str:
    """Extract a short detail string from a tool_use input dict."""
    if not isinstance(tool_input, dict):
        return ""

    if tool_name in ("Read", "Edit", "Write"):
        fp = tool_input.get("file_path")
        if isinstance(fp, str):
            return truncate(fp, 120)
    elif tool_name == "Bash":
        desc = tool_input.get("description")
        if isinstance(desc, str) and desc:
            return truncate(desc, 120)
        cmd = tool_input.get("command")
        if isinstance(cmd, str):
            return truncate(cmd, 120)
    elif tool_name in ("Grep", "Glob"):
        pat = tool_input.get("pattern")
        if isinstance(pat, str):
            return truncate(pat, 80)
    elif tool_name == "Agent":
        desc = tool_input.get("description")
        if isinstance(desc, str):
            return truncate(desc, 120)
    elif tool_name in ("WebSearch", "WebFetch"):
        q = tool_input.get("query")
        if isinstance(q, str):
            return truncate(q, 120)
        u = tool_input.get("url")
        if isinstance(u, str):
            return truncate(u, 120)

    return ""


def extract_action(content: object) -> str:
    """Extract the last action description from an assistant message's content."""
    if content is None:
        return ""

    if isinstance(content, str):
        return truncate(content, 80)

    if not isinstance(content, list):
        return ""

    last_action = ""
    for part in content:
        if not isinstance(part, dict):
            continue

        part_type = part.get("type", "")
        if part_type == "tool_use":
            name = part.get("name")
            if isinstance(name, str):
                detail = _extract_tool_detail(name, part.get("input"))
                if detail:
                    last_action = name + ": " + detail
                else:
                    last_action = name
        elif part_type == "text":
            text = part.get("text")
            if isinstance(text, str) and text:
                last_action = truncate(text, 80)

    return last_action


# ---------------------------------------------------------------------------
# Session parser
# ---------------------------------------------------------------------------


def parse_session(fpath: str) -> Session | None:
    """Parse a JSONL session file into a Session object.

    Returns None if the file cannot be parsed or contains no valid session data.
    """
    first_prompt = ""
    last_user_prompt = ""
    last_action = ""
    last_ts = ""
    waiting_for_input = False
    last_model = ""
    last_context_tokens = 0

    session_id = ""
    cwd = ""
    git_branch = ""
    version = ""

    try:
        with open(fpath, encoding="utf-8", errors="replace") as f:
            for line in f:
                line = line.strip()
                if not line:
                    continue

                try:
                    msg = Message.model_validate_json(line)
                except Exception:
                    continue

                # Capture session metadata from first valid message.
                if not session_id and msg.session_id:
                    session_id = msg.session_id
                if msg.cwd:
                    cwd = msg.cwd
                if msg.git_branch:
                    git_branch = msg.git_branch
                if msg.timestamp:
                    last_ts = msg.timestamp
                if msg.version:
                    version = msg.version

                # Track whether session is waiting for user input.
                if msg.type == "user":
                    waiting_for_input = False
                elif msg.type == "assistant" and msg.message.stop_reason == "end_turn":
                    waiting_for_input = True
                elif msg.type == "assistant" and msg.message.stop_reason == "tool_use":
                    waiting_for_input = False

                # Extract user prompts.
                if msg.type == "user":
                    text = extract_user_text(msg.message.content)
                    if text:
                        if not first_prompt:
                            first_prompt = truncate(text, 120)
                        last_user_prompt = _truncate_keep_newlines(text, 200)

                # Extract last action from assistant messages.
                if msg.type == "assistant":
                    action = extract_action(msg.message.content)
                    if action:
                        last_action = action

                    # Track token usage from the latest assistant message.
                    if msg.message.model:
                        last_model = msg.message.model
                    u = msg.message.usage
                    context_total = (
                        u.input_tokens
                        + u.cache_creation_input_tokens
                        + u.cache_read_input_tokens
                    )
                    if context_total > 0:
                        last_context_tokens = context_total

    except OSError:
        logger.warning("Failed to read session file: %s", fpath)
        return None

    if not session_id:
        return None

    return Session(
        session_id=session_id,
        cwd=cwd,
        git_branch=git_branch,
        timestamp=last_ts,
        first_prompt=first_prompt,
        last_user_prompt=last_user_prompt,
        last_action=truncate(last_action, 160),
        waiting_for_input=waiting_for_input,
        model=last_model,
        context_tokens=last_context_tokens,
        max_context_tokens=get_model_context_limit(last_model),
        version=version,
    )
