#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")/.." && pwd)"
WORKSPACE="$(cd -- "$ROOT/../.." && pwd)"
COMMAND="${1:-help}"
COMPOSE=(docker compose --project-name tuvansa-staging --env-file "$ROOT/.env.staging" -f "$ROOT/compose.staging.yaml")

usage() {
  echo "Usage: bash scripts/staging.sh <doctor|build|deploy|migrate|seed|sat-import|up|status|logs|down>"
  echo "Requires only Bash, Docker and Compose v2 on the host. down preserves volumes."
}

case "$COMMAND" in
  help) usage; exit 0 ;;
  doctor|build|deploy|migrate|seed|sat-import|up|status|logs|down) ;;
  *) usage; exit 1 ;;
esac

cd -- "$ROOT"
case "$COMMAND" in
  status) "${COMPOSE[@]}" ps -a; exit ;;
  logs) "${COMPOSE[@]}" logs --tail 100 -f; exit ;;
  down) "${COMPOSE[@]}" down; exit ;;
esac

# Keep rendered secrets in the pipe, not in arguments, logs or temporary files.
if ! "${COMPOSE[@]}" --profile maintenance config --format json 2>/dev/null |
  docker run --rm -i --network none --read-only --cap-drop ALL \
    --security-opt no-new-privileges \
    --mount "type=bind,source=$WORKSPACE,target=$WORKSPACE,readonly" \
    --workdir "$ROOT" node:22-bookworm-slim \
    node scripts/staging.mjs doctor --config-stdin; then
  echo "Staging validation failed. No deployment commands were executed." >&2
  exit 1
fi

case "$COMMAND" in
  build|deploy) "${COMPOSE[@]}" --parallel 1 --profile maintenance build ;;
esac
case "$COMMAND" in
  migrate|deploy)
    "${COMPOSE[@]}" up -d --wait postgres redis
    for service in ai-migrate core-migrate; do
      "${COMPOSE[@]}" --profile maintenance run --rm --no-deps "$service"
    done
    ;;
esac
case "$COMMAND" in
  up|deploy) "${COMPOSE[@]}" up -d --wait --wait-timeout 180 ;;
  seed) "${COMPOSE[@]}" --profile maintenance run --rm --no-deps core-seed ;;
  sat-import) "${COMPOSE[@]}" --profile maintenance run --rm ai-sat-import ;;
esac
