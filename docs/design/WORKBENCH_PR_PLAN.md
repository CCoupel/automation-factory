# Project Workbench — PR Plan

Progressive implementation plan for [PROJECT_WORKBENCH.md](./PROJECT_WORKBENCH.md).
Each PR is self-contained and reviewable independently.

**Status:** In Progress
**Date:** 2026-02-24

---

## Phase A: Foundation (no new features visible to users)

### PR 1 — `refactor/zustand-playbook-store` ✅ Done

Extract playbook state from WorkZone's 32 useState/useRef hooks into a Zustand
`playbookEditorStore`. Replace the 20+ callback-ref wiring between
MainLayout/WorkZone/ConfigZone with store subscriptions. Pure refactoring, zero
UI changes.

- **PR:** [#5](https://github.com/CCoupel/automation-factory/pull/5)
- **Files:** `WorkZone.tsx`, `MainLayout.tsx`, `ConfigZone.tsx`, new `stores/playbookEditorStore.ts`
- **Validates:** all existing E2E/manual tests pass identically

### PR 2 — `refactor/extract-visual-canvas` ✅ Done

Extract the drag-drop SVG canvas (module positioning, block resize, link drawing,
grid) from WorkZone into a reusable `VisualCanvas` component. WorkZone becomes
`PlaybookEditor` composing `VisualCanvas`. Zero UI changes.

- **PR:** [#6](https://github.com/CCoupel/automation-factory/pull/6)
- **Files:** new `components/canvas/VisualCanvas.tsx`, `CanvasModule.tsx`, `CanvasBlock.tsx`, `CanvasLink.tsx`, `CanvasGrid.tsx`; slimmed-down `PlaybookEditor.tsx`
- **Depends on:** PR 1

### PR 3 — `feat/yaml-parser-service` ✅ Merged

Backend: Build `YamlParserService` (YAML → structured JSON). Inverse of existing
`PlaybookYamlService`. Handles multi-document YAML, role references, Jinja2
expressions, Ansible-specific types. Add `POST /api/yaml/parse` endpoint.

- **PR:** [#7](https://github.com/CCoupel/automation-factory/pull/7)
- **Files:** `yaml_parser_service.py`, `yaml_parser.py` (schemas), `yaml_parser.py` (endpoint), router registration, 24 unit + 5 integration tests
- **Depends on:** nothing (backend-only, independent of PRs 1-2)

---

## Phase B: Project entity & navigation

### PR 4 — `feat/project-data-model` ✅ Done

Backend: Add `Project`, `ProjectArtifact`, `ProjectShare`, `GitCredential`
SQLAlchemy models. Add `project_id` nullable FK on `Playbook`. CRUD endpoints
for `/projects`, `/projects/{id}/artifacts`, `/projects/{id}/shares`,
`/git-credentials`. No Git operations yet.

- **PR:** [#8](https://github.com/CCoupel/automation-factory/pull/8)
- **Files:** 4 new models, 4 schemas, access control service, 4 endpoint routers, 48 integration tests (222 total)
- **Depends on:** nothing (backend-only)

### PR 5 — `feat/project-list-and-tree`

Frontend: Home page with Projects / Standalone Playbooks tabs. Project creation
(empty). `ProjectTree` component in left panel. Multi-tab work zone with
`EditorStore` (Zustand). Router changes (`/projects/:id`,
`/projects/:id/playbooks/:path`). Playbook editor opens from project tree.

- **Files:** new `stores/projectStore.ts`, `stores/editorStore.ts`, `components/project/ProjectTree.tsx`, `ProjectHeader.tsx`, route changes in `App.tsx`
- **Depends on:** PR 1-2 (frontend stores), PR 4 (backend APIs)

---

## Phase C: Git integration (import)

### PR 6 — `feat/git-import`

Backend: `GitService` — clone repo, detect Ansible structure, parse artifacts
using `YamlParserService`, create `ProjectArtifact` entries. `GitCredential` CRUD
endpoints. `POST /projects/import-git` endpoint. Git repos stored at
`/data/projects/{id}/repo/`.

Frontend: "Import from Git" dialog with clone URL, branch, credentials, progress
indicator.

- **Depends on:** PR 3 (YAML parser), PR 4 (project model)

---

## Phase D: Role authoring

### PR 7 — `feat/role-editor`

Frontend: `RoleEditor` component with Interface / Tasks / Handlers / Templates /
Files tabs. Tasks tab reuses `VisualCanvas` + `PlaySectionContent`. Interface tab
shows argument_specs and return_specs tables. `return_specs.yml` editing.

Backend: `ReturnSpecService` — parse/validate `return_specs.yml`, infer specs
from `set_fact` scanning.

- **Depends on:** PR 2 (reusable canvas), PR 5 (project tree navigation)

### PR 8 — `feat/design-time-validation`

Variable chain validation across roles and playbooks using argument_specs +
return_specs. Warnings/errors in SystemZone. Output port rendering on canvas with
connectable wiring.

- **Depends on:** PR 7 (role editor with specs)

---

## Phase E: Inventory & collections

### PR 9 — `feat/inventory-editor`

Frontend: `InventoryEditor` with host/group tree, variable panels (host vars,
group vars, inherited), add host/group dialogs, drag-assign. Backend: inventory
YAML parsing/generation.

- **Depends on:** PR 5 (project navigation)

### PR 10 — `feat/collection-manager`

Frontend: Collection browser — requirements.yml editor, Galaxy search + version
pinning, usage-in-project cross-reference, unused collection warnings.

- **Depends on:** PR 5 (project navigation)

> PRs 9 and 10 are independent and can be reviewed in parallel.

---

## Phase F: Git workflow (commit/push/PR)

### PR 11 — `feat/git-commit-push`

Backend: commit (serialize DB state → files → `git commit`), push, branch
create/switch/list. Frontend: `ChangesPanel`, `BranchPicker`, change counter
badge, push button.

- **Depends on:** PR 6 (GitService foundation)

### PR 12 — `feat/yaml-conflict-resolution`

Backend: `ConflictResolutionService` — structural diff engine (parse both
versions, diff at element level, classify levels 0-3, auto-merge levels 0-2).
Frontend: `ConflictResolver` UI.

- **Depends on:** PR 3 (YAML parser), PR 11 (git operations)

### PR 13 — `feat/git-pull-request`

Backend: GitHub/GitLab/Bitbucket API integration for PR creation and status.
Frontend: `CreatePRDialog`.

- **Depends on:** PR 11 (commit/push)

---

## Phase G: Collaboration & remaining editors

### PR 14 — `feat/project-collaboration`

WebSocket extension: project-level rooms, per-artifact presence tracking,
artifact-level update broadcasts. Frontend: presence avatars in project tree and
tab bar.

- **Depends on:** PR 5 (project entity in frontend)

### PR 15 — `feat/template-code-editor`

Frontend: `TemplateEditor` (Jinja2 with Monaco) and `CodeEditor` (Python,
read-only). Variable reference detection in templates. `FormEditor` for
ansible.cfg.

- **Depends on:** PR 5 (project navigation), adds `@monaco-editor/react` dependency

---

## Dependency Graph

```
PR1 ─→ PR2 ─→ PR7 ─→ PR8
              ↗
PR3 ─→ PR6 ─→ PR11 ─→ PR12
        ↗         ↘
PR4 ─→ PR5 ─→ PR9    PR13
         ↘
          PR10
         ↘
          PR14
         ↘
          PR15
```

## Suggested Review Order

| Order | PR | Branch | Scope |
|-------|-----|--------|-------|
| 1 | PR 1 | `refactor/zustand-playbook-store` | Frontend only |
| 2 | PR 3 | `feat/yaml-parser-service` | Backend only (parallel with PR 1) |
| 3 | PR 4 | `feat/project-data-model` | Backend only (parallel with PR 1) |
| 4 | PR 2 | `refactor/extract-visual-canvas` | Frontend only (after PR 1) |
| 5 | PR 5 | `feat/project-list-and-tree` | Full-stack (after PR 2, 4) |
| 6 | PR 6 | `feat/git-import` | Full-stack (after PR 3, 4) |
| 7-8 | PR 9, 10 | inventory-editor, collection-manager | Parallel (after PR 5) |
| 9 | PR 7 | `feat/role-editor` | Full-stack (after PR 2, 5) |
| 10 | PR 11 | `feat/git-commit-push` | Full-stack (after PR 6) |
| 11 | PR 8 | `feat/design-time-validation` | Frontend-heavy (after PR 7) |
| 12 | PR 12 | `feat/yaml-conflict-resolution` | Full-stack (after PR 3, 11) |
| 13 | PR 13 | `feat/git-pull-request` | Full-stack (after PR 11) |
| 14 | PR 14 | `feat/project-collaboration` | Full-stack (after PR 5) |
| 15 | PR 15 | `feat/template-code-editor` | Frontend (after PR 5) |

PRs 1+3+4 can all start in parallel since they touch different parts of the
codebase (frontend state, backend YAML parsing, backend data model).
