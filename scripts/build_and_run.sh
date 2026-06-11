#!/usr/bin/env bash
set -euo pipefail

MODE="${1:-dev}"
ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
PORT="${PORT:-5173}"
HOST="${HOST:-0.0.0.0}"

cd "$ROOT_DIR"

show_usage() {
  cat <<'USAGE'
usage: ./scripts/build_and_run.sh [mode]

Modes:
  dev, run, start   Start the Vite dev server
  build             Build the production bundle
  preview           Preview the production build
  help, --help      Show this help

Environment:
  PORT              Dev/preview server port (default: 5173)
  HOST              Dev/preview server host (default: 0.0.0.0)
USAGE
}

run_script() {
  if [[ -f bun.lock ]] && command -v bun >/dev/null 2>&1; then
    bun run "$@"
  else
    npm run "$@"
  fi
}

exec_script() {
  if [[ -f bun.lock ]] && command -v bun >/dev/null 2>&1; then
    exec bun run "$@"
  else
    exec npm run "$@"
  fi
}

case "$MODE" in
  dev|run|start)
    exec_script dev -- --host "$HOST" --port "$PORT"
    ;;
  build)
    run_script build
    ;;
  preview)
    exec_script preview -- --host "$HOST" --port "$PORT"
    ;;
  help|--help|-h)
    show_usage
    ;;
  *)
    show_usage >&2
    exit 2
    ;;
esac
