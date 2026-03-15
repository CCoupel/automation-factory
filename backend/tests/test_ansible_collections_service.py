"""
Tests for AnsibleCollectionsService
"""

import pytest
from unittest.mock import AsyncMock, patch, MagicMock
from app.services.ansible_collections_service import AnsibleCollectionsService

@pytest.fixture
def service():
    """Create a fresh AnsibleCollectionsService instance for each test"""
    return AnsibleCollectionsService()

@pytest.fixture
def mock_collections_html():
    """Mock HTML response from collections index page (relative links like the real page)"""
    return """
    <!DOCTYPE html>
    <html>
    <body>
        <h1>Ansible Collections Index</h1>
        <ul>
            <li><a href="community/index.html">community</a></li>
            <li><a href="ansible/index.html">ansible</a></li>
        </ul>
    </body>
    </html>
    """

@pytest.fixture
def mock_collection_detail_html():
    """Mock HTML response from a specific collection page"""
    return """
    <!DOCTYPE html>
    <html>
    <body>
        <h1>community.general Collection</h1>
        <div class="plugin-index">
            <h2>Modules</h2>
            <ul>
                <li><a href="copy_module.html">copy module</a> - Copy files to remote locations</li>
                <li><a href="file_module.html">file module</a> - Manage files and directories</li>
                <li><a href="template_module.html">template module</a> - Template a file out to a remote server</li>
            </ul>
        </div>
    </body>
    </html>
    """

@pytest.fixture
def mock_module_detail_html():
    """Mock HTML response from a module documentation page"""
    return """
    <!DOCTYPE html>
    <html>
    <body>
        <h1>copy module</h1>
        <div class="section">
            <p>Copy files to remote locations with backup option.</p>
            <table class="documentation-table">
                <tr><th>Parameter</th><th>Description</th></tr>
                <tr>
                    <td><strong>src</strong> string</td>
                    <td>Source file on the local host. required</td>
                </tr>
                <tr>
                    <td><strong>dest</strong> path</td>
                    <td>Remote absolute path where the file should be copied to. required</td>
                </tr>
            </table>
        </div>
    </body>
    </html>
    """

