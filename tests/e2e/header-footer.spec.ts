import { test, expect } from '@playwright/test';

test.describe('Header & Footer', () => {
  test('header renders logo, nav, and CTAs, footer renders columns', async ({ page }) => {
    await page.goto('/');

    // Header
    const navigation = page.getByRole('navigation', { name: 'Main navigation' });
    await expect(navigation).toBeVisible();
    await expect(page.getByText('SOLON').first()).toBeVisible();
    if ((page.viewportSize()?.width ?? 1280) < 1024) {
      await navigation.getByRole('button', { name: 'Open menu' }).click();
      await expect(navigation.getByRole('link', { name: 'Explore voting' })).toBeVisible();
    } else {
      await expect(navigation.getByRole('button', { name: 'Platform' })).toBeVisible();
      await expect(navigation.getByRole('link', { name: 'Explore voting' })).toBeVisible();
    }

    // Footer
    const siteFooter = page.getByRole('contentinfo');
    await expect(siteFooter).toBeVisible();
    await expect(siteFooter.getByRole('heading', { name: 'Platform' })).toBeVisible();
    await expect(siteFooter.getByRole('heading', { name: 'Explore' })).toBeVisible();
    await expect(siteFooter.getByRole('link', { name: /Source code/ })).toHaveAttribute('href', 'https://github.com/maonakamoto/solon');
  });
});
