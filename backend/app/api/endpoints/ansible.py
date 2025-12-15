"""
Ansible Documentation API Endpoints
"""

from fastapi import APIRouter, HTTPException, Path, Query
from typing import Dict, List, Any
import logging

from app.services.ansible_versions_service import ansible_versions_service
from app.services.ansible_collections_service import ansible_collections_service

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/ansible", tags=["ansible"])

@router.get("/versions")
async def get_ansible_versions(
    force_refresh: bool = Query(False, description="Force refresh from upstream")
):
    """
    Récupère dynamiquement les versions Ansible disponibles
    
    Returns:
        Liste des versions Ansible avec métadonnées
    """
    try:
        logger.info(f"Fetching Ansible versions (force_refresh={force_refresh})")
        versions = await ansible_versions_service.get_available_versions(force_refresh)
        
        return {
            "versions": versions,
            "total_count": len(versions),
            "cache_ttl": ansible_versions_service.CACHE_TTL,
            "source": "ansible_docs_dynamic"
        }
    except Exception as e:
        logger.error(f"Failed to fetch Ansible versions: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to fetch versions: {str(e)}")

@router.get("/{version}/collections")
async def get_collections_for_version(
    version: str = Path(..., description="Ansible version (latest, 13, 12, etc.)")
) -> Dict[str, Any]:
    """
    Récupère les collections disponibles pour une version Ansible donnée
    
    Retourne au format compatible avec l'existant:
    {namespace: [collection1, collection2, ...]}
    """
    try:
        logger.info(f"Fetching collections for Ansible version {version}")
        
        # Valider que la version existe
        available_versions = await ansible_versions_service.get_available_versions()
        if version not in available_versions:
            raise HTTPException(
                status_code=404, 
                detail=f"Ansible version '{version}' not found. Available versions: {available_versions[:5]}..."
            )
        
        # Récupérer les collections depuis la documentation
        collections = await ansible_collections_service.get_collections(version)
        
        if not collections:
            raise HTTPException(
                status_code=404,
                detail=f"No collections found for Ansible version {version}"
            )
        
        return {
            "ansible_version": version,
            "collections": collections,
            "total_namespaces": len(collections),
            "total_collections": sum(len(colls) for colls in collections.values()),
            "source": "ansible_docs"
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching collections for version {version}: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to fetch collections: {str(e)}")

@router.get("/{version}/namespaces")
async def get_namespaces_for_version(
    version: str = Path(..., description="Ansible version")
) -> Dict[str, Any]:
    """
    Récupère les namespaces disponibles (compatible avec l'API existante)
    """
    try:
        logger.info(f"Fetching namespaces for Ansible version {version}")
        
        # Récupérer les collections et les transformer en format namespaces
        collections = await ansible_collections_service.get_collections(version)
        
        namespaces = []
        for namespace, collection_list in collections.items():
            namespaces.append({
                "name": namespace,
                "collections_count": len(collection_list),
                "collections": collection_list
            })
        
        return {
            "ansible_version": version,
            "namespaces": namespaces,
            "total_count": len(namespaces),
            "source": "ansible_docs"
        }
        
    except Exception as e:
        logger.error(f"Error fetching namespaces for version {version}: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to fetch namespaces: {str(e)}")

@router.get("/{version}/namespaces/{namespace}/collections")
async def get_namespace_collections(
    version: str = Path(..., description="Ansible version"),
    namespace: str = Path(..., description="Namespace name")
) -> Dict[str, Any]:
    """
    Récupère les collections d'un namespace spécifique
    """
    try:
        logger.info(f"Fetching collections for namespace {namespace} in Ansible {version}")

        # Utiliser la méthode dédiée pour récupérer les collections du namespace
        namespace_collections = await ansible_collections_service.get_namespace_collections(version, namespace)

        if not namespace_collections:
            raise HTTPException(
                status_code=404,
                detail=f"Namespace '{namespace}' not found or has no collections in Ansible version {version}"
            )

        return {
            "ansible_version": version,
            "namespace": namespace,
            "collections": namespace_collections,
            "total_collections": len(namespace_collections),
            "source": "ansible_docs"
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching collections for namespace {namespace}: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to fetch collections: {str(e)}")

@router.get("/{version}/namespaces/{namespace}/collections/{collection}/modules")
async def get_collection_modules(
    version: str = Path(..., description="Ansible version"),
    namespace: str = Path(..., description="Namespace name"),
    collection: str = Path(..., description="Collection name")
) -> Dict[str, Any]:
    """
    Récupère les modules d'une collection spécifique
    """
    try:
        logger.info(f"Fetching modules for {namespace}.{collection} in Ansible {version}")
        
        modules = await ansible_collections_service.get_collection_modules(
            version, namespace, collection
        )
        
        if not modules:
            raise HTTPException(
                status_code=404,
                detail=f"No modules found for collection {namespace}.{collection} in Ansible {version}"
            )
        
        return {
            "ansible_version": version,
            "namespace": namespace,
            "collection": collection,
            "modules": modules,
            "total_modules": len(modules),
            "source": "ansible_docs"
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching modules for {namespace}.{collection}: {str(e)}")
        raise HTTPException(
            status_code=404, 
            detail=f"Collection {namespace}.{collection} not found for Ansible {version}"
        )

@router.get("/{version}/namespaces/{namespace}/collections/{collection}/modules/{module}/schema")
async def get_module_schema(
    version: str = Path(..., description="Ansible version"),
    namespace: str = Path(..., description="Namespace name"),
    collection: str = Path(..., description="Collection name"),
    module: str = Path(..., description="Module name")
) -> Dict[str, Any]:
    """
    Récupère le schéma détaillé d'un module depuis la documentation Ansible
    """
    try:
        logger.info(f"Fetching schema for {namespace}.{collection}.{module} in Ansible {version}")
        
        schema = await ansible_collections_service.get_module_schema(
            version, namespace, collection, module
        )
        
        return {
            "ansible_version": version,
            "namespace": namespace,
            "collection": collection,
            "module": module,
            "schema": schema,
            "source": "ansible_docs",
            "documentation_url": f"https://docs.ansible.com/ansible/{version if version != 'latest' else 'latest'}/collections/{namespace}/{collection}/{module}_module.html"
        }
        
    except Exception as e:
        logger.error(f"Error fetching schema for {namespace}.{collection}.{module}: {str(e)}")
        raise HTTPException(
            status_code=404,
            detail=f"Module documentation not available for {namespace}.{collection}.{module} in Ansible {version}"
        )

@router.get("/{version}/collections/stats")
async def get_collections_stats(
    version: str = Path(..., description="Ansible version")
) -> Dict[str, Any]:
    """
    Statistiques des collections pour une version Ansible
    """
    try:
        logger.info(f"Fetching collection statistics for Ansible {version}")
        
        collections = await ansible_collections_service.get_collections(version)
        
        stats = {
            "ansible_version": version,
            "total_namespaces": len(collections),
            "total_collections": sum(len(colls) for colls in collections.values()),
            "namespaces": {}
        }
        
        # Statistiques par namespace
        for namespace, collection_list in collections.items():
            stats["namespaces"][namespace] = {
                "collections_count": len(collection_list),
                "collections": collection_list
            }
        
        # Top namespaces par nombre de collections
        stats["top_namespaces"] = sorted(
            [(ns, len(colls)) for ns, colls in collections.items()],
            key=lambda x: x[1],
            reverse=True
        )[:10]
        
        return stats
        
    except Exception as e:
        logger.error(f"Error fetching stats for version {version}: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to fetch statistics: {str(e)}")

# Health check pour les services Ansible
@router.get("/health")
async def ansible_health_check():
    """
    Vérification de santé des services Ansible
    """
    try:
        # Test rapide de récupération des versions
        versions = await ansible_versions_service.get_available_versions()
        
        return {
            "status": "healthy",
            "service": "ansible_documentation",
            "versions_available": len(versions),
            "latest_version": versions[0] if versions else "unknown",
            "cache_status": "active"
        }
        
    except Exception as e:
        logger.error(f"Ansible health check failed: {str(e)}")
        return {
            "status": "unhealthy",
            "service": "ansible_documentation",
            "error": str(e),
            "cache_status": "unknown"
        }