class TestAnsibleCollectionsService:

    def test_parse_collections_from_html(self, service, mock_collections_html):
        """Test parsing namespaces from collections index HTML"""
        collections = service._parse_collections_from_html(mock_collections_html)

        assert isinstance(collections, dict)
        assert "community" in collections
        assert "ansible" in collections
        # Collections are loaded on demand, so initially empty lists
        assert isinstance(collections["community"], list)

    def test_parse_modules_from_collection_html(self, service, mock_collection_detail_html):
        """Test parsing modules from collection HTML"""
        modules = service._parse_modules_from_collection_html(mock_collection_detail_html)

        assert len(modules) == 3
        assert any(m["name"] == "copy" for m in modules)
        assert any(m["name"] == "file" for m in modules)
        assert any(m["name"] == "template" for m in modules)

    def test_extract_parameters_from_html(self, service, mock_module_detail_html):
        """Test extracting module parameters from HTML"""
        schema = service._parse_module_schema_from_html(mock_module_detail_html, "copy")

        assert schema["module"] == "copy"
        assert "Copy files to remote locations" in schema["description"]
        assert len(schema["parameters"]) >= 2

        param_names = [p["name"] for p in schema["parameters"]]
        assert "src" in param_names
        assert "dest" in param_names

    @pytest.mark.asyncio
    @patch('app.services.ansible_collections_service.cache')
    async def test_get_collections_cached(self, mock_cache, service):
        """Test getting collections from cache"""
        cached_collections = {"community": ["general", "aws"], "ansible": ["posix"]}
        mock_cache.get.return_value = cached_collections

        result = await service.get_collections("latest")

        assert result == cached_collections
        mock_cache.get.assert_called_once()

    @pytest.mark.asyncio
    @patch('app.services.ansible_collections_service.cache')
    @patch('app.services.ansible_versions_service.ansible_versions_service')
    async def test_get_collections_web_scraping(self, mock_versions_service, mock_cache,
                                               service, mock_collections_html):
        """Test getting collections via web scraping"""
        mock_cache.get.return_value = None  # No cache
        mock_versions_service.get_collections_url_for_version.return_value = "https://docs.ansible.com/ansible/latest/collections/"

        # Mock HTTP response
        mock_response = AsyncMock()
        mock_response.status = 200
        mock_response.text.return_value = mock_collections_html

        mock_context = AsyncMock()
        mock_context.__aenter__.return_value = mock_response
        mock_session = MagicMock()
        mock_session.get.return_value = mock_context

        with patch.object(service, 'get_session', return_value=mock_session):
            result = await service.get_collections("latest")

        assert "community" in result
        assert "ansible" in result
        mock_cache.set.assert_called_once()

    @pytest.mark.asyncio
    @patch('app.services.ansible_collections_service.cache')
    async def test_get_collection_modules_cached(self, mock_cache, service):
        """Test getting collection modules from cache"""
        cached_modules = [
            {"name": "copy", "description": "Copy files", "href": "copy_module.html"},
            {"name": "file", "description": "Manage files", "href": "file_module.html"}
        ]
        mock_cache.get.return_value = cached_modules

        result = await service.get_collection_modules("latest", "community", "general")

        assert result == cached_modules
        mock_cache.get.assert_called_once()

    @pytest.mark.asyncio
    @patch('app.services.ansible_collections_service.cache')
    async def test_get_collection_modules_web_scraping(self, mock_cache, service,
                                                      mock_collection_detail_html):
        """Test getting collection modules via web scraping"""
        mock_cache.get.return_value = None  # No cache

        # Mock HTTP response
        mock_response = AsyncMock()
        mock_response.status = 200
        mock_response.text.return_value = mock_collection_detail_html

        mock_context = AsyncMock()
        mock_context.__aenter__.return_value = mock_response
        mock_session = MagicMock()
        mock_session.get.return_value = mock_context

        with patch.object(service, 'get_session', return_value=mock_session):
            result = await service.get_collection_modules("latest", "community", "general")

        assert len(result) == 3
        assert any(m["name"] == "copy" for m in result)
        mock_cache.set.assert_called_once()

    @pytest.mark.asyncio
    @patch('app.services.ansible_collections_service.cache')
    async def test_get_module_schema_cached(self, mock_cache, service):
        """Test getting module schema from cache"""
        cached_schema = {
            "module": "copy",
            "description": "Copy files",
            "parameters": [{"name": "src", "type": "string", "required": True, "description": "Source file"}],
            "examples": [],
            "return_values": []
        }
        mock_cache.get.return_value = cached_schema

        result = await service.get_module_schema("latest", "community", "general", "copy")

        assert result == cached_schema
        mock_cache.get.assert_called_once()

    @pytest.mark.asyncio
    @patch('app.services.ansible_collections_service.cache')
    async def test_get_module_schema_web_scraping(self, mock_cache, service,
                                                 mock_module_detail_html):
        """Test getting module schema via web scraping"""
        mock_cache.get.return_value = None  # No cache

        # Mock HTTP response
        mock_response = AsyncMock()
        mock_response.status = 200
        mock_response.text.return_value = mock_module_detail_html

        mock_context = AsyncMock()
        mock_context.__aenter__.return_value = mock_response
        mock_session = MagicMock()
        mock_session.get.return_value = mock_context

        with patch.object(service, 'get_session', return_value=mock_session):
            result = await service.get_module_schema("latest", "community", "general", "copy")

        assert result["module"] == "copy"
        assert len(result["parameters"]) >= 2
        assert any(p["name"] == "src" for p in result["parameters"])
        mock_cache.set.assert_called_once()

    @pytest.mark.asyncio
    async def test_get_collections_http_error(self, service):
        """Test handling of HTTP errors"""
        mock_response = AsyncMock()
        mock_response.status = 404

        mock_context = AsyncMock()
        mock_context.__aenter__.return_value = mock_response
        mock_session = MagicMock()
        mock_session.get.return_value = mock_context

        with patch('app.services.ansible_collections_service.cache') as mock_cache:
            mock_cache.get.return_value = None
            with patch.object(service, 'get_session', return_value=mock_session):
                result = await service.get_collections("invalid_version")

        assert result == {}

    @pytest.mark.asyncio
    async def test_get_module_schema_http_error(self, service):
        """Test handling of HTTP errors for module schema"""
        mock_response = AsyncMock()
        mock_response.status = 404

        mock_context = AsyncMock()
        mock_context.__aenter__.return_value = mock_response
        mock_session = MagicMock()
        mock_session.get.return_value = mock_context

        with patch('app.services.ansible_collections_service.cache') as mock_cache:
            mock_cache.get.return_value = None
            with patch.object(service, 'get_session', return_value=mock_session):
                with pytest.raises(Exception) as exc_info:
                    await service.get_module_schema("latest", "invalid", "collection", "module")

            assert "Module documentation not available" in str(exc_info.value)
