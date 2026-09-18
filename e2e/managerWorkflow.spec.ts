import { test, expect } from '@playwright/test';
import { seedE2EDatabase, COMPANY_A } from './helpers/seedE2E';

test.describe('Manager End-to-End Workflow', () => {
  test.beforeEach(async () => {
    await seedE2EDatabase();
  });

  test('should display manager analytics, allow team management, and block admin department creation', async ({ page }) => {
    // 1. Manager Login
    await page.goto('/login');
    await page.fill('#login-identifier', COMPANY_A.manager.email);
    await page.click('button[type="submit"]');
    await page.fill('#login-password', COMPANY_A.manager.password);
    await page.click('button[type="submit"]');
    await expect(page).toHaveURL(/\/dashboard/);

    // 2. Verify Manager Dashboard KPI cards and Department intelligence
    await expect(page.getByText('Manager Command Center', { exact: true })).toBeVisible();
    await expect(page.getByText('Team Members')).toBeVisible();
    await expect(page.getByText('Submitted Today')).toBeVisible();

    // 3. Verify Sidebar does NOT show Departments link for Manager
    await expect(page.locator('nav a:has-text("Departments")')).toHaveCount(0);

    // 4. Attempt direct URL navigation to /departments -> Shows Access Denied
    await page.goto('/departments');
    await expect(page.getByText('Access Denied')).toBeVisible();
    await expect(page.getByText(/You do not have administrative privileges/i)).toBeVisible();

    // 5. Navigate to Team Members page
    await page.goto('/teams');
    await expect(page).toHaveURL(/\/teams/);
    await expect(page.getByRole('heading', { name: COMPANY_A.deptName, exact: true })).toBeVisible();

    // 6. Manager can add team member to their own department
    await page.click('button:has-text("Add Employee"), button:has-text("Add Personnel")');
    await expect(page.getByRole('heading', { name: 'Add Employee', exact: true })).toBeVisible();
    await page.fill('input[placeholder="Priya Singh"]', 'Elena Engineering');
    await page.fill('input[placeholder="priya@company.com"]', 'elena@alphacorp.io');
    await page.fill('input[placeholder="Min. 8 characters"]', 'Password123!');
    await page.click('button:has-text("Create Employee Account")');

    // Verify member added
    await expect(page.getByText('Elena Engineering', { exact: true })).toBeVisible();
  });
});
