#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
if ! command -v conda >/dev/null 2>&1; then
    echo 'Conda is unavailable in this terminal. Initialize Conda and retry.' >&2
    exit 1
fi
# Environment exports can contain local paths and other private data; review before sharing.
conda env export -n gee --no-builds | sed '/^prefix: /d' > "$ROOT/environment.local.yml"
conda run -n gee python -V
conda run -n gee python -m pip freeze > "$ROOT/pip-freeze.local.txt"
echo "Saved local environment metadata to environment.local.yml and pip-freeze.local.txt."
echo "Review contents and versions before including any export in a public release."
