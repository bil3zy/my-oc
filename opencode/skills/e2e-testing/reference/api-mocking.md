# API Mocking with Playwright

## Basic Route Interception

```typescript
import { test, expect } from '@playwright/test';

test('mock API response', async ({ page }) => {
  await page.route('**/api/users/me', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        id: 1,
        name: 'Test User',
        email: 'test@example.com',
      }),
    });
  });

  await page.goto('http://localhost:4200/ar/my-account');
  await expect(page.getByText('Test User')).toBeVisible();
});
```

## Mock with Delay (Test Loading States)

```typescript
test('shows loading spinner', async ({ page }) => {
  await page.route('**/api/properties', async (route) => {
    await new Promise((resolve) => setTimeout(resolve, 2000));
    await route.fulfill({
      status: 200,
      body: JSON.stringify([]),
    });
  });

  await page.goto('http://localhost:4200/ar');
  await expect(page.getByTestId('loading-spinner')).toBeVisible();
});
```

## Mock Error Responses

```typescript
test('handles API error', async ({ page }) => {
  await page.route('**/api/properties', async (route) => {
    await route.fulfill({
      status: 500,
      contentType: 'application/json',
      body: JSON.stringify({ error: 'Internal server error' }),
    });
  });

  await page.goto('http://localhost:4200/ar');
  await expect(page.getByText('Something went wrong')).toBeVisible();
});
```

## Block Unwanted Requests

```typescript
test('block analytics', async ({ page }) => {
  await page.route('**/analytics/**', async (route) => {
    await route.abort();
  });

  await page.goto('http://localhost:4200/ar');
  // Analytics requests are blocked
});
```

## Conditional Mocking

```typescript
test('mock only specific request', async ({ page }) => {
  await page.route('**/api/properties', async (route) => {
    const url = route.request().url();
    if (url.includes('featured')) {
      await route.fulfill({
        status: 200,
        body: JSON.stringify([{ id: 1, title: 'Featured Property' }]),
      });
    } else {
      await route.continue();
    }
  });

  await page.goto('http://localhost:4200/ar');
});
```

## Modify Responses

```typescript
test('modify existing response', async ({ page }) => {
  await page.route('**/api/properties', async (route) => {
    const response = await route.fetch();
    const body = await response.json();
    body.push({ id: 999, title: 'Injected Property' });
    await route.fulfill({
      response,
      body: JSON.stringify(body),
    });
  });

  await page.goto('http://localhost:4200/ar');
  await expect(page.getByText('Injected Property')).toBeVisible();
});
```

## Verify API Calls Were Made

```typescript
test('verify login API call', async ({ page }) => {
  let loginCalled = false;

  await page.route('**/api/auth/login', async (route) => {
    loginCalled = true;
    await route.fulfill({
      status: 200,
      body: JSON.stringify({ token: 'fake-token' }),
    });
  });

  await page.goto('http://localhost:4200/ar/auth/signin');
  await page.getByLabel('Email').fill('user@test.com');
  await page.getByLabel('Password').fill('pass123');
  await page.getByRole('button', { name: 'Sign In' }).click();

  expect(loginCalled).toBe(true);
});
```

## Matcher Patterns

| Pattern | Matches |
|---------|---------|
| `**/api/**` | All API requests |
| `**/api/properties` | Exact property endpoint |
| `**/api/properties*` | Property with query params |
| `*/api/v2/**` | v2 API only |
| `http://localhost:4200/api/**` | Local dev server only |
