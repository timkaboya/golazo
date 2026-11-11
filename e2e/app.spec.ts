import { test, expect } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  await page.route('**/api/football-scores*', (route) =>
    route.fulfill({ status: 502, contentType: 'application/json', body: '{}' })
  );
});

test('football landing page shows the requested competition groups', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { name: /More leagues/i })).toBeVisible();
  await expect(page.locator('.competition-quick-grid a[href="/leagues/champions-league"]')).toBeVisible();
  await expect(page.locator('.competition-quick-grid a[href="/leagues/premier-league"]')).toBeVisible();
  await expect(page.locator('.secondary-cta[href="/leagues/world-cup-2026"]')).toBeVisible();
  await expect(page.locator('.league-switcher a')).toHaveCount(10);
  await expect(page.locator('#match-centre')).toBeVisible();
  await expect(page.getByRole('tab', { name: /Live & today/ })).toBeVisible();
  await page.getByRole('tab', { name: /Recent/ }).click();
  await expect(page.getByRole('heading', { name: '10 most recent results' })).toBeVisible();
  const recentPanel = page.locator('.home-match-panels');
  await expect(recentPanel.locator('.home-match-card')).toHaveCount(10);
  await expect
    .poll(() =>
      recentPanel.locator('.home-match-team b').evaluateAll((scores) =>
        scores.some((score) => Boolean(score.textContent?.trim()))
      )
    )
    .toBe(true);
  const matchListColumns = await recentPanel.locator('.home-match-list').evaluate((list) =>
    getComputedStyle(list).gridTemplateColumns.split(' ').length
  );
  expect(matchListColumns).toBe((page.viewportSize()?.width ?? 0) >= 1000 ? 2 : 1);
  await page.getByRole('tab', { name: /Up next/ }).click();
  await expect(page.getByRole('heading', { name: 'Next 10 games' })).toBeVisible();
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

test('live scoreboard moves an upcoming match to live and then to recent', async ({ page }) => {
  await page.unroute('**/api/football-scores*');
  let requests = 0;
  await page.route('**/api/football-scores*', (route) => {
    requests += 1;
    const finished = requests > 1;
    return route.fulfill({
      contentType: 'application/json',
      body: JSON.stringify({
        version: 1,
        updatedUtc: '2026-10-06T20:06:00Z',
        competitions: [{
          slug: 'nations-league',
          name: 'Nations League',
          espn: 'uefa.nations',
          matches: [{
            id: '401861137',
            utc: '2026-10-06T18:45Z',
            phase: 'League Phase',
            home: { id: '477', name: 'Croatia', abbreviation: 'CRO' },
            away: { id: '164', name: 'Spain', abbreviation: 'ESP' },
            venue: 'Stadion Poljud, Split',
            status: finished ? 'finished' : 'live',
            score: { home: finished ? 2 : 1, away: 1 },
            note: finished ? 'FT' : "81'",
          }],
        }],
      }),
    });
  });

  await page.goto('/leagues/nations-league');
  const liveCard = page.locator('.match-board.is-live .football-match[data-match-id="401861137"]');
  await expect(liveCard).toBeVisible();
  await expect(liveCard).toContainText("81'");
  await expect(liveCard.locator('.football-match-score')).toHaveText(['1', '1']);
  await expect(page.locator('.match-board.is-upcoming .football-match[data-match-id="401861137"]')).toHaveCount(0);

  await page.evaluate(() => document.dispatchEvent(new Event('visibilitychange')));
  const recentCard = page.locator('.match-board.is-recent .football-match[data-match-id="401861137"]');
  await expect(recentCard).toBeVisible();
  await expect(recentCard).toContainText('FT');
  await expect(recentCard.locator('.football-match-score')).toHaveText(['2', '1']);
});

test('landing match centre immediately surfaces provider-confirmed live games', async ({ page }) => {
  await page.unroute('**/api/football-scores*');
  await page.route('**/api/football-scores*', (route) =>
    route.fulfill({
      contentType: 'application/json',
      body: JSON.stringify({
        version: 1,
        updatedUtc: '2026-10-06T20:06:00Z',
        competitions: [{
          slug: 'nations-league',
          name: 'Nations League',
          espn: 'uefa.nations',
          matches: [{
            id: '401861137',
            utc: '2026-10-06T18:45Z',
            phase: 'League Phase',
            home: { id: '477', name: 'Croatia', abbreviation: 'CRO' },
            away: { id: '164', name: 'Spain', abbreviation: 'ESP' },
            venue: 'Stadion Poljud, Split',
            status: 'live',
            score: { home: 1, away: 1 },
            note: "81'",
          }],
        }],
      }),
    })
  );

  await page.goto('/');
  await expect(page.locator('.home-live-status')).toContainText(/\d+ live now/);
  const liveCard = page.locator('.home-match-card[data-match-id="401861137"]');
  await expect(liveCard).toBeVisible();
  await expect(liveCard).toContainText("81'");
  await expect(liveCard.locator('.home-match-team b')).toHaveText(['1', '1']);
});

