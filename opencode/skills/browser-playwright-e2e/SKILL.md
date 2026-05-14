# Browser Playwright E2E Verification Skill

## Overview
Playwright-based browser automation for testing the Angular web app (bahu-front) on localhost:4200. Uses native OpenCode MCP Playwright tools.

## Dev Server
```bash
cd /Users/bahu/bahu-project/bahu-front && npm start
```
Wait for: "Local: http://localhost:4200"

## OpenCode MCP Playwright Tools

| Tool | Purpose |
|------|---------|
| `playwright_browser_navigate` | Navigate to URL |
| `playwright_browser_resize` | Set viewport (mobile/desktop) |
| `playwright_browser_snapshot` | Get accessibility tree with boxes |
| `playwright_browser_take_screenshot` | Capture screenshot |
| `playwright_browser_click` | Click element (use ref from snapshot) |
| `playwright_browser_wait_for` | Wait for time or text |
| `playwright_browser_console_messages` | Check console errors |
| `minimax_understand_image` | Analyze screenshots |

## Viewport Targets
- Mobile: 375 x 812 (iPhone 12)
- Tablet: 768 x 1024 (iPad Mini)
- Desktop: 1280 x 800

## Screenshot Path Rules
Screenshots MUST be saved to one of these directories:
- `/Users/bahu/.playwright-mcp/`
- `/Users/bahu/`

Example: `playwright_browser_take_screenshot` with `filename: "/Users/bahu/.playwright-mcp/test.png"`

## Key Routes & Elements

### Homepage (/)
- AI toggle: `.ai-toggle` or `button AI OFF AI off`
- AI textarea: `.ai-search-input`
- Full-screen modal: `.ai-full-screen-modal`

### Offers Page (/offers/buy/properties-for-sale)
- Shows "Page Not Found" on some routes - verify correct route
- AI search inline view in mobile with `activeFilterTab === 'ai'`

### AI Full-Screen Modal
Open via: Click AI toggle on homepage → AI textarea appears → click it to open full modal
- Header with back button
- Modal body: `.modal-body-custom`
- Textarea: `.ai-search-input`
- Filter chips: `.filter-chip` inside `.filters-chips-container`
- Search button: `.btn-search-expanded`
- Clear all button: `.btn-clear-all`

### AI Inline Search (mobile from map or offers)
- Wrapper: `.ai-search-inline-wrapper` + `.ai-search-bg`
- Textarea: `.ai-search-textarea`
- Filter chips: `.filter-chip`
- Footer: `.filters-footer` with `.btn-search-expanded` and `.btn-clear-all`

## Standard Workflow

### 1. Start dev server
```bash
cd /Users/bahu/bahu-project/bahu-front && npm start
```

### 2. Navigate and set up
```javascript
await page.goto('http://localhost:4200/ar', { timeout: 60000, waitUntil: 'domcontentloaded' });
await page.waitForTimeout(2000);
```

### 3. Set viewport
```javascript
await page.setViewportSize({ width: 375, height: 812 });
```

### 4. Toggle AI mode
```javascript
const toggle = page.locator('.ai-toggle').first();
await toggle.click();
```

### 5. Take screenshots for comparison
```javascript
await page.screenshot({ path: '/Users/bahu/.playwright-mcp/before.png' });
```

### 6. Analyze with vision
Use `minimax_understand_image` tool on screenshots to verify visual elements.

## Verification Checklist

When comparing AI search inline vs full-screen modal, verify:
- [ ] Wrapper padding (should be ~20px on all sides)
- [ ] Textarea border-radius, border, padding
- [ ] Filter chips styling (border-radius: 50px, border: 1px solid #dee2e6, padding: 6px 14px)
- [ ] Search button (`.btn-search-expanded`) - background: #c91014, border-radius: 8px
- [ ] Clear all button (`.btn-clear-all`) - transparent background
- [ ] Filter label typography
- [ ] Footer divider (border-top: 1px solid #e0e0e0)

## Troubleshooting

### Route shows "Page Not Found"
- Try `/ar` instead of `/ar/offers` for homepage
- Try `/ar/offers/buy/properties-for-sale` for offers page

### AI toggle not found
- Wait for settings to load: `page.waitForFunction(() => !!document.querySelector('.ai-toggle'), { timeout: 15000 })`

### Modal intercepts clicks
- Full-screen modal opens on top of homepage UI
- Take screenshot to see what's actually rendered

## Test File Location
Existing e2e tests: `e2e/ai-search-modal.spec.ts`

Base directory for this skill: file:///Users/bahu/.config/opencode/skills/browser-playwright-e2e