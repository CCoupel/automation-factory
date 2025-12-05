"""
Collections service for retrieving Ansible collections from various sources
"""

import asyncio
import httpx
from typing import List, Dict, Optional, Any
from bs4 import BeautifulSoup
import logging

logger = logging.getLogger(__name__)


class Collection:
    """Ansible Collection model"""
    def __init__(self, namespace: str, name: str, version: str = None, 
                 description: str = None, download_count: int = 0):
        self.namespace = namespace
        self.name = name
        self.full_name = f"{namespace}.{name}"
        self.version = version
        self.description = description
        self.download_count = download_count


class CollectionsService:
    """Service for retrieving Ansible collections"""
    
    def __init__(self):
        # Use the correct Galaxy API URL (after redirect)
        self.galaxy_base_url = "https://galaxy.ansible.com/api/v3/plugin/ansible/content/published/collections/index/"
        self.docs_base_url = "https://docs.ansible.com/projects/ansible"
    
    async def get_collections_for_version(self, ansible_version: str) -> List[Dict[str, Any]]:
        """
        Get collections for a specific Ansible version
        First tries Galaxy API, falls back to docs scraping
        """
        try:
            # Try Galaxy API first (more reliable)
            collections = await self._fetch_from_galaxy()
            logger.info(f"Retrieved {len(collections)} collections from Galaxy API")
            return collections
        except Exception as e:
            logger.warning(f"Galaxy API failed: {e}, falling back to docs scraping")
            try:
                collections = await self._fetch_from_docs(ansible_version)
                logger.info(f"Retrieved {len(collections)} collections from docs")
                return collections
            except Exception as e:
                logger.error(f"Both methods failed: {e}")
                return []
    
    async def _fetch_from_galaxy(self, limit: int = 100) -> List[Dict[str, Any]]:
        """Fetch collections from Galaxy API"""
        collections = []
        offset = 0
        
        async with httpx.AsyncClient(timeout=10.0, follow_redirects=True) as client:
            while True:
                url = f"{self.galaxy_base_url}?limit={limit}&offset={offset}"
                response = await client.get(url)
                response.raise_for_status()
                
                data = response.json()
                batch = data.get("data", [])
                
                # Debug: Log structure for first request
                if offset == 0:
                    logger.info(f"Galaxy API response structure: keys={list(data.keys())}")
                    if batch:
                        logger.info(f"First item structure: keys={list(batch[0].keys())}")
                        logger.info(f"First item sample: {batch[0]}")
                
                if not batch:
                    break
                
                for item in batch:
                    try:
                        # Galaxy API format: namespace is a string directly
                        namespace = item.get("namespace", "")
                        name = item.get("name", "")
                        
                        # Galaxy API format: highest_version is an object with version
                        version_data = item.get("highest_version", {})
                        version = version_data.get("version", "") if version_data else ""
                        
                        download_count = item.get("download_count", 0)
                        
                    except Exception as e:
                        logger.warning(f"Error parsing collection item: {e}, item: {item}")
                        continue
                    
                    collections.append({
                        "namespace": namespace,
                        "name": name,
                        "full_name": f"{namespace}.{name}",
                        "version": version,
                        "download_count": download_count,
                        "source": "galaxy_api"
                    })
                
                # Check if there are more pages
                if len(batch) < limit or not data.get("links", {}).get("next"):
                    break
                    
                offset += limit
                
                # Safety limit to avoid infinite loops
                if offset > 10000:
                    logger.warning("Reached safety limit, stopping pagination")
                    break
        
        # Sort by download count (most popular first)
        collections.sort(key=lambda x: x.get("download_count", 0), reverse=True)
        return collections
    
    async def _fetch_from_docs(self, ansible_version: str) -> List[Dict[str, Any]]:
        """Fetch collections from Ansible documentation (fallback)"""
        url = f"{self.docs_base_url}/{ansible_version}/collections/index.html"
        
        async with httpx.AsyncClient(timeout=10.0, follow_redirects=True) as client:
            response = await client.get(url)
            response.raise_for_status()
            
            soup = BeautifulSoup(response.text, 'html.parser')
            collections = []
            
            # Find collection links in the documentation
            # Look for links that match namespace.collection pattern
            for link in soup.find_all('a', href=True):
                href = link.get('href', '')
                text = link.get_text(strip=True)
                
                # Match pattern like "ansible.builtin", "community.general", etc.
                if '.' in text and not href.startswith('#') and 'collection' in href.lower():
                    parts = text.split('.')
                    if len(parts) == 2:
                        namespace, name = parts
                        collections.append({
                            "namespace": namespace,
                            "name": name,
                            "full_name": text,
                            "version": ansible_version,
                            "download_count": 0,
                            "source": f"docs_{ansible_version}"
                        })
            
            # Remove duplicates
            seen = set()
            unique_collections = []
            for collection in collections:
                if collection["full_name"] not in seen:
                    seen.add(collection["full_name"])
                    unique_collections.append(collection)
            
            return unique_collections


# Singleton instance
collections_service = CollectionsService()