"""
Centralized cache TTL configuration

Provides consistent cache durations across all services.
All values are in seconds.
"""


class CacheTTL:
    """Standard cache TTL values for the application"""

    # Short-lived cache (for frequently changing data)
    SHORT = 300  # 5 minutes

    # Medium cache (default for most API responses)
    MEDIUM = 900  # 15 minutes

    # Standard cache (for stable data)
    STANDARD = 1800  # 30 minutes

    # Long cache (for rarely changing data)
    LONG = 3600  # 1 hour

    # Extended cache (for very stable data like version lists)
    EXTENDED = 86400  # 24 hours

    # Specific use cases (mapped to standard values for clarity)
    ROLES_LIST = STANDARD  # 30 minutes - role listings
    ROLE_DETAILS = LONG  # 1 hour - individual role details
    NAMESPACES = EXTENDED  # 24 hours - namespace listings
    COLLECTIONS = LONG  # 1 hour - collection listings
    MODULES = LONG  # 1 hour - module listings
    MODULE_SCHEMA = EXTENDED  # 24 hours - module parameter schemas
    VERSIONS = EXTENDED  # 24 hours - Ansible version list
