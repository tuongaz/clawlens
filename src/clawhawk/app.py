"""ClawHawk – real-time Claude Code session dashboard."""

import argparse
from pathlib import Path

import uvicorn
from fastapi import FastAPI, Request, WebSocket
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles

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
