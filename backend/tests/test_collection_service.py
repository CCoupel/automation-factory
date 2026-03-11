"""
Unit tests for CollectionService (parse, generate, validate)
"""

import pytest

from app.services.collection_service import CollectionService


@pytest.fixture
def svc():
    return CollectionService()


# -----------------------------------------------
# Parse tests
# -----------------------------------------------

class TestParse:
    def test_standard_collections_and_roles(self, svc):
        content = """
collections:
  - name: community.general
    version: ">=5.0.0"
  - name: ansible.posix
roles:
  - name: geerlingguy.docker
    version: "6.1.0"
"""
        data, warnings = svc.parse(content)
        assert len(data.collections) == 2
        assert data.collections[0].name == "community.general"
        assert data.collections[0].version == ">=5.0.0"
        assert data.collections[1].name == "ansible.posix"
        assert data.collections[1].version is None
        assert len(data.roles) == 1
        assert data.roles[0].name == "geerlingguy.docker"
        assert data.roles[0].version == "6.1.0"
        assert len(warnings) == 0

    def test_string_shorthand_collections(self, svc):
        content = """
collections:
  - community.general
  - ansible.posix
"""
        data, warnings = svc.parse(content)
        assert len(data.collections) == 2
        assert data.collections[0].name == "community.general"
        assert data.collections[1].name == "ansible.posix"

    def test_string_shorthand_with_version(self, svc):
        content = """
collections:
  - "community.general:>=5.0.0"
"""
        data, warnings = svc.parse(content)
        assert len(data.collections) == 1
        assert data.collections[0].name == "community.general"
        assert data.collections[0].version == ">=5.0.0"

    def test_collections_with_source(self, svc):
        content = """
collections:
  - name: my_namespace.my_collection
    version: "1.0.0"
    source: https://galaxy.example.com
"""
        data, warnings = svc.parse(content)
        assert data.collections[0].source == "https://galaxy.example.com"

    def test_legacy_format_roles_list(self, svc):
        content = """
- name: geerlingguy.docker
  version: "6.1.0"
- name: geerlingguy.nginx
"""
        data, warnings = svc.parse(content)
        assert len(data.roles) == 2
        assert len(data.collections) == 0
        assert any("Legacy format" in w for w in warnings)

    def test_roles_with_src_and_scm(self, svc):
        content = """
roles:
  - name: my_role
    src: https://github.com/user/repo.git
    scm: git
    version: "v1.0.0"
"""
        data, warnings = svc.parse(content)
        assert data.roles[0].src == "https://github.com/user/repo.git"
        assert data.roles[0].scm == "git"

    def test_role_key_alias(self, svc):
        """Roles can use 'role' instead of 'name'."""
        content = """
roles:
  - role: geerlingguy.docker
    version: "6.1.0"
"""
        data, warnings = svc.parse(content)
        assert data.roles[0].name == "geerlingguy.docker"

    def test_empty_file(self, svc):
        data, warnings = svc.parse("")
        assert len(data.collections) == 0
        assert len(data.roles) == 0
        assert any("Empty" in w for w in warnings)

    def test_collections_only(self, svc):
        content = """
collections:
  - name: community.general
"""
        data, warnings = svc.parse(content)
        assert len(data.collections) == 1
        assert len(data.roles) == 0

    def test_roles_only(self, svc):
        content = """
roles:
  - name: geerlingguy.docker
"""
        data, warnings = svc.parse(content)
        assert len(data.collections) == 0
        assert len(data.roles) == 1

    def test_unknown_keys_warning(self, svc):
        content = """
collections:
  - name: community.general
extra_key: something
"""
        data, warnings = svc.parse(content)
        assert any("Unknown keys" in w for w in warnings)

    def test_invalid_yaml_raises(self, svc):
        with pytest.raises(ValueError, match="Invalid YAML"):
            svc.parse("collections:\n  - [invalid: yaml: :")

    def test_non_dict_non_list_raises(self, svc):
        with pytest.raises(ValueError, match="must be a YAML dict or list"):
            svc.parse("just a string")

    def test_skip_entries_missing_name(self, svc):
        content = """
collections:
  - version: "1.0.0"
  - name: community.general
"""
        data, warnings = svc.parse(content)
        assert len(data.collections) == 1
        assert any("missing 'name'" in w for w in warnings)

    def test_skip_unexpected_type_entries(self, svc):
        content = """
collections:
  - 42
  - name: community.general
"""
        data, warnings = svc.parse(content)
        assert len(data.collections) == 1
        assert any("unexpected type" in w for w in warnings)

    def test_non_list_collections_warning(self, svc):
        content = """
collections: "not a list"
"""
        data, warnings = svc.parse(content)
        assert len(data.collections) == 0
        assert any("not a list" in w for w in warnings)

    def test_string_shorthand_roles(self, svc):
        content = """
roles:
  - geerlingguy.docker
  - geerlingguy.nginx
"""
        data, warnings = svc.parse(content)
        assert len(data.roles) == 2
        assert data.roles[0].name == "geerlingguy.docker"


