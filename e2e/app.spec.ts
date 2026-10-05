import { test, expect } from '@playwright/test';

test('football landing page shows the requested competition groups', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { name: /More leagues/i })).toBeVisible();
  await expect(page.locator('.competition-quick-grid a[href="/leagues/champions-league"]')).toBeVisible();
  await expect(page.locator('.competition-quick-grid a[href="/leagues/premier-league"]')).toBeVisible();
  await expect(page.locator('.secondary-cta[href="/leagues/world-cup-2026"]')).toBeVisible();
  await expect(page.locator('.league-switcher a')).toHaveCount(10);
  await expect(page.locator('#match-centre')).toBeVisible();
  await expect(page.locator('#overall-stats')).toBeVisible();
  await expect(page.locator('#overall-scorers .leader-list li').first()).toBeVisible();
  await expect(page.locator('#overall-assists .leader-list li').first()).toBeVisible();
  await expect(page.locator('#top-news')).toBeVisible();

  const viewport = page.viewportSize();
  const newsBox = await page.locator('#top-news').boundingBox();
  if (viewport && newsBox && viewport.width >= 1000) {
    expect(newsBox.y).toBeLessThan(viewport.height);
  }
});

test('competition page shows matches table news and transfers', async ({ page }) => {
  await page.goto('/leagues/premier-league');
  await expect(page.getByRole('heading', { name: 'Premier League', exact: true })).toBeVisible();
  await expect(page.locator('.football-match').first()).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Live now' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Upcoming games' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Recent results' })).toBeVisible();
  await expect(page.locator('.football-table').first()).toBeVisible();
  await expect(page.locator('#top-scorers .leader-list li').first()).toBeVisible();
  await expect(page.locator('#top-assists .leader-list li').first()).toBeVisible();
  await expect(page.locator('#news')).toBeVisible();
  await expect(page.locator('#transfers')).toBeVisible();
});

test('football pages stay within the mobile and desktop viewport', async ({ page }) => {
  for (const path of ['/', '/leagues/premier-league']) {
    await page.goto(path);
    await expect(page.locator('.league-switcher')).toBeVisible();
    const hasPageOverflow = await page.evaluate(
      () => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1
    );
    expect(hasPageOverflow).toBe(false);
  }
});

test('world cup archive entry links to the full companion', async ({ page }) => {
  await page.goto('/leagues/world-cup-2026');
  await expect(page.getByText(/The World Cup is complete/)).toBeVisible();
  await page.getByRole('link', { name: 'Open 2026 archive' }).click();
  await expect(page).toHaveURL(/\/world-cup\/?$/);
  await expect(page.locator('.mc').first()).toBeVisible();
});

test('schedule renders fixtures and groups by day', async ({ page }) => {
  await page.goto('/world-cup');
  await expect(page.locator('.brand-name')).toHaveText('World Cup 2026');
  // Match cards render once the (fallback) snapshot loads.
  await expect(page.locator('.mc').first()).toBeVisible();
  await expect(page.locator('.day-block').first()).toBeVisible();
});

test('stage filter narrows the list', async ({ page }) => {
  await page.goto('/world-cup');
  await expect(page.locator('.mc').first()).toBeVisible();
  await page.getByRole('tab', { name: 'Final' }).click();
  // The Final stage shows only the final (1 card) at MetLife Stadium.
  await expect(page.locator('.mc')).toHaveCount(1);
  await expect(page.getByText(/MetLife/).first()).toBeVisible();
});

test('match drawer opens with details and closes on Escape', async ({ page }) => {
  await page.goto('/world-cup');
  await expect(page.locator('.mc').first()).toBeVisible();
  await page.locator('.mc').first().click();
  const dialog = page.getByRole('dialog');
  await expect(dialog).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(dialog).toBeHidden();
});

test('timezone selector updates the header label', async ({ page }) => {
  await page.goto('/world-cup');
  // Wait for the island to hydrate (cards rendered) before interacting.
  await expect(page.locator('.mc').first()).toBeVisible();
  await page.getByLabel('Select timezone').selectOption('Asia/Tokyo');
  await expect(page.locator('#tz-label')).toHaveText('Tokyo');
});

test('primary navigation reaches every section', async ({ page }) => {
  await page.goto('/world-cup');
  for (const [name, heading] of [
    ['Tables', 'Group Standings'],
    ['Top Scorers', 'Golden Boot Race'],
    ['Assists', 'Playmaker Race'],
    ['Bracket', 'Knockout Bracket'],
    ['News', 'World Cup News'],
  ] as const) {
    await page.getByRole('link', { name }).click();
    await expect(page.getByRole('heading', { name: heading })).toBeVisible();
  }
});

test('favoriting a team from the drawer enables the Favorites filter', async ({ page }) => {
  await page.goto('/world-cup');
  await expect(page.locator('.mc').first()).toBeVisible();
  await page.locator('.mc').first().click();
  await page.getByRole('button', { name: /Follow / }).first().click();
  await page.keyboard.press('Escape');
  await page.getByRole('tab', { name: '★ Favorites' }).click();
  await expect(page.locator('.mc.fav').first()).toBeVisible();
});

test('support button opens the donation modal and validates input', async ({ page }) => {
  await page.goto('/world-cup');
  const supportBtn = page.getByRole('button', { name: /Support this project/ });
  await expect(supportBtn).toBeVisible();
  await supportBtn.click();

  const dialog = page.getByRole('dialog', { name: 'Support this project' });
  await expect(dialog).toBeVisible();
  await expect(dialog.getByText(/Buy me a coffee/)).toBeVisible();

  const cta = dialog.getByRole('button', { name: /Donate securely/ });
  await expect(cta).toBeDisabled(); // no email/amount yet

  await dialog.getByLabel(/Your email/).fill('fan@example.com');
  await dialog.getByRole('button', { name: /1,000/ }).click();
  await expect(cta).toBeEnabled();

  // Close without triggering a real payment (Paystack SDK never loads).
  await page.keyboard.press('Escape');
  await expect(dialog).toBeHidden();
});
