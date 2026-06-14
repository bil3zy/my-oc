#!/usr/bin/env bash
set -euo pipefail

echo "==> Scaffolding Playwright E2E test project..."

# 1. Install Playwright
if ! npx playwright --version &>/dev/null; then
  echo "==> Installing @playwright/test..."
  npm install -D @playwright/test
  npx playwright install chromium
else
  echo "==> Playwright already installed."
fi

# 2. Create folder structure
echo "==> Creating folder structure..."
mkdir -p tests specs pages .playwright-mcp

# 3. Copy templates
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SKILL_DIR="$SCRIPT_DIR/.."

if [ -f "$SKILL_DIR/templates/playwright.config.ts" ]; then
  echo "==> Copying playwright.config.ts..."
  cp "$SKILL_DIR/templates/playwright.config.ts" playwright.config.ts
fi

if [ -f "$SKILL_DIR/templates/seed.spec.ts" ]; then
  echo "==> Copying seed.spec.ts..."
  cp "$SKILL_DIR/templates/seed.spec.ts" tests/seed.spec.ts
fi

# 4. Update playwright.config.ts with actual BASE_URL
if [ -n "${BASE_URL:-}" ]; then
  echo "==> Setting BASE_URL from environment..."
  if [[ "$OSTYPE" == "darwin"* ]]; then
    sed -i '' "s|http://localhost:4200|$BASE_URL|g" playwright.config.ts
  else
    sed -i "s|http://localhost:4200|$BASE_URL|g" playwright.config.ts
  fi
fi

echo "==> Done!"
echo ""
echo "Next steps:"
echo "  npx playwright init-agents --loop=opencode"
echo "  npx playwright test"
