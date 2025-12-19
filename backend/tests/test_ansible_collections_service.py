"""
Tests for AnsibleCollectionsService
"""

import pytest
from unittest.mock import AsyncMock, patch, MagicMock
from app.services.ansible_collections_service import AnsibleCollectionsService

@pytest.fixture
def ansible_collections_service():
    """Create a fresh AnsibleCollectionsService instance for each test"""
    return AnsibleCollectionsService()

@pytest.fixture
def mock_collections_html():
    """Mock HTML response from collections index page"""
    return """
    <!DOCTYPE html>
    <html>
    <body>
        <h1>Ansible Collections Index</h1>
        <ul>
            <li><a href="/ansible/latest/collections/community/general/">community.general</a></li>
            <li><a href="/ansible/latest/collections/community/aws/">community.aws</a></li>
            <li><a href="/ansible/latest/collections/ansible/posix/">ansible.posix</a></li>
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
        </div>
        <table class="docutils">
            <thead>
                <tr>
                    <th>Parameter</th>
                    <th>Description</th>
                </tr>
            </thead>
            <tbody>
                <tr>
                    <td>src</td>
                    <td>Local path to a file to copy to the remote server; can be absolute or relative. Required when state=file</td>
                </tr>
                <tr>
                    <td>dest</td>
                    <td>Remote absolute path where the file should be copied to. Required</td>
                </tr>
            </tbody>
        </table>
        <h3>Examples</h3>
        <pre><code>
- name: Copy file with owner and permissions
  copy:
    src: /etc/foo.conf
    dest: /tmp/foo.conf
    owner: foo
    group: foo
    mode: '0644'
        </code></pre>
    </body>
    </html>
    """

