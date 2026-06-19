/**
 * Shared helpers for Pixel Pocket Arcade Playwright specs.
 */

import { expect, type Page } from '@playwright/test';

// ── Console error tracking ────────────────────────────────────────────────────

/**
 * Attach a console-error listener BEFORE navigating so no early messages are
 * missed.  Returns the accumulator array; it is mutated on each `error` event.
 */
export function trackConsoleErrors(page: Page): string[] {
  const errors: string[] = [];
  page.on('console', (msg) => {
    if (msg.type() === 'error') errors.push(msg.text());
  });
  return errors;
}

/**
 * Assert that no unexpected console errors are present.
 * Browser hints (React DevTools, favicon 404s) are allowed; real JS errors are not.
 */
export function assertNoConsoleErrors(errors: string[]): void {
  const unexpected = errors.filter(
    (e) =>
      !e.includes('React DevTools') &&
      !e.includes('favicon') &&
      !e.includes('net::ERR_') // network-level hints (e.g. favicon)
  );
  expect(
    unexpected,
    `Unexpected console errors:\n${unexpected.join('\n')}`,
  ).toHaveLength(0);
}

// ── Layout ────────────────────────────────────────────────────────────────────

/**
 * Assert the page has no horizontal overflow at the current viewport width.
 */
export async function assertNoHorizontalScroll(page: Page): Promise<void> {
  const { scrollWidth, clientWidth } = await page.evaluate(() => ({
    scrollWidth: document.documentElement.scrollWidth,
    clientWidth: document.documentElement.clientWidth,
  }));
  expect(
    scrollWidth,
    `Horizontal scroll: scrollWidth ${scrollWidth} > clientWidth ${clientWidth}`,
  ).toBeLessThanOrEqual(clientWidth);
}

// ── Memory Match ─────────────────────────────────────────────────────────────

/**
 * Inspect the hidden front-face emoji spans (aria-hidden, always in DOM) to
 * discover two cards that share a symbol — without flipping any cards.
 *
 * Returns 1-based card numbers so tests can target "Card N, face down" by
 * exact aria-label even after the first card is flipped.
 *
 * Structure per button:
 *   Back face:  <span aria-hidden><span>?</span></span>   (has a child element)
 *   Front face: <span aria-hidden>{emoji}</span>          (no child elements, non-empty text)
 */
export async function findMatchingPairCardNumbers(
  page: Page,
): Promise<[number, number]> {
  // The Memory game is lazy-loaded; wait until the card buttons are in the DOM
  // before querying their hidden emoji spans.
  await page.waitForSelector('button[aria-label^="Card "]', { timeout: 15_000 });
  return page.evaluate<[number, number]>(() => {
    const buttons = Array.from(
      document.querySelectorAll<HTMLButtonElement>('button[aria-label^="Card "]'),
    );

    // Build a list of { cardNum, symbol } by:
    //   - extracting the card number from the aria-label ("Card 7, face down" → 7)
    //   - reading the hidden front-face emoji span (no child elements, non-empty text ≠ "?")
    const data = buttons.map((btn) => {
      const label = btn.getAttribute('aria-label') ?? '';
      const numMatch = label.match(/Card (\d+), face down/);
      const cardNum = numMatch ? parseInt(numMatch[1], 10) : 0;

      const spans = Array.from(
        btn.querySelectorAll<HTMLElement>('span[aria-hidden="true"]'),
      );
      const front = spans.find(
        (s) =>
          s.childElementCount === 0 &&
          (s.textContent?.trim() ?? '').length > 0 &&
          s.textContent?.trim() !== '?',
      );
      return { cardNum, symbol: front?.textContent?.trim() ?? '' };
    });

    // Find two remaining face-down cards that share a symbol.
    // Return their actual aria-label card numbers so clicks survive across rounds.
    for (let i = 0; i < data.length; i++) {
      for (let j = i + 1; j < data.length; j++) {
        if (data[i].symbol && data[i].symbol === data[j].symbol) {
          return [data[i].cardNum, data[j].cardNum];
        }
      }
    }
    return [1, 2]; // fallback — shouldn't happen with the 8-pair set
  });
}

// ── LocalStorage seeding ─────────────────────────────────────────────────────

/**
 * Seed localStorage BEFORE the React app initialises so the ArcadeProvider
 * picks up the pre-populated state on its first mount.
 *
 * Pass to `page.addInitScript()` (which runs before the page JS) then
 * navigate to the desired path.
 */
export const SEEDED_ARCADE_STATE = {
  version: 1,
  settings: { soundEnabled: true },
  records: {
    snakeHighScore: 42,
    memoryBest: { moves: 12, elapsedMs: 30000 },
    reactionBestAverageMs: 280,
  },
  recentPlays: [{ game: 'snake', label: 'Score 42', at: 1718800000000 }],
} as const;

export const STORAGE_KEY = 'pixel-pocket-arcade';
