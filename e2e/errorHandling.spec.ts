import { test, expect } from '@playwright/test';
import { seedE2EDatabase, COMPANY_A } from './helpers/seedE2E';

test.describe('Error Handling, Validation, and Information Leakage Prevention', () => {
  test.beforeEach(async () => {
    await seedE2EDatabase();
  });

  test('should handle nonexistent routes with safe redirection without crashes', async ({ page }) => {
    // Login as Admin
    await page.goto('/login');
    await page.fill('#login-identifier', COMPANY_A.admin.email);
    await page.click('button[type="submit"]');
    await page.fill('#login-password', COMPANY_A.admin.password);
    await page.click('button[type="submit"]');
    await expect(page).toHaveURL(/\/dashboard/);

    // Navigate to completely invalid route
    await page.goto('/some/invalid/route/that/does/not/exist');
    // App should gracefully redirect back to /dashboard
    await expect(page).toHaveURL(/\/dashboard/);
    await expect(page.getByText(COMPANY_A.admin.name)).toBeVisible();
  });

  test('should prevent information leakage: no Prisma error codes, stack traces, or file paths exposed in UI', async ({ page }) => {
    // Check login with invalid password
    await page.goto('/login');
    await page.fill('#login-identifier', COMPANY_A.admin.email);
    await page.click('button[type="submit"]');
    await page.fill('#login-password', 'InvalidPass123!');
    await page.click('button[type="submit"]');

    // Should display sanitized message
    await expect(page.getByText(/Invalid password|Invalid credentials/i)).toBeVisible();

    // Verify raw database / framework traces are NOT present in the DOM
    const bodyContent = await page.locator('body').innerText();
    expect(bodyContent).not.toContain('P2002');
    expect(bodyContent).not.toContain('P2025');
    expect(bodyContent).not.toContain('PrismaClient');
    expect(bodyContent).not.toContain('node_modules');
    expect(bodyContent).not.toContain('SQLITE_');
    expect(bodyContent).not.toContain('Error:');
  });

  test('should display client-side validation errors when required fields are missing in forms', async ({ page }) => {
    // Login as Member
    await page.goto('/login');
    await page.fill('#login-identifier', COMPANY_A.member.email);
    await page.click('button[type="submit"]');
    await page.fill('#login-password', COMPANY_A.member.password);
    await page.click('button[type="submit"]');
    await expect(page).toHaveURL(/\/dashboard/);

    // Go to standup form
    await page.goto('/standup');
    await expect(page.getByText('Daily Standup Check-in')).toBeVisible();

    // Clear yesterday accomplished input and try to submit
    const yesterdayInput = page.locator('input[placeholder*="Completed authentication module"]');
    await yesterdayInput.fill('');
    await page.click('button[type="submit"]');

    // Should display validation error
    await expect(page.getByText(/Please add at least one accomplishment for yesterday/i)).toBeVisible();
  });
});
