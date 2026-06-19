/**
 * Persistence spec — settings and records survive a page reload; the
 * "Reset data" flow clears everything and restores empty state.
 *
 * SEEDING STRATEGY
 * ─────────────────
 * We never use `addInitScript` for data that should survive a reload, because
 * `addInitScript` scripts are injected on EVERY navigation, including
 * `page.reload()`.  If we seeded via addInitScript and then the user toggled
 * a setting, a reload would re-inject the original seed and overwrite the
 * change — the test would pass but not test real persistence.
 *
 * Instead, for tests that need pre-existing records:
 *   1. `page.goto('/')` — app mounts with default state.
 *   2. `page.evaluate(...)` — write to localStorage (app already mounted).
 *   3. `page.reload()` — app re-mounts, reads the seeded localStorage.
 *   4. Assert data is visible.
 *   5. `page.reload()` again — confirm persistence.
 *
 * Key DOM facts:
 *   Sound toggle:   role="switch"  text = "Sound on" | "Sound off"
 *   Best labels:    "Score N" | "N moves, …" | "Avg N ms"
 *   Reset button:   text "Reset data"
 *   Confirm dialog: native <dialog>  confirm btn = "Reset everything"
 *   Empty state:    "No games played yet. Pick a game above to start."
 */

import { test, expect } from '@playwright/test';
import {
  trackConsoleErrors,
  assertNoConsoleErrors,
  SEEDED_ARCADE_STATE,
  STORAGE_KEY,
} from './helpers';

/** Write state into localStorage and reload so ArcadeProvider picks it up. */
async function seedAndReload(
  page: import('@playwright/test').Page,
  data: typeof SEEDED_ARCADE_STATE,
) {
  await page.evaluate(
    ({ key, state }) => localStorage.setItem(key, JSON.stringify(state)),
    { key: STORAGE_KEY, state: data },
  );
  await page.reload();
}

// ── Sound toggle persistence ─────────────────────────────────────────────────

test('toggling sound off persists after reload', async ({ page }) => {
  const errors = trackConsoleErrors(page);
  await page.goto('/');

  // Default state: sound is on
  await expect(page.getByRole('switch')).toHaveText(/Sound on/i);

  // Toggle sound off
  await page.getByRole('switch').click();
  await expect(page.getByRole('switch')).toHaveText(/Sound off/i);

  // Reload — ArcadeProvider re-reads localStorage
  await page.reload();

  // Setting must survive the reload
  await expect(page.getByRole('switch')).toHaveText(/Sound off/i);

  assertNoConsoleErrors(errors);
});

test('toggling sound on (after off) persists after reload', async ({ page }) => {
  const errors = trackConsoleErrors(page);
  await page.goto('/');

  // Toggle off then on in the same session (tests the on→off→on round-trip)
  await page.getByRole('switch').click(); // on → off
  await expect(page.getByRole('switch')).toHaveText(/Sound off/i);

  await page.getByRole('switch').click(); // off → on
  await expect(page.getByRole('switch')).toHaveText(/Sound on/i);

  // After reload, sound should still be on
  await page.reload();
  await expect(page.getByRole('switch')).toHaveText(/Sound on/i);

  assertNoConsoleErrors(errors);
});

// ── Records persistence ──────────────────────────────────────────────────────

test('game records survive a page reload', async ({ page }) => {
  const errors = trackConsoleErrors(page);
  await page.goto('/');

  // Seed via evaluate (after initial mount), then reload so the app reads it
  await seedAndReload(page, SEEDED_ARCADE_STATE);

  // Snake: "Score 42" (appears in both the card and recent plays — use first())
  await expect(page.getByText('Score 42').first()).toBeVisible();
  // Memory: "12 moves, 30s" — formatElapsed(30000) = "30s"
  await expect(page.getByText(/12 moves/i)).toBeVisible();
  // Reaction: "Avg 280 ms"
  await expect(page.getByText('Avg 280 ms')).toBeVisible();

  // Second reload — records must still be there
  await page.reload();

  await expect(page.getByText('Score 42').first()).toBeVisible();
  await expect(page.getByText(/12 moves/i)).toBeVisible();
  await expect(page.getByText('Avg 280 ms')).toBeVisible();

  assertNoConsoleErrors(errors);
});

test('recent plays list persists after reload', async ({ page }) => {
  const errors = trackConsoleErrors(page);
  await page.goto('/');

  await seedAndReload(page, SEEDED_ARCADE_STATE);

  // The seeded state has one Snake play in the recent-plays list
  // "Score 42" appears in recent-plays span (and the card Best label)
  await expect(page.getByText('Score 42').first()).toBeVisible();

  await page.reload();
  await expect(page.getByText('Score 42').first()).toBeVisible();

  assertNoConsoleErrors(errors);
});

// ── Reset flow ───────────────────────────────────────────────────────────────

test('"Reset data" + "Reset everything" clears records and shows empty state', async ({
  page,
}) => {
  const errors = trackConsoleErrors(page);
  await page.goto('/');

  await seedAndReload(page, SEEDED_ARCADE_STATE);

  // Records are visible before reset
  await expect(page.getByText('Score 42').first()).toBeVisible();

  // Open the reset confirm dialog
  await page.getByRole('button', { name: /Reset data/i }).click();

  // A native <dialog> should appear
  const dialog = page.locator('dialog[open]');
  await expect(dialog).toBeVisible({ timeout: 3000 });

  // The dialog uses a real <dialog> element (not a div)
  const tagName = await dialog.evaluate((el) => el.tagName.toLowerCase());
  expect(tagName).toBe('dialog');

  // Confirm reset
  await page.getByRole('button', { name: 'Reset everything' }).click();

  // Dialog closes
  await expect(dialog).not.toBeVisible({ timeout: 3000 });

  // All best records reset to "No record yet"
  await expect(page.getByText('No record yet')).toHaveCount(3, { timeout: 3000 });

  // Empty recent plays
  await expect(page.getByText(/No games played yet/i)).toBeVisible();

  assertNoConsoleErrors(errors);
});

test('"Reset data" dialog can be cancelled — records stay intact', async ({ page }) => {
  const errors = trackConsoleErrors(page);
  await page.goto('/');

  await seedAndReload(page, SEEDED_ARCADE_STATE);
  await expect(page.getByText('Score 42').first()).toBeVisible();

  // Open the dialog, then cancel
  await page.getByRole('button', { name: /Reset data/i }).click();
  const dialog = page.locator('dialog[open]');
  await expect(dialog).toBeVisible({ timeout: 3000 });

  await page.getByRole('button', { name: /Cancel/i }).click();
  await expect(dialog).not.toBeVisible({ timeout: 3000 });

  // Records unchanged
  await expect(page.getByText('Score 42').first()).toBeVisible();

  assertNoConsoleErrors(errors);
});

test('after reset, reloading the page still shows empty state', async ({ page }) => {
  const errors = trackConsoleErrors(page);
  await page.goto('/');

  await seedAndReload(page, SEEDED_ARCADE_STATE);

  // Perform reset
  await page.getByRole('button', { name: /Reset data/i }).click();
  await expect(page.locator('dialog[open]')).toBeVisible({ timeout: 3000 });
  await page.getByRole('button', { name: 'Reset everything' }).click();
  await expect(page.getByText(/No games played yet/i)).toBeVisible({ timeout: 3000 });

  // Reload — resetArcade() removed the localStorage key, so app boots to defaults
  await page.reload();
  await expect(page.getByText(/No games played yet/i)).toBeVisible();
  await expect(page.getByText('No record yet')).toHaveCount(3);

  assertNoConsoleErrors(errors);
});
