"""
Tests for Ansible API endpoints
"""

import pytest
from unittest.mock import AsyncMock, patch
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

class TestAnsibleEndpoints:
    
    def test_get_versions_success(self):
        """Test successful version retrieval"""
        mock_versions = ["latest", "13", "12", "11", "10"]
        
        with patch('app.services.ansible_versions_service.ansible_versions_service.get_available_versions') as mock_get:
            mock_get.return_value = mock_versions
            
            response = client.get("/api/ansible/versions")
            
            assert response.status_code == 200
            data = response.json()
            assert data["versions"] == mock_versions
            assert data["total_count"] == 5
            assert "cache_ttl" in data
            assert data["source"] == "ansible_docs_dynamic"
            
    def test_get_versions_with_force_refresh(self):
        """Test version retrieval with force refresh"""
        with patch('app.services.ansible_versions_service.ansible_versions_service.get_available_versions') as mock_get:
            mock_get.return_value = ["latest", "13"]
            
            response = client.get("/api/ansible/versions?force_refresh=true")
            
            assert response.status_code == 200
            mock_get.assert_called_once_with(True)
            
    def test_get_versions_error(self):
        """Test error handling in version retrieval"""
        with patch('app.services.ansible_versions_service.ansible_versions_service.get_available_versions') as mock_get:
            mock_get.side_effect = Exception("Network error")
            
            response = client.get("/api/ansible/versions")
            
            assert response.status_code == 500
            assert "Failed to fetch versions" in response.json()["detail"]
            
    def test_get_collections_success(self):
        """Test successful collections retrieval"""
        mock_collections = {
            "community": ["general", "aws"],
            "ansible": ["posix", "windows"]
        }
        
        with patch('app.services.ansible_versions_service.ansible_versions_service.get_available_versions') as mock_versions:
            mock_versions.return_value = ["latest", "13", "12"]
            
            with patch('app.services.ansible_collections_service.ansible_collections_service.get_collections') as mock_get:
                mock_get.return_value = mock_collections
                
                response = client.get("/api/ansible/latest/collections")
                
                assert response.status_code == 200
                data = response.json()
                assert data["ansible_version"] == "latest"
                assert data["collections"] == mock_collections
                assert data["total_namespaces"] == 2
                assert data["total_collections"] == 4
                assert data["source"] == "ansible_docs"
                
    def test_get_collections_invalid_version(self):
        """Test collections retrieval with invalid version"""
        with patch('app.services.ansible_versions_service.ansible_versions_service.get_available_versions') as mock_versions:
            mock_versions.return_value = ["latest", "13", "12"]
            
            response = client.get("/api/ansible/invalid_version/collections")
            
            assert response.status_code == 404
            assert "not found" in response.json()["detail"]
            
    def test_get_namespaces_success(self):
        """Test successful namespaces retrieval"""
        mock_collections = {
            "community": ["general", "aws"],
            "ansible": ["posix"]
        }
        
        with patch('app.services.ansible_collections_service.ansible_collections_service.get_collections') as mock_get:
            mock_get.return_value = mock_collections
            
            response = client.get("/api/ansible/latest/namespaces")
            
            assert response.status_code == 200
            data = response.json()
            assert data["ansible_version"] == "latest"
            assert len(data["namespaces"]) == 2
            assert data["total_count"] == 2
            
            # Check namespace structure
            community_ns = next((ns for ns in data["namespaces"] if ns["name"] == "community"), None)
            assert community_ns is not None
            assert community_ns["collections_count"] == 2
            assert community_ns["collections"] == ["general", "aws"]
            
    def test_get_namespace_collections_success(self):
        """Test successful namespace collections retrieval"""
        mock_collections = {
            "community": ["general", "aws", "mysql"],
            "ansible": ["posix"]
        }
        
        with patch('app.services.ansible_collections_service.ansible_collections_service.get_collections') as mock_get:
            mock_get.return_value = mock_collections
            
            response = client.get("/api/ansible/latest/namespaces/community/collections")
            
            assert response.status_code == 200
            data = response.json()
            assert data["ansible_version"] == "latest"
            assert data["namespace"] == "community"
            assert data["collections"] == ["general", "aws", "mysql"]
            assert data["total_collections"] == 3
            
    def test_get_namespace_collections_not_found(self):
        """Test namespace collections retrieval for non-existent namespace"""
        mock_collections = {"ansible": ["posix"]}
        
        with patch('app.services.ansible_collections_service.ansible_collections_service.get_collections') as mock_get:
            mock_get.return_value = mock_collections
            
            response = client.get("/api/ansible/latest/namespaces/nonexistent/collections")
            
            assert response.status_code == 404
            assert "not found" in response.json()["detail"]
            
    def test_get_collection_modules_success(self):
        """Test successful collection modules retrieval"""
        mock_modules = [
            {"name": "copy", "description": "Copy files", "href": "copy_module.html"},
            {"name": "file", "description": "Manage files", "href": "file_module.html"}
        ]
        
        with patch('app.services.ansible_collections_service.ansible_collections_service.get_collection_modules') as mock_get:
            mock_get.return_value = mock_modules
            
            response = client.get("/api/ansible/latest/namespaces/community/collections/general/modules")
            
            assert response.status_code == 200
            data = response.json()
            assert data["ansible_version"] == "latest"
            assert data["namespace"] == "community"
            assert data["collection"] == "general"
            assert data["modules"] == mock_modules
            assert data["total_modules"] == 2
            
    def test_get_collection_modules_not_found(self):
        """Test collection modules retrieval for non-existent collection"""
        with patch('app.services.ansible_collections_service.ansible_collections_service.get_collection_modules') as mock_get:
            mock_get.return_value = []
            
            response = client.get("/api/ansible/latest/namespaces/community/collections/nonexistent/modules")
            
            assert response.status_code == 404
            assert "No modules found" in response.json()["detail"]
            
    def test_get_module_schema_success(self):
        """Test successful module schema retrieval"""
        mock_schema = {
            "module": "copy",
            "description": "Copy files to remote locations",
            "parameters": [
                {
                    "name": "src",
                    "type": "string",
                    "required": True,
                    "description": "Source file path",
                    "default": None
                }
            ],
            "examples": ["copy: src=/etc/foo.conf dest=/tmp/foo.conf"],
            "return_values": []
        }
        
        with patch('app.services.ansible_collections_service.ansible_collections_service.get_module_schema') as mock_get:
            mock_get.return_value = mock_schema
            
            response = client.get("/api/ansible/latest/namespaces/community/collections/general/modules/copy/schema")
            
            assert response.status_code == 200
            data = response.json()
            assert data["ansible_version"] == "latest"
            assert data["namespace"] == "community"
            assert data["collection"] == "general"
            assert data["module"] == "copy"
            assert data["schema"] == mock_schema
            assert data["source"] == "ansible_docs"
            assert "documentation_url" in data
            
    def test_get_module_schema_not_found(self):
        """Test module schema retrieval for non-existent module"""
        with patch('app.services.ansible_collections_service.ansible_collections_service.get_module_schema') as mock_get:
            mock_get.side_effect = Exception("Module not found")
            
            response = client.get("/api/ansible/latest/namespaces/community/collections/general/modules/nonexistent/schema")
            
            assert response.status_code == 404
            assert "not available" in response.json()["detail"]
            
    def test_get_collections_stats_success(self):
        """Test successful collections stats retrieval"""
        mock_collections = {
            "community": ["general", "aws", "mysql"],
            "ansible": ["posix", "windows"],
            "cisco": ["ios"]
        }
        
        with patch('app.services.ansible_collections_service.ansible_collections_service.get_collections') as mock_get:
            mock_get.return_value = mock_collections
            
            response = client.get("/api/ansible/latest/collections/stats")
            
            assert response.status_code == 200
            data = response.json()
            assert data["ansible_version"] == "latest"
            assert data["total_namespaces"] == 3
            assert data["total_collections"] == 6
            assert len(data["namespaces"]) == 3
            assert len(data["top_namespaces"]) <= 10
            
            # Check community namespace stats
            assert data["namespaces"]["community"]["collections_count"] == 3
            assert data["namespaces"]["community"]["collections"] == ["general", "aws", "mysql"]
            
    def test_ansible_health_check_success(self):
        """Test successful Ansible health check"""
        mock_versions = ["latest", "13", "12"]
        
        with patch('app.services.ansible_versions_service.ansible_versions_service.get_available_versions') as mock_get:
            mock_get.return_value = mock_versions
            
            response = client.get("/api/ansible/health")
            
            assert response.status_code == 200
            data = response.json()
            assert data["status"] == "healthy"
            assert data["service"] == "ansible_documentation"
            assert data["versions_available"] == 3
            assert data["latest_version"] == "latest"
            assert data["cache_status"] == "active"
            
    def test_ansible_health_check_error(self):
        """Test Ansible health check with error"""
        with patch('app.services.ansible_versions_service.ansible_versions_service.get_available_versions') as mock_get:
            mock_get.side_effect = Exception("Service unavailable")
            
            response = client.get("/api/ansible/health")
            
            assert response.status_code == 200  # Health endpoint should always return 200
            data = response.json()
            assert data["status"] == "unhealthy"
            assert data["service"] == "ansible_documentation"
            assert "Service unavailable" in data["error"]
            assert data["cache_status"] == "unknown"