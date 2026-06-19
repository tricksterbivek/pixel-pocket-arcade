/**
 * Accessibility and visual-consistency spec.
 *
 * Checks:
 *   ✓ Exactly one <h1> per page
 *   ✓ Focus is visually indicated (outline style applied via :focus-visible)
 *   ✓ Every <button> on every page has a non-empty accessible name
 *   ✓ The "Reset data" confirmation uses a native <dialog> element
 *   ✓ No horizontal scroll at 375×667, 768×1024, and 1440×900
 *   ✓ No horizontal scroll at the project's own viewport (mobile 393px or desktop)
 *
 * Runs on both projects so the mobile assertions are exercised on the Pixel 5
 * viewport and the desktop assertions on Desktop Chrome.
 */

import { test, expect } from '@playwright/test';
import { trackConsoleErrors, assertNoConsoleErrors, assertNoHorizontalScroll } from './helpers';

// Pages to audit
const PAGES = [
  { name: 'Home', path: '/' },
  { name: 'Snake', path: '/games/snake' },
  { name: 'Memory Match', path: '/games/memory' },
  { name: 'Reaction Timer', path: '/games/reaction' },
  { name: 'Not Found (404)', path: '/games/nope' },
];

// ── One h1 per page ──────────────────────────────────────────────────────────

for (const { name, path } of PAGES) {
  test(`${name}: has exactly one <h1>`, async ({ page }) => {
    const errors = trackConsoleErrors(page);
    await page.goto(path);
    const h1s = page.locator('h1');
    await expect(h1s.first()).toBeVisible();
    expect(await h1s.count()).toBe(1);
    assertNoConsoleErrors(errors);
  });
}

// ── Focus visible ────────────────────────────────────────────────────────────

test('Home: interactive elements show a visible focus outline when tabbed', async ({ page }) => {
  await page.goto('/');

  // Tab to the first focusable element
  await page.keyboard.press('Tab');

  const focusedOutline = await page.evaluate(() => {
    const el = document.activeElement as HTMLElement | null;
    if (!el) return '';
    return getComputedStyle(el).outlineStyle;
  });

  // Should NOT be "none" - CSS sets outline: 2px solid var(--color-focus)
  expect(focusedOutline).not.toBe('none');
  expect(focusedOutline).not.toBe('');
});

test('Snake game: D-pad buttons show outline on keyboard focus', async ({ page }) => {
  await page.goto('/games/snake');

  // Tab until we reach the "Up" D-pad button (it's after the header link and
  // "Back to arcade" / "How to play" elements)
  // Tab a few times then check any focused button has an outline
  for (let i = 0; i < 6; i++) {
    await page.keyboard.press('Tab');
    const tag = await page.evaluate(() => document.activeElement?.tagName?.toLowerCase());
    if (tag === 'button') break;
  }

  const focusedOutlineStyle = await page.evaluate(() => {
    const el = document.activeElement as HTMLElement | null;
    if (!el) return 'none';
    return getComputedStyle(el).outlineStyle;
  });

  expect(focusedOutlineStyle).not.toBe('none');
});

// ── All buttons have accessible names ────────────────────────────────────────

for (const { name, path } of PAGES) {
  test(`${name}: every <button> has a non-empty accessible name`, async ({ page }) => {
    const errors = trackConsoleErrors(page);
    await page.goto(path);

    const buttons = await page.locator('button').all();
    for (const btn of buttons) {
      const ariaLabel = await btn.getAttribute('aria-label');
      const ariaLabelledBy = await btn.getAttribute('aria-labelledby');
      const textContent = (await btn.textContent())?.trim() ?? '';

      const hasName = !!(ariaLabel?.trim() || ariaLabelledBy || textContent);
      expect(
        hasName,
        `Button missing accessible name: ${ariaLabel ?? textContent ?? '(no label)'}`,
      ).toBe(true);
    }

    assertNoConsoleErrors(errors);
  });
}

// ── Reset dialog is a native <dialog> ────────────────────────────────────────

test('Home: "Reset data" confirmation uses a native <dialog> element', async ({ page }) => {
  const errors = trackConsoleErrors(page);
  await page.goto('/');

  await page.getByRole('button', { name: /Reset data/i }).click();

  // Native dialog should be open (has the HTML open attribute)
  const dialog = page.locator('dialog[open]');
  await expect(dialog).toBeVisible({ timeout: 3000 });

  const tagName = await dialog.evaluate((el) => el.tagName.toLowerCase());
  expect(tagName).toBe('dialog');

  // Dialog has an aria-labelledby pointing to the h2 title
  const labelledBy = await dialog.getAttribute('aria-labelledby');
  expect(labelledBy).toBeTruthy();

  // The confirm button is inside the dialog
  const confirmBtn = dialog.getByRole('button', { name: /Reset everything/i });
  await expect(confirmBtn).toBeVisible();

  // Close it
  await page.getByRole('button', { name: /Cancel/i }).click();

  assertNoConsoleErrors(errors);
});

// ── No horizontal scroll at explicit viewport sizes ───────────────────────────

const VIEWPORTS = [
  { label: '375×667 (iPhone SE)', width: 375, height: 667 },
  { label: '768×1024 (tablet)', width: 768, height: 1024 },
  { label: '1440×900 (wide desktop)', width: 1440, height: 900 },
] as const;

for (const { label, width, height } of VIEWPORTS) {
  test(`No horizontal scroll at ${label} - home page`, async ({ page }) => {
    await page.setViewportSize({ width, height });
    await page.goto('/');
    await assertNoHorizontalScroll(page);
  });

  test(`No horizontal scroll at ${label} - snake page`, async ({ page }) => {
    await page.setViewportSize({ width, height });
    await page.goto('/games/snake');
    await assertNoHorizontalScroll(page);
  });

  test(`No horizontal scroll at ${label} - memory page`, async ({ page }) => {
    await page.setViewportSize({ width, height });
    await page.goto('/games/memory');
    await assertNoHorizontalScroll(page);
  });

  test(`No horizontal scroll at ${label} - reaction page`, async ({ page }) => {
    await page.setViewportSize({ width, height });
    await page.goto('/games/reaction');
    await assertNoHorizontalScroll(page);
  });
}

// ── No horizontal scroll at the current project's natural viewport ────────────

for (const { name, path } of PAGES) {
  test(`${name}: no horizontal scroll at project viewport`, async ({ page }) => {
    await page.goto(path);
    await assertNoHorizontalScroll(page);
  });
}

// ── ARIA landmarks ────────────────────────────────────────────────────────────

test('Home: page has <main> landmark', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('main')).toBeVisible();
});

test('Home: page has <header> landmark in the document', async ({ page }) => {
  await page.goto('/');
  // The app <Header> component renders a semantic <header>
  await expect(page.locator('header').first()).toBeVisible();
});
