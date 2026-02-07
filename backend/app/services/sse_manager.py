"""
SSE Manager - Server-Sent Events for cache notifications
"""

import asyncio
import json
import logging
from datetime import datetime
from typing import Dict, Set, AsyncGenerator
from dataclasses import dataclass, field

logger = logging.getLogger(__name__)


@dataclass
class SSEClient:
    """Represents a connected SSE client"""
    id: int
    queue: asyncio.Queue = field(default_factory=asyncio.Queue)
    connected_at: datetime = field(default_factory=datetime.utcnow)


class SSEManager:
    """
    Manages Server-Sent Events connections and broadcasts
    """

    def __init__(self):
        self._clients: Dict[int, SSEClient] = {}
        self._client_counter = 0
        self._lock = asyncio.Lock()

    async def connect(self) -> SSEClient:
        """Register a new SSE client"""
        async with self._lock:
            self._client_counter += 1
            client = SSEClient(id=self._client_counter)
            self._clients[client.id] = client

        logger.info(f"📡 SSE client {client.id} connected (total: {len(self._clients)})")

        # Send welcome message
        await self._send_to_client(client, {
            "type": "connected",
            "message": "Connected to Ansible cache notifications",
            "connection_id": client.id,
            "timestamp": datetime.utcnow().isoformat()
        })

        return client

    async def disconnect(self, client: SSEClient):
        """Unregister an SSE client"""
        async with self._lock:
            if client.id in self._clients:
                del self._clients[client.id]

        logger.info(f"📡 SSE client {client.id} disconnected (remaining: {len(self._clients)})")

    async def _send_to_client(self, client: SSEClient, data: dict):
        """Send data to a specific client"""
        try:
            await client.queue.put(data)
        except Exception as e:
            logger.error(f"Error sending to client {client.id}: {e}")

    async def broadcast(self, data: dict):
        """Broadcast data to all connected clients"""
        if not self._clients:
            return

        data["timestamp"] = datetime.utcnow().isoformat()

        async with self._lock:
            client_ids = list(self._clients.keys())

        logger.info(f"📢 Broadcasting to {len(client_ids)} SSE clients: {data.get('type', 'unknown')}")

        for client_id in client_ids:
            client = self._clients.get(client_id)
            if client:
                await self._send_to_client(client, data)

    async def event_generator(self, client: SSEClient) -> AsyncGenerator[str, None]:
        """Generate SSE events for a client"""
        try:
            while True:
                # Wait for data with timeout (for keepalive)
                try:
                    data = await asyncio.wait_for(client.queue.get(), timeout=30.0)
                    yield f"data: {json.dumps(data)}\n\n"
                except asyncio.TimeoutError:
                    # Send keepalive ping
                    yield f"data: {json.dumps({'type': 'ping', 'timestamp': datetime.utcnow().isoformat()})}\n\n"

        except asyncio.CancelledError:
            pass
        except Exception as e:
            logger.error(f"Error in event generator for client {client.id}: {e}")
        finally:
            await self.disconnect(client)

    def get_status(self) -> dict:
        """Get SSE manager status"""
        return {
            "connected_clients": len(self._clients),
            "client_ids": list(self._clients.keys())
        }


# Global instance
sse_manager = SSEManager()