# -----------------------------------------------
# Generate tests
# -----------------------------------------------

class TestGenerate:
    def test_roundtrip(self, svc):
        """Parse then generate should produce valid YAML."""
        original = """
collections:
  - name: community.general
    version: ">=5.0.0"
  - name: ansible.posix
roles:
  - name: geerlingguy.docker
    version: "6.1.0"
"""
        data, _ = svc.parse(original)
        generated = svc.generate(data)

        # Parse the generated YAML again
        data2, _ = svc.parse(generated)
        assert len(data2.collections) == len(data.collections)
        assert len(data2.roles) == len(data.roles)
        assert data2.collections[0].name == data.collections[0].name
        assert data2.collections[0].version == data.collections[0].version

    def test_empty_data(self, svc):
        from app.schemas.collection import RequirementsData
        result = svc.generate(RequirementsData())
        assert "collections: []" in result
        assert "roles: []" in result

    def test_collections_only(self, svc):
        from app.schemas.collection import RequirementsData, CollectionRequirement
        data = RequirementsData(
            collections=[CollectionRequirement(name="community.general", version=">=5.0.0")]
        )
        result = svc.generate(data)
        assert "community.general" in result
        assert "roles" not in result

    def test_source_included(self, svc):
        from app.schemas.collection import RequirementsData, CollectionRequirement
        data = RequirementsData(
            collections=[CollectionRequirement(
                name="my.collection",
                source="https://galaxy.example.com"
            )]
        )
        result = svc.generate(data)
        assert "https://galaxy.example.com" in result

    def test_role_with_src_scm(self, svc):
        from app.schemas.collection import RequirementsData, RoleRequirement
        data = RequirementsData(
            roles=[RoleRequirement(
                name="my_role", src="https://github.com/user/repo.git", scm="git"
            )]
        )
        result = svc.generate(data)
        assert "src:" in result
        assert "scm: git" in result


# -----------------------------------------------
# Validate tests
# -----------------------------------------------

class TestValidate:
    def test_valid_data(self, svc):
        from app.schemas.collection import RequirementsData, CollectionRequirement, RoleRequirement
        data = RequirementsData(
            collections=[
                CollectionRequirement(name="community.general"),
                CollectionRequirement(name="ansible.posix"),
            ],
            roles=[RoleRequirement(name="geerlingguy.docker")],
        )
        errors = svc.validate(data)
        assert len(errors) == 0

    def test_duplicate_collection(self, svc):
        from app.schemas.collection import RequirementsData, CollectionRequirement
        data = RequirementsData(
            collections=[
                CollectionRequirement(name="community.general"),
                CollectionRequirement(name="community.general"),
            ]
        )
        errors = svc.validate(data)
        assert any("Duplicate collection" in e for e in errors)

    def test_invalid_fqcn(self, svc):
        from app.schemas.collection import RequirementsData, CollectionRequirement
        data = RequirementsData(
            collections=[CollectionRequirement(name="invalid-no-dot")]
        )
        errors = svc.validate(data)
        assert any("Invalid FQCN" in e for e in errors)

    def test_duplicate_role(self, svc):
        from app.schemas.collection import RequirementsData, RoleRequirement
        data = RequirementsData(
            roles=[
                RoleRequirement(name="geerlingguy.docker"),
                RoleRequirement(name="geerlingguy.docker"),
            ]
        )
        errors = svc.validate(data)
        assert any("Duplicate role" in e for e in errors)

    def test_valid_fqcn_formats(self, svc):
        from app.schemas.collection import RequirementsData, CollectionRequirement
        data = RequirementsData(
            collections=[
                CollectionRequirement(name="community.general"),
                CollectionRequirement(name="ansible.posix"),
                CollectionRequirement(name="my_namespace.my_collection"),
            ]
        )
        errors = svc.validate(data)
        assert len(errors) == 0
