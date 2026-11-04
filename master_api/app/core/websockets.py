from typing import Dict, List, Any
from fastapi import WebSocket

class ConnectionManager:
    def __init__(self):
        # organization_id -> list of web sockets
        self.active_connections: Dict[str, List[WebSocket]] = {}
        # user_id -> list of web sockets
        self.user_connections: Dict[str, List[WebSocket]] = {}

    async def connect(self, websocket: WebSocket, org_id: str, user_id: str = None):
        await websocket.accept()
        if org_id not in self.active_connections:
            self.active_connections[org_id] = []
        self.active_connections[org_id].append(websocket)
        
        if user_id:
            if user_id not in self.user_connections:
                self.user_connections[user_id] = []
            self.user_connections[user_id].append(websocket)

    async def connect_accepted(self, websocket: WebSocket, org_id: str, user_id: str = None):
        if org_id not in self.active_connections:
            self.active_connections[org_id] = []
        self.active_connections[org_id].append(websocket)
        
        if user_id:
            if user_id not in self.user_connections:
                self.user_connections[user_id] = []
            self.user_connections[user_id].append(websocket)


    def disconnect(self, websocket: WebSocket, org_id: str, user_id: str = None):
        if org_id in self.active_connections:
            if websocket in self.active_connections[org_id]:
                self.active_connections[org_id].remove(websocket)
            if not self.active_connections[org_id]:
                del self.active_connections[org_id]
                
        if user_id and user_id in self.user_connections:
            if websocket in self.user_connections[user_id]:
                self.user_connections[user_id].remove(websocket)
            if not self.user_connections[user_id]:
                del self.user_connections[user_id]

    async def broadcast_to_org(self, org_id: str, message: Any):
        if org_id in self.active_connections:
            for connection in self.active_connections[org_id]:
                try:
                    await connection.send_json(message)
                except Exception:
                    pass

    async def send_to_user(self, user_id: str, message: Any):
        if user_id in self.user_connections:
            for connection in self.user_connections[user_id]:
                try:
                    await connection.send_json(message)
                except Exception:
                    pass

manager = ConnectionManager()
