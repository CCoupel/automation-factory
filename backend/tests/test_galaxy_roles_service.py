"""
Unit tests for Galaxy Roles Service
"""

import pytest
from unittest.mock import AsyncMock, patch, MagicMock
from app.services.galaxy_roles_service import GalaxyRolesService


class TestGalaxyRolesService:
    """Test suite for GalaxyRolesService"""

    PUBLIC_SOURCE = {
        "id": "pub-1",
        "name": "Ansible Galaxy (Public)",
        "source_type": "public",
        "url": "https://galaxy.ansible.com",
        "token": None,
        "priority": 10,
    }

    PRIVATE_SOURCE = {
        "id": "priv-1",
        "name": "Private Hub",
        "source_type": "private",
        "url": "https://hub.mycompany.com",
        "token": "my-secret-token",
        "priority": 5,
    }

    @pytest.fixture
    def service(self):
        """Create a fresh service instance with public Galaxy only"""
        svc = GalaxyRolesService()
        with patch.object(svc, '_get_active_sources', return_value=[self.PUBLIC_SOURCE]):
            yield svc

    @pytest.fixture
    def service_with_private(self):
        """Create service with both public and private Galaxy"""
        svc = GalaxyRolesService()
        with patch.object(svc, '_get_active_sources', return_value=[self.PRIVATE_SOURCE, self.PUBLIC_SOURCE]):
            yield svc

    # ========================================
    # Configuration Tests
    # ========================================

    def test_get_config_public_only(self, service):
        """Test config with only public Galaxy"""
        config = service.get_config()

        assert config["public_url"] == "https://galaxy.ansible.com"
        assert config["private_configured"] is False
        assert config["private_url"] is None

    def test_get_config_with_private(self, service_with_private):
        """Test config with private Galaxy configured"""
        config = service_with_private.get_config()

        assert config["public_url"] == "https://galaxy.ansible.com"
        assert config["private_configured"] is True
        assert config["private_url"] == "https://hub.mycompany.com"

    def test_get_base_url_public(self, service):
        """Test base URL for public source"""
        url = service._get_base_url("public")
        assert url == "https://galaxy.ansible.com"

    def test_get_base_url_private_not_configured(self, service):
        """Test base URL returns None when private not configured"""
        url = service._get_base_url("private")
        assert url is None

    def test_get_base_url_private_configured(self, service_with_private):
        """Test base URL for private source"""
        url = service_with_private._get_base_url("private")
        assert url == "https://hub.mycompany.com"

    def test_get_headers_public(self, service):
        """Test headers for public Galaxy (no auth)"""
        headers = service._get_headers("public")
        assert "Authorization" not in headers
        assert headers["Accept"] == "application/json"

    def test_get_headers_private_with_token(self, service_with_private):
        """Test headers for private Galaxy (with auth)"""
        headers = service_with_private._get_headers("private")
        assert headers["Authorization"] == "Token my-secret-token"

    # ========================================
    # Standalone Role Normalization Tests
    # ========================================

    def test_normalize_standalone_role_basic(self, service):
        """Test normalizing a basic standalone role"""
        raw_role = {
            "id": 12345,
            "name": "docker",
            "namespace": "geerlingguy",
            "description": "Docker installation role",
            "download_count": 5000000,
            "github_user": "geerlingguy",
            "github_repo": "ansible-role-docker",
            "created": "2015-01-01",
            "modified": "2024-01-01"
        }

        normalized = service._normalize_standalone_role(raw_role)

        assert normalized["id"] == 12345
        assert normalized["name"] == "docker"
        assert normalized["namespace"] == "geerlingguy"
        assert normalized["fqrn"] == "geerlingguy.docker"
        assert normalized["type"] == "standalone"
        assert normalized["download_count"] == 5000000

    def test_normalize_standalone_role_nested_namespace(self, service):
        """Test normalizing role with nested namespace in summary_fields"""
        raw_role = {
            "id": 12345,
            "name": "nginx",
            "summary_fields": {
                "namespace": {"name": "geerlingguy"}
            },
            "description": "Nginx role"
        }

        normalized = service._normalize_standalone_role(raw_role)

        assert normalized["namespace"] == "geerlingguy"
        assert normalized["fqrn"] == "geerlingguy.nginx"

    def test_normalize_standalone_role_dict_namespace(self, service):
        """Test normalizing role with dict namespace"""
        raw_role = {
            "id": 12345,
            "name": "mysql",
            "namespace": {"name": "geerlingguy"},
            "description": "MySQL role"
        }

        normalized = service._normalize_standalone_role(raw_role)

        assert normalized["namespace"] == "geerlingguy"
        assert normalized["fqrn"] == "geerlingguy.mysql"

    # ========================================
    # Collection Role Extraction Tests
    # ========================================

    def test_extract_roles_from_collection_docs(self, service):
        """Test extracting roles from collection documentation"""
        docs_data = {
            "contents": [
                {
                    "content_type": "module",
                    "content_name": "copy",
                    "description": "Copy files"
                },
                {
                    "content_type": "role",
                    "content_name": "docker_swarm",
                    "description": "Configure Docker Swarm"
                },
                {
                    "content_type": "role",
                    "content_name": "firewalld",
                    "description": "Manage firewalld"
                }
            ]
        }

        roles = service._extract_roles_from_collection_docs(
            docs_data, "community", "general"
        )

        assert len(roles) == 2
        assert roles[0]["name"] == "docker_swarm"
        assert roles[0]["fqcn"] == "community.general.docker_swarm"
        assert roles[0]["type"] == "collection"
        assert roles[1]["name"] == "firewalld"

    def test_extract_roles_from_collection_docs_empty(self, service):
        """Test extracting roles from collection with no roles"""
        docs_data = {
            "contents": [
                {
                    "content_type": "module",
                    "content_name": "debug",
                    "description": "Print debug messages"
                }
            ]
        }

        roles = service._extract_roles_from_collection_docs(
            docs_data, "ansible", "builtin"
        )

        assert len(roles) == 0

    def test_extract_roles_from_collection_info(self, service):
        """Test extracting roles from collection_info section"""
        docs_data = {
            "contents": [],
            "collection_info": {
                "roles": ["my_role", "another_role"]
            }
        }

        roles = service._extract_roles_from_collection_docs(
            docs_data, "myns", "mycol"
        )

        assert len(roles) == 2
        assert roles[0]["name"] == "my_role"
        assert roles[0]["fqcn"] == "myns.mycol.my_role"

    # ========================================
    # API Call Tests (with mocking)
    # ========================================

    @pytest.mark.asyncio
    async def test_get_standalone_roles_cached(self, service):
        """Test that cached roles are returned without HTTP call"""
        cached_data = {
            "count": 2,
            "next": None,
            "previous": None,
            "results": [
                {"id": 1, "name": "docker", "namespace": "geerlingguy", "fqrn": "geerlingguy.docker", "type": "standalone"}
            ]
        }

        with patch('app.services.galaxy_roles_service.cache') as mock_cache:
            mock_cache.get.return_value = cached_data

            result = await service.get_standalone_roles()

            assert result == cached_data
            mock_cache.get.assert_called_once()

    @pytest.mark.asyncio
    async def test_get_standalone_roles_http_success(self, service):
        """Test successful HTTP call to Galaxy v1 API"""
        api_response = {
            "count": 1,
            "next": None,
            "previous": None,
            "results": [
                {
                    "id": 12345,
                    "name": "docker",
                    "namespace": "geerlingguy",
                    "description": "Docker role",
                    "download_count": 5000000
                }
            ]
        }

        with patch('app.services.galaxy_roles_service.cache') as mock_cache:
            mock_cache.get.return_value = None

            mock_response = AsyncMock()
            mock_response.status = 200
            mock_response.json = AsyncMock(return_value=api_response)

            mock_context = AsyncMock()
            mock_context.__aenter__.return_value = mock_response
            mock_context.__aexit__.return_value = None

            mock_session = MagicMock()
            mock_session.get.return_value = mock_context

            with patch.object(service, 'get_session', return_value=mock_session):
                result = await service.get_standalone_roles()

                assert result["count"] == 1
                assert len(result["results"]) == 1
                assert result["results"][0]["name"] == "docker"
                assert result["results"][0]["fqrn"] == "geerlingguy.docker"

    @pytest.mark.asyncio
    async def test_get_standalone_roles_http_error(self, service):
        """Test handling of HTTP error"""
        with patch('app.services.galaxy_roles_service.cache') as mock_cache:
            mock_cache.get.return_value = None

            mock_response = AsyncMock()
            mock_response.status = 500

            mock_context = AsyncMock()
            mock_context.__aenter__.return_value = mock_response
            mock_context.__aexit__.return_value = None

            mock_session = MagicMock()
            mock_session.get.return_value = mock_context

            with patch.object(service, 'get_session', return_value=mock_session):
                result = await service.get_standalone_roles()

                assert result["count"] == 0
                assert result["results"] == []

    @pytest.mark.asyncio
    async def test_get_collection_roles_cached(self, service):
        """Test that cached collection roles are returned"""
        cached_roles = [
            {"name": "role1", "fqcn": "ns.col.role1", "type": "collection"}
        ]

        with patch('app.services.galaxy_roles_service.cache') as mock_cache:
            mock_cache.get.return_value = cached_roles

            result = await service.get_collection_roles("ns", "col")

            assert result == cached_roles

    @pytest.mark.asyncio
    async def test_get_popular_namespaces(self, service):
        """Test getting popular namespaces"""
        roles_data = {
            "count": 3,
            "results": [
                {"namespace": "geerlingguy", "download_count": 1000000},
                {"namespace": "geerlingguy", "download_count": 500000},
                {"namespace": "ansible", "download_count": 200000}
            ]
        }

        with patch.object(service, 'get_standalone_roles', return_value=roles_data):
            with patch('app.services.galaxy_roles_service.cache') as mock_cache:
                mock_cache.get.return_value = None

                namespaces = await service.get_popular_namespaces(limit=10)

                assert len(namespaces) >= 1
                # geerlingguy should be first (most downloads)
                assert namespaces[0]["name"] == "geerlingguy"
                assert namespaces[0]["total_downloads"] == 1500000

    # ========================================
    # Integration Test (real API call)
    # ========================================

    @pytest.mark.asyncio
    @pytest.mark.skip(reason="Integration test - requires network access")
    async def test_real_api_call(self, service):
        """Integration test - uncomment to test real API"""
        result = await service.get_standalone_roles(
            search="docker",
            page_size=5
        )
        assert result["count"] > 0
        assert len(result["results"]) <= 5
        await service.close_session()
