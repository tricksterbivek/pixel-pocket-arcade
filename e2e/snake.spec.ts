/**
 * Snake game spec - idle overlay, keyboard direction, D-pad direction,
 * pause/resume, and no console errors.
 *
 * Runs on both `desktop` (Desktop Chrome) and `mobile` (Pixel 5) projects.
 *
 * Key DOM facts:
 *   - Canvas:       role="img"  aria-label="Snake game board"
 *   - D-pad btns:  aria-label "Up" | "Down" | "Left" | "Right"
 *   - Center btn:  aria-label "Pause" | "Resume"
 *   - Restart btn: text "Restart"
 *   - Idle overlay: text "Press an arrow key or D-pad to start"
 */

import { test, expect } from '@playwright/test';
import { trackConsoleErrors, assertNoConsoleErrors, assertNoHorizontalScroll } from './helpers';

test.beforeEach(async ({ page }) => {
  await page.goto('/games/snake');
});

test('shows canvas board and idle overlay on load', async ({ page }) => {
  const errors = trackConsoleErrors(page);

  // Canvas with correct ARIA role
  await expect(page.getByRole('img', { name: /Snake game board/i })).toBeVisible();

  // Idle overlay instructs the player
  await expect(page.getByText(/Press an arrow key or D-pad to start/i)).toBeVisible();

  // D-pad is rendered
  await expect(page.getByRole('button', { name: 'Up' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Down' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Left' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Right' })).toBeVisible();

  await assertNoHorizontalScroll(page);
  assertNoConsoleErrors(errors);
});

test('ArrowRight key starts the game and removes the idle overlay', async ({ page }) => {
  const errors = trackConsoleErrors(page);

  // Verify idle state first
  await expect(page.getByText(/Press an arrow key or D-pad to start/i)).toBeVisible();

  // Press ArrowRight to start
  await page.keyboard.press('ArrowRight');

  // Idle overlay should disappear (game is now playing)
  await expect(page.getByText(/Press an arrow key or D-pad to start/i)).not.toBeVisible({
    timeout: 3000,
  });

  assertNoConsoleErrors(errors);
});

test('ArrowUp key starts the game from idle', async ({ page }) => {
  await page.keyboard.press('ArrowUp');
  await expect(page.getByText(/Press an arrow key or D-pad to start/i)).not.toBeVisible({
    timeout: 3000,
  });
});

test('D-pad Up button starts game from idle and removes overlay', async ({ page }) => {
  const errors = trackConsoleErrors(page);

  await expect(page.getByText(/Press an arrow key or D-pad to start/i)).toBeVisible();

  // Tap the D-pad Up button (touch-friendly path - pointer events)
  await page.getByRole('button', { name: 'Up' }).click();

  await expect(page.getByText(/Press an arrow key or D-pad to start/i)).not.toBeVisible({
    timeout: 3000,
  });

  assertNoConsoleErrors(errors);
});

test('D-pad direction buttons are all present and enabled', async ({ page }) => {
  for (const dir of ['Up', 'Down', 'Left', 'Right']) {
    const btn = page.getByRole('button', { name: dir });
    await expect(btn).toBeVisible();
    await expect(btn).toBeEnabled();
  }
});

test('D-pad Down button changes direction while game is running', async ({ page }) => {
  const errors = trackConsoleErrors(page);

  // Start game with ArrowRight (snake moves right initially)
  await page.keyboard.press('ArrowRight');
  await expect(page.getByText(/Press an arrow key or D-pad to start/i)).not.toBeVisible({
    timeout: 3000,
  });

  // Tap D-pad Down - should not crash or show an error overlay
  await page.getByRole('button', { name: 'Down' }).click();

  // Game is still running - no "Game Over" alert yet
  const gameOverAlert = page.getByRole('alert');
  // Give one tick for any potential crash to appear
  await page.waitForTimeout(200);
  expect(await gameOverAlert.count()).toBe(0);

  assertNoConsoleErrors(errors);
});

test('Space key pauses and resumes the game', async ({ page }) => {
  const errors = trackConsoleErrors(page);

  // IMPORTANT: The Snake game is lazy-loaded.  We must wait for the idle
  // overlay to be visible (= component mounted, keydown listener attached)
  // before pressing any key, otherwise the key events are unhandled and the
  // phase stays 'idle', making toggle-pause a no-op.
  await expect(page.getByText(/Press an arrow key or D-pad to start/i)).toBeVisible({
    timeout: 10_000,
  });

  // Start playing
  await page.keyboard.press('ArrowRight');
  await expect(page.getByText(/Press an arrow key or D-pad to start/i)).not.toBeVisible({
    timeout: 3000,
  });

  // Pause - the overlay text is unique; /Paused/i is ambiguous (also matches status badge)
  await page.keyboard.press('Space');
  await expect(page.getByText(/Paused - Space/i)).toBeVisible({ timeout: 3000 });

  // Resume
  await page.keyboard.press('Space');
  await expect(page.getByText(/Paused - Space/i)).not.toBeVisible({ timeout: 3000 });

  assertNoConsoleErrors(errors);
});

test('Restart button resets to idle overlay', async ({ page }) => {
  const errors = trackConsoleErrors(page);

  // Start game
  await page.keyboard.press('ArrowRight');
  await expect(page.getByText(/Press an arrow key or D-pad to start/i)).not.toBeVisible({
    timeout: 3000,
  });

  // Restart
  await page.getByRole('button', { name: /Restart/i }).click();

  // Idle overlay should reappear
  await expect(page.getByText(/Press an arrow key or D-pad to start/i)).toBeVisible({
    timeout: 3000,
  });

  assertNoConsoleErrors(errors);
});
