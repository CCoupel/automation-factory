"""
Galaxy Roles Service - Fetch roles from Ansible Galaxy (v1 + v3 APIs)

Supports:
- API v1: Standalone/legacy roles (author.role_name format)
- API v3: Collection roles (namespace.collection.role format)
- Private Galaxy: AAP (Automation Hub) or Galaxy NG
- Dynamic source configuration from database (admin-configurable)
"""

import logging
from typing import Dict, List, Optional, Any
from app.core.config import settings
from app.core.http_service import BaseHTTPService
from app.services.cache_service import cache

logger = logging.getLogger(__name__)


class GalaxyRolesService(BaseHTTPService):
    """Service for fetching roles from Ansible Galaxy APIs"""

    # Import centralized TTL values
    from app.core.cache_config import CacheTTL
    CACHE_TTL_ROLES = CacheTTL.ROLES_LIST
    CACHE_TTL_DETAILS = CacheTTL.ROLE_DETAILS
    CACHE_TTL_CONFIG = CacheTTL.NAMESPACES

    def __init__(self):
        super().__init__(timeout=60)
        # Environment variables as fallback only (used when DB cache not loaded)
        self._fallback_public_url = settings.GALAXY_PUBLIC_URL.rstrip('/')
        self._fallback_public_enabled = settings.GALAXY_PUBLIC_ENABLED

    def _get_active_sources(self) -> List[dict]:
        """
        Get active Galaxy sources from database cache.

        Falls back to environment variables if cache not loaded.
        """
        from app.services.galaxy_source_service import GalaxySourceService

        sources = GalaxySourceService.get_active_sources()
        if sources:
            return sources

        # Fallback to environment config if cache not loaded
        logger.warning("Galaxy sources cache not loaded, using environment fallback")
        fallback = []
        if self._fallback_public_enabled:
            fallback.append({
                "id": "env-public",
                "name": "Ansible Galaxy (Public)",
                "source_type": "public",
                "url": self._fallback_public_url,
                "token": None,
                "priority": 10,
            })
        return fallback

    def _get_source_by_type(self, source_type: str) -> Optional[dict]:
        """Get the first active source of the specified type."""
        sources = self._get_active_sources()
        for source in sources:
            if source["source_type"] == source_type:
                return source
        return None

    def _get_base_url(self, source: str) -> Optional[str]:
        """Get base URL for the specified source type. Returns None if source is disabled."""
        source_config = self._get_source_by_type(source)
        if source_config:
            return source_config["url"].rstrip('/')
        return None

    def _get_headers(self, source: str) -> Dict[str, str]:
        """Get headers including auth token for private Galaxy"""
        headers = {
            "Accept": "application/json",
            "Content-Type": "application/json"
        }
        source_config = self._get_source_by_type(source)
        if source_config and source_config.get("token"):
            headers["Authorization"] = f"Token {source_config['token']}"
        return headers

    # ========================================
    # API v1 - Standalone/Legacy Roles
    # ========================================

    async def get_standalone_roles(
        self,
        search: str = "",
        namespace: str = "",
        page: int = 1,
        page_size: int = 50,
        source: str = "public",
        order_by: str = "-download_count"
    ) -> Dict[str, Any]:
        """
        Fetch standalone roles via Galaxy v1 API

        Args:
            search: Search query
            namespace: Filter by author/namespace
            page: Page number (1-indexed)
            page_size: Results per page
            source: "public" or "private"
            order_by: Sort field (default: most downloaded)

        Returns:
            Dict with count, next, previous, results
        """
        cache_key = f"galaxy_standalone_roles:{source}:{namespace}:{search}:{page}:{page_size}"
        cached = cache.get(cache_key)
        if cached:
            logger.debug(f"Returning cached standalone roles: {cache_key}")
            return cached

        try:
            base_url = self._get_base_url(source)
            url = f"{base_url}/api/v1/roles/"

            params = {
                "page": page,
                "page_size": page_size,
                "order_by": order_by
            }
            if search:
                params["search"] = search
            if namespace:
                params["namespace"] = namespace

            session = await self.get_session()
            headers = self._get_headers(source)

            logger.info(f"Fetching standalone roles from {url} with params {params}")

            async with session.get(url, params=params, headers=headers) as response:
                if response.status == 200:
                    data = await response.json()
                    result = {
                        "count": data.get("count", 0),
                        "next": data.get("next"),
                        "previous": data.get("previous"),
                        "results": [
                            self._normalize_standalone_role(role)
                            for role in data.get("results", [])
                        ]
                    }
                    cache.set(cache_key, result, self.CACHE_TTL_ROLES)
                    logger.info(f"Found {len(result['results'])} standalone roles")
                    return result
                else:
                    logger.warning(f"Galaxy v1 API returned {response.status}")
                    return {"count": 0, "next": None, "previous": None, "results": []}

        except Exception as e:
            logger.error(f"Error fetching standalone roles: {str(e)}")
            return {"count": 0, "next": None, "previous": None, "results": []}

    def _normalize_standalone_role(self, role: Dict[str, Any]) -> Dict[str, Any]:
        """Normalize standalone role data from v1 API"""
        namespace = role.get("namespace") or role.get("summary_fields", {}).get("namespace", {}).get("name", "unknown")
        if isinstance(namespace, dict):
            namespace = namespace.get("name", "unknown")

        return {
            "id": role.get("id"),
            "name": role.get("name", ""),
            "namespace": namespace,
            "description": role.get("description", ""),
            "download_count": role.get("download_count", 0),
            "github_user": role.get("github_user", ""),
            "github_repo": role.get("github_repo", ""),
            "created": role.get("created"),
            "modified": role.get("modified"),
            "fqrn": f"{namespace}.{role.get('name', '')}",
            "type": "standalone"
        }

    async def get_standalone_role_details(
        self,
        namespace: str,
        name: str,
        source: str = "public"
    ) -> Optional[Dict[str, Any]]:
        """
        Get detailed info for a specific standalone role

        Args:
            namespace: Author/namespace name
            name: Role name
            source: "public" or "private"

        Returns:
            Role details or None if not found
        """
        cache_key = f"galaxy_standalone_role:{source}:{namespace}:{name}"
        cached = cache.get(cache_key)
        if cached:
            return cached

        try:
            # First, search for the role by namespace and name
            base_url = self._get_base_url(source)
            url = f"{base_url}/api/v1/roles/"
            params = {"namespace": namespace, "name": name}

            session = await self.get_session()
            headers = self._get_headers(source)

            async with session.get(url, params=params, headers=headers) as response:
                if response.status == 200:
                    data = await response.json()
                    results = data.get("results", [])
                    if results:
                        role = self._normalize_standalone_role(results[0])
                        cache.set(cache_key, role, self.CACHE_TTL_DETAILS)
                        return role

            return None

        except Exception as e:
            logger.error(f"Error fetching role details for {namespace}.{name}: {str(e)}")
            return None

    async def get_popular_namespaces(
        self,
        source: str = "public",
        limit: int = 20
    ) -> List[Dict[str, Any]]:
        """
        Get list of popular role authors/namespaces

        Returns list of namespaces with role counts
        """
        cache_key = f"galaxy_popular_namespaces:{source}"
        cached = cache.get(cache_key)
        if cached:
            return cached[:limit]

        try:
            # Fetch top roles to extract popular namespaces
            roles_data = await self.get_standalone_roles(
                page_size=100,
                source=source,
                order_by="-download_count"
            )

            # Count roles per namespace
            namespace_counts: Dict[str, int] = {}
            namespace_downloads: Dict[str, int] = {}

            for role in roles_data.get("results", []):
                ns = role.get("namespace", "unknown")
                namespace_counts[ns] = namespace_counts.get(ns, 0) + 1
                namespace_downloads[ns] = namespace_downloads.get(ns, 0) + role.get("download_count", 0)

            # Build namespace list sorted by total downloads
            namespaces = [
                {
                    "name": ns,
                    "role_count": namespace_counts[ns],
                    "total_downloads": namespace_downloads[ns]
                }
                for ns in namespace_counts
            ]
            namespaces.sort(key=lambda x: x["total_downloads"], reverse=True)

            cache.set(cache_key, namespaces, self.CACHE_TTL_CONFIG)
            return namespaces[:limit]

        except Exception as e:
            logger.error(f"Error fetching popular namespaces: {str(e)}")
            return []

    # ========================================
    # API v3 - Collection Roles
    # ========================================

    async def get_collection_roles(
        self,
        namespace: str,
        collection: str,
        version: str = "latest",
        source: str = "public"
    ) -> List[Dict[str, Any]]:
        """
        Fetch roles from a collection via Galaxy v3 API

        Args:
            namespace: Collection namespace
            collection: Collection name
            version: Collection version or "latest"
            source: "public" or "private"

        Returns:
            List of roles in the collection
        """
        cache_key = f"galaxy_collection_roles:{source}:{namespace}:{collection}:{version}"
        cached = cache.get(cache_key)
        if cached:
            return cached

        try:
            base_url = self._get_base_url(source)

            # First get collection info to find the version
            if version == "latest":
                version = await self._get_latest_collection_version(
                    namespace, collection, source
                )
                if not version:
                    return []

            # Fetch collection contents/docs to find roles
            url = f"{base_url}/api/v3/plugin/ansible/content/published/collections/index/{namespace}/{collection}/versions/{version}/docs-blob/"

            session = await self.get_session()
            headers = self._get_headers(source)

            async with session.get(url, headers=headers) as response:
                if response.status == 200:
                    data = await response.json()
                    roles = self._extract_roles_from_collection_docs(
                        data, namespace, collection
                    )
                    cache.set(cache_key, roles, self.CACHE_TTL_ROLES)
                    return roles
                else:
                    logger.warning(f"Galaxy v3 docs-blob returned {response.status} for {namespace}.{collection}")
                    return []

        except Exception as e:
            logger.error(f"Error fetching collection roles for {namespace}.{collection}: {str(e)}")
            return []

    async def _get_latest_collection_version(
        self,
        namespace: str,
        collection: str,
        source: str = "public"
    ) -> Optional[str]:
        """Get the latest version of a collection"""
        try:
            base_url = self._get_base_url(source)
            url = f"{base_url}/api/v3/plugin/ansible/content/published/collections/index/{namespace}/{collection}/"

            session = await self.get_session()
            headers = self._get_headers(source)

            async with session.get(url, headers=headers) as response:
                if response.status == 200:
                    data = await response.json()
                    return data.get("highest_version", {}).get("version")
                return None

        except Exception as e:
            logger.error(f"Error getting latest version for {namespace}.{collection}: {str(e)}")
            return None

    def _extract_roles_from_collection_docs(
        self,
        docs_data: Dict[str, Any],
        namespace: str,
        collection: str
    ) -> List[Dict[str, Any]]:
        """Extract roles from collection documentation blob"""
        roles = []

        # The docs-blob contains contents with type "role"
        contents = docs_data.get("contents", [])

        for content in contents:
            if content.get("content_type") == "role":
                role_name = content.get("content_name", "")
                roles.append({
                    "name": role_name,
                    "namespace": namespace,
                    "collection": collection,
                    "description": content.get("description", ""),
                    "fqcn": f"{namespace}.{collection}.{role_name}",
                    "type": "collection",
                    "doc_url": content.get("doc_url", "")
                })

        # Also check for roles in the collection_info
        collection_info = docs_data.get("collection_info", {})
        if "roles" in collection_info:
            for role_info in collection_info.get("roles", []):
                role_name = role_info if isinstance(role_info, str) else role_info.get("name", "")
                if role_name and not any(r["name"] == role_name for r in roles):
                    roles.append({
                        "name": role_name,
                        "namespace": namespace,
                        "collection": collection,
                        "description": "",
                        "fqcn": f"{namespace}.{collection}.{role_name}",
                        "type": "collection"
                    })

        logger.info(f"Found {len(roles)} roles in {namespace}.{collection}")
        return roles

    async def search_collection_roles(
        self,
        query: str,
        source: str = "public",
        limit: int = 50
    ) -> List[Dict[str, Any]]:
        """
        Search for roles across collections

        Note: Galaxy v3 doesn't have a direct role search, so we search collections
        and then check their contents for roles
        """
        try:
            base_url = self._get_base_url(source)
            # Search collections that might contain roles
            url = f"{base_url}/api/v3/plugin/ansible/search/collection-versions/"
            params = {
                "keywords": query,
                "limit": limit,
                "is_highest": "true"
            }

            session = await self.get_session()
            headers = self._get_headers(source)

            roles = []
            async with session.get(url, params=params, headers=headers) as response:
                if response.status == 200:
                    data = await response.json()
                    for item in data.get("data", [])[:10]:  # Limit to first 10 collections
                        namespace = item.get("namespace", "")
                        collection = item.get("name", "")
                        if namespace and collection:
                            collection_roles = await self.get_collection_roles(
                                namespace, collection, "latest", source
                            )
                            roles.extend(collection_roles)

            return roles[:limit]

        except Exception as e:
            logger.error(f"Error searching collection roles: {str(e)}")
            return []

    # ========================================
    # Configuration
    # ========================================

    def get_config(self) -> Dict[str, Any]:
        """Get Galaxy configuration from database (without exposing tokens)"""
        sources = self._get_active_sources()

        # Find public and private sources
        public_source = self._get_source_by_type("public")
        private_source = self._get_source_by_type("private")

        return {
            "public_url": public_source["url"] if public_source else None,
            "public_enabled": public_source is not None,
            "private_configured": private_source is not None,
            "private_url": private_source["url"] if private_source else None,
            "preferred_source": "private" if private_source and private_source["priority"] < (public_source["priority"] if public_source else 999) else "public",
            "sources": [
                {
                    "id": s["id"],
                    "name": s["name"],
                    "source_type": s["source_type"],
                    "url": s["url"],
                    "priority": s["priority"],
                }
                for s in sources
            ]
        }


# Global singleton instance
galaxy_roles_service = GalaxyRolesService()
