"""
Application version information
"""
import os

__version__ = "1.14.0-rc.12"
__description__ = "Ansible Builder API with dynamic Ansible documentation integration"

# Environment: PROD (default), STAGING, DEV
# In PROD, RC suffix is hidden from displayed version
ENVIRONMENT = os.getenv("ENVIRONMENT", "PROD")

# Features by version - used for About page and API
VERSION_FEATURES = {
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