"""
Base HTTP Service - Provides shared HTTP session management for services

This class provides a reusable base for services that need async HTTP sessions
with consistent lifecycle management and configurable timeouts.
"""

import aiohttp
from typing import Optional


class BaseHTTPService:
    """
    Base class for services that need HTTP session management.

    Provides:
    - Lazy initialization of aiohttp.ClientSession
    - Automatic session recreation if closed
    - Configurable timeout
    - Clean session cleanup

    Usage:
        class MyService(BaseHTTPService):
            def __init__(self):
                super().__init__(timeout=30)  # 30 second timeout

            async def fetch_data(self):
                session = await self.get_session()
                async with session.get(url) as response:
                    return await response.json()
    """

    def __init__(self, timeout: int = 60):
        """
        Initialize the HTTP service.

        Args:
            timeout: HTTP request timeout in seconds (default: 60)
        """
        self.session: Optional[aiohttp.ClientSession] = None
        self.timeout = timeout

    async def get_session(self) -> aiohttp.ClientSession:
        """
        Get or create HTTP session.

        Returns a cached session if available and open, otherwise creates a new one.
        """
        if self.session is None or self.session.closed:
            self.session = aiohttp.ClientSession(
                timeout=aiohttp.ClientTimeout(total=self.timeout)
            )
        return self.session

    async def close_session(self):
        """
        Close HTTP session.

        Safely closes the session if it exists and is open.
        """
        if self.session and not self.session.closed:
            await self.session.close()
            self.session = None