class TestAnsibleCollectionsService:
    
    def test_parse_collections_from_html(self, ansible_collections_service, mock_collections_html):
        """Test parsing collections from HTML"""
        collections = ansible_collections_service._parse_collections_from_html(mock_collections_html)
        
        assert "community" in collections
        assert "ansible" in collections
        assert "general" in collections["community"]
        assert "aws" in collections["community"] 
        assert "posix" in collections["ansible"]
        
    def test_parse_modules_from_collection_html(self, ansible_collections_service, mock_collection_detail_html):
        """Test parsing modules from collection HTML"""
        modules = ansible_collections_service._parse_modules_from_collection_html(mock_collection_detail_html)
        
        assert len(modules) == 3
        assert any(m["name"] == "copy" for m in modules)
        assert any(m["name"] == "file" for m in modules)
        assert any(m["name"] == "template" for m in modules)
        
    def test_extract_parameters_from_html(self, ansible_collections_service, mock_module_detail_html):
        """Test extracting module parameters from HTML"""
        schema = ansible_collections_service._parse_module_schema_from_html(mock_module_detail_html, "copy")
        
        assert schema["module"] == "copy"
        assert "Copy files to remote locations" in schema["description"]
        assert len(schema["parameters"]) >= 2
        
        # Check for src and dest parameters
        param_names = [p["name"] for p in schema["parameters"]]
        assert "src" in param_names
        assert "dest" in param_names
        
    @pytest.mark.asyncio
    @patch('app.services.cache_service.cache')
    async def test_get_collections_cached(self, mock_cache, ansible_collections_service):
        """Test getting collections from cache"""
        cached_collections = {"community": ["general", "aws"], "ansible": ["posix"]}
        mock_cache.get.return_value = cached_collections
        
        result = await ansible_collections_service.get_collections("latest")
        
        assert result == cached_collections
        mock_cache.get.assert_called_once()
        
    @pytest.mark.asyncio
    @patch('app.services.cache_service.cache')
    @patch('app.services.ansible_versions_service.ansible_versions_service')
    async def test_get_collections_web_scraping(self, mock_versions_service, mock_cache, 
                                              ansible_collections_service, mock_collections_html):
        """Test getting collections via web scraping"""
        mock_cache.get.return_value = None  # No cache
        mock_versions_service.get_collections_url_for_version.return_value = "https://docs.ansible.com/ansible/latest/collections/"
        
        # Mock HTTP response
        mock_response = AsyncMock()
        mock_response.status = 200
        mock_response.text.return_value = mock_collections_html
        
        mock_session = AsyncMock()
        mock_session.get.return_value.__aenter__.return_value = mock_response
        
        with patch.object(ansible_collections_service, 'get_session', return_value=mock_session):
            result = await ansible_collections_service.get_collections("latest")
            
        assert "community" in result
        assert "ansible" in result
        mock_cache.set.assert_called_once()
        
    @pytest.mark.asyncio
    @patch('app.services.cache_service.cache')
    async def test_get_collection_modules_cached(self, mock_cache, ansible_collections_service):
        """Test getting collection modules from cache"""
        cached_modules = [
            {"name": "copy", "description": "Copy files", "href": "copy_module.html"},
            {"name": "file", "description": "Manage files", "href": "file_module.html"}
        ]
        mock_cache.get.return_value = cached_modules
        
        result = await ansible_collections_service.get_collection_modules("latest", "community", "general")
        
        assert result == cached_modules
        mock_cache.get.assert_called_once()
        
    @pytest.mark.asyncio
    @patch('app.services.cache_service.cache')
    async def test_get_collection_modules_web_scraping(self, mock_cache, ansible_collections_service, 
                                                     mock_collection_detail_html):
        """Test getting collection modules via web scraping"""
        mock_cache.get.return_value = None  # No cache
        
        # Mock HTTP response
        mock_response = AsyncMock()
        mock_response.status = 200
        mock_response.text.return_value = mock_collection_detail_html
        
        mock_session = AsyncMock()
        mock_session.get.return_value.__aenter__.return_value = mock_response
        
        with patch.object(ansible_collections_service, 'get_session', return_value=mock_session):
            result = await ansible_collections_service.get_collection_modules("latest", "community", "general")
            
        assert len(result) == 3
        assert any(m["name"] == "copy" for m in result)
        mock_cache.set.assert_called_once()
        
    @pytest.mark.asyncio
    @patch('app.services.cache_service.cache')
    async def test_get_module_schema_cached(self, mock_cache, ansible_collections_service):
        """Test getting module schema from cache"""
        cached_schema = {
            "module": "copy",
            "description": "Copy files",
            "parameters": [{"name": "src", "type": "string", "required": True, "description": "Source file"}],
            "examples": [],
            "return_values": []
        }
        mock_cache.get.return_value = cached_schema
        
        result = await ansible_collections_service.get_module_schema("latest", "community", "general", "copy")
        
        assert result == cached_schema
        mock_cache.get.assert_called_once()
        
    @pytest.mark.asyncio
    @patch('app.services.cache_service.cache') 
    async def test_get_module_schema_web_scraping(self, mock_cache, ansible_collections_service,
                                                mock_module_detail_html):
        """Test getting module schema via web scraping"""
        mock_cache.get.return_value = None  # No cache
        
        # Mock HTTP response
        mock_response = AsyncMock()
        mock_response.status = 200
        mock_response.text.return_value = mock_module_detail_html
        
        mock_session = AsyncMock()
        mock_session.get.return_value.__aenter__.return_value = mock_response
        
        with patch.object(ansible_collections_service, 'get_session', return_value=mock_session):
            result = await ansible_collections_service.get_module_schema("latest", "community", "general", "copy")
            
        assert result["module"] == "copy"
        assert len(result["parameters"]) >= 2
        assert any(p["name"] == "src" for p in result["parameters"])
        mock_cache.set.assert_called_once()
        
    @pytest.mark.asyncio
    async def test_get_collections_http_error(self, ansible_collections_service):
        """Test handling of HTTP errors"""
        mock_response = AsyncMock()
        mock_response.status = 404
        
        mock_session = AsyncMock()
        mock_session.get.return_value.__aenter__.return_value = mock_response
        
        with patch.object(ansible_collections_service, 'get_session', return_value=mock_session):
            result = await ansible_collections_service.get_collections("invalid_version")
            
        assert result == {}
        
    @pytest.mark.asyncio
    async def test_get_module_schema_http_error(self, ansible_collections_service):
        """Test handling of HTTP errors for module schema"""
        mock_response = AsyncMock()
        mock_response.status = 404
        
        mock_session = AsyncMock()
        mock_session.get.return_value.__aenter__.return_value = mock_response
        
        with patch.object(ansible_collections_service, 'get_session', return_value=mock_session):
            with pytest.raises(Exception) as exc_info:
                await ansible_collections_service.get_module_schema("latest", "invalid", "collection", "module")
                
        assert "Module documentation not available" in str(exc_info.value)