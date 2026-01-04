"""
Ansible Collections Service - Web scraping from Ansible documentation
"""

import re
import logging
from typing import Dict, List, Any
from bs4 import BeautifulSoup
from app.core.http_service import BaseHTTPService
from app.services.cache_service import cache
from app.services.ansible_versions_service import ansible_versions_service

logger = logging.getLogger(__name__)


class AnsibleCollectionsService(BaseHTTPService):
    """Service for scraping collections and modules from Ansible documentation"""

    # Import centralized TTL values
    from app.core.cache_config import CacheTTL
    CACHE_TTL_COLLECTIONS = CacheTTL.COLLECTIONS
    CACHE_TTL_MODULES = CacheTTL.MODULES
    CACHE_TTL_SCHEMA = CacheTTL.MODULE_SCHEMA

    def __init__(self):
        super().__init__(timeout=60)
    
    async def get_collections(self, version: str, force_refresh: bool = False) -> Dict[str, List[str]]:
        """
        Récupère les collections disponibles pour une version Ansible

        Args:
            version: Version Ansible (latest, 13, 12, etc.)
            force_refresh: Si True, ignore le cache et récupère les données fraîches

        Returns:
            Dictionnaire {namespace: [collections]}
        """
        cache_key = f"ansible_collections:{version}"

        # Check cache unless force_refresh is requested
        if not force_refresh:
            cached_result = cache.get(cache_key)
            if cached_result:
                logger.info(f"Returning cached collections for Ansible {version}")
                return cached_result
        else:
            logger.info(f"Force refresh requested - bypassing cache for Ansible {version}")
            # Clear existing cache
            cache.delete(cache_key)

        try:
            logger.info(f"Fetching collections for Ansible version {version} from docs.ansible.com")
            collections_url = ansible_versions_service.get_collections_url_for_version(version)

            session = await self.get_session()
            async with session.get(collections_url) as response:
                if response.status == 200:
                    html_content = await response.text()
                    collections = self._parse_collections_from_html(html_content)

                    # Cache le résultat
                    cache.set(cache_key, collections, self.CACHE_TTL_COLLECTIONS)
                    logger.info(f"Found {len(collections)} namespaces for Ansible {version}")
                    return collections
                else:
                    logger.error(f"Failed to fetch collections for {version}: HTTP {response.status}")
                    return {}

        except Exception as e:
            logger.error(f"Error fetching collections for {version}: {str(e)}")
            return {}
    
    def _parse_collections_from_html(self, html: str) -> Dict[str, List[str]]:
        """
        Parse les namespaces depuis le HTML de la page index des collections
        La page principale liste les namespaces (amazon/index.html, ansible/index.html, etc.)
        """
        collections = {}

        try:
            soup = BeautifulSoup(html, 'html.parser')

            # Sur la page index, les liens sont relatifs comme "amazon/index.html"
            # Chercher tous les liens qui pointent vers namespace/index.html
            namespace_links = soup.find_all('a', href=re.compile(r'^[a-z][a-z0-9_]+/index\.html$', re.IGNORECASE))

            for link in namespace_links:
                href = link.get('href', '')
                # Extraire le namespace depuis le lien relatif
                match = re.match(r'^([a-z][a-z0-9_]+)/index\.html$', href, re.IGNORECASE)
                if match:
                    namespace = match.group(1)
                    # Ignorer les liens de navigation comme ../index.html
                    if namespace not in collections and namespace not in ['index', 'genindex', 'search']:
                        collections[namespace] = []  # Collections seront chargées à la demande

            logger.info(f"Parsed {len(collections)} namespaces from collections index page")
            logger.debug(f"Namespaces found: {list(collections.keys())[:10]}...")
            return collections

        except Exception as e:
            logger.error(f"Error parsing namespaces from HTML: {str(e)}")
            return {}

    async def get_namespace_collections(self, version: str, namespace: str) -> List[str]:
        """
        Récupère les collections d'un namespace spécifique

        Args:
            version: Version Ansible
            namespace: Nom du namespace (ex: amazon, ansible, community)

        Returns:
            Liste des noms de collections
        """
        cache_key = f"ansible_ns_collections:{version}:{namespace}"
        cached_result = cache.get(cache_key)

        if cached_result:
            logger.info(f"Returning cached collections for namespace {namespace}")
            return cached_result

        try:
            # Construire URL de la page namespace
            if version == "latest":
                namespace_url = f"https://docs.ansible.com/ansible/latest/collections/{namespace}/index.html"
            else:
                namespace_url = f"https://docs.ansible.com/projects/ansible/{version}/collections/{namespace}/index.html"

            logger.info(f"Fetching collections for namespace {namespace} from {namespace_url}")

            session = await self.get_session()
            async with session.get(namespace_url) as response:
                if response.status == 200:
                    html_content = await response.text()
                    collections = self._parse_namespace_collections_from_html(html_content)

                    # Cache le résultat
                    cache.set(cache_key, collections, self.CACHE_TTL_COLLECTIONS)
                    logger.info(f"Found {len(collections)} collections for namespace {namespace}")
                    return collections
                else:
                    logger.error(f"Failed to fetch namespace {namespace}: HTTP {response.status}")
                    return []

        except Exception as e:
            logger.error(f"Error fetching collections for namespace {namespace}: {str(e)}")
            return []

    def _parse_namespace_collections_from_html(self, html: str) -> List[str]:
        """
        Parse les collections depuis la page d'un namespace
        Les liens sont au format collection/index.html (ex: aws/index.html)
        """
        collections = []

        try:
            soup = BeautifulSoup(html, 'html.parser')

            # Chercher les liens vers les collections (format: collection/index.html)
            collection_links = soup.find_all('a', href=re.compile(r'^[a-z][a-z0-9_]+/index\.html$', re.IGNORECASE))

            for link in collection_links:
                href = link.get('href', '')
                match = re.match(r'^([a-z][a-z0-9_]+)/index\.html$', href, re.IGNORECASE)
                if match:
                    collection = match.group(1)
                    if collection not in collections and collection not in ['index', 'genindex', 'search']:
                        collections.append(collection)

            collections.sort()
            logger.debug(f"Parsed {len(collections)} collections from namespace page")
            return collections

        except Exception as e:
            logger.error(f"Error parsing collections from namespace HTML: {str(e)}")
            return []

    async def get_collection_modules(self, version: str, namespace: str, collection: str) -> List[Dict[str, Any]]:
        """
        Récupère les modules d'une collection spécifique
        """
        cache_key = f"ansible_modules:{version}:{namespace}:{collection}"
        cached_result = cache.get(cache_key)
        
        if cached_result:
            logger.info(f"Returning cached modules for {namespace}.{collection} (Ansible {version})")
            return cached_result
        
        try:
            # Construire URL de la collection
            if version == "latest":
                collection_url = f"https://docs.ansible.com/ansible/latest/collections/{namespace}/{collection}/index.html"
            else:
                collection_url = f"https://docs.ansible.com/projects/ansible/{version}/collections/{namespace}/{collection}/index.html"
            
            logger.info(f"Fetching modules from {collection_url}")
            
            session = await self.get_session()
            async with session.get(collection_url) as response:
                if response.status == 200:
                    html_content = await response.text()
                    modules = self._parse_modules_from_collection_html(html_content)
                    
                    # Cache le résultat
                    cache.set(cache_key, modules, self.CACHE_TTL_MODULES)
                    logger.info(f"Found {len(modules)} modules for {namespace}.{collection}")
                    return modules
                else:
                    logger.error(f"Failed to fetch modules for {namespace}.{collection}: HTTP {response.status}")
                    return []
                    
        except Exception as e:
            logger.error(f"Error fetching modules for {namespace}.{collection}: {str(e)}")
            return []
    
    def _parse_modules_from_collection_html(self, html: str) -> List[Dict[str, Any]]:
        """
        Parse les modules depuis la page d'une collection
        """
        modules = []
        
        try:
            soup = BeautifulSoup(html, 'html.parser')
            
            # Chercher la section "Plugin Index" ou "Modules"
            # Format: liens vers module_name_module.html
            module_links = soup.find_all('a', href=re.compile(r'[^/]+_module\.html'))
            
            for link in module_links:
                href = link.get('href', '')
                text = link.get_text(strip=True)
                
                # Extraire nom du module depuis l'href
                match = re.search(r'([^/]+)_module\.html', href)
                if match:
                    module_name = match.group(1)
                    
                    # Essayer d'extraire la description depuis le texte suivant
                    description = ""
                    next_sibling = link.next_sibling
                    if next_sibling and isinstance(next_sibling, str):
                        description = next_sibling.strip(' –-')
                    
                    modules.append({
                        "name": module_name,
                        "description": description or f"{module_name} module",
                        "href": href
                    })
            
            # Trier par nom
            modules.sort(key=lambda x: x['name'])
            
            logger.debug(f"Parsed {len(modules)} modules")
            return modules
            
        except Exception as e:
            logger.error(f"Error parsing modules from HTML: {str(e)}")
            return []
    
    async def get_module_schema(self, version: str, namespace: str, collection: str, module: str) -> Dict[str, Any]:
        """
        Récupère le schéma d'un module en parsant sa documentation HTML
        """
        cache_key = f"ansible_schema:{version}:{namespace}:{collection}:{module}"
        cached_result = cache.get(cache_key)
        
        if cached_result:
            logger.info(f"Returning cached schema for {namespace}.{collection}.{module}")
            return cached_result
        
        try:
            # Construire URL du module
            if version == "latest":
                module_url = f"https://docs.ansible.com/ansible/latest/collections/{namespace}/{collection}/{module}_module.html"
            else:
                module_url = f"https://docs.ansible.com/projects/ansible/{version}/collections/{namespace}/{collection}/{module}_module.html"
            
            logger.info(f"Fetching schema from {module_url}")
            
            session = await self.get_session()
            async with session.get(module_url) as response:
                if response.status == 200:
                    html_content = await response.text()
                    schema = self._parse_module_schema_from_html(html_content, module)
                    
                    # Cache le résultat
                    cache.set(cache_key, schema, self.CACHE_TTL_SCHEMA)
                    logger.info(f"Extracted schema for {namespace}.{collection}.{module}")
                    return schema
                else:
                    logger.error(f"Failed to fetch module documentation: HTTP {response.status}")
                    raise Exception(f"Module documentation not available (HTTP {response.status})")
                    
        except Exception as e:
            logger.error(f"Error fetching schema for {namespace}.{collection}.{module}: {str(e)}")
            raise
    
    def _parse_module_schema_from_html(self, html: str, module_name: str) -> Dict[str, Any]:
        """
        Parse le schéma des paramètres depuis la documentation HTML du module
        """
        try:
            soup = BeautifulSoup(html, 'html.parser')
            
            schema = {
                "module": module_name,
                "description": "",
                "parameters": [],
                "examples": [],
                "return_values": []
            }
            
            # Extraire la description principale
            description_elem = soup.find('div', class_='section')
            if description_elem:
                desc_p = description_elem.find('p')
                if desc_p:
                    schema["description"] = desc_p.get_text(strip=True)
            
            # Chercher la table des paramètres
            param_table = soup.find('table') or soup.find('dl', class_='simple')
            
            if param_table:
                schema["parameters"] = self._extract_parameters_from_table(param_table)
            
            # Chercher les exemples
            examples_section = soup.find('div', id='examples') or soup.find(text=re.compile('Examples?'))
            if examples_section:
                schema["examples"] = self._extract_examples(soup, examples_section)
            
            logger.debug(f"Extracted {len(schema['parameters'])} parameters for {module_name}")
            return schema
            
        except Exception as e:
            logger.error(f"Error parsing module schema: {str(e)}")
            return {
                "module": module_name,
                "description": f"Documentation parsing failed for {module_name}",
                "parameters": [],
                "examples": [],
                "return_values": []
            }
    
    def _extract_parameters_from_table(self, table_elem) -> List[Dict[str, Any]]:
        """Extrait les paramètres depuis une table ou liste HTML"""
        parameters = []

        # Known Ansible parameter types
        PARAM_TYPES = ['string', 'boolean', 'list', 'dict', 'dictionary', 'integer', 'float', 'path', 'raw', 'any']

        try:
            if table_elem.name == 'table':
                rows = table_elem.find_all('tr')[1:]  # Skip header
                for row in rows:
                    cols = row.find_all('td')
                    if len(cols) >= 2:
                        first_cell = cols[0]
                        second_cell = cols[1]

                        # Extract parameter name from <strong> tag
                        strong = first_cell.find('strong')
                        if strong:
                            param_name = strong.get_text(strip=True)
                        else:
                            # Fallback: first text node
                            param_name = first_cell.get_text(strip=True).split()[0] if first_cell.get_text(strip=True) else ""

                        # Skip if no valid name
                        if not param_name or param_name.startswith('aliases'):
                            continue

                        # Get full text of first cell for type/aliases extraction
                        first_cell_text = first_cell.get_text()

                        # Extract type
                        param_type = "string"  # Default
                        for t in PARAM_TYPES:
                            if t in first_cell_text.lower():
                                param_type = t if t != 'dictionary' else 'dict'
                                break

                        # Extract aliases (text format: "aliases: name1, name2\n")
                        aliases = []
                        alias_match = re.search(r'aliases?:\s*([^\n]+)', first_cell_text, re.IGNORECASE)
                        if alias_match:
                            alias_text = alias_match.group(1).strip()
                            # Clean up: remove type keywords that might be at the end
                            for t in PARAM_TYPES:
                                alias_text = re.sub(rf'\s*{t}\s*$', '', alias_text, flags=re.IGNORECASE)
                            aliases = [a.strip() for a in alias_text.split(',') if a.strip()]

                        # Get description from second cell
                        param_desc = second_cell.get_text(strip=True)

                        # Check if required (in first 200 chars of description)
                        is_required = 'required' in param_desc[:200].lower()

                        # Extract default value if present
                        default_value = None
                        default_match = re.search(r'[Dd]efault[s]?:\s*([^\n.]+)', param_desc)
                        if default_match:
                            default_value = default_match.group(1).strip()

                        parameters.append({
                            "name": param_name,
                            "type": param_type,
                            "required": is_required,
                            "description": param_desc,
                            "default": default_value,
                            "aliases": aliases if aliases else None
                        })

            elif table_elem.name == 'dl':
                dts = table_elem.find_all('dt')
                for dt in dts:
                    # Extract name from strong if present
                    strong = dt.find('strong')
                    if strong:
                        param_name = strong.get_text(strip=True)
                    else:
                        param_name = dt.get_text(strip=True).split()[0] if dt.get_text(strip=True) else ""

                    if not param_name:
                        continue

                    dd = dt.find_next_sibling('dd')
                    param_desc = dd.get_text(strip=True) if dd else ""

                    parameters.append({
                        "name": param_name,
                        "type": "string",
                        "required": 'required' in param_desc[:200].lower() if param_desc else False,
                        "description": param_desc,
                        "default": None,
                        "aliases": None
                    })

        except Exception as e:
            logger.warning(f"Error extracting parameters: {str(e)}")

        return parameters
    
    def _extract_examples(self, soup, examples_section) -> List[str]:
        """Extrait les exemples depuis la documentation"""
        examples = []
        
        try:
            # Chercher les blocs de code après la section examples
            code_blocks = soup.find_all('pre') or soup.find_all('code')
            
            for block in code_blocks[:3]:  # Limiter à 3 exemples
                example_text = block.get_text(strip=True)
                if example_text and len(example_text) > 10:
                    examples.append(example_text)
        
        except Exception as e:
            logger.warning(f"Error extracting examples: {str(e)}")
        
        return examples

# Instance globale du service
ansible_collections_service = AnsibleCollectionsService()