# E2E Testing Skill

End-to-end testing with Playwright Test Agents (planner/generator/healer) and OpenCode MCP tools.

## Quick Start

```bash
# 1. Install Playwright
npm init @playwright/test

# 2. Initialize agents (one-time)
npx playwright init-agents --loop=opencode

# 3. Copy config template and seed test
cp templates/playwright.config.ts .
cp templates/seed.spec.ts tests/

# 4. Run
npx playwright test
```

## Contents

- **SKILL.md** — Core guide: locators, assertions, agents, visual verification, MCP tools
- **QUICKSTART.md** — 5-minute getting started guide
- **EXAMPLES.md** — 50+ TypeScript code examples
- **ANTI-PATTERNS.md** — 10 common mistakes with solutions
- **reference/** — Deep dives: POM, API mocking, mobile testing, debugging flaky tests
- **scripts/** — Project scaffolding
- **templates/** — Config and seed test templates

## Key Features

- **Playwright Test Agents:** Planner explores → Generator writes tests → Healer repairs failures
- **Visual Verification:** Screenshots analyzed via minimax_understand_image (MCP) or vision-assertion.ts (code-based) — test passes only if vision confirms expected state
- **Route Context:** Seed test documents app URL structure so agents don't guess wrong routes
- **Resource-Efficient:** Single worker, disable GPU, minimal RAM footprint
- **webServer Config:** Dev server auto-starts if not already running
