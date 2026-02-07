"""
Ansible Versions Service - Dynamic version detection from Ansible documentation
"""

import re
import logging
from typing import List
from app.core.http_service import BaseHTTPService
from app.services.cache_service import cache

logger = logging.getLogger(__name__)


class AnsibleVersionsService(BaseHTTPService):
    """Service for detecting and managing Ansible versions dynamically"""

    ANSIBLE_DOCS_BASE_URL = "https://docs.ansible.com"

    # Import centralized TTL values
    from app.core.cache_config import CacheTTL
    CACHE_TTL = CacheTTL.VERSIONS
    CACHE_KEY_VERSIONS = "ansible_versions:available"

    def __init__(self):
        super().__init__(timeout=30)
    
    async def get_available_versions(self, force_refresh: bool = False) -> List[str]:
        """
        Récupère dynamiquement les versions Ansible disponibles
        
        Args:
            force_refresh: Force la récupération depuis le web (ignore le cache)
            
        Returns:
            Liste des versions Ansible disponibles
        """
        if not force_refresh:
            cached_versions = cache.get(self.CACHE_KEY_VERSIONS)
            if cached_versions:
                logger.info(f"Returning cached Ansible versions: {len(cached_versions)} versions")
                return cached_versions
        
        try:
            logger.info("Fetching Ansible versions from documentation")
            session = await self.get_session()
            
            async with session.get(f"{self.ANSIBLE_DOCS_BASE_URL}/ansible/") as response:
                if response.status == 200:
                    html_content = await response.text()
                    versions = self._parse_versions_from_html(html_content)
                    
                    # Validation des versions
                    validated_versions = await self._validate_versions(versions[:10])  # Valide top 10
                    
                    if validated_versions:
                        # Cache avec TTL de 24h
                        cache.set(self.CACHE_KEY_VERSIONS, validated_versions, self.CACHE_TTL)
                        logger.info(f"Found and validated {len(validated_versions)} Ansible versions")
                        return validated_versions
                    else:
                        logger.warning("No versions validated, using fallback")
                        return self._get_fallback_versions()
                else:
                    logger.error(f"Failed to fetch Ansible versions: HTTP {response.status}")
                    return self._get_fallback_versions()
                    
        except Exception as e:
            logger.error(f"Error fetching Ansible versions: {str(e)}")
            return self._get_fallback_versions()
    
    def _parse_versions_from_html(self, html: str) -> List[str]:
        """
        Parse les versions depuis le HTML de la page principale
        """
        versions = []
        
        try:
            # Ajouter "latest" en premier
            versions.append("latest")
            
            # Pattern pour extraire les versions Ansible Community Package (Ansible 13, 12, etc.)
            ansible_pattern = r'Ansible\s+(\d+)'
            ansible_versions = re.findall(ansible_pattern, html)
            
            # Trier et ajouter les versions (ordre décroissant)
            for version in sorted(set(ansible_versions), key=int, reverse=True):
                versions.append(version)
            
            # Ajouter 2.10 qui est une version spéciale historique
            if "2.10" not in versions:
                versions.append("2.10")
            
            logger.info(f"Parsed {len(versions)} versions from HTML: {versions[:5]}...")
            return versions
            
        except Exception as e:
            logger.error(f"Error parsing versions from HTML: {str(e)}")
            return self._get_fallback_versions()
    
    async def _validate_versions(self, versions: List[str]) -> List[str]:
        """
        Valide que les versions ont des documentations disponibles
        """
        validated = []
        session = await self.get_session()
        
        for version in versions:
            try:
                # Test URL collections pour cette version
                if version == "latest":
                    test_url = f"{self.ANSIBLE_DOCS_BASE_URL}/ansible/latest/collections/"
                else:
                    test_url = f"{self.ANSIBLE_DOCS_BASE_URL}/projects/ansible/{version}/collections/"
                
                async with session.head(test_url) as response:
                    if response.status == 200:
                        validated.append(version)
                        logger.debug(f"Version {version} validated successfully")
                    else:
                        logger.warning(f"Version {version} not available (HTTP {response.status})")
            except Exception as e:
                logger.warning(f"Failed to validate version {version}: {str(e)}")
                continue
        
        return validated
    
    def _get_fallback_versions(self) -> List[str]:
        """
        Versions de fallback en cas d'échec du scraping
        """
        fallback = [
            "latest", "13", "12", "11", "10", "9", "8", "7", "6", "5", "4", "3", "2.10"
        ]
        logger.info(f"Using fallback versions: {fallback}")
        return fallback
    
    async def validate_version_exists(self, version: str) -> bool:
        """
        Vérifie qu'une version spécifique existe
        """
        available_versions = await self.get_available_versions()
        return version in available_versions
    
    def get_collections_url_for_version(self, version: str) -> str:
        """
        Construit l'URL de la page collections pour une version
        """
        return self.build_docs_url("collections/", version)

    def build_docs_url(self, path: str, version: str = "latest") -> str:
        """
        Build Ansible documentation URL for a specific version.

        Args:
            path: Path within the documentation (e.g., "collections/", "collections/ansible/builtin/")
            version: Ansible version ("latest", "13", "12", etc.)

        Returns:
            Full documentation URL

        Examples:
            build_docs_url("collections/", "latest")
            -> "https://docs.ansible.com/ansible/latest/collections/"

            build_docs_url("collections/amazon/aws/", "13")
            -> "https://docs.ansible.com/projects/ansible/13/collections/amazon/aws/"
        """
        if version == "latest":
            return f"{self.ANSIBLE_DOCS_BASE_URL}/ansible/latest/{path}"
        else:
            return f"{self.ANSIBLE_DOCS_BASE_URL}/projects/ansible/{version}/{path}"

# Instance globale du service
ansible_versions_service = AnsibleVersionsService()