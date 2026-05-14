---
name: bahu-mobile-app
description: Playwright-based browser automation for the Ionic 8 + Angular 18 mobile app. Use when testing or automating the bahu-mobile-app project.
---

# bahu-mobile-app Browser Automation & Verification

## Overview
Playwright-based browser automation for testing the Ionic 8 + Angular 18 mobile app on iOS/Android without needing native simulators. Uses localhost:8100 (Angular dev server) for fast iteration.

## Key Learned Details

### Dev Server
```bash
cd /Users/bahu/bahu-project/bahu-mobile-app
npm start  # Runs on port 8100 by default
```

### Bypassing the Intro/Onboarding Guard
The `firstTimeGuard` uses `NotificationsService.getHasSeenOnboarding()` which reads from `@ionic/storage-angular` (IndexedDB), NOT localStorage. To bypass onboarding, click through the intro buttons:

```typescript
// Use OpenCode MCP Playwright tools:
await page.goto('http://localhost:8100/intro');
// Click through intro - use ion-button selectors
for (let i = 0; i < 5; i++) {
  const nextBtn = await page.$('ion-button[expand="block"]');
  if (nextBtn) await nextBtn.click();
  await page.waitForTimeout(1000);
}
// Click skip button
const skipBtn = await page.$('ion-button[fill="clear"]');
if (skipBtn) await skipBtn.click();
```

The guard checks Ionic Storage (IndexedDB), not localStorage. The onboarding flow:
1. `IntroPage.finishIntro()` calls `storage.set('introSeen', true)` AND `notificationsService.setHasSeenOnboarding(true)`
2. The guard checks `notificationsService.getHasSeenOnboarding()` from Ionic Storage

### Angular Component Selector Pattern
- `app-search-bar-page` → `SearchBarPage` component
- `app-homepage` → `HomepagePage` component
- `app-my-account` → `MyAccountPage` (account page)
- Always wait for components to render with `waitForSelector` or `waitForTimeout`

### Common Ionic Element Selectors
- `ion-button[expand="block"]` — Next button on intro
- `ion-button[fill="clear"]` — Skip button on intro
- `.log-in-item` — Login prompt card (unauthenticated)
- `.logged-in-item` — User profile card (authenticated)
- `ion-content` — Main scrollable content area
- `ion-item` — List items with icons and labels

### Testing Account Page
```javascript
// Navigate to account page
await page.goto('http://localhost:8100/my-account');

// Check for login prompt or user profile
const loginPrompt = await page.$('.log-in-item');
const userProfile = await page.$('.logged-in-item');

if (loginPrompt) {
  // Unauthenticated state - describes login/create account card
  const avatar = await page.$('.log-in-item ion-icon');
  const title = await page.$('.log-in-item h5');
  const description = await page.$('.log-in-item p');
}

if (userProfile) {
  // Authenticated state - shows user info
  const avatar = await page.$('.logged-in-item img');
  const userName = await page.$('.logged-in-item h5');
  const userEmail = await page.$('.logged-in-item p');
}
```

### Known Issues / Console Errors (Non-Critical)
These are expected and NOT related to the AI ribbon feature:
- `API request failed: {"code":"UNIMPLEMENTED"}` — Firebase/Google auth token refresh (cosmetic, not breaking)
- `Failed to load resource: 400` — Google auth iframe CSP violation (report-only, cosmetic)
- CSS budget warnings for SCSS files exceeding 2.05kB — expected for this project

### Critical Errors to Watch For
- `Cannot read properties of undefined (reading 'aiMode')` — means `searchBarPage` ViewChild not resolved yet. Always use safe navigation `searchBarPage?.aiMode` in templates and handle null checks in handlers.
- Forms errors like `_syncPendingControls` — usually a FormGroup issue unrelated to AI ribbon

## OpenCode MCP Playwright Tools
Use these browser automation tools (NOT standalone Node.js scripts):

| Tool | Purpose |
|------|---------|
| `playwright_browser_navigate` | Navigate to URL |
| `playwright_browser_resize` | Set viewport (e.g., 375x812 for mobile) |
| `playwright_browser_snapshot` | Get accessibility tree with boxes |
| `playwright_browser_take_screenshot` | Capture screenshot |
| `playwright_browser_click` | Click element |
| `playwright_browser_run_code_unsafe` | Execute JS in page context |
| `playwright_browser_console_messages` | Check console errors |
| `playwright_browser_wait_for` | Wait for time or text |

