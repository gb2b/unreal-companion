from typing import Dict, Set
from fastapi import WebSocket
import json

class LogBroadcaster:
    def __init__(self):
        self.connections: Dict[str, Set[WebSocket]] = {}
    
    async def connect(self, project_id: str, websocket: WebSocket):
        await websocket.accept()
        if project_id not in self.connections:
            self.connections[project_id] = set()
        self.connections[project_id].add(websocket)
    
    def disconnect(self, project_id: str, websocket: WebSocket):
        if project_id in self.connections:
            self.connections[project_id].discard(websocket)
    
    async def broadcast(self, project_id: str, message: dict):
        if project_id in self.connections:
            dead_connections = set()
            for ws in self.connections[project_id]:
                try:
                    await ws.send_json(message)
                except Exception:
                    dead_connections.add(ws)
            
            # Clean up dead connections
            for ws in dead_connections:
                self.connections[project_id].discard(ws)
    
    async def log(self, project_id: str, log_type: str, message: str, **kwargs):
        await self.broadcast(project_id, {
            "type": "log",
            "payload": {
                "type": log_type,
                "message": message,
                **kwargs
            }
        })
    
    async def status(self, project_id: str, unreal_connected: bool, mcp_connected: bool):
        await self.broadcast(project_id, {
            "type": "status",
            "payload": {
                "unreal_connected": unreal_connected,
                "mcp_connected": mcp_connected
            }
        })
    
    async def action_start(self, project_id: str, tool: str, params: dict):
        await self.broadcast(project_id, {
            "type": "action_start",
            "payload": {
                "tool": tool,
                "params": params
            }
        })
    
    async def action_end(self, project_id: str, tool: str, result: str, success: bool):
        await self.broadcast(project_id, {
            "type": "action_end",
            "payload": {
                "tool": tool,
                "result": result,
                "success": success
            }
        })

broadcaster = LogBroadcaster()
