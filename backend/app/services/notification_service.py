"""
Notification Service - Server-Sent Events for frontend notifications
Notifies frontends when Galaxy cache is updated
"""

import asyncio
import json
import time
from typing import List, Dict, Any, Optional, AsyncIterator
import logging
from datetime import datetime
from fastapi import Request
from starlette.responses import StreamingResponse

logger = logging.getLogger(__name__)

class NotificationService:
    """
    Server-Sent Events (SSE) service to notify frontends about cache updates
    """
    
    def __init__(self):
        # Active SSE connections
        self.active_connections: List[asyncio.Queue] = []
        self.connection_count = 0
        
        # Notification history (last 10 events)
        self.notification_history: List[Dict[str, Any]] = []
        self.max_history = 10
    
    async def add_connection(self) -> asyncio.Queue:
        """Add a new SSE connection"""
        connection_queue = asyncio.Queue()
        self.active_connections.append(connection_queue)
        self.connection_count += 1
        
        logger.info(f"✅ New SSE connection added. Total: {len(self.active_connections)}")
        
        # Send welcome message
        welcome_event = {
            "type": "connected",
            "message": "Connected to Galaxy cache notifications",
            "timestamp": datetime.utcnow().isoformat(),
            "connection_id": self.connection_count
        }
        
        await connection_queue.put(welcome_event)
        
        return connection_queue
    
    async def remove_connection(self, connection_queue: asyncio.Queue):
        """Remove SSE connection"""
        try:
            if connection_queue in self.active_connections:
                self.active_connections.remove(connection_queue)
                logger.info(f"❌ SSE connection removed. Total: {len(self.active_connections)}")
        except ValueError:
            pass  # Connection already removed
    
    async def broadcast_notification(self, event_type: str, data: Dict[str, Any], message: str = ""):
        """
        Broadcast notification to all connected frontends
        
        Args:
            event_type: Type of event (cache_updated, sync_started, sync_completed, etc.)
            data: Event data to send
            message: Human-readable message
        """
        if not self.active_connections:
            logger.debug(f"No active connections to broadcast {event_type}")
            return
        
        # Create notification event
        event = {
            "type": event_type,
            "message": message,
            "data": data,
            "timestamp": datetime.utcnow().isoformat()
        }
        
        # Add to history
        self._add_to_history(event)
        
        # Broadcast to all connections
        disconnected_queues = []
        for queue in self.active_connections:
            try:
                await asyncio.wait_for(queue.put(event), timeout=1.0)
            except (asyncio.TimeoutError, Exception) as e:
                logger.warning(f"Failed to send notification to connection: {e}")
                disconnected_queues.append(queue)
        
        # Remove failed connections
        for queue in disconnected_queues:
            await self.remove_connection(queue)
        
        logger.info(f"📡 Broadcasted '{event_type}' to {len(self.active_connections)} connections")
    
    def _add_to_history(self, event: Dict[str, Any]):
        """Add event to history and maintain size limit"""
        self.notification_history.append(event)
        if len(self.notification_history) > self.max_history:
            self.notification_history.pop(0)  # Remove oldest
    
    async def get_event_stream(self, connection_queue: asyncio.Queue) -> AsyncIterator[str]:
        """
        Generate SSE stream for a connection
        """
        try:
            # Send recent history first
            for historical_event in self.notification_history:
                yield f"data: {json.dumps(historical_event)}\\n\\n"
            
            # Send live events
            while True:
                try:
                    # Wait for next event with timeout
                    event = await asyncio.wait_for(connection_queue.get(), timeout=30.0)
                    yield f"data: {json.dumps(event)}\\n\\n"
                    
                except asyncio.TimeoutError:
                    # Send keepalive ping
                    ping_event = {
                        "type": "ping",
                        "timestamp": datetime.utcnow().isoformat()
                    }
                    yield f"data: {json.dumps(ping_event)}\\n\\n"
                    
        except asyncio.CancelledError:
            logger.debug("SSE stream cancelled")
        except Exception as e:
            logger.error(f"Error in SSE stream: {e}")
        finally:
            # Clean up connection
            await self.remove_connection(connection_queue)
    
    async def notify_cache_sync_started(self):
        """Notify that Galaxy cache sync has started"""
        await self.broadcast_notification(
            event_type="cache_sync_started",
            message="Galaxy cache synchronization started",
            data={"status": "syncing"}
        )
    
    async def notify_cache_sync_completed(self, stats: Dict[str, Any]):
        """Notify that Galaxy cache sync has completed"""
        await self.broadcast_notification(
            event_type="cache_sync_completed", 
            message="Galaxy cache synchronization completed",
            data={
                "status": "completed",
                "stats": stats
            }
        )
    
    async def notify_cache_updated(self, update_type: str, namespace: Optional[str] = None):
        """Notify that specific cache data has been updated"""
        data = {"update_type": update_type}
        if namespace:
            data["namespace"] = namespace
        
        await self.broadcast_notification(
            event_type="cache_updated",
            message=f"Cache updated: {update_type}",
            data=data
        )
    
    async def notify_cache_error(self, error_message: str):
        """Notify about cache sync errors"""
        await self.broadcast_notification(
            event_type="cache_error",
            message=f"Cache sync error: {error_message}",
            data={"error": error_message}
        )
    
    def get_status(self) -> Dict[str, Any]:
        """Get notification service status"""
        return {
            "active_connections": len(self.active_connections),
            "total_connections": self.connection_count,
            "recent_events": len(self.notification_history),
            "service_status": "active"
        }

# Singleton instance
notification_service = NotificationService()