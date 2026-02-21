"""
Tests for AnsibleVersionsService
"""

import pytest
from unittest.mock import AsyncMock, patch, MagicMock
from app.services.ansible_versions_service import AnsibleVersionsService

@pytest.fixture
def service():
    """Create a fresh AnsibleVersionsService instance for each test"""
    return AnsibleVersionsService()

@pytest.fixture
def mock_html_response():
    """Mock HTML response from Ansible docs page"""
    return """
    <!DOCTYPE html>
    <html>
    <body>
        <h1>Ansible Documentation</h1>
        <p>Ansible 13 is the latest version</p>
        <p>Ansible 12 documentation</p>
        <p>Ansible 11 support</p>
        <p>ansible-core 2.17.1 details</p>
    </body>
    </html>
    """

class TestAnsibleVersionsService:

    def test_parse_versions_from_html(self, service, mock_html_response):
        """Test parsing versions from HTML content"""
        versions = service._parse_versions_from_html(mock_html_response)

        assert versions[0] == "latest"  # Should always be first
        assert "13" in versions
        assert "12" in versions
        assert "11" in versions
        assert "2.10" in versions  # Should be added automatically
        assert len(versions) >= 5

    def test_get_fallback_versions(self, service):
        """Test fallback versions list"""
        fallback = service._get_fallback_versions()

        assert fallback[0] == "latest"
        assert "13" in fallback
        assert "2.10" in fallback
        assert len(fallback) >= 10

    @pytest.mark.asyncio
    @patch('app.services.ansible_versions_service.cache')
    async def test_get_available_versions_cached(self, mock_cache, service):
        """Test getting versions from cache"""
        cached_versions = ["13", "12", "11"]
        mock_cache.get.return_value = cached_versions

        result = await service.get_available_versions()

        assert result == cached_versions
        mock_cache.get.assert_called_once_with(service.CACHE_KEY_VERSIONS)

    @pytest.mark.asyncio
    @patch('app.services.ansible_versions_service.cache')
    async def test_get_available_versions_web_scraping(self, mock_cache, service, mock_html_response):
        """Test getting versions via web scraping"""
        mock_cache.get.return_value = None  # No cache

        # Mock HTTP session and response
        mock_response = AsyncMock()
        mock_response.status = 200
        mock_response.text.return_value = mock_html_response

        # Mock validation HEAD requests — accept all versions
        mock_head_response = AsyncMock()
        mock_head_response.status = 200

        mock_get_ctx = AsyncMock()
        mock_get_ctx.__aenter__.return_value = mock_response
        mock_head_ctx = AsyncMock()
        mock_head_ctx.__aenter__.return_value = mock_head_response

        mock_session = MagicMock()
        mock_session.get.return_value = mock_get_ctx
        mock_session.head.return_value = mock_head_ctx

        with patch.object(service, 'get_session', return_value=mock_session):
            result = await service.get_available_versions()

        assert len(result) > 0
        assert "13" in result
        mock_cache.set.assert_called_once()

    @pytest.mark.asyncio
    async def test_get_available_versions_fallback_on_error(self, service):
        """Test fallback when web scraping fails"""
        with patch.object(service, 'get_session', side_effect=Exception("Network error")):
            with patch('app.services.ansible_versions_service.cache') as mock_cache:
                mock_cache.get.return_value = None
                result = await service.get_available_versions()

        # Should return fallback versions
        assert result[0] == "latest"
        assert "13" in result
        assert len(result) >= 10

    @pytest.mark.asyncio
    async def test_validate_version_exists_true(self, service):
        """Test version validation when version exists"""
        with patch.object(service, 'get_available_versions', return_value=["latest", "13", "12"]):
            result = await service.validate_version_exists("13")
            assert result is True

    @pytest.mark.asyncio
    async def test_validate_version_exists_false(self, service):
        """Test version validation when version doesn't exist"""
        with patch.object(service, 'get_available_versions', return_value=["latest", "13", "12"]):
            result = await service.validate_version_exists("999")
            assert result is False

    def test_get_collections_url_for_version_latest(self, service):
        """Test URL generation for latest version"""
        url = service.get_collections_url_for_version("latest")
        assert url == "https://docs.ansible.com/ansible/latest/collections/"

    def test_get_collections_url_for_version_specific(self, service):
        """Test URL generation for specific version"""
        url = service.get_collections_url_for_version("13")
        assert url == "https://docs.ansible.com/projects/ansible/13/collections/"

    @pytest.mark.asyncio
    @patch('app.services.ansible_versions_service.cache')
    async def test_force_refresh(self, mock_cache, service, mock_html_response):
        """Test force refresh bypasses cache"""
        mock_cache.get.return_value = ["cached", "versions"]

        # Mock successful web scraping
        mock_response = AsyncMock()
        mock_response.status = 200
        mock_response.text.return_value = mock_html_response

        mock_head_response = AsyncMock()
        mock_head_response.status = 200

        mock_get_ctx = AsyncMock()
        mock_get_ctx.__aenter__.return_value = mock_response
        mock_head_ctx = AsyncMock()
        mock_head_ctx.__aenter__.return_value = mock_head_response

        mock_session = MagicMock()
        mock_session.get.return_value = mock_get_ctx
        mock_session.head.return_value = mock_head_ctx

        with patch.object(service, 'get_session', return_value=mock_session):
            result = await service.get_available_versions(force_refresh=True)

        # Should not call cache.get when force_refresh=True
        mock_cache.get.assert_not_called()
        assert len(result) > 0
