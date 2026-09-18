import { test, expect } from '@playwright/test';

test.describe('Nginx Reverse Proxy & Production Docker Runtime Verification', () => {
  const NGINX_BASE = 'http://localhost';

  test('should load frontend SPA with production security headers from Nginx', async ({ page }) => {
    const response = await page.goto(`${NGINX_BASE}/login`);
    expect(response).not.toBeNull();
    expect(response!.status()).toBe(200);

    const headers = response!.headers();
    expect(headers['x-frame-options']).toBe('DENY');
    expect(headers['x-content-type-options']).toBe('nosniff');
    expect(headers['referrer-policy']).toBe('strict-origin-when-cross-origin');
    expect(headers['content-security-policy']).toContain("default-src 'self'");

    // Check page rendered
    await expect(page.locator('#login-identifier')).toBeVisible();
  });

  test('should execute full auth and SPA navigation through Nginx reverse proxy', async ({ page }) => {
    // Navigate to registration
    await page.goto(`${NGINX_BASE}/register`);
    await expect(page.locator('input[placeholder="Nexus Technologies"]')).toBeVisible();

    const uniqueId = Date.now();
    const testEmail = `docker.user.${uniqueId}@runtime-test.io`;

    await page.fill('input[placeholder="Nexus Technologies"]', `Runtime Org ${uniqueId}`);
    await page.fill('input[placeholder="Alex Mercer"]', 'Docker Runtime User');
    await page.fill('input[placeholder="alex@nexustech.io"]', testEmail);
    await page.locator('input[type="password"]').first().fill('Password123!');
    await page.locator('input[type="password"]').nth(1).fill('Password123!');

    await page.click('button[type="submit"]');

    // Should redirect to dashboard
    await expect(page).toHaveURL(/.*dashboard/);
    await expect(page.getByText('Docker Runtime User').first()).toBeVisible();

    // Verify SPA routing without full reload
    await page.goto(`${NGINX_BASE}/teams`);
    await expect(page).toHaveURL(/.*teams/);
  });

  test('should proxy API health and readiness endpoints with Request-ID', async ({ request }) => {
    const liveRes = await request.get(`${NGINX_BASE}/api/health/live`);
    expect(liveRes.status()).toBe(200);
    const liveBody = await liveRes.json();
    expect(liveBody.status).toBe('ok');
    expect(liveRes.headers()['x-request-id']).toBeDefined();

    const readyRes = await request.get(`${NGINX_BASE}/api/health`);
    expect(readyRes.status()).toBe(200);
    const readyBody = await readyRes.json();
    expect(readyBody.status).toBe('ok');
    expect(readyBody.database).toBe('connected');
    expect(readyRes.headers()['x-request-id']).toBeDefined();
  });
});
