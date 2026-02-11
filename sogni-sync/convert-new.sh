#!/bin/bash
# Convert newsletters to markdown
#
# Usage:
#   ./convert-new.sh          # Convert only new newsletters
#   ./convert-new.sh --force  # Re-convert all newsletters
#   ./convert-new.sh 19       # Convert specific newsletter (19.html)

cd "$(dirname "$0")"
node convert-to-markdown.js "$@"
