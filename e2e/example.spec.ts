import { test, expect } from '@playwright/test';

test.describe('Home Page', () => {
  test('should redirect to dashboard', async ({ page }) => {
    await page.goto('/');
    
    // Wait for redirect to complete
    await page.waitForURL('**/dashboard', { timeout: 5000 });
    
    // Verify we're on the dashboard
    expect(page.url()).toContain('/dashboard');
  });
});

test.describe('Navigation', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to dashboard first
    await page.goto('/dashboard');
  });

  test('should have accessible navigation', async ({ page }) => {
    // Check if navigation elements are present
    // Note: Adjust selectors based on your actual navigation structure
    const nav = page.locator('nav');
    await expect(nav).toBeVisible();
  });
});

