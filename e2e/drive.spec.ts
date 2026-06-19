import { test, expect } from '@playwright/test';

// Mini Drive renders with three.js. In headless Chromium WebGL is normally
// available (SwiftShader); if it is not, the game shows a graceful fallback,
// and the gameplay assertions are skipped rather than failing.
test.describe('Mini Drive', () => {
  test('loads with a title and either the 3D canvas or a WebGL fallback', async ({ page }) => {
    await page.goto('/games/drive');
    await expect(page.getByRole('heading', { level: 1, name: 'Mini Drive' })).toBeVisible();
    const hasCanvas = (await page.locator('canvas').count()) > 0;
    if (hasCanvas) {
      await expect(page.getByText(/Press an arrow key or a steer button/i)).toBeVisible();
    } else {
      await expect(page.getByText(/needs WebGL/i)).toBeVisible();
    }
  });

  test('starts on key press and reaches a non-idle state', async ({ page }) => {
    await page.goto('/games/drive');
    test.skip((await page.locator('canvas').count()) === 0, 'WebGL unavailable');
    await page.getByText(/Press an arrow key or a steer button/i).waitFor();
    await page.keyboard.press('ArrowUp');
    // It is now playing; without steering it will also crash shortly. Either
    // status proves the loop ran. (Idle is gone.)
    await expect(page.getByText(/Playing|Crashed/i).first()).toBeVisible({ timeout: 6000 });
  });

  test('Restart returns the game to idle', async ({ page }) => {
    await page.goto('/games/drive');
    test.skip((await page.locator('canvas').count()) === 0, 'WebGL unavailable');
    await page.getByText(/Press an arrow key or a steer button/i).waitFor();
    await page.keyboard.press('ArrowUp');
    await page.getByRole('button', { name: 'Restart' }).click();
    await expect(page.getByText(/Press an arrow key or a steer button/i)).toBeVisible();
  });

  test('exposes labelled steer controls for touch', async ({ page }) => {
    await page.goto('/games/drive');
    test.skip((await page.locator('canvas').count()) === 0, 'WebGL unavailable');
    await expect(page.getByRole('button', { name: 'Steer left' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Steer right' })).toBeVisible();
  });
});
