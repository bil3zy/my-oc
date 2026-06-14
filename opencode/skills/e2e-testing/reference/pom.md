# Page Object Model (POM) Patterns

## Base Page

```typescript
// pages/base.page.ts
import { type Page, type Locator } from '@playwright/test';

export class BasePage {
  constructor(protected readonly page: Page) {}

  async navigate(path: string): Promise<void> {
    await this.page.goto(path);
  }

  async getTitle(): Promise<string> {
    return this.page.title();
  }

  async waitForSelector(selector: string): Promise<void> {
    await this.page.waitForSelector(selector);
  }
}
```

## Example: Login Page

```typescript
// pages/login.page.ts
import { type Page, type Locator } from '@playwright/test';
import { BasePage } from './base.page';

export class LoginPage extends BasePage {
  readonly emailInput: Locator;
  readonly passwordInput: Locator;
  readonly submitButton: Locator;
  readonly errorMessage: Locator;

  constructor(page: Page) {
    super(page);
    this.emailInput = page.getByLabel('Email');
    this.passwordInput = page.getByLabel('Password');
    this.submitButton = page.getByRole('button', { name: 'Sign In' });
    this.errorMessage = page.getByTestId('login-error');
  }

  async login(email: string, password: string): Promise<void> {
    await this.emailInput.fill(email);
    await this.passwordInput.fill(password);
    await this.submitButton.click();
  }

  async getErrorMessage(): Promise<string> {
    return this.errorMessage.textContent() ?? '';
  }
}
```

## Test Using POM

```typescript
// tests/login.spec.ts
import { test, expect } from '@playwright/test';
import { LoginPage } from '../pages/login.page';

test('successful login', async ({ page }) => {
  const loginPage = new LoginPage(page);
  await loginPage.navigate('http://localhost:4200/ar/auth/signin');

  await loginPage.login('user@example.com', 'password123');

  await expect(page.getByText('Welcome back')).toBeVisible();
});

test('shows error on invalid credentials', async ({ page }) => {
  const loginPage = new LoginPage(page);
  await loginPage.navigate('http://localhost:4200/ar/auth/signin');

  await loginPage.login('wrong@email.com', 'badpassword');

  await expect(loginPage.errorMessage).toBeVisible();
  await expect(loginPage.errorMessage).toContainText('Invalid');
});
```

## Best Practices

1. **One page class per page/feature** — Don't create god objects
2. **Expose locators as readonly properties** — Not strings
3. **Methods return void or page objects** — Keep fluent
4. **Keep locators in constructor** — Single place to update
5. **Never put assertions in page objects** — Tests own assertions
6. **Use role/label locators** — Not CSS, not XPath
