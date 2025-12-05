#!/bin/bash
# Raccourci vers les outils Ansible Builder
# Usage: ./tooling.sh <command> [options]

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
"$SCRIPT_DIR/TOOLING/ansible-builder.sh" "$@"