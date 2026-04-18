#!/usr/bin/env bash
set -euo pipefail

limit=1000
status=0

for file in "$@"; do
  [ -f "$file" ] || continue
  lines=$(wc -l < "$file")
  if [ "$lines" -gt "$limit" ]; then
    echo "$file exceeds $limit lines ($lines)"
    status=1
  fi
done

exit "$status"