**Screenshot path restriction**: Only save to `/Users/bahu/.playwright-mcp/` or `/Users/bahu/`

```javascript
// Example using MCP tools (NOT require('playwright'))
// Navigate and set mobile viewport
await page.goto('http://localhost:8100/my-account');
await page.setViewportSize({ width: 375, height: 812 });

// Take screenshot to allowed directory
await page.screenshot({
  path: '.playwright-mcp/bahu-mobile-account.png',
  scale: 'css',
  type: 'png'
});
```

## Testing Workflow

### 1. Start Dev Server
```bash
cd /Users/bahu/bahu-project/bahu-mobile-app && npm start
# Wait for: "Server started: Hot Module Replacement disabled, Live Reloading enabled"
```

### 2. Run Playwright Test via MCP
```javascript
// Use playwright_browser_navigate to go to page
await page.goto('http://localhost:8100', { waitUntil: 'networkidle', timeout: 30000 });
await page.waitForTimeout(2000);

// Navigate past intro using MCP run_code_unsafe:
await (async (page) => {
  for (let i = 0; i < 5; i++) {
    const nextBtn = await page.$('ion-button[expand="block"]');
    if (nextBtn) { await nextBtn.click(); await page.waitForTimeout(1000); }
  }
  const skipBtn = await page.$('ion-button[fill="clear"]');
  if (skipBtn) { await skipBtn.click(); await page.waitForTimeout(1500); }
})(page);

// Get URL
const url = page.url();

// Use playwright_browser_take_screenshot with path in allowed directory
await page.screenshot({
  path: '.playwright-mcp/screenshot.png',
  scale: 'css',
  type: 'png'
});

// Check console errors via MCP
const errors = [];
page.on('console', msg => { if (msg.type() === 'error') errors.push(msg.text()); });
```

### 3. Verify Visual Check
Use `minimax_understand_image` tool on the screenshot.

### 4. Quick Compile Check (No Full Build)
```bash
cd /Users/bahu/bahu-project/bahu-mobile-app
npx ng build --configuration=development 2>&1 | grep -E "error|Error|✘" | head -10
```

## Template Safety Pattern (Critical)
Always use safe navigation `?.` on optional ViewChild references:
```html
<!-- BAD - crashes if searchBarPage is undefined -->
<button [ngClass]="{'active': searchBarPage.aiMode}">

<!-- GOOD - safe navigation -->
<button [ngClass]="{'active': searchBarPage?.aiMode}">
```

```typescript
// Handlers should use null checks
onAIToggleClick(event: Event): void {
  event.stopPropagation();
  if (this.searchBarPage) {
    this.searchBarPage.toggleAIMode();
    this.searchBarPage.openFullscreenAI();
  }
}
```

## Common Patterns

### Testing Component Visibility
```javascript
const el = await page.$('app-search-bar-page');
if (el) {
  const isVisible = await el.isVisible();
  console.log('Component visible:', isVisible);
}
```

### Testing Console Errors
```javascript
const errors = [];
page.on('console', msg => {
  if (msg.type() === 'error') errors.push(msg.text());
});

// After interaction:
const criticalErrors = errors.filter(e => e.includes('aiMode') || e.includes('TypeError'));
if (criticalErrors.length > 0) {
  console.log('ERRORS FOUND:', criticalErrors);
}
```

### Screenshot Comparison
```javascript
// Use MCP playwright_browser_take_screenshot with path in allowed directory
await page.screenshot({
  path: '.playwright-mcp/before.png',
  scale: 'css',
  type: 'png'
});
// ... make changes ...
await page.screenshot({
  path: '.playwright-mcp/after.png',
  scale: 'css',
  type: 'png'
});
```

## Troubleshooting

### Page stuck on /intro
Use the OpenCode MCP Playwright intro bypass method (see above). The guard reads from Ionic Storage (IndexedDB), not localStorage. The onboarding flow:
1. `IntroPage.finishIntro()` calls `storage.set('introSeen', true)` AND `notificationsService.setHasSeenOnboarding(true)`
2. The guard checks `notificationsService.getHasSeenOnboarding()` from Ionic Storage

### Build errors on templates
- Check for `?.` safe navigation on all ViewChild references
- Move complex click handler expressions out of template into component methods
- If error mentions line numbers, check template HTML at those lines

### Server not responding on 8100
```bash
# Kill any existing servers
pkill -f "ng serve" || true
pkill -f "node.*angular" || true

# Restart
cd /Users/bahu/bahu-project/bahu-mobile-app && npm start
```