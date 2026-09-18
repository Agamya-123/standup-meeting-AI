import { test, expect } from '@playwright/test';
import { seedE2EDatabase, COMPANY_A } from './helpers/seedE2E';

test.describe('Role-Based UI Permissions Matrix & Navigation Access Controls', () => {
  test.beforeEach(async () => {
    await seedE2EDatabase();
  });

  test('ADMIN should have full access to navigation, department management, and employee provisioning', async ({ page }) => {
    await page.goto('/login');
    await page.fill('#login-identifier', COMPANY_A.admin.email);
    await page.click('button[type="submit"]');
    await page.fill('#login-password', COMPANY_A.admin.password);
    await page.click('button[type="submit"]');
    await expect(page).toHaveURL(/\/dashboard/);

    // Nav has Departments link
    await expect(page.locator('nav a:has-text("Departments")')).toBeVisible();
    await expect(page.locator('nav a:has-text("Team Members")')).toBeVisible();

    // Direct access to /departments is allowed
    await page.goto('/departments');
    await expect(page.getByText('Organization Departments')).toBeVisible();
    await expect(page.locator('button:has-text("New Dept")')).toBeVisible();

    // Teams page has full creation buttons
    await page.goto('/teams');
    await expect(page.locator('button:has-text("Create Team")')).toBeVisible();
    await expect(page.locator('button:has-text("Add Employee")')).toBeVisible();
  });

  test('MANAGER should have team management access but blocked from department creation and admin routes', async ({ page }) => {
    await page.goto('/login');
    await page.fill('#login-identifier', COMPANY_A.manager.email);
    await page.click('button[type="submit"]');
    await page.fill('#login-password', COMPANY_A.manager.password);
    await page.click('button[type="submit"]');
    await expect(page).toHaveURL(/\/dashboard/);

    // Nav does NOT have Departments link
    await expect(page.locator('nav a:has-text("Departments")')).toHaveCount(0);

    // Direct access to /departments is blocked
    await page.goto('/departments');
    await expect(page.getByText('Access Denied')).toBeVisible();

    // Teams page allows department team management and personnel addition
    await page.goto('/teams');
    await expect(page.locator('button:has-text("Add Personnel")')).toBeVisible();
  });

  test('TEAM_LEAD should have team view and member provisioning restricted to TEAM_MEMBER role only', async ({ page }) => {
    await page.goto('/login');
    await page.fill('#login-identifier', COMPANY_A.lead.email);
    await page.click('button[type="submit"]');
    await page.fill('#login-password', COMPANY_A.lead.password);
    await page.click('button[type="submit"]');
    await expect(page).toHaveURL(/\/dashboard/);

    // Nav does NOT have Departments link
    await expect(page.locator('nav a:has-text("Departments")')).toHaveCount(0);

    // Direct access to /departments is blocked
    await page.goto('/departments');
    await expect(page.getByText('Access Denied')).toBeVisible();

    // Teams page allows adding personnel, but NOT creating new teams
    await page.goto('/teams');
    await expect(page.locator('button:has-text("Add Personnel")')).toBeVisible();
    await expect(page.locator('button:has-text("Create Team")')).toHaveCount(0);
  });

  test('TEAM_MEMBER should have read-only team access, no provisioning buttons, and access to standups', async ({ page }) => {
    await page.goto('/login');
    await page.fill('#login-identifier', COMPANY_A.member.email);
    await page.click('button[type="submit"]');
    await expect(page.locator('#login-password')).toBeVisible();
    await page.fill('#login-password', COMPANY_A.member.password);
    await page.click('button[type="submit"]');
    await expect(page).toHaveURL(/\/dashboard/);

    // Nav does NOT have Departments link
    await expect(page.locator('nav a:has-text("Departments")')).toHaveCount(0);

    // Direct access to /departments is blocked
    await page.goto('/departments');
    await expect(page.getByText('Access Denied')).toBeVisible();

    // Teams page has zero creation/provisioning buttons
    await page.goto('/teams');
    await expect(page.locator('button:has-text("Add Personnel")')).toHaveCount(0);
    await expect(page.locator('button:has-text("Add Employee")')).toHaveCount(0);
    await expect(page.locator('button:has-text("Create Team")')).toHaveCount(0);

    // Member can access Standup and History
    await page.goto('/standup');
    await expect(page.getByText('Daily Standup Check-in')).toBeVisible();

    await page.goto('/history');
    await expect(page.getByText('Standup Submission History')).toBeVisible();
  });
});
