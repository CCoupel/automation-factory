"""
Unit tests for InventoryService
"""

import pytest

from app.services.inventory_service import InventoryService
from app.schemas.inventory import InventoryData, InventoryHost, InventoryGroup


@pytest.fixture
def svc():
    return InventoryService()


# ---------------------------------------------------------------------------
# YAML parsing
# ---------------------------------------------------------------------------

class TestParseYaml:
    def test_simple_yaml(self, svc):
        content = """
all:
  hosts:
    host1:
      ansible_host: 1.2.3.4
    host2:
      ansible_host: 5.6.7.8
"""
        data, warnings = svc.parse_yaml(content)
        assert len(data.hosts) == 2
        assert {h.name for h in data.hosts} == {"host1", "host2"}
        host1 = next(h for h in data.hosts if h.name == "host1")
        assert host1.variables["ansible_host"] == "1.2.3.4"
        assert len(warnings) == 0

    def test_yaml_with_groups(self, svc):
        content = """
all:
  hosts:
    host1:
    host2:
  children:
    webservers:
      hosts:
        host1:
      vars:
        http_port: 80
    dbservers:
      hosts:
        host2:
"""
        data, warnings = svc.parse_yaml(content)
        assert len(data.hosts) == 2
        # all + webservers + dbservers
        group_names = {g.name for g in data.groups}
        assert "all" in group_names
        assert "webservers" in group_names
        assert "dbservers" in group_names

        webservers = next(g for g in data.groups if g.name == "webservers")
        assert webservers.hosts == ["host1"]
        assert webservers.variables == {"http_port": 80}

    def test_yaml_nested_children(self, svc):
        content = """
all:
  children:
    production:
      children:
        webservers:
          hosts:
            web1:
"""
        data, warnings = svc.parse_yaml(content)
        group_names = {g.name for g in data.groups}
        assert "production" in group_names
        assert "webservers" in group_names
        prod = next(g for g in data.groups if g.name == "production")
        assert "webservers" in prod.children
        assert len(data.hosts) == 1
        assert data.hosts[0].name == "web1"

    def test_yaml_empty_hosts(self, svc):
        content = """
all:
  hosts:
    host1:
"""
        data, warnings = svc.parse_yaml(content)
        assert len(data.hosts) == 1
        assert data.hosts[0].variables == {}

    def test_yaml_invalid_toplevel(self, svc):
        with pytest.raises(ValueError, match="mapping"):
            svc.parse_yaml("just a string")

    def test_yaml_group_with_none(self, svc):
        content = """
all:
  children:
    empty_group:
"""
        data, warnings = svc.parse_yaml(content)
        group_names = {g.name for g in data.groups}
        assert "empty_group" in group_names


# ---------------------------------------------------------------------------
# INI parsing
# ---------------------------------------------------------------------------

class TestParseIni:
    def test_simple_ini(self, svc):
        content = """
host1 ansible_host=1.2.3.4
host2 ansible_host=5.6.7.8
"""
        data, warnings = svc.parse_ini(content)
        assert len(data.hosts) == 2
        host1 = next(h for h in data.hosts if h.name == "host1")
        assert host1.variables["ansible_host"] == "1.2.3.4"

    def test_ini_with_groups(self, svc):
        content = """
[webservers]
web1
web2

[dbservers]
db1
"""
        data, warnings = svc.parse_ini(content)
        assert len(data.hosts) == 3
        group_names = {g.name for g in data.groups}
        assert "webservers" in group_names
        assert "dbservers" in group_names
        webservers = next(g for g in data.groups if g.name == "webservers")
        assert set(webservers.hosts) == {"web1", "web2"}

    def test_ini_with_vars(self, svc):
        content = """
[webservers]
web1

[webservers:vars]
http_port=80
secure=true
"""
        data, warnings = svc.parse_ini(content)
        webservers = next(g for g in data.groups if g.name == "webservers")
        assert webservers.variables["http_port"] == 80
        assert webservers.variables["secure"] is True

    def test_ini_with_children(self, svc):
        content = """
[production:children]
webservers
dbservers

[webservers]
web1

[dbservers]
db1
"""
        data, warnings = svc.parse_ini(content)
        prod = next(g for g in data.groups if g.name == "production")
        assert set(prod.children) == {"webservers", "dbservers"}

    def test_ini_comments(self, svc):
        content = """
# This is a comment
; Another comment
host1
"""
        data, warnings = svc.parse_ini(content)
        assert len(data.hosts) == 1
        assert data.hosts[0].name == "host1"

    def test_ini_host_inline_vars(self, svc):
        content = """
host1 ansible_port=2222 ansible_user=admin
"""
        data, warnings = svc.parse_ini(content)
        host1 = data.hosts[0]
        assert host1.variables["ansible_port"] == 2222
        assert host1.variables["ansible_user"] == "admin"

    def test_ini_value_coercion(self, svc):
        assert svc._coerce_ini_value("true") is True
        assert svc._coerce_ini_value("false") is False
        assert svc._coerce_ini_value("yes") is True
        assert svc._coerce_ini_value("no") is False
        assert svc._coerce_ini_value("42") == 42
        assert svc._coerce_ini_value("3.14") == 3.14
        assert svc._coerce_ini_value("hello") == "hello"


