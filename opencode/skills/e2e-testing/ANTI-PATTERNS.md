# Anti-Patterns: 10 Common Mistakes

## 1. Using CSS/XPath Locators Instead of Role/Text

```typescript
// ❌ Bad — breaks on class change, DOM restructure
await page.locator('.btn-primary').click();
await page.locator('//div[@class="form"]//input').fill('test');

// ✅ Good — survives DOM changes
await page.getByRole('button', { name: 'Submit' }).click();
await page.getByLabel('Email').fill('test');
```

## 2. Hardcoded Waits

```typescript
// ❌ Bad — slow, flaky, environment-dependent
await page.waitForTimeout(3000);

// ✅ Good — adapts to actual conditions
await expect(page.getByText('Success')).toBeVisible({ timeout: 10000 });
```

## 3. Assuming Routes Without Verification

```typescript
// ❌ Bad — agent guesses /login, fails when app uses /ar/auth/signin
await page.goto('http://localhost:4200/login');

// ✅ Good — use seed test context, verify with snapshot first
await page.goto('http://localhost:4200/ar/auth/signin');
await expect(page.getByLabel('Email')).toBeVisible();
```

## 4. Shared Test State

```typescript
// ❌ Bad — tests depend on each other
let userId: string;
test('create user', async () => { userId = '123'; });
test('delete user', async () => { /* uses userId from previous test */ });

// ✅ Good — each test is independent
test('create user', async ({ page }) => { /* ... */ });
test('delete user', async ({ page }) => {
  // set up own state via API or UI
});
```

## 5. Testing Implementation Details

```typescript
// ❌ Bad — tests internal structure, breaks on refactor
await expect(page.locator('.user-list li:nth-child(3)')).toBeVisible();

// ✅ Good — tests behavior, survives refactor
await expect(page.getByText('user@example.com')).toBeVisible();
```

## 6. Ignoring Console Errors

```typescript
// ❌ Bad — test passes even with errors
await page.goto('http://localhost:4200/ar');

// ✅ Good — fail on unexpected errors
page.on('console', (msg) => {
  if (msg.type() === 'error') {
    test.fail(true, `Console error: ${msg.text()}`);
  }
});
await page.goto('http://localhost:4200/ar');
```

## 7. Overusing `page.evaluate()`

```typescript
// ❌ Bad — bypasses Playwright's auto-waiting
await page.evaluate(() => {
  document.querySelector('button')?.click();
});

// ✅ Good — uses Playwright's built-in waiting
await page.getByRole('button').click();
```

## 8. Not Mocking External APIs

```typescript
// ❌ Bad — tests depend on external services being available
await page.goto('http://localhost:4200/ar');

// ✅ Good — mock external dependencies
await page.route('**/api/**', async (route) => {
  await route.fulfill({ status: 200, body: '{}' });
});
await page.goto('http://localhost:4200/ar');
```

## 9. Nested Callbacks Instead of Sequential Actions

```typescript
// ❌ Bad — deeply nested, hard to debug
await page.getByRole('button').click().then(() => {
  return page.getByLabel('name').fill('test').then(() => {
    return page.getByRole('button', { name: 'Save' }).click();
  });
});

// ✅ Good — sequential, readable
await page.getByRole('button').click();
await page.getByLabel('Name').fill('test');
await page.getByRole('button', { name: 'Save' }).click();
```

## 10. Disabling Playwright's Auto-Waiting

```typescript
// ❌ Bad — forces interaction before element is ready
await page.locator('.dynamic-content button').click({ force: true });

// ✅ Good — let Playwright wait for actionability
await page.getByRole('button', { name: 'Submit' }).click();
```
