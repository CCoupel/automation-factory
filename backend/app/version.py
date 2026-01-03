"""
Application version information
"""
import os

__version__ = "2.1.0-rc.2"
__description__ = "Ansible Builder API with Diagram Export/Import"

# Environment: PROD (default), STAGING, DEV
# In PROD, RC suffix is hidden from displayed version
ENVIRONMENT = os.getenv("ENVIRONMENT", "PROD")

# Features by version - used for About page and API
VERSION_FEATURES = {
    "2.1.0": {
        "title": "Diagram Export/Import",
        "release_date": "2026-01-03",
        "features": [
            "Export diagram as JSON (.abd format) - full backup with positions",
            "Export diagram as Mermaid (.md) - for documentation",
            "Export diagram as SVG - vector image for presentations",
            "Import diagram from .abd file with validation",
            "Format versioning for future compatibility",
            "Integrity checks (checksum, counts) on import"
        ],
        "improvements": [
            "Proprietary .abd format with migration support",
            "Feature detection for compatibility warnings",
            "UI state preservation (collapsed blocks, viewport)",
            "Validation feedback with errors and warnings"
        ],
        "technical": [
            "AnsibleBuilderDiagram type with header/metadata/content/integrity",
            "Backend exporters (abd_exporter, mermaid_exporter, svg_exporter)",
            "API endpoints /api/export/{abd,mermaid,svg}",
            "playbook_export_service.py for consistent traversal",
            "diagramExportApiService.ts for frontend API calls",
            "ImportDiagramDialog.tsx with file selection and feedback"
        ]
    },
    "2.0.0": {
        "title": "Galaxy Roles Integration",
        "release_date": "2026-01-01",
        "features": [
            "Galaxy API v1 for standalone/legacy roles (author.role_name format)",
            "Galaxy API v3 for collection roles (namespace.collection.role format)",
            "Private Galaxy support (AAP Automation Hub or Galaxy NG)",
            "Configuration to disable public Galaxy",
            "Drag & drop roles to playbook with duplicates allowed",
            "Role enable/disable toggle with visual indicator",
            "Role reordering via drag & drop",
            "Role configuration panel with variables support",
            "Source toggle between public and private Galaxy"
        ],
        "improvements": [
            "36,000+ standalone roles available from Galaxy v1 API",
            "Collection roles extracted from Galaxy v3 docs-blob",
            "Token-based authentication for private Galaxy",
            "Caching with 30-minute TTL for role lists",
            "Disabled roles excluded from YAML generation",
            "Roles with vars properly serialized in playbook"
        ],
        "technical": [
            "galaxy_roles_service.py: Unified v1+v3 API access",
            "galaxy_roles.py: REST endpoints /api/galaxy-roles/*",
            "galaxyRolesApiService.ts: Frontend API client with caching",
            "RolesTreeView.tsx: Complete refactor with tabs and source toggle",
            "GALAXY_PUBLIC_ENABLED config to disable public Galaxy",
            "RoleDefinition type with enabled property",
            "playbookPreviewService.ts: Role filtering and YAML generation"
        ]
    },
    "1.18.0": {
        "title": "Rationalisation du Code",
        "release_date": "2025-12-31",
        "features": [
            "Élimination de la duplication de code (~800 lignes supprimées)",
            "Service centralisé de contrôle d'accès playbooks",
            "Service unifié de gestion des favoris",
            "Gestion d'erreurs API standardisée (apiErrorHandler)",
            "Composant DraggableListItem réutilisable"
        ],
        "improvements": [
            "Réduction de 32% du code dans collaborationService.ts",
            "Réduction de 25% du code dans user_favorites.py",
            "Architecture plus maintenable et extensible",
            "Logs d'audit unifiés pour toutes les actions"
        ],
        "technical": [
            "playbook_access_service.py: Contrôle d'accès + audit centralisés",
            "favorites_service.py: CRUD générique namespaces/collections/modules",
            "apiErrorHandler.ts: withApiErrorHandling wrapper",
            "DraggableListItem.tsx: Base pour ModuleListItem et GenericElementListItem",
            "constants/moduleConfigs.ts: Extraction configurations modules"
        ]
    },
    "1.17.0": {
        "title": "Bloc Assertions Système",
        "release_date": "2025-12-29",
        "features": [
            "Génération automatique d'un bloc assertions PAR VARIABLE dans pre_tasks",
            "Validation des variables required, types, patterns et valeurs par défaut",
            "Blocs système visibles mais verrouillés (non modifiables)",
            "Icône cadenas et style grisé pour les blocs système",
            "Support des types custom avec regexp ou filtres (| from_json)"
        ],
        "improvements": [
            "UN BLOC PAR VARIABLE pour meilleure organisation visuelle",
            "Assertions exécutées en premier dans pre_tasks via liens",
            "Support des types int, bool, list, dict avec expressions Jinja2",
            "Positionnement automatique avec espacement correct"
        ],
        "technical": [
            "Service assertions_service.py pour génération YAML",
            "assertionsGenerator.ts avec multi-blocs et liens automatiques",
            "Flag isSystem sur ModuleBlock pour blocs non-modifiables",
            "Protection drag/delete/edit dans WorkZone"
        ]
    },
    "1.16.0": {
        "title": "Types de Variables Personnalisables",
        "release_date": "2025-12-29",
        "features": [
            "Types de variables personnalisables par l'administrateur",
            "Validation par regexp ou filtres Ansible (| from_json, | from_yaml)",
            "Interface d'administration pour creer/modifier/supprimer les types",
            "Types builtin immutables (string, int, bool, list, dict)",
            "Activation/desactivation des types personnalises"
        ],
        "improvements": [
            "Selection dynamique des types dans AddVariableDialog",
            "Affichage des patterns de validation",
            "Cache 5 minutes pour les types de variables"
        ],
        "technical": [
            "Table custom_variable_types en base de donnees",
            "API /variable-types avec endpoints admin",
            "Service de validation regexp et filtres",
            "Onglet Types Variables dans ConfigurationDialog"
        ]
    },
    "1.15.0": {
        "title": "Gestion des Variables Amelioree",
        "release_date": "2025-12-25",
        "features": [
            "Edition inline des variables",
            "Support des types de variables (string, int, bool, list, dict)",
            "Interface VarsZone connectee au playbook",
            "Validation des noms et valeurs de variables"
        ],
        "improvements": [
            "UX amelioree pour la gestion des variables",
            "Icones de type pour chaque variable",
            "Synchronisation temps reel des variables"
        ],
        "technical": [
            "Composant VarsZone refactorise",
            "Integration avec WorkZone state",
            "Support collaboration WebSocket pour variables"
        ]
    },
    "1.14.3": {
        "title": "Vue Arborescente Elements (TreeView)",
        "release_date": "2025-12-25",
        "features": [
            "Vue arborescente pour namespaces/collections/modules",
            "Chargement paresseux (lazy loading) des données",
            "Recherche et filtre des namespaces",
            "Drag & drop des modules vers le playbook depuis TreeView"
        ],
        "improvements": [
            "Navigation plus intuitive dans les collections Ansible",
            "Meilleure visibilité de la hiérarchie namespace/collection/module",
            "Indicateurs de chargement par nœud"
        ],
        "technical": [
            "Composant ModulesTreeView avec MUI X Tree View",
            "SimpleTreeView avec expansion contrôlée",
            "Icônes différenciées par niveau (Folder/Widgets/Extension)",
            "Intégration avec GalaxyCacheContext pour les données"
        ]
    },
    "1.14.0": {
        "title": "Synchronisation Temps Réel des Playbooks",
        "release_date": "2025-12-22",
        "features": [
            "Synchronisation temps réel des modifications entre collaborateurs",
            "Versioning des playbooks pour gestion des conflits",
            "Updates granulaires (module, config, liens, plays, variables)",
            "Debounce 300ms pour optimisation performance",
            "Highlight visuel des éléments modifiés par autres utilisateurs"
        ],
        "improvements": [
            "Réactivité améliorée lors de l'édition collaborative",
            "Notification visuelle des modifications reçues",
            "Gestion intelligente des conflits avec versioning"
        ],
        "technical": [
            "Hook useCollaborationSync pour application des updates",
            "Types d'updates: module_add, module_move, module_delete, module_config, link_*, play_*, variable_*",
            "Debounce intégré pour réduction du trafic WebSocket",
            "Version field sur Playbook pour détection de conflits"
        ]
    },
    "1.13.0": {
        "title": "Collaboration Multi-utilisateur Temps Réel",
        "release_date": "2025-12-22",
        "features": [
            "Système de rôles (Propriétaire/Éditeur/Visualiseur)",
            "Partage de playbooks par username",
            "Synchronisation temps réel via WebSockets",
            "Avatars des utilisateurs connectés",
            "Highlight des modifications reçues",
            "Indicateur de partage sur les playbooks personnels",
            "Transfert de propriété lors de la suppression d'un playbook partagé"
        ],
        "improvements": [
            "Collaboration en temps réel entre utilisateurs",
            "Audit log des modifications",
            "Gestion des conflits d'édition",
            "Séparation playbooks personnels / partagés avec onglets",
            "Affichage du propriétaire et rôle pour playbooks partagés"
        ],
        "technical": [
            "WebSocket endpoint avec ConnectionManager",
            "Tables playbook_shares et playbook_audit_log",
            "Broadcast des modifications aux collaborateurs",
            "JWT token enrichi avec username pour WebSockets"
        ]
    },
    "1.12.2": {
        "title": "Ansible Lint Integration",
        "release_date": "2025-12-20",
        "features": [
            "ansible-lint validation for playbooks",
            "Detailed lint issues with rule IDs and severity levels",
            "Real-time lint preview without saving",
            "Support for error, warning, and info severity levels"
        ],
        "improvements": [
            "Enhanced playbook quality validation",
            "Structured lint output with line numbers",
            "Integration with existing validation workflow"
        ],
        "technical": [
            "ansible-lint subprocess execution with JSON output",
            "Temporary file handling for lint validation",
            "Comprehensive issue parsing from lint results"
        ]
    },
    "1.10.0": {
        "title": "Ansible Documentation Integration",
        "release_date": "2025-12-14",
        "features": [
            "Dynamic Ansible version detection from official documentation",
            "Direct integration with Ansible docs for module parameters",
            "Complete collection coverage across Ansible versions",
            "Automatic version synchronization with upstream releases",
            "Enhanced module documentation parsing from HTML sources"
        ],
        "improvements": [
            "Eliminated dependency on Galaxy API doc_strings",
            "Comprehensive collection support (70+ collections per version)",
            "Version-specific documentation accuracy",
            "Simplified API architecture with /api/ansible endpoints"
        ],
        "technical": [
            "Web scraping service for Ansible documentation",
            "Intelligent caching with 24-hour TTL for versions",
            "Fallback mechanisms for offline scenarios",
            "Namespace and collection preservation for user experience"
        ]
    },
    "1.9.0": {
        "title": "Module Parameter Collection",
        "release_date": "2025-12-14",
        "features": [
            "Dynamic module parameter collection from Galaxy API",
            "Schema-based configuration interface with help tooltips",
            "Enhanced error handling (404 vs 500) for missing modules",
            "Performance optimization for module schema retrieval",
            "Robust handling of Galaxy API edge cases"
        ],
        "improvements": [
            "Help icons with tooltips replace verbose parameter descriptions",
            "Caching strategy with 60-minute TTL for module schemas", 
            "TypeScript interfaces for module schemas and parameters",
            "Comprehensive error logging and user feedback"
        ],
        "technical": [
            "Galaxy API v3 docs-blob endpoint integration",
            "Support for all parameter types: str, int, bool, list, dict, path",
            "Dynamic form generation based on parameter schemas",
            "Cache hit/miss tracking for performance monitoring"
        ]
    },
    "1.8.0": {
        "title": "User Favorites and Version Management",
        "release_date": "2025-12-08", 
        "features": [
            "User favorites system for namespaces and collections",
            "Version management system with 3-phase deployment process",
            "Galaxy SMART API optimization with 3-tier enrichment",
            "MUI Tabs value error fixes with ALL tab selection"
        ],
        "improvements": [
            "Optimized performance for favorite namespaces",
            "Smart caching with selective data refresh",
            "Enhanced UI with better navigation patterns",
            "Improved error handling and user feedback"
        ]
    }
}

def get_base_version(version: str) -> str:
    """Extract base version (remove -rc.X or _N suffix)"""
    if '-rc.' in version:
        return version.split('-')[0]
    elif '_' in version:
        return version.split('_')[0]
    return version

def get_display_version() -> str:
    """Get version string for display (hides RC in PROD)"""
    if ENVIRONMENT == "PROD":
        return get_base_version(__version__)
    return __version__

def get_current_version():
    """Get current version string (respects ENVIRONMENT)"""
    return get_display_version()

def get_version_info():
    """Get complete version information including features"""
    base_version = get_base_version(__version__)
    display_version = get_display_version()

    return {
        "version": display_version,
        "base_version": base_version,
        "internal_version": __version__,  # Always shows full version for debugging
        "environment": ENVIRONMENT,
        "description": __description__,
        "is_rc": "-rc." in __version__ and ENVIRONMENT != "PROD",
        "features": VERSION_FEATURES.get(base_version, {})
    }