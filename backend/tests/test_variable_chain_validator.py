"""
Unit tests for VariableChainValidator service.
"""

import pytest
import pytest_asyncio
from unittest.mock import AsyncMock, MagicMock, patch

from app.services.variable_chain_validator import VariableChainValidator, JINJA_VAR_RE


class TestJinjaVarRegex:
    """Test the Jinja2 variable extraction regex."""

    def test_simple_var(self):
        matches = JINJA_VAR_RE.findall("{{ my_var }}")
        assert matches == ["my_var"]

    def test_no_spaces(self):
        matches = JINJA_VAR_RE.findall("{{my_var}}")
        assert matches == ["my_var"]

    def test_multiple_vars(self):
        matches = JINJA_VAR_RE.findall("{{ foo }} and {{ bar }}")
        assert set(matches) == {"foo", "bar"}

    def test_filter_expression(self):
        matches = JINJA_VAR_RE.findall("{{ my_var | default('') }}")
        assert matches == ["my_var"]

    def test_no_match_number(self):
        matches = JINJA_VAR_RE.findall("{{ 42 }}")
        assert matches == []

    def test_underscore_start(self):
        matches = JINJA_VAR_RE.findall("{{ _private }}")
        assert matches == ["_private"]


class TestExtractJinjaVars:
    """Test the _extract_jinja_vars method."""

    def setup_method(self):
        self.validator = VariableChainValidator()

    def test_string_value(self):
        result = self.validator._extract_jinja_vars("{{ foo }}")
        assert result == {"foo"}

    def test_dict_value(self):
        result = self.validator._extract_jinja_vars({
            "key1": "{{ var1 }}",
            "key2": "{{ var2 }}",
        })
        assert result == {"var1", "var2"}

    def test_list_value(self):
        result = self.validator._extract_jinja_vars(["{{ a }}", "{{ b }}"])
        assert result == {"a", "b"}

    def test_nested(self):
        result = self.validator._extract_jinja_vars({
            "outer": [{"inner": "{{ deep_var }}"}]
        })
        assert result == {"deep_var"}

    def test_no_jinja(self):
        result = self.validator._extract_jinja_vars("plain string")
        assert result == set()

    def test_non_string(self):
        result = self.validator._extract_jinja_vars(42)
        assert result == set()


class TestCheckTypeCompat:
    """Test the _check_type_compat method."""

    def setup_method(self):
        self.validator = VariableChainValidator()

    def test_any_type_always_compat(self):
        assert self.validator._check_type_compat("any", "hello")
        assert self.validator._check_type_compat("any", 42)
        assert self.validator._check_type_compat("any", [1, 2])

    def test_str_type(self):
        assert self.validator._check_type_compat("str", "hello")
        assert not self.validator._check_type_compat("str", 42)

    def test_int_type(self):
        assert self.validator._check_type_compat("int", 42)
        assert not self.validator._check_type_compat("int", "hello")

    def test_bool_not_int(self):
        assert not self.validator._check_type_compat("int", True)

    def test_bool_type(self):
        assert self.validator._check_type_compat("bool", True)
        assert not self.validator._check_type_compat("bool", 1)

    def test_list_type(self):
        assert self.validator._check_type_compat("list", [1, 2])
        assert not self.validator._check_type_compat("list", "not a list")

    def test_dict_type(self):
        assert self.validator._check_type_compat("dict", {"a": 1})
        assert not self.validator._check_type_compat("dict", [1, 2])

    def test_jinja_expression_always_compat(self):
        assert self.validator._check_type_compat("int", "{{ some_var }}")

    def test_unknown_type_compat(self):
        assert self.validator._check_type_compat("unknown_type", "anything")


class TestIsBuiltinVar:
    """Test the _is_builtin_var method."""

    def setup_method(self):
        self.validator = VariableChainValidator()

    def test_ansible_facts(self):
        assert self.validator._is_builtin_var("ansible_facts")

    def test_item(self):
        assert self.validator._is_builtin_var("item")

    def test_custom_var(self):
        assert not self.validator._is_builtin_var("my_custom_var")


