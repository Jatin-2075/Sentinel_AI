"""
In-process WebSocket connection manager, scoped per project ("room" pattern
called out in the spec as a Redis pub/sub channel — this is the single-instance
equivalent; swap the broadcast() body for a Redis pub/sub publish if you scale
to multiple API instances/workers).
"""
import asyncio
import json
from collections import defaultdict
from typing import Any
from uuid import UUID

from fastapi import WebSocket


class ConnectionManager:
    def __init__(self) -> None:
        self._rooms: dict[str, list[WebSocket]] = defaultdict(list)
        self._lock = asyncio.Lock()

    async def connect(self, project_id: UUID, websocket: WebSocket) -> None:
        await websocket.accept()
        async with self._lock:
            self._rooms[str(project_id)].append(websocket)

    async def disconnect(self, project_id: UUID, websocket: WebSocket) -> None:
        async with self._lock:
            room = self._rooms.get(str(project_id), [])
            if websocket in room:
                room.remove(websocket)

    async def broadcast(self, project_id: UUID, message: dict[str, Any]) -> None:
        room = self._rooms.get(str(project_id), [])
        if not room:
            return
        payload = json.dumps(message, default=str)
        dead: list[WebSocket] = []
        for ws in room:
            try:
                await ws.send_text(payload)
            except Exception:
                dead.append(ws)
        if dead:
            async with self._lock:
                for ws in dead:
                    if ws in self._rooms.get(str(project_id), []):
                        self._rooms[str(project_id)].remove(ws)


manager = ConnectionManager()
