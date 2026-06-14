---
name: e2e-testing
description: End-to-end testing with Playwright Test Agents (planner/generator/healer) and OpenCode MCP tools. Covers test generation, visual verification via minimax_understand_image (MCP) or vision-assertion.ts (code-based), Page Object Models, API mocking, mobile testing, and flaky test debugging. Use when writing, generating, debugging, or running E2E tests.
---

# E2E Testing with Playwright

## Overview

This skill combines **Playwright Test Agents** (planner, generator, healer) for AI-driven test generation with **OpenCode MCP tools** for browser automation and **minimax_understand_image** (or the code-based `vision-assertion.ts` utility) for visual verification.

Three personas served:
- **Developer** — writing individual tests with locators, assertions, and visual checks
- **QA Engineer** — building full test suites with POM, API mocking, mobile emulation
- **Debugger** — diagnosing and fixing flaky tests using traces, screenshots, and visual analysis

## Core Principles

### 1. Locator Priority (Always follow this order)

| Priority | Strategy | Example |
|----------|----------|---------|
| 1 (Best) | `getByRole` | `page.getByRole('button', { name: 'Submit' })` |
| 2 | `getByLabel` | `page.getByLabel('Email')` |
| 3 | `getByPlaceholder` | `page.getByPlaceholder('your@email.com')` |
| 4 | `getByText` | `page.getByText('Welcome back')` |
| 5 | `getByTestId` | `page.getByTestId('login-form')` |
| Never | CSS chaining | `page.locator('div > form .btn.primary')` |
| Never | XPath | `page.locator('//div[@class="form"]')` |

**Why:** Role/label/placeholder locators survive DOM restructuring. CSS and XPath break on any class or structural change.

### 2. Web-First Assertions (Always use `await expect()`)

```typescript
// ✅ Correct — auto-retries until condition is met
await expect(page.getByRole('button')).toBeVisible();
await expect(page.getByText('Saved')).toHaveText('Saved');

// ❌ Wrong — no retry, fails on async rendering
expect(await page.getByText('Saved').textContent()).toBe('Saved');
```

Web-first assertions retry for up to 5 seconds (configurable). Raw assertions check once and fail on async content.

### 3. Test Isolation

Each test gets a fresh browser context. No shared state:
```typescript
import { test } from '@playwright/test';

test.describe('feature', () => {
  test.beforeEach(async ({ page }) => {
    // Clean state per test
    await page.goto('http://localhost:4200/ar');
  });

  test('does something', async ({ page }) => {
    // page is fresh
  });
});
```

### 4. Pre-Test Route Verification

Always verify the correct path and route before testing:
1. Confirm the URL pattern is correct before navigation
2. Take a snapshot to verify the page loaded
3. If route is uncertain, navigate to a known starting point (e.g., homepage)
4. Never assume a route — confirm it via snapshot before proceeding

### 5. Visual Verification via minimax_understand_image

Use this structured prompt format for visual assertions:

```markdown
## Visual Assertion Pattern (Agent-Executed)

When testing visual state, always use this exact sequence:

1. Take screenshot: `playwright_browser_take_screenshot`
2. Call `minimax_understand_image` with this description format:

Describe the [ELEMENT NAME]:
- Background color: [expected color]
- Text content: [expected text]
- Border radius: [expected value]
- State: [visible/hidden/disabled/focused]

Also check: [any additional visual criteria]

3. Test passes ONLY if minimax_understand_image confirms ALL criteria.
```

**Example:**
```
Describe the login submit button:
- Background color: #c91014 (red)
- Text content: "Sign In"
- Border radius: 8px
- State: visible and enabled
```

### 6. Code-Based Visual Verification (No MCP)

Use the `vision-assertion.ts` utility to call MiniMax's vision API directly from test code — no MCP tools required.

**Setup:**

```bash
export MINIMAX_API_KEY=sk-xxx  # from https://platform.minimax.io
```

**Copy the utility** from `templates/vision-assertion.ts` into your project, then:

```typescript
import { expectVisualState } from '../utils/vision-assertion';

test('homepage header is correct', async ({ page }) => {
  await page.goto('http://localhost:4200/ar');

  await expectVisualState(page, {
    description: 'Describe the homepage header:',
    expected: { state: 'visible' },
    additionalChecks: [
      'Logo should be present',
      'Search bar should be visible',
      'Sign In button should exist',
    ],
  });
});
```

**Three call patterns:**

| Function | Purpose |
|----------|---------|
| `assertVisualState(page, check)` | Returns `{ description, matches, details }` — inspect yourself |
| `expectVisualState(page, check)` | Throws on mismatch — drop into any test |
| `assertVisualStateAnthropic(page, check)` | Uses `@anthropic-ai/sdk` for SDK-style callers |

**How it works:**
1. Takes a screenshot via `page.screenshot()`
2. Sends it as base64 to `https://api.minimax.io/anthropic/v1/messages` (Anthropic-compatible endpoint)
3. Parses the response for pass/fail

