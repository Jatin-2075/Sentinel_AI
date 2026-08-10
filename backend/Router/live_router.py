from uuid import UUID

from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Query
from sqlalchemy.orm import Session

from ..Database.database import SessionLocal
from ..Models.project_model import Projects
from ..Core.dependencies import get_user_from_token_ws
from ..Core.ws_manager import manager

router = APIRouter(tags=["Live"])


@router.websocket("/live/{project_id}")
async def live_feed(websocket: WebSocket, project_id: UUID, token: str = Query(...)):
    """WS /live — joined to the caller's project channel, pushing new incidents
    in real time, per the spec. Auth is a JWT access token passed as ?token=,
    since browsers can't set custom headers on WebSocket upgrade requests."""
    user = get_user_from_token_ws(token)
    if user is None:
        await websocket.close(code=4401)
        return

    db: Session = SessionLocal()
    try:
        project = (
            db.query(Projects)
            .filter(Projects.id == project_id, Projects.auth_id == user.id)
            .first()
        )
    finally:
        db.close()

    if project is None:
        await websocket.close(code=4404)
        return

    await manager.connect(project_id, websocket)
    try:
        while True:
            # We don't expect inbound messages, but need to keep the socket
            # alive and detect disconnects.
            await websocket.receive_text()
    except WebSocketDisconnect:
        pass
    finally:
        await manager.disconnect(project_id, websocket)
