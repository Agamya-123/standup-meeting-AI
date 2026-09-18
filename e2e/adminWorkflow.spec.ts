import { test, expect } from '@playwright/test';
import { seedE2EDatabase, COMPANY_A } from './helpers/seedE2E';

test.describe('Admin End-to-End Workflow', () => {
  test.beforeEach(async () => {
    await seedE2EDatabase();
  });

  test('should allow admin to manage departments, teams, and provision employees', async ({ page }) => {
    // 1. Admin Login
    await page.goto('/login');
    await page.fill('#login-identifier', COMPANY_A.admin.email);
    await page.click('button[type="submit"]');
    await page.fill('#login-password', COMPANY_A.admin.password);
    await page.click('button[type="submit"]');
    await expect(page).toHaveURL(/\/dashboard/);

    // 2. Navigate to Departments page
    await page.click('nav a:has-text("Departments")');
    await expect(page).toHaveURL(/\/departments/);
    await expect(page.getByText('Organization Departments')).toBeVisible();

    // 3. Create a New Department
    await page.click('button:has-text("New Dept")');
    await expect(page.getByText('Create Department')).toBeVisible();
    await page.fill('input[placeholder="Engineering"]', 'Platform Engineering');
    await page.fill('textarea[placeholder="Core engineering and product development..."]', 'Infrastructure and cloud platform services');
    await page.click('button:has-text("Create")');

    // Verify Department created and listed
    await expect(page.getByText('Platform Engineering')).toBeVisible();

    // 4. Navigate to Team Members page
    await page.click('nav a:has-text("Team Members")');
    await expect(page).toHaveURL(/\/teams/);

    // 5. Create a New Team in Platform Engineering
    await page.click('button:has-text("Create Team")');
    await expect(page.getByText('Create New Team')).toBeVisible();
    await page.fill('input[placeholder*="Frontend Core, API Platform"]', 'Cloud Architecture');
    await page.fill('textarea[placeholder*="What does this team focus on?"]', 'Kubernetes and AWS platform architecture');
    await page.selectOption('select:has-text("Select Department")', { label: 'Platform Engineering' });
    await page.getByRole('button', { name: 'Create Team', exact: true }).last().click();

    // Verify Team created
    await expect(page.getByText('Cloud Architecture')).toBeVisible();

    // 6. Provision a New Employee
    await page.click('button:has-text("Add Employee")');
    await expect(page.getByRole('heading', { name: 'Add Employee', exact: true })).toBeVisible();
    await page.fill('input[placeholder="Priya Singh"]', 'Carlos CloudArchitect');
    await page.fill('input[placeholder="priya@company.com"]', 'carlos@alphacorp.io');
    await page.fill('input[placeholder*="Auto"]', 'ALP-ENG99');
    await page.fill('input[placeholder="Min. 8 characters"]', 'Password123!');
    await page.selectOption('select:has(option:has-text("Team Lead"))', 'TEAM_LEAD');
    await page.click('button:has-text("Create Employee Account")');

    // Verify employee added
    await expect(page.getByText('Carlos CloudArchitect', { exact: true })).toBeVisible();
  });
});
