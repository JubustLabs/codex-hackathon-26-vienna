#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")/.."

files=()
for file in "$@"; do
  [ -f "$file" ] && files+=("$file")
done

if [ ${#files[@]} -eq 0 ]; then
  exit 0
fi

bun x prettier --write "${files[@]}"
