"""
Unit tests for ReturnSpecService.

Tests parsing, validation, inference, and YAML generation
without HTTP or database.
"""

import pytest
import yaml

from app.services.return_spec_service import ReturnSpecService


@pytest.fixture
def service():
    return ReturnSpecService()


class TestParse:
    def test_parse_valid_return_specs(self, service):
        content = """
main:
  short_description: Main entrypoint returns
  return_values:
    web_port:
      type: int
      description: The configured web port
      scope: host
      always_set: true
    config_path:
      type: str
      description: Path to the generated config
"""
        result = service.parse(content)
        assert "main" in result
        assert result["main"]["short_description"] == "Main entrypoint returns"
        assert "web_port" in result["main"]["returns"]
        assert result["main"]["returns"]["web_port"]["type"] == "int"
        assert result["main"]["returns"]["web_port"]["always_set"] is True
        assert result["main"]["returns"]["config_path"]["type"] == "str"

    def test_parse_empty_string(self, service):
        assert service.parse("") == {}

    def test_parse_invalid_yaml(self, service):
        assert service.parse("{{invalid") == {}

    def test_parse_non_dict_yaml(self, service):
        assert service.parse("- item1\n- item2") == {}

    def test_parse_with_returns_key(self, service):
        """Test alternative 'returns' key instead of 'return_values'."""
        content = """
main:
  returns:
    my_var:
      type: str
      description: A variable
"""
        result = service.parse(content)
        assert "my_var" in result["main"]["returns"]

    def test_parse_defaults(self, service):
        content = """
main:
  return_values:
    my_var: {}
"""
        result = service.parse(content)
        var = result["main"]["returns"]["my_var"]
        assert var["type"] == "any"
        assert var["description"] == ""
        assert var["scope"] == "host"
        assert var["always_set"] is False
        assert var["choices"] is None

    def test_parse_with_choices_and_elements(self, service):
        content = """
main:
  return_values:
    status:
      type: str
      choices: [running, stopped, failed]
    server_list:
      type: list
      elements: str
"""
        result = service.parse(content)
        assert result["main"]["returns"]["status"]["choices"] == ["running", "stopped", "failed"]
        assert result["main"]["returns"]["server_list"]["elements"] == "str"


class TestValidate:
    def test_valid_specs(self, service):
        specs = {
            "main": {
                "returns": {
                    "my_var": {"type": "str", "scope": "host"},
                }
            }
        }
        errors = service.validate(specs)
        assert errors == []

    def test_invalid_type(self, service):
        specs = {
            "main": {
                "returns": {
                    "my_var": {"type": "invalid_type"},
                }
            }
        }
        errors = service.validate(specs)
        assert len(errors) == 1
        assert "invalid_type" in errors[0]

    def test_invalid_scope(self, service):
        specs = {
            "main": {
                "returns": {
                    "my_var": {"type": "str", "scope": "invalid_scope"},
                }
            }
        }
        errors = service.validate(specs)
        assert len(errors) == 1
        assert "invalid_scope" in errors[0]

    def test_invalid_choices_type(self, service):
        specs = {
            "main": {
                "returns": {
                    "my_var": {"type": "str", "choices": "not_a_list"},
                }
            }
        }
        errors = service.validate(specs)
        assert len(errors) == 1
        assert "choices" in errors[0]

    def test_invalid_depends_on_type(self, service):
        specs = {
            "main": {
                "returns": {
                    "my_var": {"type": "str", "depends_on": "not_a_list"},
                }
            }
        }
        errors = service.validate(specs)
        assert len(errors) == 1
        assert "depends_on" in errors[0]

    def test_not_a_dict(self, service):
        errors = service.validate("not a dict")
        assert errors == ["Return specs must be a dictionary"]

    def test_multiple_errors(self, service):
        specs = {
            "main": {
                "returns": {
                    "v1": {"type": "bad"},
                    "v2": {"scope": "bad"},
                }
            }
        }
        errors = service.validate(specs)
        assert len(errors) == 2


