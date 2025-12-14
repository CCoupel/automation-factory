"""
Tests for Galaxy API endpoints with module schema functionality
"""

import pytest
from unittest.mock import Mock, patch
from fastapi import HTTPException
from app.api.endpoints.galaxy import get_module_schema, get_collection_docs_blob


class TestGalaxyEndpoints:
    """Test Galaxy endpoints for module schemas"""
    
    @pytest.mark.asyncio
    async def test_module_schema_with_valid_docstrings(self):
        """Test module schema retrieval with valid documentation"""
        # Mock cache miss
        with patch('app.api.endpoints.galaxy.cache.get', return_value=None):
            # Mock docs-blob response
            mock_docs = {
                "docs_blob": {
                    "contents": [{
                        "content_name": "docker_container",
                        "content_type": "module",
                        "doc_strings": {
                            "doc": {
                                "description": ["Test module"],
                                "short_description": "Test",
                                "options": {
                                    "name": {
                                        "type": "str",
                                        "required": True,
                                        "description": ["Container name"]
                                    }
                                }
                            }
                        }
                    }]
                }
            }
            
            with patch('app.api.endpoints.galaxy.get_collection_docs_blob', return_value=mock_docs):
                with patch('app.api.endpoints.galaxy.cache.set') as mock_cache_set:
                    result = await get_module_schema(
                        namespace="community",
                        collection="docker", 
                        version="latest",
                        module="docker_container"
                    )
                    
                    assert result["module_name"] == "docker_container"
                    assert result["namespace"] == "community"
                    assert "name" in result["parameters"]
                    assert result["parameters"]["name"]["required"] == True
                    
                    # Verify cache was set
                    mock_cache_set.assert_called_once()
    
    @pytest.mark.asyncio
    async def test_module_schema_with_null_docstrings(self):
        """Test module schema with null doc_strings returns 404"""
        # Mock cache miss
        with patch('app.api.endpoints.galaxy.cache.get', return_value=None):
            # Mock docs-blob with null doc_strings (like community.aws)
            mock_docs = {
                "docs_blob": {
                    "contents": [{
                        "content_name": "api_gateway",
                        "content_type": "module",
                        "doc_strings": None  # This is the issue we fixed
                    }]
                }
            }
            
            with patch('app.api.endpoints.galaxy.get_collection_docs_blob', return_value=mock_docs):
                with pytest.raises(HTTPException) as exc_info:
                    await get_module_schema(
                        namespace="community",
                        collection="aws",
                        version="10.0.0",
                        module="api_gateway"
                    )
                
                assert exc_info.value.status_code == 404
                assert "Documentation not available" in exc_info.value.detail
    
    @pytest.mark.asyncio
    async def test_module_schema_not_found(self):
        """Test module schema when module doesn't exist"""
        # Mock cache miss
        with patch('app.api.endpoints.galaxy.cache.get', return_value=None):
            # Mock docs-blob without the requested module
            mock_docs = {
                "docs_blob": {
                    "contents": [{
                        "content_name": "other_module",
                        "content_type": "module",
                        "doc_strings": {}
                    }]
                }
            }
            
            with patch('app.api.endpoints.galaxy.get_collection_docs_blob', return_value=mock_docs):
                with pytest.raises(HTTPException) as exc_info:
                    await get_module_schema(
                        namespace="community",
                        collection="docker",
                        version="latest",
                        module="nonexistent"
                    )
                
                assert exc_info.value.status_code == 404
                assert "not found" in exc_info.value.detail
    
    @pytest.mark.asyncio
    async def test_module_schema_with_cache_hit(self):
        """Test module schema returns cached result"""
        cached_schema = {
            "module_name": "cached_module",
            "namespace": "test",
            "parameters": {}
        }
        
        # Mock cache hit
        with patch('app.api.endpoints.galaxy.cache.get', return_value=cached_schema):
            # get_collection_docs_blob should not be called
            with patch('app.api.endpoints.galaxy.get_collection_docs_blob') as mock_docs_blob:
                result = await get_module_schema(
                    namespace="test",
                    collection="collection",
                    version="1.0.0",
                    module="cached_module"
                )
                
                assert result == cached_schema
                # Verify docs-blob was not called (cache hit)
                mock_docs_blob.assert_not_called()
    
    @pytest.mark.asyncio
    async def test_options_list_conversion(self):
        """Test that options as list gets converted to dict"""
        with patch('app.api.endpoints.galaxy.cache.get', return_value=None):
            # Mock docs with options as list
            mock_docs = {
                "docs_blob": {
                    "contents": [{
                        "content_name": "test_module",
                        "content_type": "module",
                        "doc_strings": {
                            "doc": {
                                "description": "Test",
                                "options": [
                                    {
                                        "name": "param1",
                                        "type": "str",
                                        "required": False
                                    }
                                ]
                            }
                        }
                    }]
                }
            }
            
            with patch('app.api.endpoints.galaxy.get_collection_docs_blob', return_value=mock_docs):
                with patch('app.api.endpoints.galaxy.cache.set'):
                    result = await get_module_schema(
                        namespace="test",
                        collection="collection",
                        version="1.0.0",
                        module="test_module"
                    )
                    
                    # Options should be converted from list to dict
                    assert "param1" in result["parameters"]
                    assert result["parameters"]["param1"]["type"] == "str"