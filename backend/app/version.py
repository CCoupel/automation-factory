"""
Application version information
"""

__version__ = "1.9.0_5"
__description__ = "Ansible Builder API with module parameter schemas from Galaxy API"

# Features by version - used for About page and API
VERSION_FEATURES = {
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

def get_current_version():
    """Get current version string"""
    return __version__

def get_version_info():
    """Get complete version information including features"""
    # Extract base version (remove -rc.X or _N suffix)
    base_version = __version__
    if '-rc.' in base_version:
        base_version = base_version.split('-')[0]
    elif '_' in base_version:
        base_version = base_version.split('_')[0]
    
    return {
        "version": __version__,
        "base_version": base_version,
        "description": __description__,
        "is_rc": "-rc." in __version__,
        "features": VERSION_FEATURES.get(base_version, {})
    }