class TestInferFromTasks:
    def test_infer_set_fact(self, service):
        tasks_yaml = """
- name: Set web port
  set_fact:
    web_port: 8080
    config_enabled: true

- name: Set paths
  ansible.builtin.set_fact:
    config_path: /etc/myapp/config.yml
"""
        result = service.infer_from_tasks(tasks_yaml)
        assert "web_port" in result
        assert result["web_port"]["type"] == "int"
        assert result["web_port"]["always_set"] is True
        assert "config_enabled" in result
        assert result["config_enabled"]["type"] == "bool"
        assert "config_path" in result
        assert result["config_path"]["type"] == "str"

    def test_infer_conditional_set_fact(self, service):
        tasks_yaml = """
- name: Set conditionally
  set_fact:
    optional_var: something
  when: some_condition
"""
        result = service.infer_from_tasks(tasks_yaml)
        assert result["optional_var"]["always_set"] is False

    def test_infer_in_block(self, service):
        tasks_yaml = """
- block:
    - name: Set in block
      set_fact:
        block_var: value
  rescue:
    - name: Set in rescue
      set_fact:
        rescue_var: value
"""
        result = service.infer_from_tasks(tasks_yaml)
        assert "block_var" in result
        assert "rescue_var" in result

    def test_infer_skips_cacheable(self, service):
        tasks_yaml = """
- name: Set with cacheable
  set_fact:
    my_var: value
    cacheable: true
"""
        result = service.infer_from_tasks(tasks_yaml)
        assert "my_var" in result
        assert "cacheable" not in result

    def test_infer_empty_tasks(self, service):
        assert service.infer_from_tasks("") == {}

    def test_infer_invalid_yaml(self, service):
        assert service.infer_from_tasks("{{invalid") == {}

    def test_infer_no_set_facts(self, service):
        tasks_yaml = """
- name: Debug message
  debug:
    msg: Hello
"""
        result = service.infer_from_tasks(tasks_yaml)
        assert result == {}

    def test_infer_list_type(self, service):
        tasks_yaml = """
- name: Set list
  set_fact:
    server_list:
      - server1
      - server2
"""
        result = service.infer_from_tasks(tasks_yaml)
        assert result["server_list"]["type"] == "list"

    def test_infer_dict_type(self, service):
        tasks_yaml = """
- name: Set dict
  set_fact:
    server_config:
      host: localhost
      port: 8080
"""
        result = service.infer_from_tasks(tasks_yaml)
        assert result["server_config"]["type"] == "dict"


class TestGenerateYaml:
    def test_generate_basic(self, service):
        specs = {
            "main": {
                "short_description": "Main returns",
                "returns": {
                    "web_port": {
                        "type": "int",
                        "description": "The web port",
                        "scope": "host",
                        "always_set": True,
                    }
                }
            }
        }
        result = service.generate_yaml(specs)
        parsed = yaml.safe_load(result)
        assert parsed["main"]["short_description"] == "Main returns"
        assert parsed["main"]["return_values"]["web_port"]["type"] == "int"
        assert parsed["main"]["return_values"]["web_port"]["always_set"] is True

    def test_generate_omits_default_scope(self, service):
        specs = {
            "main": {
                "returns": {
                    "my_var": {"type": "str", "scope": "host"},
                }
            }
        }
        result = service.generate_yaml(specs)
        parsed = yaml.safe_load(result)
        assert "scope" not in parsed["main"]["return_values"]["my_var"]

    def test_generate_includes_non_default_scope(self, service):
        specs = {
            "main": {
                "returns": {
                    "my_var": {"type": "str", "scope": "global"},
                }
            }
        }
        result = service.generate_yaml(specs)
        parsed = yaml.safe_load(result)
        assert parsed["main"]["return_values"]["my_var"]["scope"] == "global"

    def test_roundtrip(self, service):
        """Parse → Generate → Parse should be stable."""
        original = """
main:
  short_description: Test
  return_values:
    port:
      type: int
      description: The port
      always_set: true
    name:
      type: str
      description: The name
      scope: global
"""
        parsed = service.parse(original)
        generated = service.generate_yaml(parsed)
        reparsed = service.parse(generated)
        assert parsed == reparsed
