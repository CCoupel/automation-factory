"""
Cache Scheduler Service - Automatic cache synchronization with Ansible docs
"""

import asyncio
import logging
from datetime import datetime, timedelta
from typing import Optional, List, Callable, Any
from app.services.ansible_collections_service import ansible_collections_service
from app.services.ansible_versions_service import ansible_versions_service
from app.services.cache_service import cache

logger = logging.getLogger(__name__)


class CacheSchedulerService:
    """
    Background scheduler for automatic cache synchronization
    Refreshes cache from Ansible docs at regular intervals
    """

    # Default sync interval: 24 hours
    SYNC_INTERVAL_HOURS = 24

    def __init__(self):
        self._running = False
        self._task: Optional[asyncio.Task] = None
        self._last_sync: Optional[datetime] = None
        self._next_sync: Optional[datetime] = None
        self._sync_in_progress = False
        self._notification_callbacks: List[Callable[[dict], Any]] = []

    def register_notification_callback(self, callback: Callable[[dict], Any]):
        """Register a callback to be called when cache events occur"""
        self._notification_callbacks.append(callback)

    def unregister_notification_callback(self, callback: Callable[[dict], Any]):
        """Unregister a notification callback"""
        if callback in self._notification_callbacks:
            self._notification_callbacks.remove(callback)

    async def _notify(self, event_type: str, message: str, data: dict = None):
        """Send notification to all registered callbacks"""
        notification = {
            "type": event_type,
            "message": message,
            "data": data or {},
            "timestamp": datetime.utcnow().isoformat()
        }

        logger.info(f"📢 Cache notification: {event_type} - {message}")

        for callback in self._notification_callbacks:
            try:
                if asyncio.iscoroutinefunction(callback):
                    await callback(notification)
                else:
                    callback(notification)
            except Exception as e:
                logger.error(f"Error in notification callback: {e}")

    async def start(self):
        """Start the background scheduler"""
        if self._running:
            logger.warning("Cache scheduler already running")
            return

        self._running = True
        self._task = asyncio.create_task(self._scheduler_loop())
        logger.info(f"🚀 Cache scheduler started (sync every {self.SYNC_INTERVAL_HOURS}h)")

        # Schedule next sync
        self._next_sync = datetime.utcnow() + timedelta(hours=self.SYNC_INTERVAL_HOURS)

        await self._notify("scheduler_started", f"Cache scheduler started, next sync at {self._next_sync.isoformat()}")

    async def stop(self):
        """Stop the background scheduler"""
        if not self._running:
            return

        self._running = False
        if self._task:
            self._task.cancel()
            try:
                await self._task
            except asyncio.CancelledError:
                pass
            self._task = None

        logger.info("⏹️ Cache scheduler stopped")
        await self._notify("scheduler_stopped", "Cache scheduler stopped")

    async def _scheduler_loop(self):
        """Main scheduler loop"""
        while self._running:
            try:
                # Wait for next sync interval
                await asyncio.sleep(self.SYNC_INTERVAL_HOURS * 3600)

                if self._running:
                    await self.sync_all_caches()

            except asyncio.CancelledError:
                break
            except Exception as e:
                logger.error(f"Error in scheduler loop: {e}")
                await self._notify("scheduler_error", f"Scheduler error: {str(e)}")
                # Wait a bit before retrying
                await asyncio.sleep(60)

    async def sync_all_caches(self, force: bool = False):
        """
        Synchronize all caches from Ansible docs

        Args:
            force: If True, bypass any ongoing sync check
        """
        if self._sync_in_progress and not force:
            logger.warning("Sync already in progress, skipping")
            return {"status": "skipped", "reason": "sync_in_progress"}

        self._sync_in_progress = True
        sync_start = datetime.utcnow()

        try:
            await self._notify("cache_sync_started", "Starting cache synchronization from Ansible docs")

            # Get available versions
            versions = await ansible_versions_service.get_available_versions()
            logger.info(f"📥 Syncing cache for {len(versions)} Ansible versions")

            sync_results = {
                "versions_synced": [],
                "namespaces_total": 0,
                "errors": []
            }

            # Sync each version (limit to recent versions for performance)
            versions_to_sync = versions[:6]  # Sync latest 6 versions

            for version in versions_to_sync:
                try:
                    # Force refresh collections for this version
                    collections = await ansible_collections_service.get_collections(version, force_refresh=True)
                    namespace_count = len(collections)

                    sync_results["versions_synced"].append(version)
                    sync_results["namespaces_total"] += namespace_count

                    logger.info(f"✅ Synced Ansible {version}: {namespace_count} namespaces")

                    await self._notify("cache_updated", f"Synced Ansible {version}", {
                        "version": version,
                        "namespace_count": namespace_count
                    })

                    # Small delay to avoid hammering the server
                    await asyncio.sleep(1)

                except Exception as e:
                    error_msg = f"Failed to sync version {version}: {str(e)}"
                    logger.error(error_msg)
                    sync_results["errors"].append(error_msg)

            # Update sync timestamps
            self._last_sync = datetime.utcnow()
            self._next_sync = self._last_sync + timedelta(hours=self.SYNC_INTERVAL_HOURS)

            sync_duration = (datetime.utcnow() - sync_start).total_seconds()

            await self._notify("cache_sync_completed",
                f"Cache sync completed in {sync_duration:.1f}s", {
                    "duration_seconds": sync_duration,
                    "versions_synced": len(sync_results["versions_synced"]),
                    "namespaces_total": sync_results["namespaces_total"],
                    "next_sync": self._next_sync.isoformat()
                })

            logger.info(f"✅ Cache sync completed in {sync_duration:.1f}s")

            return {
                "status": "completed",
                "duration_seconds": sync_duration,
                **sync_results
            }

        except Exception as e:
            logger.error(f"Cache sync failed: {e}")
            await self._notify("cache_sync_error", f"Cache sync failed: {str(e)}", {
                "error": str(e)
            })
            return {"status": "error", "error": str(e)}

        finally:
            self._sync_in_progress = False

    def get_status(self) -> dict:
        """Get current scheduler status"""
        return {
            "running": self._running,
            "sync_in_progress": self._sync_in_progress,
            "last_sync": self._last_sync.isoformat() if self._last_sync else None,
            "next_sync": self._next_sync.isoformat() if self._next_sync else None,
            "sync_interval_hours": self.SYNC_INTERVAL_HOURS,
            "cache_stats": cache.get_stats()
        }


# Global instance
cache_scheduler = CacheSchedulerService()
