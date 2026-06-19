/**
 * Reaction Timer spec - "too soon" penalty, full 5-round session, keyboard
 * activation (Space), and no console errors.
 *
 * Key DOM facts:
 *   - The whole target is a single <button> whose aria-label tracks the phase:
 *       idle:      "Tap to Start. Click · Space · Touch"
 *       waiting:   "Wait.... Round N of 5"
 *       ready:     "GO!. React now!"
 *       result:    "<ms> ms. Tap for next round"
 *       tooSoon:   "Too Soon!. Tap to retry this round"
 *       completed: "<avg> ms. Session average"  (or "New best average!")
 *   - The target uses onPointerDown (not onClick); Playwright .click() fires
 *     pointerdown so it works correctly.
 *   - The random wait is 1 000-3 000 ms; tests wait for the aria-label change
 *     rather than a fixed delay.
 */

import { test, expect } from '@playwright/test';
import { trackConsoleErrors, assertNoConsoleErrors, assertNoHorizontalScroll } from './helpers';

// Selectors derived from the component's aria-label templates
const TARGET = (page: import('@playwright/test').Page) =>
  page.getByRole('button', {
    name: /Tap to Start|Wait|GO!|ms\.|Too Soon|Session average|New best/i,
  });

test.beforeEach(async ({ page }) => {
  await page.goto('/games/reaction');
});

// ── Basic page ──────────────────────────────────────────────────────────────

test('shows the target button and h1 on load', async ({ page }) => {
  const errors = trackConsoleErrors(page);

  await expect(page.locator('h1')).toContainText('Reaction Timer');
  await expect(page.getByRole('button', { name: /Tap to Start/i })).toBeVisible();

  await assertNoHorizontalScroll(page);
  assertNoConsoleErrors(errors);
});

// ── Too Soon penalty ────────────────────────────────────────────────────────

test('clicking during "Wait..." phase shows "Too Soon!"', async ({ page }) => {
  const errors = trackConsoleErrors(page);

  // Click to start the round (idle → waiting)
  await page.getByRole('button', { name: /Tap to Start/i }).click();

  // Wait for the button to enter the "waiting" phase
  const waitingButton = page.getByRole('button', { name: /Wait/i });
  await expect(waitingButton).toBeVisible({ timeout: 3000 });

  // Click again IMMEDIATELY while still in waiting → Too Soon
  await waitingButton.click();

  // "Too Soon!" headline should appear in the target button
  await expect(page.getByRole('button', { name: /Too Soon/i })).toBeVisible({ timeout: 3000 });

  assertNoConsoleErrors(errors);
});

test('Too Soon allows retry - clicking "Tap to retry" re-arms the round', async ({ page }) => {
  // Get to Too Soon state
  await page.getByRole('button', { name: /Tap to Start/i }).click();
  await expect(page.getByRole('button', { name: /Wait/i })).toBeVisible({ timeout: 3000 });
  await page.getByRole('button', { name: /Wait/i }).click();
  await expect(page.getByRole('button', { name: /Too Soon/i })).toBeVisible({ timeout: 3000 });

  // Clicking the Too Soon button re-arms → goes back to waiting
  await page.getByRole('button', { name: /Too Soon/i }).click();
  await expect(page.getByRole('button', { name: /Wait/i })).toBeVisible({ timeout: 3000 });
});

// ── Full 5-round session ────────────────────────────────────────────────────

test('completing 5 valid rounds shows session average', async ({ page }) => {
  // Each round waits up to 3 s for the random timer → allow 60 s total.
  test.setTimeout(60_000);

  const errors = trackConsoleErrors(page);

  // Round 1: start from idle
  await page.getByRole('button', { name: /Tap to Start/i }).click();
  await expect(page.getByRole('button', { name: /GO!/i })).toBeVisible({ timeout: 5000 });
  await page.getByRole('button', { name: /GO!/i }).click();

  // Rounds 2-5: from result, click to arm the next round, wait for GO!, react
  for (let round = 2; round <= 5; round++) {
    // After clicking GO!, phase → result (round 1-4) or completed (round 5)
    // For rounds 1-4 we land on "result" with "Tap for next round"
    // For round 5 we land directly on "completed"
    if (round <= 5) {
      const nextOrDone = page.getByRole('button', {
        name: /Tap for next round|Session average|New best/i,
      });
      await expect(nextOrDone).toBeVisible({ timeout: 5000 });

      // If already completed (shouldn't happen before round 5 tap) we're done
      const label = await nextOrDone.getAttribute('aria-label');
      if (label && (label.includes('Session average') || label.includes('New best'))) break;

      // Arm the next round
      await nextOrDone.click();
      await expect(page.getByRole('button', { name: /GO!/i })).toBeVisible({ timeout: 5000 });
      await page.getByRole('button', { name: /GO!/i }).click();
    }
  }

  // After 5 rounds the button shows the session average
  await expect(
    page.getByRole('button', { name: /Session average|New best average/i }),
  ).toBeVisible({ timeout: 5000 });

  // Stats panel should show a numeric "Best avg" (reaction result was recorded)
  await expect(page.getByText(/Best avg/i)).toBeVisible();

  assertNoConsoleErrors(errors);
});

// ── Keyboard activation ─────────────────────────────────────────────────────

test('Space key activates the target (idle → waiting)', async ({ page }) => {
  const errors = trackConsoleErrors(page);

  // Focus the target button then press Space
  await page.getByRole('button', { name: /Tap to Start/i }).focus();
  await page.keyboard.press('Space');

  // Should enter waiting phase
  await expect(page.getByRole('button', { name: /Wait/i })).toBeVisible({ timeout: 3000 });

  assertNoConsoleErrors(errors);
});

test('Space key triggers Too Soon when pressed during waiting', async ({ page }) => {
  // Start the round with a pointer click
  await page.getByRole('button', { name: /Tap to Start/i }).click();
  const waitBtn = page.getByRole('button', { name: /Wait/i });
  await expect(waitBtn).toBeVisible({ timeout: 3000 });

  // Focus and press Space while waiting
  await waitBtn.focus();
  await page.keyboard.press('Space');

  await expect(page.getByRole('button', { name: /Too Soon/i })).toBeVisible({ timeout: 3000 });
});

// ── New Game (restart) ──────────────────────────────────────────────────────

test('"New Game" button resets to idle state', async ({ page }) => {
  const errors = trackConsoleErrors(page);

  // Start a round so we're not in idle
  await page.getByRole('button', { name: /Tap to Start/i }).click();
  await expect(page.getByRole('button', { name: /Wait/i })).toBeVisible({ timeout: 3000 });

  // Click New Game
  await page.getByRole('button', { name: 'New Game' }).click();

  // Should reset to idle
  await expect(page.getByRole('button', { name: /Tap to Start/i })).toBeVisible({ timeout: 3000 });

  assertNoConsoleErrors(errors);
});
