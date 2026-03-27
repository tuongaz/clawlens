"""ClawHawk – real-time Claude Code session dashboard."""

import argparse
import asyncio
import os
from pathlib import Path

import uvicorn
from fastapi import FastAPI, Request, WebSocket
from fastapi.responses import FileResponse, JSONResponse
from fastapi.staticfiles import StaticFiles

from clawhawk.ide import load_ide_map
from clawhawk.sessions import (
    _load_active_info,
    decode_project_path,
    find_session_file,
    parse_session_detail,
)
from clawhawk.ws import websocket_endpoint

# Resolve web/dist relative to the project root (3 levels up from src/clawhawk/app.py)
_PROJECT_ROOT = Path(__file__).resolve().parent.parent.parent
_DIST_DIR = _PROJECT_ROOT / "web" / "dist"

app = FastAPI(title="ClawHawk")


def _setup_static_files() -> None:
    """Mount static file serving if the dist directory exists."""
    if not _DIST_DIR.is_dir():
        return

    # Serve /assets/ directly for hashed JS/CSS bundles
    assets_dir = _DIST_DIR / "assets"
    if assets_dir.is_dir():
        app.mount("/assets", StaticFiles(directory=str(assets_dir)), name="assets")


_setup_static_files()


@app.websocket("/ws")
async def ws_route(ws: WebSocket) -> None:
    await websocket_endpoint(ws)


@app.get("/api/sessions/{session_id}")
async def get_session_detail(session_id: str) -> JSONResponse:
    """Return full session detail for a given session ID."""
    fpath = await asyncio.to_thread(find_session_file, session_id)
    if fpath is None:
        return JSONResponse(
            status_code=404,
            content={"error": f"Session {session_id} not found"},
        )

    detail = await asyncio.to_thread(parse_session_detail, fpath)
    if detail is None:
        return JSONResponse(
            status_code=500,
            content={"error": f"Failed to parse session {session_id}"},
        )

    # Enrich with active status, IDE client, memory flag, project name.
    home = os.path.expanduser("~")
    active_info = await asyncio.to_thread(_load_active_info, home)
    detail.is_active = detail.session_id in active_info.session_ids

    ide_dir = os.path.join(home, ".claude", "ide")
    ide_map = await asyncio.to_thread(load_ide_map, ide_dir)
    for folder, client in ide_map.items():
        if detail.cwd == folder or detail.cwd.startswith(folder + os.sep):
            detail.client = client
            break

    dir_name = os.path.basename(os.path.dirname(fpath))
    detail.project_name = decode_project_path(dir_name)

    mem_dir = os.path.join(home, ".claude", "projects", dir_name, "memory")
    try:
        for entry in os.listdir(mem_dir):
            if entry.endswith(".md") and not os.path.isdir(
                os.path.join(mem_dir, entry)
            ):
                detail.uses_memory = True
                break
    except OSError:
        pass

    return JSONResponse(
        content=detail.model_dump(by_alias=True, mode="json"),
    )


@app.get("/{full_path:path}")
async def spa_fallback(request: Request, full_path: str) -> FileResponse:
    """Serve static files or fall back to index.html for SPA routing."""
    # Try to serve the exact file first (favicon.svg, icons.svg, etc.)
    file_path = _DIST_DIR / full_path
    if full_path and file_path.is_file():
        return FileResponse(str(file_path))

    # Fall back to index.html for all other paths (SPA routing)
    return FileResponse(str(_DIST_DIR / "index.html"))


def main() -> None:
    parser = argparse.ArgumentParser(description="ClawHawk dashboard server")
    parser.add_argument("--port", type=int, default=3333)
    args = parser.parse_args()
    uvicorn.run(app, host="0.0.0.0", port=args.port)
