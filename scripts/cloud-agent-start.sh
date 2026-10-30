#!/usr/bin/env bash
# Cloud Agent `start` — write .env.local, bring up anonymous Convex + Next.js.
# Idempotent: skips services that are already listening.
set -euo pipefail

# Cursor runs `start` from the workspace root (sometimes via a copied script).
if [[ -f package.json && -d convex ]]; then
  ROOT="$(pwd)"
elif [[ -f /workspace/package.json ]]; then
  ROOT="/workspace"
else
  ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
fi
cd "$ROOT"

python3 - <<'PY'
import os
from pathlib import Path

root = Path.cwd()
env_path = root / ".env.local"

# Preserve Convex URLs already written by `convex init` / `convex dev`.
preserved: dict[str, str] = {}
if env_path.exists():
    for line in env_path.read_text().splitlines():
        if not line or line.startswith("#") or "=" not in line:
            continue
        k, _, v = line.partition("=")
        v = v.strip().strip('"')
        if k in (
            "NEXT_PUBLIC_CONVEX_URL",
            "CONVEX_DEPLOYMENT",
            "NEXT_PUBLIC_CONVEX_SITE_URL",
        ) and v:
            preserved[k] = v

sign_in = "/" + "sign" + "-in"
sign_up = "/" + "sign" + "-up"

def env(name: str, default: str = "") -> str:
    v = os.environ.get(name) or default
    if not v or "\n" in v or "\r" in v:
        return ""
    return v

# Never copy cloud CONVEX_* from the process environment — anonymous local owns those.
clerk_keys = {
    "NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY": env("NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY"),
    "CLERK_SECRET_KEY": env("CLERK_SECRET_KEY"),
    "CLERK_FRONTEND_API_URL": env("CLERK_FRONTEND_API_URL"),
    "NEXT_PUBLIC_CLERK_SIGN_IN_URL": env("NEXT_PUBLIC_CLERK_SIGN_IN_URL", sign_in) or sign_in,
    "NEXT_PUBLIC_CLERK_SIGN_UP_URL": env("NEXT_PUBLIC_CLERK_SIGN_UP_URL", sign_up) or sign_up,
}
optional = {
    "NEXT_PUBLIC_SENTRY_DSN": env("NEXT_PUBLIC_SENTRY_DSN"),
    "NEXT_PUBLIC_POSTHOG_KEY": env("NEXT_PUBLIC_POSTHOG_KEY"),
    "NEXT_PUBLIC_POSTHOG_HOST": env("NEXT_PUBLIC_POSTHOG_HOST"),
    "LOCATIONIQ_API_KEY": env("LOCATIONIQ_API_KEY"),
}

lines = [
    "# Convex — written by anonymous `convex init` / `convex dev` (do not inject cloud URLs)",
    f"NEXT_PUBLIC_CONVEX_URL={preserved.get('NEXT_PUBLIC_CONVEX_URL', '')}",
    f"CONVEX_DEPLOYMENT={preserved.get('CONVEX_DEPLOYMENT', '')}",
    "",
    "# Clerk",
]
for k, v in clerk_keys.items():
    if not v:
        continue
    if k.endswith("_KEY"):
        lines.append(f'{k}="{v}"')
    else:
        lines.append(f"{k}={v}")

lines += ["", "# Optional"]
for k, v in optional.items():
    if v:
        lines.append(f'{k}="{v}"' if k.endswith("_KEY") else f"{k}={v}")
    else:
        lines.append(f"{k}=")

if preserved.get("NEXT_PUBLIC_CONVEX_SITE_URL"):
    lines += ["", f"NEXT_PUBLIC_CONVEX_SITE_URL={preserved['NEXT_PUBLIC_CONVEX_SITE_URL']}"]

env_path.write_text("\n".join(lines) + "\n")
print("env.local", sum(1 for L in lines if L and not L.startswith("#") and "=" in L))
PY

# Convex API health is /version (GET / often 404s; curl -f would treat that as down).
convex_up() {
  curl -sf -o /dev/null "http://127.0.0.1:3210/version" 2>/dev/null
}

next_up() {
  curl -sf -o /dev/null "http://127.0.0.1:3000/" 2>/dev/null
}

convex_cli() {
  env -u CONVEX_DEPLOYMENT -u NEXT_PUBLIC_CONVEX_URL -u NEXT_PUBLIC_CONVEX_SITE_URL \
    CONVEX_AGENT_MODE=anonymous pnpm exec convex "$@"
}

# Clear injected cloud Convex deployment so anonymous mode can win.
export CONVEX_AGENT_MODE="${CONVEX_AGENT_MODE:-anonymous}"
unset CONVEX_DEPLOYMENT NEXT_PUBLIC_CONVEX_URL NEXT_PUBLIC_CONVEX_SITE_URL || true

if ! grep -q '^CONVEX_DEPLOYMENT=anonymous:' .env.local 2>/dev/null; then
  echo "[cloud-agent-start] configuring anonymous Convex…"
  pnpm exec convex init </dev/null
fi

TMUX_CONF="/exec-daemon/tmux.portal.conf"
tmux_cmd() {
  if [[ -f "$TMUX_CONF" ]]; then
    tmux -f "$TMUX_CONF" "$@"
  else
    tmux "$@"
  fi
}

ensure_tmux_session() {
  local name="$1"
  local cmd="$2"
  if tmux_cmd has-session -t "=${name}" 2>/dev/null; then
    return 0
  fi
  tmux_cmd new-session -d -s "$name" -c "$ROOT" -- "${SHELL:-bash}" -l
  tmux_cmd send-keys -t "${name}:0.0" "$cmd" C-m
}

if ! convex_up; then
  echo "[cloud-agent-start] starting Convex on :3210…"
  ensure_tmux_session "convex-dev" \
    "env -u CONVEX_DEPLOYMENT -u NEXT_PUBLIC_CONVEX_URL -u NEXT_PUBLIC_CONVEX_SITE_URL CONVEX_AGENT_MODE=anonymous pnpm exec convex dev"
  for _ in $(seq 1 90); do
    convex_up && break
    sleep 1
  done
  if ! convex_up; then
    echo "[cloud-agent-start] Convex did not become ready on :3210/version" >&2
    exit 1
  fi
fi

if [[ -n "${CLERK_FRONTEND_API_URL:-}" ]]; then
  echo "[cloud-agent-start] ensuring CLERK_FRONTEND_API_URL on Convex…"
  convex_cli env set CLERK_FRONTEND_API_URL "$CLERK_FRONTEND_API_URL" >/dev/null || true
fi

# Port up != functions pushed. Retry until seed:run exists (idempotent insert-only).
echo "[cloud-agent-start] waiting for Convex functions, then seeding…"
seeded=0
for _ in $(seq 1 90); do
  if convex_cli run seed:run >/tmp/cloud-agent-seed.log 2>&1; then
    seeded=1
    break
  fi
  sleep 1
done
if [[ "$seeded" -ne 1 ]]; then
  echo "[cloud-agent-start] seed:run failed after waiting for deploy:" >&2
  tail -n 40 /tmp/cloud-agent-seed.log >&2 || true
  exit 1
fi

if next_up; then
  echo "[cloud-agent-start] Next.js already on :3000 — idle."
  exec sleep infinity
fi

echo "[cloud-agent-start] starting Next.js on :3000…"
exec env -u CONVEX_DEPLOYMENT -u NEXT_PUBLIC_CONVEX_URL -u NEXT_PUBLIC_CONVEX_SITE_URL \
  pnpm dev
