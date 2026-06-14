# Mobile Testing

## Viewport Targets

| Device | Width | Height |
|--------|-------|--------|
| iPhone 12/13 | 375 | 812 |
| iPhone 14 Pro | 390 | 844 |
| iPad Mini | 768 | 1024 |
| iPad Pro | 1024 | 1366 |
| Samsung Galaxy S21 | 360 | 800 |
| Google Pixel 7 | 412 | 915 |

## Project Configuration

```typescript
// playwright.config.ts
import { devices, defineConfig } from '@playwright/test';

export default defineConfig({
  projects: [
    {
      name: 'mobile-chrome',
      use: {
        ...devices['Pixel 5'],
        channel: 'chrome',
      },
    },
    {
      name: 'mobile-safari',
      use: {
        ...devices['iPhone 13'],
      },
    },
    {
      name: 'tablet',
      use: {
        browserName: 'chromium',
        viewport: { width: 768, height: 1024 },
      },
    },
  ],
});
```

## Per-Test Viewport

```typescript
import { test, expect } from '@playwright/test';

test('mobile layout', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await page.goto('http://localhost:4200/ar');
  // Mobile-specific assertions
  await expect(page.getByTestId('mobile-menu')).toBeVisible();
  await expect(page.getByTestId('desktop-nav')).toBeHidden();
});

test('tablet layout', async ({ page }) => {
  await page.setViewportSize({ width: 768, height: 1024 });
  await page.goto('http://localhost:4200/ar');
  // Tablet assertions
});

test('desktop layout', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto('http://localhost:4200/ar');
  // Desktop assertions
});
```

## Touch Simulation

Playwright emulates touch events automatically for device presets. For manual touch:

```typescript
test('touch interactions', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 });

  // Swipe left on carousel
  const carousel = page.locator('.carousel');
  const box = await carousel.boundingBox();
  if (box) {
    await page.mouse.move(box.x + 300, box.y + box.height / 2);
    await page.mouse.down();
    await page.mouse.move(box.x + 50, box.y + box.height / 2, { steps: 10 });
    await page.mouse.up();
  }
});
```

## Responsive Design Checks

```typescript
test('responsive menu', async ({ page }) => {
  // Mobile: hamburger menu
  await page.setViewportSize({ width: 375, height: 812 });
  await page.goto('http://localhost:4200/ar');
  await page.getByTestId('hamburger-menu').click();
  await expect(page.getByTestId('mobile-nav')).toBeVisible();

  // Desktop: full nav visible
  await page.setViewportSize({ width: 1280, height: 800 });
  await expect(page.getByTestId('desktop-nav')).toBeVisible();
  await expect(page.getByTestId('mobile-nav')).toBeHidden();
});
```

## Visual Verification on Mobile

```typescript
test('mobile login screen visual', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await page.goto('http://localhost:4200/ar/auth/signin');

  await page.screenshot({ path: '.playwright-mcp/mobile-login.png' });
  // Then minimax_understand_image with:
  // "Describe the login form on mobile view:
  //  - Form card should take full width (375px)
  //  - Input fields should be full width
  //  - Submit button should be full width with background #c91014
  //  - No sidebar or desktop-only elements visible"
});
```
