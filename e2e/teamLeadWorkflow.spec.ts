import { test, expect } from '@playwright/test';
import { seedE2EDatabase, COMPANY_A } from './helpers/seedE2E';

test.describe('Team Lead End-to-End Workflow', () => {
  test.beforeEach(async () => {
    await seedE2EDatabase();
  });

  test('should allow team lead to view team roster, provision members within role limit, and block admin routes', async ({ page }) => {
    // 1. Team Lead Login
    await page.goto('/login');
    await page.fill('#login-identifier', COMPANY_A.lead.email);
    await page.click('button[type="submit"]');
    await page.fill('#login-password', COMPANY_A.lead.password);
    await page.click('button[type="submit"]');
    await expect(page).toHaveURL(/\/dashboard/);

    // 2. Lead can see workspace dashboard
    await expect(page.getByText(COMPANY_A.lead.name)).toBeVisible();

    // 3. Departments link should NOT be present in navigation
    await expect(page.locator('nav a:has-text("Departments")')).toHaveCount(0);

    // 4. Attempt direct navigation to /departments -> Shows Access Denied
    await page.goto('/departments');
    await expect(page.getByText('Access Denied')).toBeVisible();
    await expect(page.getByText(/You do not have administrative privileges/i)).toBeVisible();

    // 5. Navigate to Teams Page
    await page.goto('/teams');
    await expect(page).toHaveURL(/\/teams/);
    await expect(page.getByText(COMPANY_A.teamName)).toBeVisible();
    await expect(page.getByText(COMPANY_A.member.name)).toBeVisible();

    // 6. Team Lead can add a Team Member
    await page.click('button:has-text("Add Personnel"), button:has-text("Add Employee")');
    await expect(page.getByRole('heading', { name: 'Add Employee', exact: true })).toBeVisible();

    // Verify role options: Team Lead cannot provision Admins or Managers
    const roleSelect = page.locator('select:has(option:has-text("Team Member"))');
    await expect(roleSelect).toBeVisible();
    await expect(roleSelect.locator('option[value="ADMIN"]')).toHaveCount(0);
    await expect(roleSelect.locator('option[value="MANAGER"]')).toHaveCount(0);

    // Fill employee details
    await page.fill('input[placeholder="Priya Singh"]', 'Tanya TestMember');
    await page.fill('input[placeholder="priya@company.com"]', 'tanya@alphacorp.io');
    await page.fill('input[placeholder="Min. 8 characters"]', 'Password123!');
    await page.click('button:has-text("Create Employee Account")');

    // Verify new member is listed in team roster
    await expect(page.getByText('Tanya TestMember', { exact: true })).toBeVisible();
  });
});
