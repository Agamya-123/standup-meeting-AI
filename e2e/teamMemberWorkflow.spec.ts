import { test, expect } from '@playwright/test';
import { seedE2EDatabase, COMPANY_A } from './helpers/seedE2E';

test.describe('Team Member End-to-End Workflow', () => {
  test.beforeEach(async () => {
    await seedE2EDatabase();
  });

  test('should display member overview, enforce UI restrictions, and permit standup submission', async ({ page }) => {
    // 1. Team Member Login
    await page.goto('/login');
    await page.fill('#login-identifier', COMPANY_A.member.email);
    await page.click('button[type="submit"]');
    await page.fill('#login-password', COMPANY_A.member.password);
    await page.click('button[type="submit"]');
    await expect(page).toHaveURL(/\/dashboard/);

    // 2. Verify Member Dashboard & Welcome
    await expect(page.getByText(COMPANY_A.member.name)).toBeVisible();
    await expect(page.getByText("Today's Standup Pending")).toBeVisible();

    // 3. Navigation link checks: Departments is NOT in nav
    await expect(page.locator('nav a:has-text("Departments")')).toHaveCount(0);

    // 4. Attempt direct navigation to /departments -> Shows Access Denied
    await page.goto('/departments');
    await expect(page.getByText('Access Denied')).toBeVisible();

    // 5. Navigate to Teams Page -> Verify read-only access (no Add Personnel / Create Team buttons)
    await page.goto('/teams');
    await expect(page).toHaveURL(/\/teams/);
    await expect(page.getByText(COMPANY_A.teamName)).toBeVisible();
    await expect(page.locator('button:has-text("Add Personnel")')).toHaveCount(0);
    await expect(page.locator('button:has-text("Add Employee")')).toHaveCount(0);
    await expect(page.locator('button:has-text("Create Team")')).toHaveCount(0);
    await expect(page.locator('button:has-text("Add Team")')).toHaveCount(0);

    // 6. Navigate to /standup and submit daily standup
    await page.goto('/standup');
    await expect(page).toHaveURL(/\/standup/);
    await expect(page.getByText('Daily Standup Check-in')).toBeVisible();

    // Fill yesterday accomplished, today focus, select Minor Blocker
    await page.fill('input[placeholder*="Completed authentication module"]', 'Completed unit test coverage for frontend');
    await page.fill('input[placeholder*="Implement manager dashboard"]', 'Implement E2E test suites with Playwright');
    await page.click('button:has-text("Minor Blocker")');
    await page.fill('input[placeholder*="Waiting for production AWS"]', 'Waiting for PR merge to staging');

    // Submit standup
    await page.click('button[type="submit"]');

    // Verify submitted state in feed and in My Standup Form
    await expect(page.getByText('Completed unit test coverage for frontend')).toBeVisible();
    await expect(page.getByText('Implement E2E test suites with Playwright')).toBeVisible();
    await expect(page.getByText('Waiting for PR merge to staging')).toBeVisible();

    await page.click('button:has-text("My Standup Form")');
    await expect(page.getByText("Today's Standup Submitted")).toBeVisible();
  });
});
