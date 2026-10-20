#!/bin/bash
# Setup script del entorno cloud (se cachea). Pégalo en claude.ai/code > entorno > Setup script.
# Instala dependencias de cada juego y el Chromium de Playwright que usa shot.mjs como respaldo.
set -e
cd "$(git rev-parse --show-toplevel 2>/dev/null || pwd)"
for d in games/*/; do
  if [ -f "$d/package.json" ]; then (cd "$d" && npm ci --loglevel=error); fi
done
(cd games/sedimento && npx --yes playwright install --with-deps chromium)
