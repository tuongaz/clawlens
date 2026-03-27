"""WebSocket endpoint for real-time session data updates."""

from __future__ import annotations

import asyncio
import logging

from fastapi import WebSocket, WebSocketDisconnect

from clawhawk.models import DashboardMessage, ProjectGroup
from clawhawk.sessions import load_grouped_sessions
from clawhawk.stats import load_token_stats

logger = logging.getLogger(__name__)

_TICK_FAST = 0.01  # 10ms when active sessions exist
_TICK_SLOW = 2.0  # 2s when all idle


def _has_active_sessions(groups: list[ProjectGroup]) -> bool:
    for g in groups:
        for s in g.sessions:
            if s.is_active:
                return True
    return False


async def websocket_endpoint(ws: WebSocket) -> None:
    """Accept a WebSocket connection and push session data on change."""
    await ws.accept()

    last_data: bytes = b""

    try:
        while True:
            groups = await asyncio.to_thread(load_grouped_sessions, 0)
            stats = await asyncio.to_thread(load_token_stats)

            msg = DashboardMessage(groups=groups, stats=stats)
            data = msg.model_dump_json(by_alias=True).encode()

            if data != last_data:
                await ws.send_bytes(data)
                last_data = data

            interval = _TICK_FAST if _has_active_sessions(groups) else _TICK_SLOW
            await asyncio.sleep(interval)
    except WebSocketDisconnect:
        pass
    except Exception:
        logger.debug("WebSocket connection closed")
