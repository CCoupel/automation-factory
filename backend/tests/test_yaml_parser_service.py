"""
Unit tests for YamlParserService.

Tests the YAML → Play[] graph conversion without HTTP or database.
"""

import pytest

from app.services.yaml_parser_service import YamlParserService, TASK_LEVEL_KEYS


@pytest.fixture
def parser():
    return YamlParserService()


# ---------------------------------------------------------------------------
# 1. Simple playbook with one task
# ---------------------------------------------------------------------------

class TestSimplePlaybook:
    def test_single_task(self, parser):
        yaml_content = """
- name: Test Play
  hosts: all
  tasks:
    - name: Say hello
      ansible.builtin.debug:
        msg: "Hello"
"""
        result = parser.parse(yaml_content)
        assert not result["errors"]
        assert len(result["plays"]) == 1

        play = result["plays"][0]
        assert play["name"] == "Test Play"
        assert play["id"] == "play-1"

        # Should have START + 1 task = 2 modules
        modules = play["modules"]
        assert len(modules) == 2

        start = modules[0]
        assert start["isPlay"] is True
        assert start["parentSection"] == "tasks"

        task = modules[1]
        assert task["collection"] == "ansible.builtin"
        assert task["name"] == "debug"
        assert task["taskName"] == "Say hello"
        assert task["moduleParameters"] == {"msg": "Hello"}

        # One link: START → task
        assert len(play["links"]) == 1
        link = play["links"][0]
        assert link["from"] == start["id"]
        assert link["to"] == task["id"]
        assert link["type"] == "tasks"


# ---------------------------------------------------------------------------
# 2. Multiple tasks — ordering and chain
# ---------------------------------------------------------------------------

class TestMultipleTasks:
    def test_chain_start_a_b_c(self, parser):
        yaml_content = """
- name: Chain test
  hosts: all
  tasks:
    - name: Task A
      ansible.builtin.debug:
        msg: A
    - name: Task B
      ansible.builtin.debug:
        msg: B
    - name: Task C
      ansible.builtin.debug:
        msg: C
"""
        result = parser.parse(yaml_content)
        play = result["plays"][0]

        # START + 3 tasks = 4 modules
        assert len(play["modules"]) == 4

        # 3 links: START→A, A→B, B→C
        links = play["links"]
        assert len(links) == 3
        assert links[0]["from"] == play["modules"][0]["id"]
        assert links[0]["to"] == play["modules"][1]["id"]
        assert links[1]["from"] == play["modules"][1]["id"]
        assert links[1]["to"] == play["modules"][2]["id"]
        assert links[2]["from"] == play["modules"][2]["id"]
        assert links[2]["to"] == play["modules"][3]["id"]


# ---------------------------------------------------------------------------
# 3. Block with rescue/always
# ---------------------------------------------------------------------------

class TestBlocks:
    def test_block_with_rescue_always(self, parser):
        yaml_content = """
- name: Block test
  hosts: all
  tasks:
    - name: My block
      block:
        - name: Normal task
          ansible.builtin.debug:
            msg: normal
      rescue:
        - name: Rescue task
          ansible.builtin.debug:
            msg: rescue
      always:
        - name: Always task
          ansible.builtin.debug:
            msg: always
"""
        result = parser.parse(yaml_content)
        play = result["plays"][0]

        # Find the block module
        block = [m for m in play["modules"] if m.get("isBlock")][0]
        assert block["name"] == "My block"
        assert "normal" in block["blockSections"]
        assert "rescue" in block["blockSections"]
        assert "always" in block["blockSections"]
        assert len(block["blockSections"]["normal"]) == 1
        assert len(block["blockSections"]["rescue"]) == 1
        assert len(block["blockSections"]["always"]) == 1

        # Children should have parentId pointing to block
        children = [m for m in play["modules"] if m.get("parentId") == block["id"]]
        assert len(children) == 3

        normal_child = [c for c in children if c["parentSection"] == "normal"][0]
        assert normal_child["taskName"] == "Normal task"

        rescue_child = [c for c in children if c["parentSection"] == "rescue"][0]
        assert rescue_child["taskName"] == "Rescue task"

        always_child = [c for c in children if c["parentSection"] == "always"][0]
        assert always_child["taskName"] == "Always task"


# ---------------------------------------------------------------------------
# 4. Multi-play (list of plays)
# ---------------------------------------------------------------------------

class TestMultiPlay:
    def test_two_plays(self, parser):
        yaml_content = """
- name: Play 1
  hosts: web
  tasks:
    - ansible.builtin.ping:

- name: Play 2
  hosts: db
  tasks:
    - ansible.builtin.debug:
        msg: hello
"""
        result = parser.parse(yaml_content)
        assert len(result["plays"]) == 2
        assert result["plays"][0]["name"] == "Play 1"
        assert result["plays"][0]["id"] == "play-1"
        assert result["plays"][1]["name"] == "Play 2"
        assert result["plays"][1]["id"] == "play-2"


# ---------------------------------------------------------------------------
# 5. Multi-document YAML (--- separator)
# ---------------------------------------------------------------------------

