"""
Tests for variable types endpoints (/api/variable-types/*).
"""

import pytest


class TestListVariableTypes:

    async def test_list_types(self, authenticated_client):
        resp = await authenticated_client.get("/api/variable-types")
        assert resp.status_code == 200
        data = resp.json()
        assert "builtin" in data
        assert "custom" in data
        assert len(data["builtin"]) > 0


class TestValidateBuiltin:

    async def test_validate_string(self, authenticated_client):
        resp = await authenticated_client.post(
            "/api/variable-types/validate",
            json={"type_name": "string", "value": "hello"},
        )
        assert resp.status_code == 200
        assert resp.json()["is_valid"] is True

    async def test_validate_int_valid(self, authenticated_client):
        resp = await authenticated_client.post(
            "/api/variable-types/validate",
            json={"type_name": "int", "value": "42"},
        )
        assert resp.status_code == 200
        assert resp.json()["is_valid"] is True

    async def test_validate_int_invalid(self, authenticated_client):
        resp = await authenticated_client.post(
            "/api/variable-types/validate",
            json={"type_name": "int", "value": "not_a_number"},
        )
        assert resp.status_code == 200
        assert resp.json()["is_valid"] is False

    async def test_validate_unknown_type(self, authenticated_client):
        resp = await authenticated_client.post(
            "/api/variable-types/validate",
            json={"type_name": "nonexistent_type", "value": "x"},
        )
        assert resp.status_code == 404


class TestAdminCustomTypes:

    async def test_admin_create_custom_type(self, admin_client):
        resp = await admin_client.post(
            "/api/variable-types/admin",
            json={
                "name": "test_type",
                "label": "Test Type",
                "pattern": r"^test-.*$",
                "description": "A test type",
            },
        )
        assert resp.status_code == 201
        data = resp.json()
        assert data["name"] == "test_type"
        assert data["is_active"] is True

    async def test_admin_list_all_types(self, admin_client):
        resp = await admin_client.get("/api/variable-types/admin")
        assert resp.status_code == 200
        assert isinstance(resp.json(), list)

    async def test_admin_update_custom_type(self, admin_client):
        # Create first
        create_resp = await admin_client.post(
            "/api/variable-types/admin",
            json={
                "name": "update_me",
                "label": "Update Me",
                "pattern": r".*",
            },
        )
        type_id = create_resp.json()["id"]

        # Update
        resp = await admin_client.put(
            f"/api/variable-types/admin/{type_id}",
            json={"label": "Updated Label"},
        )
        assert resp.status_code == 200
        assert resp.json()["label"] == "Updated Label"

    async def test_admin_delete_custom_type(self, admin_client):
        create_resp = await admin_client.post(
            "/api/variable-types/admin",
            json={
                "name": "delete_me",
                "label": "Delete Me",
                "pattern": r".*",
            },
        )
        type_id = create_resp.json()["id"]

        resp = await admin_client.delete(f"/api/variable-types/admin/{type_id}")
        assert resp.status_code == 204

    async def test_non_admin_denied(self, authenticated_client):
        resp = await authenticated_client.get("/api/variable-types/admin")
        assert resp.status_code == 403

    async def test_create_duplicate_name(self, admin_client):
        await admin_client.post(
            "/api/variable-types/admin",
            json={"name": "dup_type", "label": "Dup", "pattern": ".*"},
        )
        resp = await admin_client.post(
            "/api/variable-types/admin",
            json={"name": "dup_type", "label": "Dup2", "pattern": ".*"},
        )
        assert resp.status_code == 400

    async def test_create_builtin_name_rejected(self, admin_client):
        resp = await admin_client.post(
            "/api/variable-types/admin",
            json={"name": "string", "label": "Override String", "pattern": ".*"},
        )
        assert resp.status_code == 400

    async def test_delete_nonexistent(self, admin_client):
        resp = await admin_client.delete("/api/variable-types/admin/nonexistent-id")
        assert resp.status_code == 404

    async def test_update_nonexistent(self, admin_client):
        resp = await admin_client.put(
            "/api/variable-types/admin/nonexistent-id",
            json={"label": "X"},
        )
        assert resp.status_code == 404


class TestValidateCustomType:

    async def test_validate_custom_type(self, admin_client, authenticated_client):
        # Create a custom type
        await admin_client.post(
            "/api/variable-types/admin",
            json={"name": "ip_addr", "label": "IP", "pattern": r"^\d+\.\d+\.\d+\.\d+$"},
        )
        # Validate against it
        resp = await authenticated_client.post(
            "/api/variable-types/validate",
            json={"type_name": "ip_addr", "value": "192.168.1.1"},
        )
        assert resp.status_code == 200
        assert resp.json()["is_valid"] is True

    async def test_validate_custom_type_invalid(self, admin_client, authenticated_client):
        await admin_client.post(
            "/api/variable-types/admin",
            json={"name": "port_num", "label": "Port", "pattern": r"^\d+$"},
        )
        resp = await authenticated_client.post(
            "/api/variable-types/validate",
            json={"type_name": "port_num", "value": "not-a-port"},
        )
        assert resp.status_code == 200
        assert resp.json()["is_valid"] is False


class TestValidateMoreBuiltins:

    async def test_validate_bool_true(self, authenticated_client):
        resp = await authenticated_client.post(
            "/api/variable-types/validate",
            json={"type_name": "bool", "value": "true"},
        )
        assert resp.status_code == 200
        assert resp.json()["is_valid"] is True

    async def test_validate_bool_invalid(self, authenticated_client):
        resp = await authenticated_client.post(
            "/api/variable-types/validate",
            json={"type_name": "bool", "value": "maybe"},
        )
        assert resp.status_code == 200
        assert resp.json()["is_valid"] is False

    async def test_validate_list(self, authenticated_client):
        resp = await authenticated_client.post(
            "/api/variable-types/validate",
            json={"type_name": "list", "value": "[1, 2, 3]"},
        )
        assert resp.status_code == 200
        assert resp.json()["is_valid"] is True

    async def test_validate_dict(self, authenticated_client):
        resp = await authenticated_client.post(
            "/api/variable-types/validate",
            json={"type_name": "dict", "value": '{"key": "value"}'},
        )
        assert resp.status_code == 200
        assert resp.json()["is_valid"] is True
