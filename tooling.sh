#!/bin/bash
# Raccourci vers les outils Automation Factory
# Usage: ./tooling.sh <command> [options]

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
"$SCRIPT_DIR/TOOLING/automation-factory.sh" "$@"