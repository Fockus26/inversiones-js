#!/usr/bin/env bash
# Enciende, apaga o consulta a Gaby desde el VPS (lo mismo que escribir "gaby on/off/estado").
# Uso (desde bot/):  ./scripts/gaby.sh on | off | estado
set -euo pipefail
cd "$(dirname "$0")/.."
ACCION="${1:-estado}"
case "$ACCION" in on|off|estado) ;; *) echo "Uso: ./scripts/gaby.sh on|off|estado"; exit 1 ;; esac
docker compose exec -T -e ACCION="$ACCION" gaby bun -e \
  'const r = await fetch(`http://localhost:3000/control/${process.env.WEBHOOK_TOKEN}/${process.env.ACCION}`, { method: "POST" }); process.stdout.write(await r.text()); process.exit(r.ok ? 0 : 1)'