**Prefer code-based over MCP when:**
- You want visual checks inside `test()` blocks (not just agent-driven)
- Tests run in CI without MCP tool access
- You need deterministic, repeatable assertions

### 7. Resource Guidelines (Minimal RAM/CPU/Disk)

```typescript
// playwright.config.ts
use: {
  launchOptions: {
    args: [
      '--disable-gpu',
      '--disable-dev-shm-usage',
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--single-process',
    ],
  },
}
```

- Workers: `1` (single process)
- Only increase resources when tests timeout or fail due to constraints

## Playwright Test Agents

Playwright ships with three built-in Test Agents: **planner**, **generator**, and **healer**.

### One-Time Setup

```bash
npx playwright init-agents --loop=opencode
```

This generates agent definitions in `.github/`. Regenerate whenever Playwright is updated.

### Agent Workflow

```
┌──────────┐     ┌───────────┐     ┌────────┐
│ Planner  │ ──▶ │ Generator │ ──▶ │ Healer │
│ (explore │     │ (write    │     │ (fix   │
│  + plan) │     │  tests)   │     │  tests)│
└──────────┘     └───────────┘     └────────┘
```

#### 🎭 Planner — Explore + Produce Test Plan
- **Input:** Request (e.g., "Generate a plan for guest checkout") + seed test
- **Output:** Markdown test plan in `specs/` (e.g., `specs/basic-operations.md`)
- The seed test provides route context — document app URL structure there

#### 🎭 Generator — Transform Plan → Playwright Tests
- **Input:** Markdown plan from `specs/`
- **Output:** Playwright test files in `tests/`
- Generator runs live to verify selectors and assertions

#### 🎭 Healer — Auto-Repair Failing Tests
- **Input:** Failing test name
- **Output:** Repaired test or skipped (if functionality is broken)
- Replays steps, inspects UI, suggests locator/wait/data fixes, re-runs

### Artifacts Structure

```
repo/
  .github/                    # Agent definitions (generated by init-agents)
  specs/                      # Human-readable test plans (by planner)
    basic-operations.md
  tests/                      # Generated Playwright tests (by generator)
    seed.spec.ts
    create/add-valid-todo.spec.ts
    vision-assertion.ts          # Code-based visual verification utility
  playwright.config.ts
```

## OpenCode MCP Tools for E2E

Use these OpenCode MCP tools alongside Playwright tests:

| Tool | Purpose |
|------|---------|
| `playwright_browser_navigate` | Navigate to URL |
| `playwright_browser_snapshot` | Get accessibility tree |
| `playwright_browser_take_screenshot` | Capture screenshot for visual verification |
| `playwright_browser_click` | Click element by ref |
| `playwright_browser_type` | Type into element |
| `playwright_browser_resize` | Set viewport |
| `playwright_browser_wait_for` | Wait for text, element, or time |
| `playwright_browser_console_messages` | Check console errors |
| `minimax_understand_image` | Analyze screenshots for visual assertions (MCP) |
| `vision-assertion.ts` | Code-based alternative — see `templates/vision-assertion.ts` and Section 6 |
| `playwright_browser_network_requests` | Inspect network traffic |
| `playwright_browser_evaluate` | Execute JavaScript on page |

## Standard Workflow

### 1. Start dev server (or use webServer config)
```bash
npm start
```

### 2. Initialize Playwright agents (one-time)
```bash
npx playwright init-agents --loop=opencode
```

### 3. Generate test plan
Ask the planner agent: "Generate a plan for [feature/scenario]"

### 4. Generate tests
Ask the generator agent to transform the plan into tests.

### 5. Run tests
```bash
npx playwright test
```

### 6. Visual verification

Two approaches — choose one per project:

**A) MCP-based** (agent-driven): use `minimax_understand_image`
- Take screenshot
- Analyze with structured prompt format
- Test passes only if vision confirms all expected states

**B) Code-based** (in-test): use `vision-assertion.ts`
- Call `await expectVisualState(page, { description, expected })` inside `test()` blocks
- No MCP tools needed — runs entirely in Node.js
- See Section 6 "Code-Based Visual Verification" for full docs

## Viewport Targets

- **Mobile:** 375 x 812 (iPhone 12)
- **Tablet:** 768 x 1024 (iPad Mini)
- **Desktop:** 1280 x 800

## Screenshot Path

Save screenshots to a configurable directory:
```typescript
// configurable — default convention
const SCREENSHOT_DIR = process.env.SCREENSHOT_DIR || '.playwright-mcp';
```

## Running Tests

| Purpose | Command |
|---------|---------|
| Run all tests | `npx playwright test` |
| Run & see browser | `npx playwright test --headed` |
| Debug specific test | `npx playwright test --debug` |
| Full visual debugging | `npx playwright test --ui` |
| View HTML report | `npx playwright show-report` |
