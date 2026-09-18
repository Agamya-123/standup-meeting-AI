import { test, expect } from '@playwright/test';
import { seedE2EDatabase, COMPANY_A } from './helpers/seedE2E';

test.describe('Standup Lifecycle & Smart Interactive Form Journey', () => {
  test.beforeEach(async () => {
    await seedE2EDatabase();
  });

  test('should support smart templates, preview tab, blocker levels, submission, editing, and history audit', async ({ page }) => {
    // 1. Member Login
    await page.goto('/login');
    await page.fill('#login-identifier', COMPANY_A.member.email);
    await page.click('button[type="submit"]');
    await page.fill('#login-password', COMPANY_A.member.password);
    await page.click('button[type="submit"]');
    await expect(page).toHaveURL(/\/dashboard/);

    // 2. Navigate to Standup Check-in
    await page.goto('/standup');
    await expect(page).toHaveURL(/\/standup/);
    await expect(page.getByText('Daily Standup Check-in')).toBeVisible();

    // 3. Test Smart Template Auto-Populate
    await page.click('button:has-text("Full-Stack Feature")');
    await expect(page.locator('input[value="Built responsive UI layout & components with Tailwind CSS"]')).toBeVisible();
    await expect(page.locator('input[value="Connect frontend with backend REST API endpoints"]')).toBeVisible();

    // 4. Test Live Preview Tab
    await page.click('button:has-text("Preview")');
    await expect(page.getByText('Live Preview (How your card looks to teammates):')).toBeVisible();
    await expect(page.getByText('Built responsive UI layout & components with Tailwind CSS')).toBeVisible();
    await expect(page.getByText('Connect frontend with backend REST API endpoints')).toBeVisible();

    // Switch back to Editor Tab
    await page.click('button:has-text("Editor")');

    // 5. Test Adding Custom Bullets and Setting Critical Blocker
    await page.click('button:has-text("Add Another Accomplishment")');
    const yesterdayInputs = page.locator('input[placeholder*="Completed authentication module"]');
    await yesterdayInputs.last().fill('Verified security headers and rate limits');

    await page.click('button:has-text("Critical Blocker")');
    await page.fill('input[placeholder*="Waiting for production AWS"]', 'Database connection pool saturation in staging');

    // 6. Submit Standup
    await page.click('button[type="submit"]');

    // 7. Verify Submitted View in My Standup Form
    await page.click('button:has-text("My Standup Form")');
    await expect(page.getByText("Today's Standup Submitted")).toBeVisible();
    await expect(page.getByText('Verified security headers and rate limits')).toBeVisible();
    await expect(page.getByText('Critical Blocker')).toBeVisible();
    await expect(page.getByText('Database connection pool saturation in staging')).toBeVisible();

    // 8. Test In-Place Edit Submission
    await page.click('button:has-text("Edit Submission")');
    await expect(page.getByText("Edit Today's Standup")).toBeVisible();

    // Change blocker level to All Clear (NONE)
    await page.click('button:has-text("No Blocker (All Clear)")');
    await page.click('button[type="submit"]');

    // Verify Updated Standup shows All Clear
    await page.click('button:has-text("My Standup Form")');
    await expect(page.getByText("Today's Standup Submitted")).toBeVisible();
    await expect(page.getByText('No Active Blocker')).toBeVisible();

    // 9. Navigate to History Page and Verify Audit Trail
    await page.goto('/history');
    await expect(page).toHaveURL(/\/history/);
    await expect(page.getByText('Standup Submission History')).toBeVisible();
    // History should render seeded history entry (from 2026-09-17)
    await expect(page.getByText('Configured database indexes')).toBeVisible();
  });
});
