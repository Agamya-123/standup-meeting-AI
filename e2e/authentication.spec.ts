import { test, expect } from '@playwright/test';
import { seedE2EDatabase, COMPANY_A } from './helpers/seedE2E';

test.describe('Authentication & Session Lifecycle', () => {
  test.beforeEach(async () => {
    await seedE2EDatabase();
  });

  test('should complete two-step login with email identifier', async ({ page }) => {
    await page.goto('/login');

    // Step 1: Identifier lookup
    await expect(page.locator('#login-identifier')).toBeVisible();
    await page.fill('#login-identifier', COMPANY_A.admin.email);
    await page.click('button[type="submit"]');

    // Step 2: Password step with company branding
    await expect(page.locator('#login-password')).toBeVisible();
    await expect(page.getByText(COMPANY_A.name, { exact: true }).first()).toBeVisible();
    await page.fill('#login-password', COMPANY_A.admin.password);
    await page.click('button[type="submit"]');

    // Redirected to dashboard and workspace loaded
    await expect(page).toHaveURL(/\/dashboard/);
    await expect(page.getByText(COMPANY_A.admin.name)).toBeVisible();
  });

  test('should complete two-step login with employee ID identifier', async ({ page }) => {
    await page.goto('/login');

    // Step 1: Identifier lookup with Employee ID
    await expect(page.locator('#login-identifier')).toBeVisible();
    await page.fill('#login-identifier', COMPANY_A.member.employeeId);
    await page.click('button[type="submit"]');

    // Step 2: Password step
    await expect(page.locator('#login-password')).toBeVisible();
    await expect(page.getByText(COMPANY_A.name, { exact: true }).first()).toBeVisible();
    await page.fill('#login-password', COMPANY_A.member.password);
    await page.click('button[type="submit"]');

    // Redirected to dashboard
    await expect(page).toHaveURL(/\/dashboard/);
    await expect(page.getByText(COMPANY_A.member.name)).toBeVisible();
  });

  test('should show error on non-existent identifier', async ({ page }) => {
    await page.goto('/login');

    await page.fill('#login-identifier', 'nonexistent.user@unknown-domain.xyz');
    await page.click('button[type="submit"]');

    // Expect error message
    await expect(page.getByText(/No active account detected|No account detected/i)).toBeVisible();
    // Should stay on Step 1
    await expect(page.locator('#login-identifier')).toBeVisible();
  });

  test('should show error on invalid password', async ({ page }) => {
    await page.goto('/login');

    // Step 1
    await page.fill('#login-identifier', COMPANY_A.admin.email);
    await page.click('button[type="submit"]');

    // Step 2
    await expect(page.locator('#login-password')).toBeVisible();
    await page.fill('#login-password', 'WrongPassword999!');
    await page.click('button[type="submit"]');

    // Expect invalid credentials error
    await expect(page.getByText(/Invalid password\. Please check your credentials/i)).toBeVisible();
    await expect(page).toHaveURL(/\/login/);
  });

  test('should allow switching accounts from password step', async ({ page }) => {
    await page.goto('/login');

    // Step 1
    await page.fill('#login-identifier', COMPANY_A.admin.email);
    await page.click('button[type="submit"]');
    await expect(page.locator('#login-password')).toBeVisible();

    // Click switch account
    await page.click('button:has-text("Switch")');

    // Back to Step 1
    await expect(page.locator('#login-identifier')).toBeVisible();
    await expect(page.locator('#login-identifier')).toHaveValue('admin@alphacorp.io');
  });

  test('should logout successfully and redirect to login', async ({ page }) => {
    await page.goto('/login');

    // Login as Admin
    await page.fill('#login-identifier', COMPANY_A.admin.email);
    await page.click('button[type="submit"]');
    await page.fill('#login-password', COMPANY_A.admin.password);
    await page.click('button[type="submit"]');
    await expect(page).toHaveURL(/\/dashboard/);

    // Click logout button in Navbar
    await page.locator('button[title="Sign Out"]').click();

    // Must be redirected to /login
    await expect(page).toHaveURL(/\/login/);
  });

  test('should redirect unauthenticated users from protected routes', async ({ page }) => {
    // Attempt accessing protected routes directly
    const protectedRoutes = ['/dashboard', '/teams', '/departments', '/standup', '/history'];

    for (const route of protectedRoutes) {
      await page.goto(route);
      await expect(page).toHaveURL(/\/login/);
    }
  });
});
