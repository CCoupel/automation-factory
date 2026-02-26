"""
Integration tests for the YAML parser API endpoint.

Uses the same sync TestClient pattern as the other endpoint tests.
Auth is tested by mocking get_current_user.
"""

import pytest
from unittest.mock import patch, MagicMock
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

VALID_YAML = """
- name: Test Play
  hosts: all
  vars:
    my_var: hello
  tasks:
    - name: Say hello
      ansible.builtin.debug:
        msg: "{{ my_var }}"
"""

INVALID_YAML = ":\n  - :\n    a: [unterminated"

# Mock user for authenticated requests
_mock_user = MagicMock()
_mock_user.id = "test-user-id"
_mock_user.username = "testuser"
_mock_user.is_admin = False


def _auth_override():
    return _mock_user


class TestParseYamlEndpoint:
    """POST /api/yaml/parse"""

    def test_parse_valid_yaml(self):
        from app.core.dependencies import get_current_user
        app.dependency_overrides[get_current_user] = _auth_override
        try:
            resp = client.post(
                "/api/yaml/parse",
                json={"yaml_content": VALID_YAML},
            )
            assert resp.status_code == 200
            data = resp.json()
            assert len(data["plays"]) == 1
            assert data["plays"][0]["name"] == "Test Play"
            assert len(data["plays"][0]["modules"]) >= 2  # START + task
            assert len(data["plays"][0]["links"]) >= 1
            assert len(data["plays"][0]["variables"]) == 1
            assert data["errors"] == []
        finally:
            app.dependency_overrides.clear()

    def test_parse_invalid_yaml(self):
        from app.core.dependencies import get_current_user
        app.dependency_overrides[get_current_user] = _auth_override
        try:
            resp = client.post(
                "/api/yaml/parse",
                json={"yaml_content": INVALID_YAML},
            )
            # Invalid YAML yields empty plays + warnings → 400
            assert resp.status_code == 400
        finally:
            app.dependency_overrides.clear()

    def test_requires_auth(self):
        # No override → should get 401 or 403 depending on auth implementation
        app.dependency_overrides.clear()
        resp = client.post(
            "/api/yaml/parse",
            json={"yaml_content": VALID_YAML},
        )
        assert resp.status_code in (401, 403)

    def test_empty_yaml(self):
        from app.core.dependencies import get_current_user
        app.dependency_overrides[get_current_user] = _auth_override
        try:
            resp = client.post(
                "/api/yaml/parse",
                json={"yaml_content": ""},
            )
            assert resp.status_code == 200
            data = resp.json()
            assert data["plays"] == []
        finally:
            app.dependency_overrides.clear()

    def test_round_trip(self):
        """Parse YAML → get graph → verify structure is consistent."""
        from app.core.dependencies import get_current_user
        app.dependency_overrides[get_current_user] = _auth_override
        try:
            complex_yaml = """
- name: Round Trip Play
  hosts: webservers
  become: true
  vars:
    http_port: 80
    max_clients: 200
  pre_tasks:
    - name: Check connectivity
      ansible.builtin.ping:
  tasks:
    - name: Install nginx
      ansible.builtin.apt:
        name: nginx
        state: present
      become: true
    - name: Configure nginx
      ansible.builtin.template:
        src: nginx.conf.j2
        dest: /etc/nginx/nginx.conf
      notify: Restart nginx
  handlers:
    - name: Restart nginx
      ansible.builtin.service:
        name: nginx
        state: restarted
"""
            resp = client.post(
                "/api/yaml/parse",
                json={"yaml_content": complex_yaml},
            )
            assert resp.status_code == 200
            data = resp.json()
            play = data["plays"][0]

            # Verify structure integrity
            assert play["name"] == "Round Trip Play"
            assert play["attributes"]["hosts"] == "webservers"
            assert play["attributes"]["become"] is True

            # Variables
            var_keys = {v["key"] for v in play["variables"]}
            assert "http_port" in var_keys
            assert "max_clients" in var_keys

            # Sections
            start_modules = [m for m in play["modules"] if m.get("isPlay")]
            sections = {m["parentSection"] for m in start_modules}
            assert "pre_tasks" in sections
            assert "tasks" in sections
            assert "handlers" in sections

            # All links should reference valid module IDs
            module_ids = {m["id"] for m in play["modules"]}
            for link in play["links"]:
                assert link["from"] in module_ids, f"Link from {link['from']} not in modules"
                assert link["to"] in module_ids, f"Link to {link['to']} not in modules"
        finally:
            app.dependency_overrides.clear()