# ---------------------------------------------------------------------------
# Format detection
# ---------------------------------------------------------------------------

class TestDetectFormat:
    def test_yaml_with_triple_dash(self, svc):
        assert svc.detect_format("---\nall:\n  hosts:") == "yaml"

    def test_yaml_with_all_key(self, svc):
        assert svc.detect_format("all:\n  hosts:\n    host1:") == "yaml"

    def test_ini_with_brackets(self, svc):
        assert svc.detect_format("[webservers]\nweb1\nweb2") == "ini"

    def test_ini_plain_hosts(self, svc):
        assert svc.detect_format("host1 ansible_host=1.2.3.4") == "ini"


# ---------------------------------------------------------------------------
# Auto-detect parse
# ---------------------------------------------------------------------------

class TestParse:
    def test_parse_yaml(self, svc):
        content = "all:\n  hosts:\n    host1:\n"
        data, warnings, fmt = svc.parse(content)
        assert fmt == "yaml"
        assert len(data.hosts) == 1

    def test_parse_ini(self, svc):
        content = "[web]\nhost1\nhost2\n"
        data, warnings, fmt = svc.parse(content)
        assert fmt == "ini"
        assert len(data.hosts) == 2


# ---------------------------------------------------------------------------
# YAML generation
# ---------------------------------------------------------------------------

class TestGenerateYaml:
    def test_simple_generation(self, svc):
        data = InventoryData(
            hosts=[
                InventoryHost(name="host1", variables={"ansible_host": "1.2.3.4"}),
                InventoryHost(name="host2", variables={}),
            ],
            groups=[
                InventoryGroup(name="webservers", hosts=["host1"]),
            ],
        )
        yaml_str = svc.generate_yaml(data)
        assert "host1" in yaml_str
        assert "host2" in yaml_str
        assert "webservers" in yaml_str
        assert "1.2.3.4" in yaml_str

    def test_roundtrip_yaml(self, svc):
        original = """all:
  hosts:
    host1:
      ansible_host: 1.2.3.4
  children:
    webservers:
      hosts:
        host1:
      vars:
        http_port: 80
"""
        data, warnings = svc.parse_yaml(original)
        generated = svc.generate_yaml(data)
        # Re-parse and compare
        data2, warnings2 = svc.parse_yaml(generated)
        assert {h.name for h in data.hosts} == {h.name for h in data2.hosts}

    def test_empty_inventory(self, svc):
        data = InventoryData(hosts=[], groups=[])
        yaml_str = svc.generate_yaml(data)
        assert "all" in yaml_str

    def test_generation_with_group_vars(self, svc):
        data = InventoryData(
            hosts=[InventoryHost(name="host1")],
            groups=[
                InventoryGroup(
                    name="webservers",
                    hosts=["host1"],
                    variables={"http_port": 80},
                ),
            ],
        )
        yaml_str = svc.generate_yaml(data)
        assert "http_port" in yaml_str
        assert "80" in yaml_str


# ---------------------------------------------------------------------------
# Validation
# ---------------------------------------------------------------------------

class TestValidate:
    def test_valid_inventory(self, svc):
        data = InventoryData(
            hosts=[InventoryHost(name="host1")],
            groups=[InventoryGroup(name="web", hosts=["host1"])],
        )
        assert svc.validate(data) == []

    def test_duplicate_hosts(self, svc):
        data = InventoryData(
            hosts=[InventoryHost(name="host1"), InventoryHost(name="host1")],
            groups=[],
        )
        errors = svc.validate(data)
        assert any("Duplicate host" in e for e in errors)

    def test_duplicate_groups(self, svc):
        data = InventoryData(
            hosts=[],
            groups=[InventoryGroup(name="web"), InventoryGroup(name="web")],
        )
        errors = svc.validate(data)
        assert any("Duplicate group" in e for e in errors)

    def test_unknown_host_reference(self, svc):
        data = InventoryData(
            hosts=[],
            groups=[InventoryGroup(name="web", hosts=["nonexistent"])],
        )
        errors = svc.validate(data)
        assert any("unknown host" in e for e in errors)

    def test_unknown_child_reference(self, svc):
        data = InventoryData(
            hosts=[],
            groups=[InventoryGroup(name="prod", children=["nonexistent"])],
        )
        errors = svc.validate(data)
        assert any("unknown child group" in e for e in errors)
