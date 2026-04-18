#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")/.."

files=()
for file in "$@"; do
  case "$file" in
    georg/*) files+=("${file#georg/}") ;;
  esac
done

if [ ${#files[@]} -eq 0 ]; then
  exit 0
fi

bun x prettier --write "${files[@]}"
