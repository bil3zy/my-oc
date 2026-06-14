# Debugging Flaky Tests

## Flaky Test Checklist

### 1. Check for Hardcoded Waits
```typescript
// ❌ Bad — brittle, slow, environment-dependent
await page.waitForTimeout(3000);

// ✅ Good — web-first, adapts to conditions
await expect(page.getByText('Success')).toBeVisible({ timeout: 10000 });
```

### 2. Verify Locator Stability
- CSS class locators break on class changes → use role/label
- nth-child breaks on DOM reorder → use unique text or test-id
- Chained selectors (`div > span.btn`) break on restructure → use `getByRole`

### 3. Enable Tracing for Diagnostics

```typescript
// playwright.config.ts
use: {
  trace: 'on-first-retry',
}
```

Then view the trace:
```bash
npx playwright show-trace path/to/trace.zip
```

### 4. Check for Race Conditions
- Is the test clicking before the page renders? → Add `waitFor`/`expect`
- Is an API call still in flight? → Wait for network idle
- Is a transition/animation in progress? → Wait for stable state

### 5. Verify Route Correctness
- Did the agent guess the wrong URL? → Check URL via snapshot
- Does the route need a locale prefix? → Use the seed test format
- Is it an SPA route that needs client-side navigation? → Click through app, don't navigate directly

### 6. Check Resource Constraints
- Workers > 1 can cause timing issues → Set `workers: 1`
- Headless mode hides rendering issues → Try `--headed`
- Memory pressure can cause timeouts → Add `--disable-gpu`, `--single-process`

### 7. Visual Verification for Styling Issues

When a test fails and you can't tell why, use visual verification:

```
1. playwright_browser_take_screenshot → {filename: ".playwright-mcp/debug.png"}
2. playwright_browser_snapshot → check the accessibility tree
3. minimax_understand_image → {
     image: ".playwright-mcp/debug.png",
     description: "Describe the current page state — what elements are visible, what is the URL, are there any error messages or overlays?"
   }
```

### 8. Retry Strategy

```typescript
// playwright.config.ts
retries: 2,
```

Set retries to 1-2 for local development, more on CI. Avoid relying on retries as a crutch — fix the root cause.

## Trace Analysis Workflow

1. Run with trace enabled:
```bash
npx playwright test --trace on
```

2. After failure, open trace:
```bash
npx playwright show-trace test-results/**/trace.zip
```

3. In the trace viewer:
- Check **Actions** tab for exact sequence of events
- Check **Console** for errors or warnings
- Check **Network** for failed API calls or slow requests
- Check **Snapshots** to see the DOM at each step

## Common Fixes

| Symptom | Likely Cause | Fix |
|---------|-------------|-----|
| Test fails intermittently | Race condition | Replace `waitForTimeout` with web-first assertion |
| Element not found | Wrong locator | Use `getByRole` or `getByTestId` |
| Wrong page renders | Wrong route | Verify URL with snapshot before acting |
| Timeout on navigation | SPA not ready | Wait for specific element, not page load |
| Visual mismatch | Animation in progress | Wait for animation end or add stabilization delay |
| Console errors | Missing API mocks | Add `page.route()` for all external endpoints |
