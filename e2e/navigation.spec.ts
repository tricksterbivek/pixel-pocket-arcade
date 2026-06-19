/**
 * Navigation spec - home page structure, every game link, back navigation,
 * and the 404 not-found route.
 *
 * Runs on both `desktop` (Desktop Chrome) and `mobile` (Pixel 5) projects.
 */

import { test, expect } from '@playwright/test';
import { trackConsoleErrors, assertNoConsoleErrors, assertNoHorizontalScroll } from './helpers';

// ---------------------------------------------------------------------------
// Home page
// ---------------------------------------------------------------------------

test.describe('Home page', () => {
  test('renders h1, three game cards, and no console errors', async ({ page }) => {
    const errors = trackConsoleErrors(page);
    await page.goto('/');

    // Exactly one h1
    await expect(page.locator('h1')).toBeVisible();
    expect(await page.locator('h1').count()).toBe(1);

    // All three game cards (link elements) are present
    await expect(page.locator('a[href="/games/snake"]')).toBeVisible();
    await expect(page.locator('a[href="/games/memory"]')).toBeVisible();
    await expect(page.locator('a[href="/games/reaction"]')).toBeVisible();

    // Sound switch present
    await expect(page.getByRole('switch')).toBeVisible();

    // Header link back to home is accessible
    await expect(
      page.getByRole('link', { name: /Pixel Pocket Arcade/i }),
    ).toBeVisible();

    // No horizontal scroll on load
    await assertNoHorizontalScroll(page);

    assertNoConsoleErrors(errors);
  });

  test('fresh state shows "No games played yet" and "No record yet" for all games', async ({
    page,
  }) => {
    await page.goto('/');
    // Empty recent plays
    await expect(page.getByText('No games played yet')).toBeVisible();
    // All four game cards show "No record yet" (default best labels)
    const noRecordTexts = page.getByText('No record yet');
    expect(await noRecordTexts.count()).toBe(4);
  });
});

// ---------------------------------------------------------------------------
// Game navigation (home → game → back)
// ---------------------------------------------------------------------------

for (const { name, href, h1 } of [
  { name: 'Snake', href: '/games/snake', h1: 'Snake' },
  { name: 'Memory Match', href: '/games/memory', h1: 'Memory Match' },
  { name: 'Reaction Timer', href: '/games/reaction', h1: 'Reaction Timer' },
]) {
  test(`navigates from home to ${name} and back`, async ({ page }) => {
    const errors = trackConsoleErrors(page);
    await page.goto('/');

    // Click the game card link
    await page.locator(`a[href="${href}"]`).click();
    await expect(page).toHaveURL(href);

    // Game page has exactly one h1 with the game title
    const h1Locator = page.locator('h1');
    await expect(h1Locator).toBeVisible();
    await expect(h1Locator).toContainText(h1);
    expect(await h1Locator.count()).toBe(1);

    // No horizontal scroll on game page
    await assertNoHorizontalScroll(page);

    // Back to arcade link returns to home
    await page.getByRole('link', { name: /Back to arcade/i }).click();
    await expect(page).toHaveURL('/');

    assertNoConsoleErrors(errors);
  });
}

// ---------------------------------------------------------------------------
// 404 not-found route
// ---------------------------------------------------------------------------

test('unknown route shows 404 page with "Back to arcade" link', async ({ page }) => {
  const errors = trackConsoleErrors(page);
  await page.goto('/games/nope');

  // Should land on the not-found page, NOT redirect away
  await expect(page).toHaveURL('/games/nope');

  // Visible 404 indicator
  await expect(page.getByText('404')).toBeVisible();
  await expect(page.locator('h1')).toContainText(/not found/i);

  // Exactly one h1
  expect(await page.locator('h1').count()).toBe(1);

  // Recovery link
  const backLink = page.getByRole('link', { name: /Back to arcade/i });
  await expect(backLink).toBeVisible();
  await backLink.click();
  await expect(page).toHaveURL('/');

  assertNoConsoleErrors(errors);
});
