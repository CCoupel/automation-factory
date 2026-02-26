# Project Workbench - Design Document

Design specification for evolving Automation Factory from a single-playbook visual editor
into a full Ansible project workbench with role authoring, inventory management, Git-backed
collaboration, and a novel `return_specs.yml` specification for role output interfaces.

**Status:** Draft
**Date:** 2026-02-23
**Scope:** Frontend architecture, backend data model, UX flows, `return_specs.yml` spec

---

## Table of Contents

1. [Motivation](#1-motivation)
2. [Design Principles](#2-design-principles)
3. [Data Model](#3-data-model)
4. [UX Design](#4-ux-design)
5. [Role Designer and return_specs](#5-role-designer-and-return_specs)
6. [Inventory Manager](#6-inventory-manager)
7. [Collection Manager](#7-collection-manager)
8. [Git Integration](#8-git-integration)
9. [YAML-Aware Conflict Resolution](#9-yaml-aware-conflict-resolution)
10. [Collaboration Model](#10-collaboration-model)
11. [Frontend Refactoring](#11-frontend-refactoring)
12. [Backend Changes](#12-backend-changes)
13. [Implementation Sequence](#13-implementation-sequence)
14. [Appendix A: return_specs.yml Specification](#appendix-a-return_specsyml-specification)
15. [Appendix B: Reference Project Analysis](#appendix-b-reference-project-analysis)

---

## 1. Motivation

### 1.1 Current State

Automation Factory is a visual playbook builder. Users drag Ansible modules from a Galaxy-
connected palette onto a canvas, configure task parameters via forms, and export standard
Ansible YAML. The application supports multi-play playbooks, blocks with rescue/always,
real-time collaboration via WebSocket, and role-based sharing (owner/editor/viewer).

The organizational unit is the **playbook**. There is no concept of project, no role
authoring, no inventory management, no Git integration.

### 1.2 The Gap

Real-world Ansible projects are not single playbooks. The SEAPATH reference project
(~/Code/github.com/seapath/ansible) contains 64 roles, 49 playbooks, custom Python
modules, external collections, multi-environment inventories, Jinja2 templates, and CI/CD
integration. These artifacts reference each other: playbooks import roles, roles depend on
other roles, templates reference variables from inventories, and collections provide shared
module libraries.

Automation Factory cannot manage this level of complexity today. Users who need roles,
inventories, or collections must work outside the tool, losing the visual design and
collaboration advantages.

### 1.3 Vision

Extend Automation Factory into a **project workbench** that can:

- Import existing Ansible projects (from Git repositories)
- Author and refactor roles with the same visual approach used for playbooks
- Manage inventories with a structured editor (hosts, groups, variables)
- Track collections and their dependencies
- Commit changes back to Git and create pull requests
- Resolve merge conflicts with YAML-aware semantic understanding
- Maintain real-time collaboration across all artifact types

Additionally, introduce a `return_specs.yml` specification for Ansible roles, formalizing
role outputs the way `argument_specs.yml` formalizes inputs. Automation Factory serves as
the reference implementation and demonstrator for this spec.

### 1.4 Original Design Brief (2020)

From the original Automation Factory concept document:

> "The next level could be achieved by providing a user interface that allows users to
> create their playbooks / roles with drag-n-drop and per task forms, similar to what BPM
> solutions provide."

The project workbench fulfills this vision by extending the BPM-style visual editor beyond
playbooks to the full Ansible artifact ecosystem.

---

## 2. Design Principles

### 2.1 Progressive Disclosure

A user creating a simple playbook should see the same interface they see today. The project
workbench is an additional layer that appears when the user creates or imports a project.
Standalone playbooks remain a first-class concept.

### 2.2 Import-First

The workbench must handle existing Ansible projects faithfully. This requires a YAML parser
(currently missing) and a round-trip guarantee: import a project, make changes, export it
back without losing structure, comments where feasible, or formatting beyond what the tool
manages.

### 2.3 Collaborative by Default

Every artifact in a project inherits the collaboration model: real-time presence, WebSocket
sync, sharing with roles. Git integration adds asynchronous collaboration (branches, PRs)
on top of the existing synchronous model.

### 2.4 Typed Interfaces

Roles have formal input specs (`argument_specs.yml`) and, with this design, formal output
specs (`return_specs.yml`). The workbench uses both to validate variable chains at design
time, preventing runtime errors.

### 2.5 Backward Compatibility

Standalone playbooks (no project context) continue to work exactly as they do today. The
project workbench is additive. No existing data model changes break current functionality.

---

## 3. Data Model

### 3.1 New Entity: Project

```
Project
├── id: UUID
├── name: string
├── description: text (nullable)
├── owner_id: FK → User
├── git_url: string (nullable)          # remote repository URL
├── git_branch: string (default: "main")
├── git_credentials_id: FK → GitCredential (nullable)
├── created_at: datetime
├── updated_at: datetime
└── settings: JSON                      # ansible.cfg equivalent, project-level config
```

### 3.2 New Entity: ProjectArtifact

Each file/directory in the project is tracked as an artifact:

```
ProjectArtifact
├── id: UUID
├── project_id: FK → Project
├── artifact_type: enum
│   ├── playbook
│   ├── role
│   ├── inventory
│   ├── collection_requirements
│   ├── variable_file
│   ├── template
│   ├── custom_module
│   ├── ansible_cfg
│   └── file                            # static files (roles/x/files/)
├── path: string                        # relative path within project (e.g., "roles/cephadm")
├── content: JSON                       # structured representation (parsed YAML/JSON)
├── raw_content: text (nullable)        # original text for round-trip (templates, modules)
├── version: integer                    # optimistic locking
├── created_at: datetime
├── updated_at: datetime
└── metadata: JSON                      # artifact-specific metadata
```

### 3.3 New Entity: ProjectShare

Mirrors PlaybookShare but at project level:

```
ProjectShare
├── id: UUID
├── project_id: FK → Project
├── user_id: FK → User
├── role: enum (owner, editor, viewer)
├── created_at: datetime
└── created_by: FK → User
```

### 3.4 New Entity: GitCredential

```
GitCredential
├── id: UUID
├── user_id: FK → User
├── name: string                        # display name
├── provider: enum (github, gitlab, bitbucket, custom)
├── token_encrypted: text               # Fernet-encrypted PAT
├── created_at: datetime
└── updated_at: datetime
```

### 3.5 Playbook Model Changes

Add optional project reference (backward-compatible):

```
Playbook (existing)
├── ...existing fields...
└── project_id: FK → Project (nullable)  # null = standalone playbook
```

### 3.6 Relationship Diagram

```
User (1) ──┬──→ (Many) Project (owner)
            ├──→ (Many) ProjectShare
            ├──→ (Many) GitCredential
            └──→ (Many) Playbook (standalone, project_id=null)

Project (1) ──┬──→ (Many) ProjectArtifact
              ├──→ (Many) ProjectShare
              ├──→ (Many) Playbook (project_id set)
              └──→ (0-1) GitCredential

ProjectArtifact (Many) ──→ (1) Project
```

---

## 4. UX Design

### 4.1 Navigation Architecture

```
/login                                    # existing
/                                         # project list + standalone playbooks
/projects/:id                            # project workbench
/projects/:id/playbooks/:path            # playbook editor (existing canvas)
/projects/:id/roles/:path                # role editor
/projects/:id/inventory/:path            # inventory editor
/projects/:id/files/:path                # template/file editor
/playbooks/:id                           # standalone playbook (backward compat)
/admin/accounts                          # existing
```

### 4.2 Home Page: Project List

Replaces the current PlaybookManagerDialog as the entry point:

```
┌──────────────────────────────────────────────────────────────────┐
│  Automation Factory                           user@example.com ▾ │
├──────────────────────────────────────────────────────────────────┤
│                                                                  │
│  [Projects]  [Standalone Playbooks]                    [+ New]  │
│                                                                  │
│  ┌────────────────────────────────────────────────────────────┐  │
│  │ SEAPATH Cluster                                            │  │
│  │ 49 playbooks · 64 roles · git: github.com/seapath/ansible │  │
│  │ Last edited: 2h ago · Shared with: 3 users                │  │
│  ├────────────────────────────────────────────────────────────┤  │
│  │ Network Infrastructure                                     │  │
│  │ 4 playbooks · 2 roles · no git                            │  │
│  │ Last edited: 3 days ago                                    │  │
│  ├────────────────────────────────────────────────────────────┤  │
│  │ Shared with me                                             │  │
│  │ DevOps Platform (viewer) · Database Setup (editor)        │  │
│  └────────────────────────────────────────────────────────────┘  │
│                                                                  │
└──────────────────────────────────────────────────────────────────┘
```

The "Standalone Playbooks" tab shows the current flat playbook list for backward
compatibility.

The [+ New] button offers:
- New Standalone Playbook (current behavior)
- New Project (empty)
- Import from Git (clone URL)

### 4.3 Project Workbench Layout

When inside a project, the layout adapts the existing 4-zone pattern:

```
┌──────────────────────────────────────────────────────────────────┐
│ AF · SEAPATH Cluster · main ▾ · 3 changes · [↑ Push] · user ▾  │
├──────────┬───────────────────────────────────────────┬───────────┤
│ [Project]│  [cluster_setup.yml ×] [cephadm/tasks ×] │  Config   │
│ [Modules]│                                           │  Zone     │
│          │                                           │           │
│ Project  │         Active Editor                     │ Context-  │
│ Tree     │         (type depends on artifact)        │ sensitive │
│   or     │                                           │ panel     │
│ Module   │                                           │           │
│ Palette  │                                           │           │
├──────────┴───────────────────────────────────────────┴───────────┤
│ System Zone (validation, assertions, git status)                 │
└──────────────────────────────────────────────────────────────────┘
```

Key changes from the current layout:

**Header bar** — Shows project name, branch selector, change counter, push/PR action.
Replaces the playbook-only header when inside a project.

**Left panel tabs** — "Project" (file tree) and "Modules" (existing palette). The project
tab shows the artifact tree; the modules tab shows the Galaxy module palette as today.

**Work zone tabs** — Multiple artifacts can be open simultaneously, shown as tabs above the
editor area. Each tab opens the appropriate editor type.

**Config zone** — Remains context-sensitive. Shows module config when a task is selected,
play attributes when a play is selected, role interface when editing a role, host variables
when editing an inventory, etc.

**System zone** — Extended with Git status, branch info, and validation across all open
artifacts.

### 4.4 Project Tree (Left Panel)

```
📦 SEAPATH Cluster
├── 📁 Playbooks
│   ├── 📄 cluster_setup_ceph.yml
│   ├── 📄 seapath_setup_network.yml
│   ├── 📄 deploy_vms.yml
│   └── 📄 ... (46 more)
├── 📁 Roles
│   ├── 📁 cephadm
│   │   ├── 📋 tasks/main.yml
│   │   ├── 📋 handlers/main.yml
│   │   ├── 📁 templates/ (2 files)
│   │   ├── 📋 defaults/main.yml
│   │   ├── 📋 meta/main.yml
│   │   ├── 📋 meta/argument_specs.yml
│   │   └── 📋 meta/return_specs.yml
│   ├── 📁 detect_seapath_distro
│   └── 📁 ... (62 more)
├── 📁 Inventory
│   ├── 📄 production.yml
│   └── 📄 staging.yml
├── 📁 Collections
│   └── 📄 requirements.yml
├── 📁 Vars
│   ├── 📄 Debian_paths.yml
│   └── 📄 CentOS_paths.yml
├── 📁 Library
│   └── 🐍 cluster_vm.py
└── ⚙️ ansible.cfg
```

**Interactions:**
- Single-click: select artifact (shows preview in config zone)
- Double-click: open artifact in work zone tab
- Right-click: context menu (rename, delete, duplicate, new file/folder)
- Drag from tree: reorder, move between directories
- Icons indicate: modified (dot), conflict (warning), new (plus)

### 4.5 Multi-Editor Work Zone

The work zone renders different editors based on artifact type:

| Artifact Type | Editor | Description |
|---------------|--------|-------------|
| Playbook | Visual Canvas (existing) | Drag-drop tasks, blocks, roles on canvas |
| Role tasks | Visual Canvas (adapted) | Same canvas, scoped to tasks + handlers |
| Role defaults/vars | Variable Table | Key-value table with type/description |
| Role meta | Form Editor | argument_specs + return_specs forms |
| Inventory | Inventory Editor | Host/group tree with variable panels |
| Template | Code Editor | Jinja2 with syntax highlighting |
| Variable file | Variable Table | Key-value table |
| requirements.yml | Collection Browser | Galaxy search + version pinning |
| Custom module | Code Editor | Python (read-only by default) |
| ansible.cfg | Form Editor | Grouped settings with documentation |

**Tab bar** above the editor area:

```
┌─────────────────────────────────────────────────────────────────┐
│ [cluster_setup.yml ×] [cephadm/tasks ×] [production.yml ×]    │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│    Active editor content for selected tab                       │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

Tabs show: artifact name, modified indicator (dot), close button. The active tab is
highlighted. Tabs can be reordered by dragging.

---

## 5. Role Designer and return_specs

### 5.1 Role Editor Layout

When opening a role from the project tree, the work zone shows a role-specific editor:

```
┌─ Role: cephadm ──────────────────────────────────────────────┐
│                                                               │
│  [Interface]  [Tasks]  [Handlers]  [Templates]  [Files]      │
│                                                               │
│  (content depends on selected tab)                            │
│                                                               │
└───────────────────────────────────────────────────────────────┘
```

**Interface tab** — Shows the role's formal interface: inputs (argument_specs) and outputs
(return_specs). This is the primary design-time contract view.

**Tasks tab** — Visual canvas (same as playbook tasks section), but scoped to a single
ordered task list. No plays, no pre/post distinction. The canvas reuses the existing
PlaySectionContent and BlockSectionContent components.

**Handlers tab** — List of handlers with name and trigger configuration.

**Templates tab** — File list with inline Jinja2 editor. Shows which variables are
referenced in each template.

**Files tab** — Static files managed by the role. Upload, download, rename, delete.

### 5.2 Interface Tab Detail

```
┌─ Role Interface: cephadm ────────────────────────────────────┐
│                                                               │
│  ┌─ Inputs (argument_specs.yml) ──────────────────────────┐  │
│  │                                                         │  │
│  │  Name              Type    Required  Default            │  │
│  │  ─────────────────────────────────────────────────────  │  │
│  │  cephadm_release    str    yes       -                  │  │
│  │  cephadm_network    str    yes       -                  │  │
│  │  cephadm_registry   str    no        ""                 │  │
│  │  cephadm_download   bool   no        false              │  │
│  │                                                         │  │
│  │  [+ Add Input]                                          │  │
│  └─────────────────────────────────────────────────────────┘  │
│                                                               │
│  ┌─ Outputs (return_specs.yml) ───────────────────────────┐  │
│  │                                                         │  │
│  │  Name                    Type   Scope  Condition        │  │
│  │  ─────────────────────────────────────────────────────  │  │
│  │  cephadm_is_ceph_node    bool   host   always           │  │
│  │  cephadm_first_node      str    play   always           │  │
│  │  cephadm_do_bootstrap    bool   play   always           │  │
│  │  cephadm_mon_nodes       list   play   always           │  │
│  │                                                         │  │
│  │  [+ Add Output]                                         │  │
│  └─────────────────────────────────────────────────────────┘  │
│                                                               │
│  ┌─ Dependencies (meta/main.yml) ─────────────────────────┐  │
│  │                                                         │  │
│  │  detect_seapath_distro                                  │  │
│  │  └─ provides: seapath_distro (str), is_using_cephadm   │  │
│  │                                                         │  │
│  │  [+ Add Dependency]                                     │  │
│  └─────────────────────────────────────────────────────────┘  │
│                                                               │
└───────────────────────────────────────────────────────────────┘
```

### 5.3 Output Ports on Canvas

When a role with declared outputs is referenced in a playbook's `roles:` section, the role
block on the canvas shows **output ports**:

```
┌──────────────────────────┐
│ detect_seapath_distro    │
│                          │
│          seapath_distro ─●──────┐
│        is_using_cephadm ─●──┐  │
└──────────────────────────┘   │  │
                               │  │
                               │  │
┌──────────────────────────┐   │  │
│ cephadm                  │   │  │
│                          │   │  │
│  ●─ is_using_cephadm ───┘   │
│                          │   │
└──────────────────────────┘   │
                               │
┌──────────────────────────┐   │
│ ansible.builtin.debug    │   │
│                          │   │
│  ●─ msg: {{ distro }} ──────┘
└──────────────────────────┘
```

Drawing a connection between an output port and an input parameter generates the
appropriate `{{ variable_name }}` reference automatically. This is the "transparent
register linking" concept from the original design brief.

### 5.4 Design-Time Validation

With both argument_specs and return_specs available, the workbench validates variable
chains at design time:

| Check | Severity | Example |
|-------|----------|---------|
| Undefined variable reference | Error | Task uses `{{ foo }}` but no upstream role/task produces `foo` |
| Type mismatch | Warning | Output is `list`, but consumer uses it as `str` |
| Invalid choice | Error | Output has `choices: [A, B, C]`, consumer tests `== "D"` |
| Scope mismatch | Warning | Output is `host`-scoped, consumer assumes single value |
| Missing dependency | Warning | Role B uses output from role A, but A is not listed before B |
| Unused output | Info | Role declares output that nothing consumes |

Validation results appear in the system zone (bottom panel) alongside existing assertion
validation.

### 5.5 return_specs.yml Authoring

The "Add Output" flow:

1. User clicks [+ Add Output] in the Interface tab
2. Dialog appears with fields: name, type, description, scope, always_set, choices,
   depends_on
3. On save, the return_specs.yml file is updated
4. If the role already has tasks that `set_fact` for this variable, the system detects the
   match automatically
5. If not, the system suggests adding a `set_fact` task

When importing an existing role (from Git), the workbench can **infer** return_specs by
scanning tasks for `set_fact` calls and offering to create the spec from discovered facts.

---

## 6. Inventory Manager

### 6.1 Inventory Editor Layout

```
┌─ Inventory: production.yml ──────────────────────────────────┐
│                                                               │
│  ┌─ Hosts ──────────────┬─ Groups ────────────────────────┐  │
│  │ [+ Add Host]         │ [+ Add Group]                   │  │
│  │                      │                                  │  │
│  │ 🖥 node1             │ 📂 all                           │  │
│  │   192.168.200.121    │   ├── 📂 hypervisors             │  │
│  │   [hyp, mons]        │   │   ├── node1                  │  │
│  │                      │   │   ├── node2                  │  │
│  │ 🖥 node2             │   │   └── node3                  │  │
│  │   192.168.200.122    │   ├── 📂 mons                    │  │
│  │   [hyp, mons]        │   │   ├── node1                  │  │
│  │                      │   │   └── node2                  │  │
│  │ 🖥 node3             │   └── 📂 osds                    │  │
│  │   192.168.200.123    │       ├── node1                  │  │
│  │   [hyp, osds]        │       └── node3                  │  │
│  └──────────────────────┴──────────────────────────────────┘  │
│                                                               │
│  ┌─ Variables (selected: node1 in hypervisors) ───────────┐  │
│  │                                                         │  │
│  │  [Host Vars]  [Group Vars]  [Inherited]                │  │
│  │                                                         │  │
│  │  Host Vars (node1):                                     │  │
│  │    ansible_host: 192.168.200.121                        │  │
│  │    ptp_interface: eno12419                              │  │
│  │                                                         │  │
│  │  Group Vars (hypervisors):                              │  │
│  │    isolcpus: "4-N"                                      │  │
│  │    livemigration_user: libvirtadmin                     │  │
│  │                                                         │  │
│  │  Inherited (all):                                       │  │
│  │    admin_user: admin                  (from: all)       │  │
│  │    ansible_python: /usr/bin/python3   (from: all)       │  │
│  └─────────────────────────────────────────────────────────┘  │
│                                                               │
└───────────────────────────────────────────────────────────────┘
```

### 6.2 Key Interactions

- **Add host**: form with hostname, ansible_host, optional group assignments
- **Add group**: name input, optional parent group, optional children groups
- **Assign host to group**: drag host to group, or checkbox in host detail
- **Edit variables**: inline editing in variable table, add/remove key-value pairs
- **Variable precedence**: "Inherited" tab shows the effective variable value with
  provenance (which group or host_vars it comes from)
- **Validation**: warn on undefined variables referenced in playbooks, highlight unused
  hosts (not in any group used by playbooks)

### 6.3 Inventory Formats

The editor supports:
- **YAML inventory** (primary, as in SEAPATH): structured YAML with hosts/groups/vars
- **INI inventory** (import only): parse on import, convert to YAML internally
- **Dynamic inventory scripts** (reference only): show script path, no editing

---

## 7. Collection Manager

### 7.1 Requirements Editor

```
┌─ Collections: requirements.yml ──────────────────────────────┐
│                                                               │
│  ┌─ Installed Collections ────────────────────────────────┐  │
│  │                                                         │  │
│  │  community.general          latest    [Galaxy]  [×]    │  │
│  │  community.libvirt           latest    [Galaxy]  [×]    │  │
│  │  containers.podman           latest    [Galaxy]  [×]    │  │
│  │  ansible.posix               latest    [Galaxy]  [×]    │  │
│  │  ansible.utils               latest    [Galaxy]  [×]    │  │
│  │  openstack.config_template   2.1.1     [Git]    [×]    │  │
│  │                                                         │  │
│  │  [+ Add Collection]                                     │  │
│  └─────────────────────────────────────────────────────────┘  │
│                                                               │
│  ┌─ Usage in Project ─────────────────────────────────────┐  │
│  │                                                         │  │
│  │  community.general (used in 12 tasks across 8 roles)   │  │
│  │    json_query: roles/cephadm/tasks/main.yml:142        │  │
│  │    json_query: roles/cephadm/tasks/main.yml:198        │  │
│  │    ...                                                  │  │
│  │                                                         │  │
│  │  ansible.posix (used in 5 tasks across 3 roles)        │  │
│  │    authorized_key: roles/cephadm/tasks/main.yml:45     │  │
│  │    ...                                                  │  │
│  │                                                         │  │
│  │  containers.podman (used in 0 tasks) ⚠ unused          │  │
│  └─────────────────────────────────────────────────────────┘  │
│                                                               │
└───────────────────────────────────────────────────────────────┘
```

### 7.2 Add Collection Dialog

Reuses the existing Galaxy integration (ModulesTreeView, galaxy sources). The dialog adds:
- Version pinning with available versions dropdown
- Source selection (public Galaxy, private Galaxy, Git URL)
- Automatic detection of required collections from FQCN usage in project tasks

---

## 8. Git Integration

### 8.1 Hybrid Model

Git provides persistence, versioning, and review workflows. The database provides real-time
collaboration state. The boundary is explicit:

```
Real-time layer (DB + WebSocket)
├── Live editing state per artifact
├── Presence tracking per artifact
├── Auto-save (debounced)
└── Collaboration broadcasts

Persistence layer (Git)
├── Committed snapshots (explicit user action)
├── Branch management
├── Merge / conflict resolution
├── Push to remote
└── Pull request creation
```

Users work in the real-time layer. When they want to checkpoint their work, they explicitly
commit to Git. The commit serializes the DB state into Ansible project files.

### 8.2 Project Header Bar

```
┌──────────────────────────────────────────────────────────────────┐
│ AF · SEAPATH Cluster  ·  main ▾  ·  3 changes  ·  ↑ Push  · ···│
└──────────────────────────────────────────────────────────────────┘
         │                    │          │              │
    project name        branch picker  change count   push/PR
```

**Branch picker** — dropdown showing local branches. "New branch from main..." option at
bottom. When switching branches, the DB state is replaced with the branch content.

**Change counter** — badge showing number of modified artifacts since last commit. Clicking
opens the Changes panel.

**Push button** — pushes current branch to remote. If no remote tracking branch exists,
prompts to create one.

### 8.3 Changes Panel

Accessible from the change counter badge or system zone:

```
┌─ Changes ────────────────────────────────────────────────────┐
│                                                               │
│  Modified (2)                                                 │
│  ☑ playbooks/cluster_setup_ceph.yml                [Diff]    │
│  ☑ roles/cephadm/tasks/main.yml                    [Diff]    │
│                                                               │
│  Added (1)                                                    │
│  ☑ roles/cephadm/meta/return_specs.yml             [Diff]    │
│                                                               │
│  ┌─ Commit Message ──────────────────────────────────────┐   │
│  │ Add return_specs to cephadm role                      │   │
│  │                                                        │   │
│  │ Declares cephadm_is_ceph_node, cephadm_first_node,   │   │
│  │ and cephadm_do_bootstrap as formal outputs.           │   │
│  └────────────────────────────────────────────────────────┘   │
│                                                               │
│  [Commit to feature/return-specs]           [Discard All]     │
│                                                               │
└───────────────────────────────────────────────────────────────┘
```

**Diff view** — clicking [Diff] opens a side-by-side or unified diff for that artifact.
For structured artifacts (playbooks, roles, inventories), the diff is YAML-aware
(section-level, not line-level). See Section 9.

### 8.4 Create Pull Request

After committing and pushing:

```
┌─ Create Pull Request ────────────────────────────────────────┐
│                                                               │
│  From: feature/return-specs                                   │
│  To:   main  ▾                                                │
│                                                               │
│  Title: Add return_specs to cephadm role                      │
│                                                               │
│  Description:                                                 │
│  ┌────────────────────────────────────────────────────────┐   │
│  │ ## Summary                                             │   │
│  │ - Added meta/return_specs.yml with 4 output specs      │   │
│  │ - Updated tasks to align with spec naming              │   │
│  │                                                        │   │
│  │ ## Automation Factory                                  │   │
│  │ Designed in AF Project Workbench                       │   │
│  └────────────────────────────────────────────────────────┘   │
│                                                               │
│  Platform:  ○ GitHub  ○ GitLab  ○ Bitbucket                  │
│                                                               │
│  [Create PR]                                      [Cancel]    │
└───────────────────────────────────────────────────────────────┘
```

The PR is created via the platform's API (GitHub REST API, GitLab API, etc.) using the
stored GitCredential.

### 8.5 Import from Git

```
┌─ Import Project from Git ────────────────────────────────────┐
│                                                               │
│  Repository URL:                                              │
│  ┌────────────────────────────────────────────────────────┐   │
│  │ https://github.com/seapath/ansible.git                │   │
│  └────────────────────────────────────────────────────────┘   │
│                                                               │
│  Branch: main ▾                                               │
│                                                               │
│  Credentials: (select or add new)                             │
│  ┌────────────────────────────────────────────────────────┐   │
│  │ GitHub - fdupont (PAT)                          [+]   │   │
│  └────────────────────────────────────────────────────────┘   │
│                                                               │
│  [Clone & Import]                                 [Cancel]    │
│                                                               │
│  ┌─ Import Progress ─────────────────────────────────────┐   │
│  │  ✓ Cloning repository...                               │   │
│  │  ✓ Detecting Ansible structure...                      │   │
│  │  ● Parsing playbooks (12/49)...                        │   │
│  │  ○ Parsing roles (0/64)...                             │   │
│  │  ○ Parsing inventories...                              │   │
│  │  ○ Detecting collections...                            │   │
│  └────────────────────────────────────────────────────────┘   │
│                                                               │
└───────────────────────────────────────────────────────────────┘
```

The import process:
1. Clone the repository to a backend-managed directory
2. Detect Ansible project structure (presence of playbooks/, roles/, ansible.cfg)
3. Parse each artifact into structured JSON representation
4. Create ProjectArtifact entries in the database
5. For roles: scan for set_fact calls, infer potential return_specs
6. For playbooks: parse YAML into the existing PlaybookContent JSON format
7. For inventories: parse YAML into host/group/variable structure

---

## 9. YAML-Aware Conflict Resolution

### 9.1 Why YAML-Aware

Git operates on text lines. When two users modify the same YAML file, Git reports a
conflict even if the changes are in independent sections. Automation Factory understands
Ansible structure and can resolve many of these conflicts automatically.

### 9.2 Conflict Classification

```
Level 0: No conflict
  Different files modified by each branch.
  → Auto-merge. No UI needed.

Level 1: Structural independence
  Same file, but changes in different sections
  (e.g., one user edits pre_tasks, another edits post_tasks).
  → Auto-merge with notification.

Level 2: Additive compatibility
  Same section, both branches add new elements
  (e.g., both add a role to the same play's roles list).
  → Auto-merge with review. User confirms element order.

Level 3: True conflict
  Same element modified differently
  (e.g., both change the same task's parameters).
  → Manual resolution required.
```

### 9.3 Structured Diff Engine

The engine does not diff raw YAML text. Instead:

1. Parse both versions into structured representation
   (plays → sections → tasks/roles/variables)
2. Diff at the structural level, identifying elements by stable keys
   (task name + module FQCN, role name, variable key, host name)
3. Classify each diff into levels 0-3
4. Apply auto-merges for levels 0-2
5. Present level 3 conflicts to the user

### 9.4 Element Identification

To diff structurally, elements need stable identifiers:

| Element | Identifier | Fallback |
|---------|-----------|----------|
| Play | `name` field | index in playbook |
| Task | `name` + module FQCN | index in section |
| Role | role name (FQCN) | index in roles list |
| Variable | variable key | - |
| Host | hostname | - |
| Group | group name | - |
| Handler | handler name | index |
| Block | `name` or first task name | index |

### 9.5 Resolution UI

For level 3 conflicts, the resolution UI shows a structured comparison:

```
┌─ Conflict: playbooks/cluster_setup_ceph.yml ─────────────────┐
│                                                                │
│  Play: Ceph Expansion  ·  Section: roles  ·  ⚠ CONFLICT      │
│                                                                │
│  ┌─ Yours (feature/refactor) ──────────────────────────────┐  │
│  │  roles:                                                  │  │
│  │    - detect_seapath_distro                               │  │
│  │    - ceph_prepare_installation                           │  │
│  │    + ceph_validate_topology          ← added             │  │
│  └──────────────────────────────────────────────────────────┘  │
│                                                                │
│  ┌─ Theirs (main) ─────────────────────────────────────────┐  │
│  │  roles:                                                  │  │
│  │    - detect_seapath_distro                               │  │
│  │    - ceph_prepare_installation                           │  │
│  │    + ceph_check_prerequisites        ← added             │  │
│  └──────────────────────────────────────────────────────────┘  │
│                                                                │
│  Resolution:  ○ Keep yours  ○ Keep theirs  ● Keep both        │
│                                                                │
│  ┌─ Preview ───────────────────────────────────────────────┐  │
│  │  roles:                                                  │  │
│  │    - detect_seapath_distro                               │  │
│  │    - ceph_prepare_installation                           │  │
│  │    - ceph_check_prerequisites                            │  │
│  │    - ceph_validate_topology                              │  │
│  └──────────────────────────────────────────────────────────┘  │
│                                                                │
│  [Apply]                                      [Skip / Abort]  │
└────────────────────────────────────────────────────────────────┘
```

Key UX principles:
- Always show a preview of the result before applying
- Default to "Keep both" when both changes are additive
- Allow per-conflict resolution (not all-or-nothing)
- Show the Ansible context (play name, section name) not just file paths
- Color-code additions (green), deletions (red), conflicts (amber)

### 9.6 Auto-Merge Examples

**Two users add tasks to different sections (Level 1):**
```
User A: adds task to pre_tasks
User B: adds task to post_tasks
→ Auto-merged. Notification: "Auto-merged 2 changes in setup.yml"
```

**Two users add different variables (Level 1):**
```
User A: adds variable "db_host"
User B: adds variable "db_port"
→ Auto-merged. Both variables present in result.
```

**Two users add roles to same play (Level 2):**
```
User A: adds role "monitoring"
User B: adds role "logging"
→ Auto-merged. User sees preview to confirm order.
```

**Two users modify same task parameter (Level 3):**
```
User A: changes timeout from 30 to 60
User B: changes timeout from 30 to 120
→ Manual resolution required. User picks value.
```

---

## 10. Collaboration Model

### 10.1 Scope Evolution

Current: collaboration is per-playbook (WebSocket room = playbook ID).

Project workbench: collaboration is per-project, with per-artifact granularity.

```
WebSocket Room: project:{project_id}
├── Presence: which users are connected to the project
├── Per-artifact tracking: which user is editing which artifact
└── Update broadcasts: scoped to artifact ID
```

### 10.2 Presence Indicators

**Project level** — header shows all users connected to the project.

**Artifact level** — project tree shows small avatars next to artifacts being edited by
other users. Tab bar shows user avatar on tabs being edited by others.

```
📦 SEAPATH Cluster
├── 📁 Playbooks
│   ├── 📄 cluster_setup_ceph.yml  👤 Alice
│   └── 📄 deploy_vms.yml
├── 📁 Roles
│   ├── 📁 cephadm  👤 Bob
│   └── 📁 network_basics
```

### 10.3 Concurrent Editing

**Same artifact, same user type (both editors):**
Real-time sync via WebSocket as today. Both users see each other's changes immediately.
This works well for the visual canvas where changes are granular (add task, move task,
change parameter).

**Same artifact, different editors viewing:**
Viewer sees live updates but cannot modify.

**Different artifacts:**
No conflict possible. Each user works independently.

### 10.4 Git Collaboration Flow

For asynchronous collaboration (different sessions, code review):

1. User A creates a branch, makes changes, commits
2. User A pushes and creates a PR
3. User B reviews the PR (on GitHub/GitLab or in AF's future review UI)
4. User B approves or requests changes
5. PR is merged on the remote
6. Both users pull the updated main branch

The in-app comment system (planned for v2.4.x) complements Git PR comments by allowing
comments anchored to specific visual elements (tasks on canvas, variables, role interfaces)
rather than just text lines.

---

## 11. Frontend Refactoring

### 11.1 Rationale

The current architecture decision document states: "State Management Libraries Rejected:
Redux, Zustand, Recoil - Raison: État local suffisant, éviter over-engineering." This was
appropriate when the application had a single editor type and a single entity (playbook).

The project workbench introduces:
- Multiple editor types sharing state
- Multiple artifacts open simultaneously
- Cross-artifact validation (variable chains)
- Git state (branch, changes, conflicts)
- Project-level collaboration

Local component state cannot manage this complexity. Zustand (already in package.json) is
the appropriate tool.

### 11.2 WorkZone Decomposition

Current WorkZone.tsx: 5,093 lines, 32 useState/useRef hooks, 18 callback props.

Target decomposition:

```
WorkZone.tsx (5,093 lines)
    ↓
stores/
├── projectStore.ts              # project, artifacts, git state
├── editorStore.ts               # open tabs, active editor, selections
├── playbookEditorStore.ts       # plays, modules, links (extracted from WorkZone)
├── roleEditorStore.ts           # role tasks, handlers, interface
├── inventoryEditorStore.ts      # hosts, groups, variables
└── collaborationStore.ts        # presence, updates (from CollaborationContext)

components/editors/
├── PlaybookEditor.tsx           # playbook canvas (bulk of current WorkZone)
├── RoleEditor.tsx               # role editor with tabs
├── InventoryEditor.tsx          # host/group/variable editor
├── TemplateEditor.tsx           # Jinja2 code editor
├── VariableTableEditor.tsx      # key-value table
├── FormEditor.tsx               # structured form (ansible.cfg, argument_specs)
└── CodeEditor.tsx               # read-only or editable code view

components/canvas/
├── VisualCanvas.tsx             # reusable drag-drop SVG canvas
├── CanvasModule.tsx             # module rendering on canvas
├── CanvasBlock.tsx              # block rendering with sections
├── CanvasLink.tsx               # link rendering
└── CanvasGrid.tsx               # grid overlay

components/project/
├── ProjectTree.tsx              # left panel project file tree
├── ProjectHeader.tsx            # header bar with branch/changes
├── ChangesPanel.tsx             # git changes and commit UI
├── ConflictResolver.tsx         # YAML-aware conflict resolution
├── BranchPicker.tsx             # branch selector dropdown
└── CreatePRDialog.tsx           # pull request creation
```

### 11.3 State Management Migration

**Phase 1: Extract playbook state to store**

Move plays, modules, links, variables, collapsed state from WorkZone's useState into
playbookEditorStore (Zustand). WorkZone becomes a thin rendering shell. ConfigZone reads
from the store directly instead of through callback refs.

The callback-ref pattern in MainLayout (20+ refs forwarding state between WorkZone and
ConfigZone) is replaced by store subscriptions. MainLayout becomes a layout shell only.

This phase changes no UI behavior. It's a pure refactoring.

**Phase 2: Extract canvas into reusable component**

The visual canvas (drag-drop, SVG rendering, module positioning, block resize, link
drawing) is extracted from WorkZone into VisualCanvas. PlaybookEditor composes VisualCanvas
with playbook-specific logic (play tabs, sections). RoleEditor composes the same
VisualCanvas with role-specific logic (single task list + handlers).

**Phase 3: Add routing and project store**

App.tsx gets new routes. ProjectStore manages project state, artifact list, git state.
EditorStore manages open tabs and active editor. The home page shows the project list.

**Phase 4: Build new editors**

RoleEditor, InventoryEditor, TemplateEditor, etc. are built as new components that compose
existing primitives (VisualCanvas, variable tables, code editor).

### 11.4 New Dependencies

| Dependency | Purpose | Notes |
|-----------|---------|-------|
| zustand (5.0) | State management | Already in package.json |
| @monaco-editor/react | Code editor for templates, modules | Jinja2, Python, YAML syntax |
| react-diff-viewer | Diff visualization for conflicts | Or custom implementation |

### 11.5 Unchanged Components

The following components require no refactoring:
- MainLayout.tsx (583 lines) — becomes simpler (removes callback refs)
- ModulesZoneCached (889 lines) — add project tab, keep modules tab
- PlaySectionContent (680 lines) — reused by both PlaybookEditor and RoleEditor
- BlockSectionContent (741 lines) — reused as-is
- SectionLinks — reused as-is
- TaskAttributeIcons, PlayAttributeIcons — reused as-is
- ResizeHandles — reused as-is
- All dialog components — extended, not rewritten
- All services — extended, not rewritten
- All contexts (Auth, Theme, Preferences) — unchanged

---

## 12. Backend Changes

### 12.1 New API Endpoints

**Projects:**
```
GET    /projects                         # list user's projects
POST   /projects                         # create new project
GET    /projects/{id}                    # get project with artifact list
PUT    /projects/{id}                    # update project metadata
DELETE /projects/{id}                    # delete project and all artifacts
```

**Project Artifacts:**
```
GET    /projects/{id}/artifacts                    # list all artifacts
GET    /projects/{id}/artifacts/{artifact_id}      # get artifact content
PUT    /projects/{id}/artifacts/{artifact_id}      # update artifact content
POST   /projects/{id}/artifacts                    # create new artifact
DELETE /projects/{id}/artifacts/{artifact_id}      # delete artifact
```

**Project Sharing:**
```
GET    /projects/{id}/shares              # list shares
POST   /projects/{id}/shares              # share with user
PUT    /projects/{id}/shares/{share_id}   # update role
DELETE /projects/{id}/shares/{share_id}   # unshare
```

**Git Operations:**
```
POST   /projects/import-git              # clone and import from Git URL
POST   /projects/{id}/git/commit         # commit current state
POST   /projects/{id}/git/push           # push to remote
POST   /projects/{id}/git/pull           # pull from remote
GET    /projects/{id}/git/branches       # list branches
POST   /projects/{id}/git/branches       # create branch
POST   /projects/{id}/git/checkout       # switch branch
GET    /projects/{id}/git/status         # changed files
GET    /projects/{id}/git/diff           # diff for specific artifact
POST   /projects/{id}/git/merge          # merge branches
POST   /projects/{id}/git/resolve        # resolve conflict
POST   /projects/{id}/git/create-pr      # create pull request on remote
```

**YAML Operations:**
```
POST   /projects/{id}/parse-yaml         # YAML → JSON (new, for import)
POST   /projects/{id}/generate-yaml      # JSON → YAML (extends existing)
```

**Git Credentials:**
```
GET    /git-credentials                  # list user's credentials
POST   /git-credentials                  # add credential
DELETE /git-credentials/{id}             # remove credential
```

### 12.2 New Services

**ProjectService** — CRUD, sharing, artifact management.

**GitService** — Clone, commit, push, pull, branch management, merge, conflict detection.
Uses `git` CLI via subprocess (similar to existing ansible-lint integration). Git
repositories stored on the backend filesystem with path:
`/data/projects/{project_id}/repo/`.

**YamlParserService** — Parse Ansible YAML into structured JSON. This is the inverse of the
existing PlaybookYamlService. Must handle:
- Multi-document YAML (multiple plays)
- Role references (string and dict formats)
- Jinja2 expressions in values (preserve as strings)
- Ansible-specific types (vault-encrypted values, tags)
- Comments (preserve where possible for round-trip)

**ConflictResolutionService** — Structural diff and merge engine. Takes two parsed
representations, produces a diff with conflict classification, applies resolution
decisions.

**ReturnSpecService** — Parse and validate return_specs.yml files. Infer return specs from
role tasks (scan for set_fact calls).

### 12.3 Git Repository Storage

Each project with Git integration has a bare repository on the backend filesystem:

```
/data/projects/{project_id}/
├── repo/                    # git repository (bare or working tree)
├── worktrees/               # git worktrees for merge operations
│   ├── merge-{timestamp}/   # temporary worktree for conflict resolution
│   └── ...
└── metadata.json            # project metadata cache
```

The `/data/projects/` directory must be on a persistent volume (not ephemeral container
storage), consistent with the architecture decision on data storage.

### 12.4 WebSocket Changes

Extend the WebSocket protocol to support project-level rooms:

```python
# Current: connect to playbook room
ws://host/ws/playbook/{playbook_id}?token=...

# New: connect to project room
ws://host/ws/project/{project_id}?token=...

# Message format extended with artifact_id:
{
    "type": "update",
    "artifact_id": "uuid-of-artifact",
    "update_type": "module_add",
    "data": { ... }
}
```

The backend WebSocket manager broadcasts updates only to users viewing the same artifact,
while presence is tracked at the project level.

---

## 13. Implementation Sequence

Each step delivers standalone value and can be validated independently.

### Step 1: State Management Migration

Extract playbook state from WorkZone into Zustand stores. Replace callback-ref wiring in
MainLayout with store subscriptions. No UI changes, no new features. Pure refactoring.

**Validates:** existing behavior preserved with new state management.

### Step 2: Canvas Extraction

Extract VisualCanvas from WorkZone. WorkZone becomes PlaybookEditor composing VisualCanvas.
No UI changes.

**Validates:** canvas is reusable, PlaybookEditor works identically.

### Step 3: YAML Parser

Build YamlParserService (YAML → JSON). This is the foundational piece for both project
import and conflict resolution.

**Validates:** round-trip test — parse existing YAML, generate YAML, compare.

### Step 4: Project Entity

Add Project model, ProjectArtifact model, API endpoints, project list page, project tree
in left panel. Projects can be created empty and populated manually.

**Validates:** create project, add playbook, navigate tree, open playbook editor.

### Step 5: Git Import

Add GitService, Git credential management, import-from-Git flow. Uses YAML parser from
step 3.

**Validates:** import SEAPATH project, browse artifacts in tree, open playbooks.

### Step 6: Role Editor

Build RoleEditor using VisualCanvas from step 2. Implement Interface tab with
argument_specs and return_specs editing. Implement return_specs inference from set_fact
scanning.

**Validates:** create role, add tasks visually, define inputs/outputs, generate YAML.

### Step 7: Design-Time Validation

Implement variable chain validation using argument_specs and return_specs. Show warnings
in system zone.

**Validates:** connect role output to task input, see validation in system zone.

### Step 8: Inventory Editor

Build InventoryEditor with host/group tree and variable panels.

**Validates:** create inventory, add hosts/groups, set variables, generate YAML.

### Step 9: Git Commit and Push

Add commit, push, branch management. Changes panel in system zone.

**Validates:** modify artifact, commit, push, create branch.

### Step 10: Conflict Resolution

Build ConflictResolutionService and ConflictResolver UI. YAML-aware diff engine.

**Validates:** create conflicting changes on two branches, merge with resolution UI.

### Step 11: Pull Request Integration

GitHub/GitLab API integration for PR creation and status tracking.

**Validates:** create PR from AF, see PR status, link back to project.

### Step 12: Collection Manager and Template Editor

Build remaining editors. Collection manager with Galaxy search. Template editor with
Jinja2 syntax highlighting.

**Validates:** manage requirements.yml, edit Jinja2 templates with variable hints.

---

## Appendix A: return_specs.yml Specification

### A.1 Overview

The `return_specs.yml` file declares the facts (variables) that a role guarantees to
produce when executed. It is the output counterpart to `argument_specs.yml` (inputs).

The file is placed at `meta/return_specs.yml` within the role directory, alongside the
existing `meta/main.yml` and optional `meta/argument_specs.yml`.

### A.2 Format

```yaml
return_specs:
  main:                                    # entrypoint name (matches argument_specs)
    short_description: "Brief role purpose"
    returns:
      variable_name:
        type: str                          # str, int, bool, list, dict, float, any
        description: >
          Human-readable description of what this fact represents
          and when it is set.
        scope: host                        # host, play, or global
        always_set: true                   # guaranteed vs conditional output
        choices:                           # optional: constrain value space
          - value1
          - value2
        elements: str                      # if type is list, element type
        depends_on:                        # optional: input variables that influence output
          - input_variable_name
        version_added: "1.0.0"             # optional: documentation
```

### A.3 Field Reference

**`type`** (required)
The data type of the output fact. Uses the same type system as argument_specs:
`str`, `int`, `bool`, `float`, `list`, `dict`, `any`.

**`description`** (required)
Human-readable description. Should explain what the fact represents, when it is set,
and how consumers should use it.

**`scope`** (required)
The Ansible variable scope of this fact:
- `host` — set per-host via `set_fact`. Available in `hostvars[hostname].variable_name`.
  Different hosts may have different values.
- `play` — set once via `set_fact` + `run_once: true`. Available to all hosts in the play
  but not across plays.
- `global` — set via `set_fact` with `cacheable: true` or via `add_host`. Persists across
  plays.

**`always_set`** (required)
Whether this fact is guaranteed to be set after role execution, regardless of conditionals.
- `true` — the fact is always produced (may have a default value)
- `false` — the fact is only produced when certain conditions are met (document in
  description)

**`choices`** (optional)
List of allowed values. Only applicable to `str`, `int`, `float` types. Enables
design-time validation when consumers use the value in conditionals.

**`elements`** (optional)
If `type` is `list`, specifies the type of list elements: `str`, `int`, `dict`, etc.

**`depends_on`** (optional)
List of input variable names (from argument_specs or inventory/group_vars) that influence
this output's value. Enables dependency graph construction.

**`version_added`** (optional)
The role version in which this output was added. For documentation purposes.

### A.4 Full Example: detect_seapath_distro

```yaml
return_specs:
  main:
    short_description: >
      Detect SEAPATH Linux distribution and determine Ceph deployment method
    returns:
      seapath_distro:
        type: str
        description: >
          The detected Linux distribution type running on the target host.
          Determined from /etc/os-release and package manager detection.
        scope: host
        always_set: true
        choices:
          - Debian
          - CentOS
          - OracleLinux
          - Yocto

      is_using_cephadm:
        type: bool
        description: >
          Whether to use cephadm (modern orchestrator) for Ceph deployment
          instead of ceph-ansible (legacy). True for Debian and OracleLinux,
          or when force_cephadm input is set.
        scope: host
        always_set: true
        depends_on:
          - force_cephadm
```

### A.5 Full Example: cephadm

```yaml
return_specs:
  main:
    short_description: >
      Deploy and configure Ceph storage cluster using cephadm orchestrator
    returns:
      cephadm_is_ceph_node:
        type: bool
        description: >
          Per-host flag indicating whether this machine is already part of
          an existing Ceph cluster. Determined by checking if 'ceph' command
          returns status successfully.
        scope: host
        always_set: true

      cephadm_first_node:
        type: str
        description: >
          Hostname of the first node selected for Ceph bootstrap. This is the
          highest-priority existing Ceph node, or the first cluster_machine if
          no Ceph nodes exist yet.
        scope: play
        always_set: true

      cephadm_do_bootstrap:
        type: bool
        description: >
          Whether a fresh Ceph cluster bootstrap is needed. True when no
          existing Ceph nodes are detected in the cluster.
        scope: play
        always_set: true

      cephadm_mon_nodes_to_add:
        type: list
        elements: str
        description: >
          List of hostnames that should be added as Ceph monitor nodes.
          Computed as the difference between desired monitor hosts and
          existing Ceph nodes.
        scope: play
        always_set: true

      cephadm_existing_osd_hosts:
        type: list
        elements: str
        description: >
          List of hostnames that already have OSD daemons running.
          Queried from ceph orch ps output.
        scope: play
        always_set: true

      cephadm_nodes_needing_osds:
        type: list
        elements: str
        description: >
          List of hostnames that need OSD deployment. Computed as the
          difference between all OSD hosts and existing OSD hosts.
        scope: play
        always_set: true
        depends_on:
          - ceph_osd_disk
```

### A.6 Tooling Integration

**ansible-doc** — Could display return_specs alongside argument_specs when documenting
roles, similar to how module RETURN documentation is displayed.

**ansible-lint** — Could validate that declared outputs are actually produced by the role's
tasks (presence of matching set_fact calls).

**Automation Factory** — Uses return_specs for design-time variable chain validation, output
port rendering on canvas, and automatic `{{ variable }}` reference generation.

### A.7 Relationship to Module Return Values

Ansible modules have a RETURN documentation block that describes their output. This is
documented in module source code and rendered by ansible-doc. The `return_specs.yml` for
roles serves a similar purpose but at the role level.

Key difference: module return values are accessed via `register`, while role outputs are
accessed as facts (set via `set_fact`). The return_specs describes the facts, not the
registered task results.

### A.8 Upstream Proposal Path

1. Implement in Automation Factory as reference implementation
2. Write an Ansible Enhancement Proposal (AEP) referencing the AF implementation
3. Submit to Ansible community forum for discussion
4. Initial scope: documentation-only (parsed by ansible-doc, no runtime validation)
5. Future scope: optional `validate_return_spec` module for post-role assertion

---

## Appendix B: Reference Project Analysis

### B.1 SEAPATH Ansible Project

**Repository:** ~/Code/github.com/seapath/ansible
**Structure:** 64 roles, 49 playbooks, custom modules, external collections

### B.2 Role Output Patterns Discovered

Analysis of SEAPATH roles identified four output patterns:

| Pattern | Example | Description |
|---------|---------|-------------|
| Decision flags | `is_using_cephadm: bool` | Controls playbook branching via `when:` |
| Topology results | `cephadm_mon_nodes_to_add: list` | Dynamic host/group lists |
| Derived config | `_registry_push_address: str` | Computed values for templates |
| State verification | `cephadm_is_ceph_node: bool` | System state captured as facts |

### B.3 Key Findings

- 24 of 64 roles use `set_fact` to produce outputs
- 0 roles use `argument_specs.yml` (no formal input specification)
- Naming convention: `{{ role_name }}_{{ output_name }}` for role-prefixed facts
- Some roles use short names for widely-consumed outputs (e.g., `seapath_distro`)
- Variable scope is implicit and inconsistent (host vs play vs global)
- Dependencies between roles are undocumented (discoverable only by reading task source)

### B.4 Inventory Structure

SEAPATH uses YAML inventories with inline variables (no separate group_vars/host_vars
directories). Groups include: `hypervisors`, `cluster_machines`, `mons`, `osds`, `clients`.
Variable assignment is per-group and per-host within the inventory file.

### B.5 Collection Dependencies

From `ansible-requirements.yaml`:
- `community.libvirt`
- `community.general`
- `containers.podman`
- `ansible.posix`
- `ansible.utils`
- `openstack.config_template` (from Git, pinned to v2.1.1)

---

*This document is maintained alongside the project codebase. For current implementation
status, see [Work in Progress](../work/WORK_IN_PROGRESS.md).*
