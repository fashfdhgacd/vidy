#!/usr/bin/env bash
# Satellite catalog sync without GitHub Actions (vidy's Actions are blocked by billing since
# 2026-11-18). Same job as .github/workflows/videyy-catalog-sync.yml: pull the public
# koleksidrpinguin.com /api/satelit export, refresh data/synced-catalog.json + panel settings,
# commit to main when something changed. The push starts the Cloudflare Workers Build, which
# redeploys videyy.icu and videqsss.icu. Needs only git push access; no tokens are read here.
set -euo pipefail
cd "$(dirname "$0")/.."
git fetch -q origin main
git checkout -q main
git reset -q --hard origin/main
env -u GITHUB_TOKEN -u VIDEY_SYNC_TOKEN SYNC_MODE=full SYNC_TRIGGER="${SYNC_TRIGGER:-box}" node scripts/videyy-sync.mjs
git add -- data/synced-catalog.json data/satelit-config.json public/sync-status.json src/lib/catalog/catalog-blocklist.json
if git diff --cached --quiet -- data/synced-catalog.json data/satelit-config.json src/lib/catalog/catalog-blocklist.json; then
  echo "No catalog change."
  git reset -q --hard origin/main
  exit 0
fi
git commit -q -m "chore(sync): koleksidrpinguin catalog snapshot + sync status"
git push -q origin HEAD:main
echo "Pushed sync commit $(git rev-parse --short HEAD)"
