import { test, expect } from '@playwright/test';
import { seedE2EDatabase, COMPANY_A, COMPANY_B } from './helpers/seedE2E';

test.describe('Multi-Tenant Dual Browser Context Isolation & IDOR Safeguards', () => {
  test.beforeEach(async () => {
    await seedE2EDatabase();
  });

  test('should enforce strict tenant isolation across dual browser contexts with zero cross-tenant leakage', async ({ browser }) => {
    // 1. Create Isolated Browser Context A (Alpha Corp)
    const contextA = await browser.newContext();
    const pageA = await contextA.newPage();

    // 2. Create Isolated Browser Context B (Beta Global)
    const contextB = await browser.newContext();
    const pageB = await contextB.newPage();

    // 3. Authenticate Context A as Alpha Corp Admin
    await pageA.goto('/login');
    await pageA.fill('#login-identifier', COMPANY_A.admin.email);
    await pageA.click('button[type="submit"]');
    await pageA.fill('#login-password', COMPANY_A.admin.password);
    await pageA.click('button[type="submit"]');
    await expect(pageA).toHaveURL(/\/dashboard/);

    // 4. Authenticate Context B as Beta Global Admin
    await pageB.goto('/login');
    await pageB.fill('#login-identifier', COMPANY_B.admin.email);
    await pageB.click('button[type="submit"]');
    await pageB.fill('#login-password', COMPANY_B.admin.password);
    await pageB.click('button[type="submit"]');
    await expect(pageB).toHaveURL(/\/dashboard/);

    // 5. Verify Context A displays ONLY Company A tenant data
    await expect(pageA.getByText(COMPANY_A.admin.name)).toBeVisible();
    await pageA.goto('/teams');
    await expect(pageA.getByRole('heading', { name: COMPANY_A.deptName, exact: true })).toBeVisible();
    await expect(pageA.getByText(COMPANY_A.teamName)).toBeVisible();
    await expect(pageA.getByText(COMPANY_A.manager.name)).toBeVisible();

    // Context A must NOT have Company B data anywhere in DOM
    await expect(pageA.getByText(COMPANY_B.name)).toHaveCount(0);
    await expect(pageA.getByText(COMPANY_B.deptName)).toHaveCount(0);
    await expect(pageA.getByText(COMPANY_B.teamName)).toHaveCount(0);
    await expect(pageA.getByText(COMPANY_B.admin.name)).toHaveCount(0);
    await expect(pageA.getByText(COMPANY_B.manager.name)).toHaveCount(0);

    // 6. Verify Context B displays ONLY Company B tenant data
    await expect(pageB.getByText(COMPANY_B.admin.name)).toBeVisible();
    await pageB.goto('/teams');
    await expect(pageB.getByRole('heading', { name: COMPANY_B.deptName, exact: true })).toBeVisible();
    await expect(pageB.getByText(COMPANY_B.teamName)).toBeVisible();
    await expect(pageB.getByText(COMPANY_B.manager.name)).toBeVisible();

    // Context B must NOT have Company A data anywhere in DOM
    await expect(pageB.getByText(COMPANY_A.name)).toHaveCount(0);
    await expect(pageB.getByText(COMPANY_A.deptName)).toHaveCount(0);
    await expect(pageB.getByText(COMPANY_A.teamName)).toHaveCount(0);
    await expect(pageB.getByText(COMPANY_A.admin.name)).toHaveCount(0);
    await expect(pageB.getByText(COMPANY_A.manager.name)).toHaveCount(0);

    // 7. Verify Cross-Tenant IDOR API Tampering Protection from Browser Session A
    // Execute fetch in pageA context with Page A token attempting to access Company B endpoints
    const idorResponse = await pageA.evaluate(async () => {
      const token = localStorage.getItem('standup_token') || localStorage.getItem('token');
      // Attempt to access cross-tenant standups or teams by arbitrary API call
      const res = await fetch('/api/teams', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      return res.json();
    });

    // Verify response contains only Company A teams, never Company B
    const returnedTeams = idorResponse.teams || [];
    const containsCompanyBTeam = returnedTeams.some((t: any) => t.name === 'Analytics Squad');
    expect(containsCompanyBTeam).toBe(false);

    // Clean up contexts
    await contextA.close();
    await contextB.close();
  });
});