class TestMultiDocument:
    def test_multi_document(self, parser):
        yaml_content = """---
- name: Doc 1
  hosts: all
  tasks:
    - ansible.builtin.ping:
---
- name: Doc 2
  hosts: all
  tasks:
    - ansible.builtin.debug:
        msg: hi
"""
        result = parser.parse(yaml_content)
        assert len(result["plays"]) == 2
        assert result["plays"][0]["name"] == "Doc 1"
        assert result["plays"][1]["name"] == "Doc 2"


# ---------------------------------------------------------------------------
# 6. Variables with type inference
# ---------------------------------------------------------------------------

class TestVariables:
    def test_type_inference(self, parser):
        yaml_content = """
- name: Vars test
  hosts: all
  vars:
    my_string: hello
    my_int: 42
    my_bool: true
    my_list:
      - a
      - b
    my_dict:
      key: value
  tasks:
    - ansible.builtin.debug:
        msg: "{{ my_string }}"
"""
        result = parser.parse(yaml_content)
        play = result["plays"][0]
        variables = play["variables"]
        assert len(variables) == 5

        by_key = {v["key"]: v for v in variables}
        assert by_key["my_string"]["type"] == "string"
        assert by_key["my_int"]["type"] == "int"
        assert by_key["my_bool"]["type"] == "bool"
        assert by_key["my_list"]["type"] == "list"
        assert by_key["my_dict"]["type"] == "dict"

        # All should be required=True
        for v in variables:
            assert v["required"] is True


# ---------------------------------------------------------------------------
# 7. Play attributes
# ---------------------------------------------------------------------------

class TestPlayAttributes:
    def test_attributes_extraction(self, parser):
        yaml_content = """
- name: Attrs test
  hosts: webservers
  become: true
  gather_facts: false
  remote_user: deploy
  connection: local
  tasks:
    - ansible.builtin.ping:
"""
        result = parser.parse(yaml_content)
        attrs = result["plays"][0]["attributes"]
        assert attrs["hosts"] == "webservers"
        assert attrs["become"] is True
        assert attrs["gatherFacts"] is False
        assert attrs["remoteUser"] == "deploy"
        assert attrs["connection"] == "local"


# ---------------------------------------------------------------------------
# 8. Roles
# ---------------------------------------------------------------------------

class TestRoles:
    def test_roles_in_attributes(self, parser):
        yaml_content = """
- name: With roles
  hosts: all
  roles:
    - geerlingguy.docker
    - role: geerlingguy.nginx
      vars:
        nginx_port: 8080
  tasks:
    - ansible.builtin.ping:
"""
        result = parser.parse(yaml_content)
        roles = result["plays"][0]["attributes"]["roles"]
        assert len(roles) == 2
        assert roles[0] == "geerlingguy.docker"
        assert roles[1]["role"] == "geerlingguy.nginx"


# ---------------------------------------------------------------------------
# 9. Jinja2 expressions preserved as strings
# ---------------------------------------------------------------------------

class TestJinja2:
    def test_jinja2_preserved(self, parser):
        yaml_content = """
- name: Jinja test
  hosts: all
  tasks:
    - name: Template task
      ansible.builtin.debug:
        msg: "{{ inventory_hostname }}"
      when: "ansible_os_family == 'Debian'"
"""
        result = parser.parse(yaml_content)
        task = result["plays"][0]["modules"][1]
        assert task["moduleParameters"]["msg"] == "{{ inventory_hostname }}"
        assert task["when"] == "ansible_os_family == 'Debian'"


# ---------------------------------------------------------------------------
# 10. Task attributes
# ---------------------------------------------------------------------------

class TestTaskAttributes:
    def test_task_level_attributes(self, parser):
        yaml_content = """
- name: Task attrs
  hosts: all
  tasks:
    - name: Complex task
      ansible.builtin.command:
        cmd: echo hello
      when: ansible_os_family == "RedHat"
      register: cmd_result
      loop:
        - a
        - b
      tags:
        - deploy
        - config
      ignore_errors: true
      become: true
      delegate_to: localhost
"""
        result = parser.parse(yaml_content)
        task = result["plays"][0]["modules"][1]
        assert task["when"] == 'ansible_os_family == "RedHat"'
        assert task["register"] == "cmd_result"
        assert task["loop"] == ["a", "b"]
        assert task["tags"] == ["deploy", "config"]
        assert task["ignoreErrors"] is True
        assert task["become"] is True
        assert task["delegateTo"] == "localhost"


# ---------------------------------------------------------------------------
# 11. Non-FQCN module
# ---------------------------------------------------------------------------

class TestNonFQCN:
    def test_short_module_name(self, parser):
        yaml_content = """
- name: Short names
  hosts: all
  tasks:
    - name: Short
      debug:
        msg: hello
"""
        result = parser.parse(yaml_content)
        task = result["plays"][0]["modules"][1]
        assert task["collection"] == ""
        assert task["name"] == "debug"


# ---------------------------------------------------------------------------
# 12. Empty YAML
# ---------------------------------------------------------------------------

class TestEmptyYaml:
    def test_empty_string(self, parser):
        result = parser.parse("")
        assert result["plays"] == []
        assert not result["errors"]

    def test_only_document_markers(self, parser):
        result = parser.parse("---\n")
        assert result["plays"] == []


