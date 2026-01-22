from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from services.log_broadcaster import broadcaster

router = APIRouter()

@router.websocket("/ws/{project_id}")
async def websocket_endpoint(websocket: WebSocket, project_id: str):
    await broadcaster.connect(project_id, websocket)
    try:
        while True:
            # Keep connection alive, receive any client messages
            await websocket.receive_text()
    except WebSocketDisconnect:
        broadcaster.disconnect(project_id, websocket)