class TestValidateRoleArgs:
    """Test the _validate_role_args method."""

    def setup_method(self):
        self.validator = VariableChainValidator()

    def test_missing_required(self):
        issues = []
        specs = {
            "args": {
                "required_var": {"required": True, "type": "str"},
            },
            "returns": {},
        }
        self.validator._validate_role_args("my_role", {}, specs, issues, module_id="m1")
        assert len(issues) == 1
        assert issues[0].severity == "error"
        assert "required_var" in issues[0].message

    def test_required_provided(self):
        issues = []
        specs = {
            "args": {
                "required_var": {"required": True, "type": "str"},
            },
            "returns": {},
        }
        self.validator._validate_role_args(
            "my_role", {"required_var": "value"}, specs, issues, module_id="m1"
        )
        assert len(issues) == 0

    def test_type_mismatch(self):
        issues = []
        specs = {
            "args": {
                "my_int": {"required": False, "type": "int"},
            },
            "returns": {},
        }
        self.validator._validate_role_args(
            "my_role", {"my_int": "not_an_int"}, specs, issues, module_id="m1"
        )
        assert len(issues) == 1
        assert issues[0].severity == "warning"
        assert "type" in issues[0].message.lower() or "Type" in issues[0].message

    def test_no_args_specs(self):
        issues = []
        specs = {"args": {}, "returns": {}}
        self.validator._validate_role_args("my_role", {"foo": "bar"}, specs, issues, module_id=None)
        assert len(issues) == 0


@pytest.mark.asyncio
class TestValidate:
    """Test the full validate method."""

    async def test_invalid_yaml(self):
        validator = VariableChainValidator()
        db = AsyncMock()
        result = await validator.validate("proj1", "{{invalid yaml: [", db)
        assert not result.is_valid
        assert len(result.issues) == 1
        assert result.issues[0].severity == "error"

    async def test_empty_playbook(self):
        validator = VariableChainValidator()
        db = AsyncMock()
        result = await validator.validate("proj1", "---\n- hosts: all\n  tasks: []\n", db)
        assert result.is_valid
        assert len(result.issues) == 0

    async def test_non_list_yaml(self):
        validator = VariableChainValidator()
        db = AsyncMock()
        result = await validator.validate("proj1", "key: value\n", db)
        assert result.is_valid

    async def test_role_reference_with_missing_required(self):
        validator = VariableChainValidator()
        db = AsyncMock()

        # Mock _resolve_role_specs to return specs with a required arg
        async def mock_resolve(project_id, role_name, session):
            return {
                "args": {"required_param": {"required": True, "type": "str"}},
                "returns": {"output_var": {"type": "str", "scope": "host"}},
            }

        validator._resolve_role_specs = mock_resolve

        playbook_yaml = """
- hosts: all
  roles:
    - role: my_role
"""
        result = await validator.validate("proj1", playbook_yaml, db)
        assert not result.is_valid
        assert any("required_param" in i.message for i in result.issues)
        assert "my_role" in result.role_specs

    async def test_include_role_task(self):
        validator = VariableChainValidator()
        db = AsyncMock()

        async def mock_resolve(project_id, role_name, session):
            return {
                "args": {},
                "returns": {"role_output": {"type": "str", "scope": "host"}},
            }

        validator._resolve_role_specs = mock_resolve

        playbook_yaml = """
- hosts: all
  tasks:
    - ansible.builtin.include_role:
        name: my_role
"""
        result = await validator.validate("proj1", playbook_yaml, db)
        assert result.is_valid
        assert "my_role" in result.role_specs

    async def test_undefined_variable_warning(self):
        validator = VariableChainValidator()
        db = AsyncMock()

        async def mock_resolve(project_id, role_name, session):
            return {"args": {}, "returns": {}}

        validator._resolve_role_specs = mock_resolve

        playbook_yaml = """
- hosts: all
  tasks:
    - ansible.builtin.debug:
        msg: "{{ undefined_custom_var }}"
"""
        result = await validator.validate("proj1", playbook_yaml, db)
        # Should warn about undefined_custom_var (not a builtin)
        warnings = [i for i in result.issues if i.var_name == "undefined_custom_var"]
        assert len(warnings) == 1
        assert warnings[0].severity == "warning"

    async def test_builtin_var_not_warned(self):
        validator = VariableChainValidator()
        db = AsyncMock()

        playbook_yaml = """
- hosts: all
  tasks:
    - ansible.builtin.debug:
        msg: "{{ ansible_hostname }}"
"""
        result = await validator.validate("proj1", playbook_yaml, db)
        assert not any(i.var_name == "ansible_hostname" for i in result.issues)
