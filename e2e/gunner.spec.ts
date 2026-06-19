import { test, expect } from '@playwright/test';

// Star Gunner renders with three.js and pulls its asteroid roster from NASA.
// We stub the NASA endpoint so the test is deterministic and offline-safe.
// In headless Chromium WebGL is normally available (SwiftShader); if it is not,
// the game shows a graceful fallback and the gameplay assertions are skipped.

const NASA = '**/api.nasa.gov/**';
const NASA_BODY = {
  near_earth_objects: [
    { name: '433 Eros', estimated_diameter: { meters: { estimated_diameter_max: 16840 } }, is_potentially_hazardous_asteroid: false },
    { name: '99942 Apophis', estimated_diameter: { meters: { estimated_diameter_max: 375 } }, is_potentially_hazardous_asteroid: true },
    { name: '101955 Bennu', estimated_diameter: { meters: { estimated_diameter_max: 490 } }, is_potentially_hazardous_asteroid: true },
    { name: '162173 Ryugu', estimated_diameter: { meters: { estimated_diameter_max: 900 } }, is_potentially_hazardous_asteroid: false },
    { name: '25143 Itokawa', estimated_diameter: { meters: { estimated_diameter_max: 330 } }, is_potentially_hazardous_asteroid: false },
  ],
};

// Unique to the idle overlay; the "How to play" list also says "press Space to fire".
const idlePrompt = /Aim and click/i;

test.describe('Star Gunner', () => {
  test('loads with a title, NASA caption, and the 3D canvas or a WebGL fallback', async ({ page }) => {
    await page.route(NASA, (route) => route.fulfill({ json: NASA_BODY }));
    await page.goto('/games/gunner');

    await expect(page.getByRole('heading', { level: 1, name: 'Star Gunner' })).toBeVisible();

    const idle = page.getByText(idlePrompt);
    const noWebgl = page.getByText(/needs WebGL/i);
    await expect(idle.or(noWebgl)).toBeVisible({ timeout: 8000 });

    // The roster resolved from the (stubbed) live NASA feed. "NeoWs" appears
    // only in the data-source caption, not in the game description.
    await expect(page.getByText(/NeoWs/i)).toBeVisible();

    if (await idle.isVisible()) {
      await expect(page.locator('canvas')).toHaveCount(1);
    } else {
      await expect(noWebgl).toBeVisible();
    }
  });

  test('falls back to the built-in set when NASA is unreachable', async ({ page }) => {
    await page.route(NASA, (route) => route.abort());
    await page.goto('/games/gunner');
    // The fallback caption renders even without WebGL.
    await expect(page.getByText(/built-in asteroid set/i)).toBeVisible({ timeout: 9000 });
  });

  test('starts on Space and reaches a non-idle state', async ({ page }) => {
    await page.route(NASA, (route) => route.fulfill({ json: NASA_BODY }));
    await page.goto('/games/gunner');

    const idle = page.getByText(idlePrompt);
    const noWebgl = page.getByText(/needs WebGL/i);
    await expect(idle.or(noWebgl)).toBeVisible({ timeout: 8000 });
    test.skip(await noWebgl.isVisible(), 'WebGL unavailable');

    await page.keyboard.press('Space');
    await expect(page.getByText(/Playing|Out of lives/i).first()).toBeVisible({ timeout: 6000 });
  });

  test('Restart returns the game to idle', async ({ page }) => {
    await page.route(NASA, (route) => route.fulfill({ json: NASA_BODY }));
    await page.goto('/games/gunner');

    const idle = page.getByText(idlePrompt);
    const noWebgl = page.getByText(/needs WebGL/i);
    await expect(idle.or(noWebgl)).toBeVisible({ timeout: 8000 });
    test.skip(await noWebgl.isVisible(), 'WebGL unavailable');

    await page.keyboard.press('Space');
    await page.getByRole('button', { name: 'Restart' }).click();
    await expect(page.getByText(idlePrompt)).toBeVisible();
  });

  test('exposes a labelled Fire control for touch', async ({ page }) => {
    await page.route(NASA, (route) => route.fulfill({ json: NASA_BODY }));
    await page.goto('/games/gunner');

    const idle = page.getByText(idlePrompt);
    const noWebgl = page.getByText(/needs WebGL/i);
    await expect(idle.or(noWebgl)).toBeVisible({ timeout: 8000 });
    test.skip(await noWebgl.isVisible(), 'WebGL unavailable');

    await expect(page.getByRole('button', { name: 'Fire' })).toBeVisible();
  });
});
