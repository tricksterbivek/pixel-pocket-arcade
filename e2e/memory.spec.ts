/**
 * Memory Match spec — card flipping, matching pairs, mismatch/lock flow,
 * "New Game" restart, and no console errors.
 *
 * Key DOM facts:
 *   - Face-down card:  button  aria-label="Card N, face down"
 *   - Face-up card:    button  aria-label="<emoji>"
 *   - Matched card:    button  aria-label="<emoji>, matched"
 *   - New Game button: text "New Game"
 *
 * Because the grid is randomly shuffled we use a DOM-peek helper that reads
 * the hidden front-face emoji spans to locate a matching pair before flipping.
 */

import { test, expect } from '@playwright/test';
import {
  trackConsoleErrors,
  assertNoConsoleErrors,
  assertNoHorizontalScroll,
  findMatchingPairCardNumbers,
} from './helpers';

test.beforeEach(async ({ page }) => {
  await page.goto('/games/memory');
});

// ── Initial state ──────────────────────────────────────────────────────────

test('shows 16 face-down cards on load', async ({ page }) => {
  const errors = trackConsoleErrors(page);

  const faceDownCards = page.getByRole('button', { name: /Card \d+, face down/ });
  await expect(faceDownCards.first()).toBeVisible();
  expect(await faceDownCards.count()).toBe(16);

  await assertNoHorizontalScroll(page);
  assertNoConsoleErrors(errors);
});

test('has exactly one h1 with "Memory Match"', async ({ page }) => {
  await expect(page.locator('h1')).toContainText('Memory Match');
  expect(await page.locator('h1').count()).toBe(1);
});

// ── Card flipping ──────────────────────────────────────────────────────────

test('flipping a card reveals its symbol', async ({ page }) => {
  const errors = trackConsoleErrors(page);

  // Flip the first card
  await page.getByRole('button', { name: 'Card 1, face down' }).click();

  // The card is now face-up: its aria-label is the emoji (not "face down")
  const flipped = page.getByRole('button').filter({
    hasNot: page.locator('[aria-label*="face down"]'),
    hasNot: page.locator('[aria-label*="matched"]'),
  });
  // There should be exactly one face-up (non-face-down, non-matched) card
  // whose aria-label is a short emoji string (not "Card N, face down")
  const allButtons = await page.locator('button').all();
  // Count cards NOT in face-down state
  let faceUpCount = 0;
  for (const btn of allButtons) {
    const label = await btn.getAttribute('aria-label');
    if (label && !label.includes('face down') && !label.includes('matched') && !label.includes('New Game') && !label.includes('Back') && !label.includes('How to play')) {
      faceUpCount++;
    }
  }
  expect(faceUpCount).toBe(1);

  // 15 cards remain face-down
  expect(await page.getByRole('button', { name: /Card \d+, face down/ }).count()).toBe(15);

  assertNoConsoleErrors(errors);
});

test('flipping two mismatched cards locks briefly then resets both to face-down', async ({
  page,
}) => {
  const errors = trackConsoleErrors(page);

  // Wait for the lazy-loaded game to render all 16 cards before DOM-peeking
  await page.waitForSelector('button[aria-label^="Card "]', { timeout: 15_000 });

  // Peek at symbols to intentionally find a non-matching pair
  const allPairs = await page.evaluate<[number, number][]>(() => {
    const buttons = Array.from(
      document.querySelectorAll<HTMLButtonElement>('button[aria-label^="Card "]'),
    );
    const symbols = buttons.map((btn) => {
      const spans = Array.from(btn.querySelectorAll<HTMLElement>('span[aria-hidden="true"]'));
      const front = spans.find(
        (s) => s.childElementCount === 0 && (s.textContent?.trim() ?? '').length > 0 && s.textContent?.trim() !== '?',
      );
      return front?.textContent?.trim() ?? '';
    });
    // Return all [i+1, j+1] where symbols differ (first mismatch)
    for (let i = 0; i < symbols.length; i++) {
      for (let j = i + 1; j < symbols.length; j++) {
        if (symbols[i] && symbols[j] && symbols[i] !== symbols[j]) {
          return [[i + 1, j + 1]];
        }
      }
    }
    return [[1, 3]];
  });

  const [card1, card2] = allPairs[0];

  await page.getByRole('button', { name: `Card ${card1}, face down` }).click();
  await page.getByRole('button', { name: `Card ${card2}, face down` }).click();

  // Locked phase — the game checks the pair (briefly shown)
  // After ~800 ms the cards flip back; wait generously
  await expect(
    page.getByRole('button', { name: /Card \d+, face down/ }),
  ).toHaveCount(16, { timeout: 3000 });

  // No matched cards
  expect(await page.getByRole('button', { name: /matched/ }).count()).toBe(0);

  assertNoConsoleErrors(errors);
});

test('flipping two matching cards marks them as matched', async ({ page }) => {
  const errors = trackConsoleErrors(page);

  const [card1, card2] = await findMatchingPairCardNumbers(page);

  await page.getByRole('button', { name: `Card ${card1}, face down` }).click();
  await page.getByRole('button', { name: `Card ${card2}, face down` }).click();

  // Both cards should now be matched
  await expect(page.getByRole('button', { name: /matched/ })).toHaveCount(2, {
    timeout: 3000,
  });

  // 14 remain face-down
  expect(await page.getByRole('button', { name: /Card \d+, face down/ }).count()).toBe(14);

  assertNoConsoleErrors(errors);
});

// ── New Game ───────────────────────────────────────────────────────────────

test('"New Game" button resets all 16 cards to face-down', async ({ page }) => {
  const errors = trackConsoleErrors(page);

  // Flip a matching pair to change the board state
  const [card1, card2] = await findMatchingPairCardNumbers(page);
  await page.getByRole('button', { name: `Card ${card1}, face down` }).click();
  await page.getByRole('button', { name: `Card ${card2}, face down` }).click();
  await expect(page.getByRole('button', { name: /matched/ })).toHaveCount(2, { timeout: 3000 });

  // Restart
  await page.getByRole('button', { name: 'New Game' }).click();

  // All 16 cards face-down again
  await expect(page.getByRole('button', { name: /Card \d+, face down/ })).toHaveCount(16, {
    timeout: 3000,
  });

  // No matched cards after restart
  expect(await page.getByRole('button', { name: /matched/ }).count()).toBe(0);

  assertNoConsoleErrors(errors);
});

// ── Completion ─────────────────────────────────────────────────────────────

/**
 * Complete the entire 8-pair board and verify the status shows completion.
 * Uses the DOM-peek helper to find each pair without guessing.
 */
test('completing all 8 pairs shows success status', async ({ page }) => {
  test.setTimeout(60_000);
  const errors = trackConsoleErrors(page);

  for (let round = 0; round < 8; round++) {
    const [c1, c2] = await findMatchingPairCardNumbers(page);
    await page.getByRole('button', { name: `Card ${c1}, face down` }).click();
    await page.getByRole('button', { name: `Card ${c2}, face down` }).click();
    // After matching, 2 more cards become "matched" each round
    await expect(page.getByRole('button', { name: /matched/ })).toHaveCount(
      (round + 1) * 2,
      { timeout: 5000 },
    );
  }

  // All 16 matched — game complete
  await expect(page.getByRole('button', { name: /matched/ })).toHaveCount(16);

  // Status badge shows "New Best!" on a fresh run (no prior record) or "Complete!" otherwise.
  await expect(page.getByText(/Complete!|New Best!/i)).toBeVisible({ timeout: 5000 });

  assertNoConsoleErrors(errors);
});
