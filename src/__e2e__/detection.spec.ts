import { test, expect } from '@playwright/test';

test.describe('Epic Games Free Games Detection', () => {
  test('should load free games page', async ({ page }) => {
    await page.goto('/store/en-US/free-games');

    const heading = page.locator('text=/free games/i');
    await expect(heading).toBeVisible({ timeout: 10000 });
  });

  test('should detect game cards on free games page', async ({ page }) => {
    await page.goto('/store/en-US/free-games');

    const gameCards = page.locator('[data-testid="DiscoverGrid"] [data-component-type="Card"]');
    const count = await gameCards.count();

    expect(count).toBeGreaterThan(0);
  });

  test('should have account menu available', async ({ page }) => {
    await page.goto('/store/en-US/free-games');

    const accountLink = page.locator('a[href*="/account"]');
    await expect(accountLink).toBeVisible({ timeout: 5000 });
  });
});
