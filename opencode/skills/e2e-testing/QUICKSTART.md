# QUICKSTART: 5-Minute Setup

## 1. Install Playwright

```bash
npm init @playwright/test
# or in an existing project:
npm install -D @playwright/test
npx playwright install chromium
```

## 2. Copy Templates

```bash
cp templates/playwright.config.ts .
mkdir -p tests specs
cp templates/seed.spec.ts tests/
cp templates/vision-assertion.ts utils/  # optional: code-based visual verification
```

## 3. Initialize Test Agents (one-time)

```bash
npx playwright init-agents --loop=opencode
```

## 4. Set Base URL

Edit `playwright.config.ts` and set `baseURL` or use `BASE_URL` env var:

```bash
export BASE_URL=http://localhost:4200
```

## 5. Start Dev Server

```bash
npm start
# or let webServer config handle it automatically
```

## 6. Generate Tests

Ask the planner agent:

> "Generate a test plan for the login flow"

Then ask the generator:

> "Generate tests from specs/login-flow.md"

## 7. Run

```bash
npx playwright test
```

## 8. Visual Verification

Two options — pick one:

**A) MCP-based** (agent-driven):
```
1. playwright_browser_take_screenshot → screenshot.png
2. minimax_understand_image with description format
3. Pass only if vision confirms all expected states
```

**B) Code-based** (in-test): Copy `templates/vision-assertion.ts` to your project:
```bash
cp templates/vision-assertion.ts utils/
```
Set `MINIMAX_API_KEY` env var, then call inside tests:
```typescript
import { expectVisualState } from '../utils/vision-assertion';

await expectVisualState(page, {
  description: 'Describe the login button:',
  expected: { textContent: 'Sign In', backgroundColor: '#c91014' },
});
```