test('league result opens a full match centre with lineups table stats and head to head', async ({ page }) => {
  await page.route('**/api/match?*', (route) =>
    route.fulfill({ status: 502, contentType: 'application/json', body: '{}' })
  );
  await page.route('**/summary?event=*', (route) =>
    route.fulfill({
      contentType: 'application/json',
      body: JSON.stringify({
        header: {
          competitions: [{
            id: '401861131',
            status: { type: { state: 'post', shortDetail: 'FT' } },
            competitors: [
              { homeAway: 'home', team: { id: '162' }, score: '3', winner: true },
              { homeAway: 'away', team: { id: '465' }, score: '1' },
            ],
          }],
        },
        gameInfo: { venue: { fullName: "Renato Dall'Ara" }, officials: [] },
        rosters: [
          {
            homeAway: 'home',
            formation: '1',
            roster: [{ jersey: '1', starter: true, formationPlace: 1, position: { abbreviation: 'G' }, athlete: { displayName: 'Home Keeper' } }],
          },
          {
            homeAway: 'away',
            formation: '1',
            roster: [{ jersey: '1', starter: true, formationPlace: 1, position: { abbreviation: 'G' }, athlete: { displayName: 'Away Keeper' } }],
          },
        ],
        boxscore: {
          teams: [
            { homeAway: 'home', statistics: [{ name: 'possessionPct', displayValue: '55' }, { name: 'totalShots', displayValue: '12' }] },
            { homeAway: 'away', statistics: [{ name: 'possessionPct', displayValue: '45' }, { name: 'totalShots', displayValue: '8' }] },
          ],
        },
        keyEvents: [
          { clock: { displayValue: "12'" }, type: { text: 'Goal' }, team: { id: '162' }, participants: [{ athlete: { displayName: 'Home Scorer' } }] },
          { clock: { displayValue: "74'" }, type: { text: 'Red Card' }, team: { id: '465' }, participants: [{ athlete: { displayName: 'Away Defender' } }] },
        ],
        lastFiveGames: [
          { team: { id: '162' }, events: [{ gameDate: '2026-10-01', score: '2-0', gameResult: 'W', opponent: { abbreviation: 'BEL' } }] },
          { team: { id: '465' }, events: [{ gameDate: '2026-10-01', score: '1-1', gameResult: 'D', opponent: { abbreviation: 'FRA' } }] },
        ],
        headToHeadGames: [{ events: [{ gameDate: '2024-06-01', score: '1-0', gameResult: 'W', opponent: { abbreviation: 'TUR' }, leagueAbbreviation: 'Friendly' }] }],
      }),
    })
  );

  await page.goto('/leagues/nations-league');
  await page.locator('.match-board.is-recent .football-match').first().click();
  const dialog = page.getByRole('dialog');
  await expect(dialog).toBeVisible();
  await expect(dialog.getByText('Full time')).toBeVisible();
  await expect(dialog.getByLabel("Goal: Home Scorer, 12'")).toBeVisible();
  await expect(dialog.getByLabel("Red card: Away Defender, 74'")).toBeVisible();
  await dialog.getByRole('tab', { name: 'Lineup' }).click();
  await expect(dialog.getByText('Starting lineups')).toBeVisible();
  await dialog.getByRole('tab', { name: 'Table' }).click();
  await expect(dialog.locator('.fmd-table tr.is-match-team')).toHaveCount(2);
  await dialog.getByRole('tab', { name: 'Stats' }).click();
  await expect(dialog.getByText('Possession')).toBeVisible();
  await dialog.getByRole('tab', { name: 'Head to head' }).click();
  await expect(dialog.getByText(/recent form/i).first()).toBeVisible();
});

test('future match centre explains when predicted lineups and stats are not published', async ({ page }) => {
  await page.route('**/api/match?*', (route) =>
    route.fulfill({ status: 502, contentType: 'application/json', body: '{}' })
  );
  await page.route('**/summary?event=*', (route) =>
    route.fulfill({
      contentType: 'application/json',
      body: JSON.stringify({
        header: { competitions: [{ id: '1', status: { type: { state: 'pre' } }, competitors: [] }] },
      }),
    })
  );

  await page.goto('/leagues/premier-league');
  await page.locator('.match-board.is-upcoming .football-match').first().click();
  const dialog = page.getByRole('dialog');
  await dialog.getByRole('tab', { name: 'Lineup' }).click();
  await expect(dialog.getByText(/Predicted lineups are not published yet/)).toBeVisible();
  await dialog.getByRole('tab', { name: 'Stats' }).click();
  await expect(dialog.getByText(/once the match starts/)).toBeVisible();
});

test('landing page match cards open the same match centre', async ({ page }) => {
  await page.route('**/api/match?*', (route) =>
    route.fulfill({ status: 502, contentType: 'application/json', body: '{}' })
  );
  await page.route('**/summary?event=*', (route) =>
    route.fulfill({
      contentType: 'application/json',
      body: JSON.stringify({
        header: { competitions: [{ id: '1', status: { type: { state: 'post' } }, competitors: [] }] },
      }),
    })
  );

  await page.goto('/');
  const recentTab = page.getByRole('tab', { name: /Recent/ });
  await recentTab.click();
  await expect(recentTab).toHaveAttribute('aria-selected', 'true');
  await page.locator('.home-match-card').first().click();
  await expect(page.getByRole('dialog')).toBeVisible();
  await expect(page.getByRole('tab', { name: 'Table' })).toBeVisible();
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
  const supportBtn = page.getByRole('button', { name: /Buy me a coffee/ });
  await expect(supportBtn).toBeVisible();
  await supportBtn.click();

  const dialog = page.getByRole('dialog', { name: 'Buy me a coffee' });
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

test('landing page offers Paystack support', async ({ page }) => {
  await page.goto('/');
  const supportBtn = page.getByRole('button', { name: /Buy me a coffee/ });
  await expect(supportBtn).toBeVisible();
  await supportBtn.click();

  const dialog = page.getByRole('dialog', { name: 'Buy me a coffee' });
  await expect(dialog).toBeVisible();
  await expect(dialog.getByText(/Golazo is free and ad-free/)).toBeVisible();
});
