import { expect, test } from '@playwright/test';
import { IMPLEMENTED_PAGE_ROUTES } from '../../src/lib/site-config';

for (const route of IMPLEMENTED_PAGE_ROUTES) {
  test(`${route} renders without overflow or browser errors`, async ({ page }) => {
    const browserErrors: string[] = [];
    page.on('console', (message) => {
      if (message.type() === 'error') browserErrors.push(message.text());
    });
    page.on('pageerror', (error) => browserErrors.push(error.message));

    const response = await page.goto(route, { waitUntil: 'networkidle' });

    expect(response?.status(), `${route} should return 200`).toBe(200);
    await expect(page.getByRole('main')).toHaveCount(1);
    await expect(page.locator('h1')).toHaveCount(1);
    await expect(page.locator('h1')).toBeVisible();
    const dimensions = await page.evaluate(() => ({
      documentWidth: document.documentElement.scrollWidth,
      viewportWidth: document.documentElement.clientWidth,
    }));
    expect(dimensions.documentWidth, `${route} should not overflow horizontally`).toBeLessThanOrEqual(dimensions.viewportWidth + 1);
    if (test.info().project.name.startsWith('mobile-')) {
      const clippedControls = await page.locator('a[href], button, input, select, textarea').evaluateAll((controls) => controls.flatMap((control) => {
        const style = window.getComputedStyle(control);
        if (style.display === 'none' || style.visibility === 'hidden') return [];
        const rect = control.getBoundingClientRect();
        if (rect.width === 0 || rect.height === 0) return [];
        if (rect.bottom <= 0 || rect.top >= window.innerHeight || rect.right <= 0 || rect.left >= window.innerWidth) return [];
        const clipped = rect.left < -1 || rect.right > window.innerWidth + 1;
        return clipped ? [{ label: control.textContent?.trim() || control.getAttribute('aria-label') || control.tagName, left: rect.left, right: rect.right }] : [];
      }));
      expect(clippedControls, `${route} should not clip interactive controls`).toEqual([]);
      const undersizedControls = await page.locator('a[href], button, input, select, textarea').evaluateAll((controls) => controls.flatMap((control) => {
        const style = window.getComputedStyle(control);
        if (style.display === 'none' || style.visibility === 'hidden') return [];
        const rect = control.getBoundingClientRect();
        if (rect.width === 0 || rect.height === 0 || rect.bottom <= 0 || rect.top >= window.innerHeight || rect.right <= 0 || rect.left >= window.innerWidth) return [];
        return rect.height < 43.5 ? [{ label: control.textContent?.trim() || control.getAttribute('aria-label') || control.tagName, height: rect.height }] : [];
      }));
      expect(undersizedControls, `${route} should expose 44px mobile targets`).toEqual([]);
    }
    expect(browserErrors, `${route} should not log browser errors`).toEqual([]);
  });
}

test('every rendered internal link targets the implemented route catalog', async ({ page, request }) => {
  const discovered = new Set<string>();

  for (const route of IMPLEMENTED_PAGE_ROUTES) {
    await page.goto(route, { waitUntil: 'domcontentloaded' });
    const hrefs = await page.locator('a[href]').evaluateAll((links) => links.map((link) => link.getAttribute('href')).filter(Boolean) as string[]);
    for (const href of hrefs) {
      expect(href, `placeholder link found on ${route}`).not.toBe('#');
      if (!href.startsWith('/') || href.startsWith('//') || href.startsWith('/#') || href === '#main-content') continue;
      discovered.add(new URL(href, 'http://solon.local').pathname);
    }
  }

  expect([...discovered].sort()).toEqual([...IMPLEMENTED_PAGE_ROUTES].sort());
  for (const route of discovered) {
    const response = await request.get(route);
    expect(response.status(), `${route} should be reachable`).toBe(200);
  }
});

test('public voting selection leads to the honest signed-vote workspace', async ({ page }) => {
  await page.goto('/governance/voting');
  await page.getByRole('button', { name: 'Vote Yes' }).first().click();
  await expect(page.getByRole('status')).toContainText('Yes selected');
  await page.getByRole('link', { name: 'Continue to signed vote' }).first().click();
  await expect(page).toHaveURL(/\/dashboard\/voting$/);
  await expect(page.getByRole('heading', { name: 'Cast a verifiable vote' })).toBeVisible();
});

test('voting workspace preserves the address and never claims an unsigned success', async ({ page }) => {
  await page.goto('/dashboard/voting');
  const address = '1BoatSLRHtKNngkdXEeobR76b53LETtpyT';
  await page.getByLabel('Registered Bitcoin address').fill(address);
  await page.getByRole('button', { name: 'Continue' }).click();
  await expect(page).toHaveURL(new RegExp(`address=${address}`));
  await expect(page.getByText(address)).toBeVisible();
  const yes = page.getByRole('button', { name: 'YES' });
  const sampleMode = await page.getByText(/Sample mode:/).isVisible();
  if (sampleMode) {
    await expect(yes).toBeDisabled();
  } else {
    await yes.click();
    await expect(yes).toHaveAttribute('aria-pressed', 'true');
  }
  await expect(page.getByRole('button', { name: 'Submit signed vote' })).toBeDisabled();
  await expect(page.getByText(/signing is not available/i)).toBeVisible();
});

test('integration guide only advertises shipped API surfaces', async ({ page }) => {
  await page.goto('/integration');
  await expect(page.getByText('/api/bitcoin/wallet/{orgId}').first()).toBeVisible();
  await expect(page.getByText('/api/solon/transparency?orgId={orgId}')).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Read transparency evidence' })).toBeVisible();
  await expect(page.getByText(/does not invent a score/i)).toBeVisible();
  await expect(page.getByText('/api/voting/{sessionId}/cryptographic-vote')).toBeVisible();
  await expect(page.getByText('@solon/sdk')).toHaveCount(0);
  await expect(page.getByText('api.solon.org')).toHaveCount(0);
});

test('mobile navigation and primary controls fit the viewport', async ({ page }, testInfo) => {
  test.skip(!testInfo.project.name.startsWith('mobile-'), 'mobile viewport coverage');
  await page.goto('/');
  await page.getByRole('button', { name: 'Open menu' }).click();
  const menu = page.locator('#mobile-navigation');
  await expect(menu).toBeVisible();
  const menuBox = await menu.boundingBox();
  expect(menuBox?.x).toBeGreaterThanOrEqual(0);
  expect((menuBox?.x ?? 0) + (menuBox?.width ?? 0)).toBeLessThanOrEqual((page.viewportSize()?.width ?? 0) + 1);

  const controls = menu.locator('a, button');
  for (let index = 0; index < await controls.count(); index += 1) {
    const box = await controls.nth(index).boundingBox();
    expect(box?.height ?? 0).toBeGreaterThanOrEqual(44);
  }
});
