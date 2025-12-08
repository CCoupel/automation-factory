"""
Smart Galaxy Service - Optimized API direct approach
Méthode 2 Option A: API directe namespaces + collections ciblées
"""

import asyncio
import httpx
import time
from typing import List, Dict, Any, Optional
import logging
from datetime import datetime
from .cache_service import cache, cached_galaxy_request

logger = logging.getLogger(__name__)

class SmartGalaxyService:
    """
    Service Galaxy optimisé avec API directe namespaces
    Focus: Réactivité maximale avec minimum d'API calls
    """
    
    def __init__(self):
        # Galaxy API endpoints (utilise les URLs qui fonctionnent)
        self.galaxy_base_url = "https://galaxy.ansible.com/api/v3/plugin/ansible/content/published/collections/index"
        # Pas d'endpoint namespaces direct - utilise extraction depuis collections
        self.collections_url = self.galaxy_base_url
        
        # Performance settings
        self.max_concurrent = 3  # Conservative pour éviter rate limits
        self.semaphore = asyncio.Semaphore(self.max_concurrent)
        self.request_delay = 0.2  # 200ms entre requêtes
        
        # Stats tracking
        self.last_sync_time: Optional[datetime] = None
        self.sync_stats = {
            "api_calls": 0,
            "namespaces_fetched": 0,
            "collections_fetched": 0,
            "errors": 0,
            "duration_seconds": 0
        }
    
    async def startup_sync_smart(self) -> Dict[str, Any]:
        """
        Sync optimisée au démarrage
        Méthode 2 Option A: API directe namespaces
        """
        start_time = time.time()
        self.sync_stats = {"api_calls": 0, "namespaces_fetched": 0, "collections_fetched": 0, "errors": 0}
        
        logger.info("🚀 Starting SMART Galaxy sync (API directe namespaces)")
        
        try:
            # Phase 1: Récupération directe des namespaces (1 API call)
            namespaces = await self._get_namespaces_direct()
            
            # Phase 2: Collections pour top namespaces (5-10 API calls max)
            enriched_namespaces = await self._enrich_top_namespaces(namespaces)
            
            # Phase 3: Cache avec TTL long pour données stables
            await self._cache_results(enriched_namespaces)
            
            duration = time.time() - start_time
            self.sync_stats["duration_seconds"] = duration
            self.last_sync_time = datetime.utcnow()
            
            logger.info(f"✅ SMART sync completed in {duration:.2f}s")
            logger.info(f"📊 Stats: {self.sync_stats['api_calls']} API calls, "
                       f"{self.sync_stats['namespaces_fetched']} namespaces, "
                       f"{self.sync_stats['collections_fetched']} collections")
            
            return {
                "status": "success",
                "sync_time": self.last_sync_time.isoformat(),
                "stats": self.sync_stats.copy(),
                "namespaces_count": len(enriched_namespaces),
                "method": "api_direct_namespaces"
            }
            
        except Exception as e:
            duration = time.time() - start_time
            self.sync_stats["duration_seconds"] = duration
            logger.error(f"❌ SMART sync failed after {duration:.2f}s: {e}")
            
            return {
                "status": "error",
                "error": str(e),
                "stats": self.sync_stats.copy(),
                "method": "api_direct_namespaces"
            }
    
    async def _get_namespaces_direct(self) -> List[Dict]:
        """
        Phase 1: Extraction optimisée des namespaces depuis collections
        Approche directe mais efficace (pas d'API namespaces disponible)
        """
        logger.info("📥 Phase 1: Extracting namespaces from collections (optimized)...")
        
        try:
            async with httpx.AsyncClient(timeout=30.0, follow_redirects=True) as client:
                # Extraction directe depuis collections (seule méthode qui fonctionne)
                return await self._extract_namespaces_from_collections(client)
                
        except Exception as e:
            logger.error(f"❌ Failed to get namespaces: {e}")
            self.sync_stats["errors"] += 1
            return []
    
    async def _extract_namespaces_from_collections(self, client: httpx.AsyncClient) -> List[Dict]:
        """
        Extraction optimisée des namespaces depuis collections
        Utilise l'URL et paramètres qui fonctionnent (basés sur galaxy_service.py)
        """
        try:
            # URL correcte avec / final requis par Galaxy API
            url = f"{self.collections_url}/?limit=300"
            logger.info(f"Fetching collections from: {url}")
            response = await client.get(url)
            response.raise_for_status()
            self.sync_stats["api_calls"] += 1
            
            data = response.json()
            collections = data.get("data", [])
            
            # Extraire namespaces uniques avec métadonnées
            namespaces_dict = {}
            for collection in collections:
                ns_name = collection.get("namespace", "")
                if ns_name and ns_name not in namespaces_dict:
                    namespaces_dict[ns_name] = {
                        "name": ns_name,
                        "collection_count": 0,  # Sera calculé phase 2
                        "total_downloads": 0,
                        "discovered_from": "collections_sample"
                    }
            
            # Trier par fréquence d'apparition (popularité estimée)
            namespace_counts = {}
            for collection in collections:
                ns = collection.get("namespace", "")
                namespace_counts[ns] = namespace_counts.get(ns, 0) + 1
            
            # Ordonner par popularité estimée
            sorted_namespaces = sorted(
                namespaces_dict.values(),
                key=lambda x: namespace_counts.get(x["name"], 0),
                reverse=True
            )
            
            logger.info(f"✅ Extracted {len(sorted_namespaces)} namespaces from collections")
            self.sync_stats["namespaces_fetched"] = len(sorted_namespaces)
            return sorted_namespaces
            
        except Exception as e:
            logger.error(f"❌ Fallback extraction failed: {e}")
            self.sync_stats["errors"] += 1
            return []
    
    async def _enrich_top_namespaces(self, namespaces: List[Dict]) -> List[Dict]:
        """
        Phase 2: Enrichir les top namespaces avec leurs collections
        Maximum 10 API calls pour les namespaces les plus importants
        """
        logger.info("📚 Phase 2: Enriching top namespaces with collections...")
        
        # Sélectionner top namespaces (priorité par popularité estimée)
        PRIORITY_NAMESPACES = [
            "community", "ansible", "cisco", "redhat", "amazon",
            "microsoft", "google", "vmware", "f5networks", "fortinet"
        ]
        
        # Mixer prioritaires + découverts
        top_namespaces = []
        
        # D'abord les prioritaires s'ils existent
        for priority_ns in PRIORITY_NAMESPACES:
            for ns in namespaces:
                if ns["name"] == priority_ns:
                    top_namespaces.append(ns)
                    break
        
        # Puis les autres découverts jusqu'à 10 total
        for ns in namespaces:
            if len(top_namespaces) >= 10:
                break
            if ns not in top_namespaces:
                top_namespaces.append(ns)
        
        logger.info(f"Enriching {len(top_namespaces)} top namespaces: {[ns['name'] for ns in top_namespaces[:5]]}...")
        
        # Enrichissement en parallèle avec limitation
        enrichment_tasks = []
        for namespace in top_namespaces:
            task = self._enrich_namespace_collections(namespace)
            enrichment_tasks.append(task)
        
        # Exécution par batch avec délai
        batch_size = 3
        enriched_results = []
        
        for i in range(0, len(enrichment_tasks), batch_size):
            batch = enrichment_tasks[i:i + batch_size]
            batch_results = await asyncio.gather(*batch, return_exceptions=True)
            enriched_results.extend(batch_results)
            
            # Délai entre batches
            if i + batch_size < len(enrichment_tasks):
                await asyncio.sleep(self.request_delay * 3)
        
        # Traitement des résultats
        final_namespaces = []
        for i, result in enumerate(enriched_results):
            if isinstance(result, dict):
                final_namespaces.append(result)
            else:
                # En cas d'erreur, garder namespace original
                final_namespaces.append(top_namespaces[i])
        
        # Ajouter les namespaces non-enrichis (au-delà du top 10) sans doublons
        enriched_names = {ns["name"] for ns in final_namespaces}
        for ns in namespaces[len(top_namespaces):]:
            if ns["name"] not in enriched_names:
                final_namespaces.append(ns)
                enriched_names.add(ns["name"])
        
        logger.info(f"✅ Enriched {len([r for r in enriched_results if isinstance(r, dict)])} namespaces with collections")
        
        return final_namespaces
    
    async def _enrich_namespace_collections(self, namespace: Dict) -> Dict:
        """
        Enrichir un namespace avec ses collections (1 API call)
        """
        async with self.semaphore:
            try:
                await asyncio.sleep(self.request_delay)  # Rate limiting
                
                async with httpx.AsyncClient(timeout=15.0) as client:
                    # Récupérer métadonnées + échantillon collections (avec / final requis)
                    url = f"{self.collections_url}/?namespace={namespace['name']}&limit=10"
                    response = await client.get(url)
                    response.raise_for_status()
                    self.sync_stats["api_calls"] += 1
                    
                    data = response.json()
                    collections = data.get("data", [])
                    meta = data.get("meta", {})
                    total_count = meta.get("count", len(collections))
                    
                    # Calculer downloads total estimé
                    total_downloads = 0
                    if collections:
                        sample_downloads = sum(col.get("download_count", 0) for col in collections)
                        # Estimation proportionnelle
                        if len(collections) > 0 and total_count > len(collections):
                            total_downloads = int(sample_downloads * (total_count / len(collections)))
                        else:
                            total_downloads = sample_downloads
                    
                    # Enrichir namespace
                    enriched = namespace.copy()
                    enriched.update({
                        "collection_count": total_count,
                        "total_downloads": total_downloads,
                        "top_collections": collections[:5],  # Garder top 5 pour cache
                        "enriched": True
                    })
                    
                    self.sync_stats["collections_fetched"] += len(collections)
                    
                    logger.debug(f"✅ Enriched {namespace['name']}: {total_count} collections, {total_downloads:,} downloads")
                    return enriched
                    
            except Exception as e:
                logger.warning(f"❌ Failed to enrich {namespace['name']}: {e}")
                self.sync_stats["errors"] += 1
                return namespace  # Retourner original en cas d'erreur
    
    async def _cache_results(self, namespaces: List[Dict]):
        """
        Phase 3: Cache des résultats avec TTL optimisé
        """
        try:
            # Cache long pour données stables
            ttl_namespaces = 6 * 3600  # 6h pour namespaces
            ttl_collections = 2 * 3600  # 2h pour collections
            
            # Cache namespaces complet
            cache.set("galaxy_smart:all_namespaces", namespaces, ttl_namespaces)
            
            # Cache popular namespaces (top 10) - prendre les 10 premiers même si non-enriched
            popular_ns = namespaces[:10]  # Prendre top 10 indépendamment de l'enrichment
            cache.set("galaxy_smart:popular_namespaces", popular_ns, ttl_namespaces)
            
            # Cache collections par namespace enrichi
            for ns in namespaces:
                if ns.get("top_collections"):
                    cache_key = f"galaxy_smart:collections:{ns['name']}"
                    cache.set(cache_key, ns["top_collections"], ttl_collections)
            
            # Cache metadata sync
            sync_metadata = {
                "last_sync": self.last_sync_time.isoformat() if self.last_sync_time else None,
                "stats": self.sync_stats.copy(),
                "method": "smart_api_direct"
            }
            cache.set("galaxy_smart:sync_metadata", sync_metadata, ttl_namespaces)
            
            logger.info(f"✅ Cached {len(namespaces)} namespaces, {len(popular_ns)} popular, sync metadata")
            
        except Exception as e:
            logger.error(f"❌ Failed to cache results: {e}")
    
    # API publiques pour récupération
    
    def get_cached_namespaces(self, popular_only: bool = False) -> List[Dict]:
        """Récupérer namespaces depuis cache"""
        cache_key = "galaxy_smart:popular_namespaces" if popular_only else "galaxy_smart:all_namespaces"
        cached = cache.get(cache_key)
        return cached if cached else []
    
    def get_cached_collections(self, namespace: str) -> List[Dict]:
        """Récupérer collections depuis cache"""
        cache_key = f"galaxy_smart:collections:{namespace}"
        cached = cache.get(cache_key)
        return cached if cached else []
    
    def get_sync_status(self) -> Dict[str, Any]:
        """Status de la dernière sync"""
        cached = cache.get("galaxy_smart:sync_metadata")
        if cached:
            return cached
        return {
            "last_sync": None,
            "stats": self.sync_stats.copy(),
            "method": "smart_api_direct",
            "cache_status": "no_metadata"
        }


# Singleton instance
smart_galaxy_service = SmartGalaxyService()