# ---------------------------------------------------------------------------
# 13. Invalid YAML
# ---------------------------------------------------------------------------

class TestInvalidYaml:
    def test_invalid_yaml_returns_error(self, parser):
        result = parser.parse(":\n  - :\n    a: [unterminated")
        assert result["plays"] == []
        assert len(result["errors"]) > 0


# ---------------------------------------------------------------------------
# 14. All four sections
# ---------------------------------------------------------------------------

class TestAllSections:
    def test_four_sections(self, parser):
        yaml_content = """
- name: All sections
  hosts: all
  pre_tasks:
    - name: Pre
      ansible.builtin.debug:
        msg: pre
  tasks:
    - name: Main
      ansible.builtin.debug:
        msg: main
  post_tasks:
    - name: Post
      ansible.builtin.debug:
        msg: post
  handlers:
    - name: Handler
      ansible.builtin.debug:
        msg: handler
"""
        result = parser.parse(yaml_content)
        play = result["plays"][0]

        # 4 START nodes + 4 tasks = 8 modules
        assert len(play["modules"]) == 8

        start_modules = [m for m in play["modules"] if m.get("isPlay")]
        assert len(start_modules) == 4

        sections = {m["parentSection"] for m in start_modules}
        assert sections == {"pre_tasks", "tasks", "post_tasks", "handlers"}

        # 4 links (one per section: START → task)
        assert len(play["links"]) == 4


# ---------------------------------------------------------------------------
# 15. Module key identification
# ---------------------------------------------------------------------------

class TestModuleKeyIdentification:
    def test_identify_module_key(self, parser):
        task = {
            "name": "Install nginx",
            "ansible.builtin.apt": {"name": "nginx", "state": "present"},
            "when": "ansible_os_family == 'Debian'",
            "become": True,
        }
        key = parser._identify_module_key(task)
        assert key == "ansible.builtin.apt"

    def test_block_has_no_module_key(self, parser):
        task = {
            "name": "My block",
            "block": [{"ansible.builtin.debug": {"msg": "hi"}}],
            "rescue": [],
            "when": "condition",
        }
        key = parser._identify_module_key(task)
        assert key is None

    def test_all_task_level_keys_excluded(self, parser):
        """All keys in TASK_LEVEL_KEYS should be skipped."""
        task = {k: "value" for k in TASK_LEVEL_KEYS}
        key = parser._identify_module_key(task)
        assert key is None


# ---------------------------------------------------------------------------
# 16. Nested blocks
# ---------------------------------------------------------------------------

class TestNestedBlocks:
    def test_block_inside_block(self, parser):
        yaml_content = """
- name: Nested blocks
  hosts: all
  tasks:
    - name: Outer block
      block:
        - name: Inner block
          block:
            - name: Deep task
              ansible.builtin.debug:
                msg: deep
"""
        result = parser.parse(yaml_content)
        play = result["plays"][0]

        blocks = [m for m in play["modules"] if m.get("isBlock")]
        assert len(blocks) == 2

        outer = [b for b in blocks if b["name"] == "Outer block"][0]
        inner = [b for b in blocks if b["name"] == "Inner block"][0]

        assert inner["parentId"] == outer["id"]
        assert inner["parentSection"] == "normal"

        # Deep task should be child of inner block
        deep = [m for m in play["modules"] if m.get("taskName") == "Deep task"]
        assert len(deep) == 1
        assert deep[0]["parentId"] == inner["id"]


# ---------------------------------------------------------------------------
# Additional edge cases
# ---------------------------------------------------------------------------

class TestEdgeCases:
    def test_play_without_name(self, parser):
        yaml_content = """
- hosts: all
  tasks:
    - ansible.builtin.ping:
"""
        result = parser.parse(yaml_content)
        assert result["plays"][0]["name"] == "Play 1"

    def test_task_with_null_params(self, parser):
        yaml_content = """
- name: Null params
  hosts: all
  tasks:
    - ansible.builtin.ping:
"""
        result = parser.parse(yaml_content)
        task = result["plays"][0]["modules"][1]
        assert task["name"] == "ping"
        # ping with no params → moduleParameters not set (None value skipped)
        assert "moduleParameters" not in task or task["moduleParameters"] is None

    def test_no_tasks(self, parser):
        yaml_content = """
- name: No tasks play
  hosts: all
"""
        result = parser.parse(yaml_content)
        play = result["plays"][0]
        assert play["modules"] == []
        assert play["links"] == []

    def test_dict_document(self, parser):
        """A YAML document that is a dict (single play, not in a list)."""
        yaml_content = """
name: Single dict play
hosts: all
tasks:
  - ansible.builtin.ping:
"""
        result = parser.parse(yaml_content)
        assert len(result["plays"]) == 1
        assert result["plays"][0]["name"] == "Single dict play"

    def test_no_variables(self, parser):
        yaml_content = """
- name: No vars
  hosts: all
  tasks:
    - ansible.builtin.ping:
"""
        result = parser.parse(yaml_content)
        assert result["plays"][0]["variables"] == []
