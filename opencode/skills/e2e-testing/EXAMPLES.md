# E2E Testing Examples

## Navigation & Page Load

```typescript
test('navigate to homepage', async ({ page }) => {
  await page.goto('http://localhost:4200/ar');
  await expect(page).toHaveTitle(/bahu/i);
});

test('navigate with locale prefix', async ({ page }) => {
  await page.goto('http://localhost:4200/en');
  await expect(page.getByText(/sign in/i)).toBeVisible();
});
```

## Forms & Inputs

```typescript
test('fill login form', async ({ page }) => {
  await page.goto('http://localhost:4200/ar/auth/signin');
  await page.getByLabel('Email').fill('user@example.com');
  await page.getByLabel('Password').fill('password123');
  await page.getByRole('button', { name: 'Sign In' }).click();
  await expect(page.getByText('Welcome back')).toBeVisible();
});

test('form validation errors', async ({ page }) => {
  await page.goto('http://localhost:4200/ar/auth/signin');
  await page.getByRole('button', { name: 'Sign In' }).click();
  await expect(page.getByText('Email is required')).toBeVisible();
  await expect(page.getByText('Password is required')).toBeVisible();
});
```

## Lists & Tables

```typescript
test('property list loads', async ({ page }) => {
  await page.goto('http://localhost:4200/ar/offers/buy/properties-for-sale');
  await expect(page.getByTestId('property-card')).toHaveCount(10);
});

test('search filters', async ({ page }) => {
  await page.goto('http://localhost:4200/ar');
  await page.getByTestId('search-input').fill('apartment');
  await page.getByRole('button', { name: 'Search' }).click();
  await expect(page.getByTestId('property-card')).not.toHaveCount(0);
});
```

## Modals & Dialogs

```typescript
test('open AI search modal', async ({ page }) => {
  await page.goto('http://localhost:4200/ar');
  await page.getByTestId('ai-toggle').click();
  await expect(page.getByTestId('ai-full-screen-modal')).toBeVisible();
  await expect(page.getByPlaceholder('Describe your search')).toBeFocused();
});

test('close modal with back button', async ({ page }) => {
  await page.goto('http://localhost:4200/ar');
  await page.getByTestId('ai-toggle').click();
  await page.getByTestId('modal-back-button').click();
  await expect(page.getByTestId('ai-full-screen-modal')).toBeHidden();
});
```

## Dropdowns & Selects

```typescript
test('select property type', async ({ page }) => {
  await page.goto('http://localhost:4200/ar');
  await page.getByLabel('Property Type').selectOption('apartment');
  await expect(page.getByLabel('Property Type')).toHaveValue('apartment');
});
```

## Tabs & Filters

```typescript
test('switch between tabs', async ({ page }) => {
  await page.goto('http://localhost:4200/ar');
  await page.getByRole('tab', { name: 'Buy' }).click();
  await expect(page.getByTestId('buy-content')).toBeVisible();
  await expect(page.getByTestId('rent-content')).toBeHidden();
});
```

## Authentication Flows

```typescript
test('logout', async ({ page }) => {
  await page.goto('http://localhost:4200/ar');
  await page.getByTestId('user-menu').click();
  await page.getByRole('button', { name: 'Logout' }).click();
  await expect(page.getByRole('button', { name: 'Sign In' })).toBeVisible();
});
```

## Visual Verification (MCP-based)

```typescript
test('verify homepage visual state (MCP)', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto('http://localhost:4200/ar');

  await page.screenshot({ path: '.playwright-mcp/homepage.png' });
  // minimax_understand_image with:
  // "Describe the homepage:
  //  - Header should have logo, search bar, and sign in button
  //  - Hero section should have property search CTA
  //  - Footer should show links and contact info"
});
```

## Visual Verification (Code-based)

```typescript
import { expectVisualState } from '../utils/vision-assertion';

test('verify homepage visual state (code)', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto('http://localhost:4200/ar');

  await expectVisualState(page, {
    description: 'Describe the homepage:',
    additionalChecks: [
      'Header should have logo, search bar, and sign in button',
      'Hero section should have property search CTA',
      'Footer should show links and contact info',
    ],
  });
});

test('verify map loaded correctly', async ({ page }) => {
  await page.goto('http://localhost:4200/ar/offers-details/123');
  await page.locator('button.btn-map').first().click();
  await page.waitForTimeout(3000);

  await expectVisualState(page, {
    description: 'Describe the map area:',
    expected: { state: 'visible' },
    additionalChecks: [
      'Map should show a rendered area with markers or tiles',
      'There should NOT be an error icon or Google Maps error message',
    ],
  });
});
```

## Mobile-Specific Examples

```typescript
test('mobile hamburger menu', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await page.goto('http://localhost:4200/ar');
  await page.getByTestId('hamburger-menu').click();
  await expect(page.getByTestId('mobile-nav')).toBeVisible();
  await expect(page.getByTestId('desktop-nav')).toBeHidden();
});

test('mobile AI search inline', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await page.goto('http://localhost:4200/ar/offers/buy/properties-for-sale');
  await expect(page.getByTestId('ai-search-inline')).toBeVisible();
});
```

## API Mocking Examples

```typescript
test('mock empty property list', async ({ page }) => {
  await page.route('**/api/properties', async (route) => {
    await route.fulfill({ status: 200, body: '[]' });
  });
  await page.goto('http://localhost:4200/ar');
  await expect(page.getByText('No properties found')).toBeVisible();
});
```

## Error Handling Examples

```typescript
test('network error shows retry', async ({ page }) => {
  await page.route('**/api/properties', async (route) => {
    await route.abort('ConnectionRefused');
  });
  await page.goto('http://localhost:4200/ar');
  await expect(page.getByRole('button', { name: 'Retry' })).toBeVisible();
  await page.getByRole('button', { name: 'Retry' }).click();
  await expect(page.getByTestId('property-card')).not.toHaveCount(0);
});
```

## Multiple Assertions

```typescript
test('property detail page', async ({ page }) => {
  await page.goto('http://localhost:4200/ar/property/123');

  await expect(page.getByTestId('property-title')).toBeVisible();
  await expect(page.getByTestId('property-price')).toBeVisible();
  await expect(page.getByTestId('property-description')).toBeVisible();
  await expect(page.getByTestId('property-images')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Contact Agent' })).toBeVisible();
});
```

## Waiting for Specific Conditions

```typescript
test('wait for API response', async ({ page }) => {
  const responsePromise = page.waitForResponse('**/api/properties');
  await page.goto('http://localhost:4200/ar');
  const response = await responsePromise;
  expect(response.status()).toBe(200);
});

test('wait for element to disappear', async ({ page }) => {
  await page.goto('http://localhost:4200/ar');
  await expect(page.getByTestId('loading-spinner')).toBeVisible();
  await expect(page.getByTestid('loading-spinner')).toBeHidden({ timeout: 10000 });
});
```
