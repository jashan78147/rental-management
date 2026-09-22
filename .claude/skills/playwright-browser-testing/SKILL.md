---
name: playwright-browser-testing
description: Write and run Playwright scripts for browser automation and UI verification - screenshots, responsive/viewport checks, login-flow testing, link and console-error checks, and visually verifying a page or artifact before calling it done. Use when asked to test a website, verify a page renders correctly, take a screenshot of a running app, check responsive behavior, or validate any browser-based UI work.
---

> Source: adapted from the open-source "playwright-skill" (github.com/lackeyjb/playwright-skill) by lackeyjb. The original ships a bundled `run.js` wrapper and a `lib/helpers.js` module (dev-server auto-detection, browser launch helpers) that live in the skill's own installed directory - those files aren't portable into a single-file skill, so this adaptation writes plain, self-contained Node + Playwright scripts directly instead, and defaults to headless mode since this environment has no visible display.

# Playwright Browser Automation

Write focused, disposable Playwright scripts to verify UI work rather than guessing whether a page renders correctly. Never claim a page "looks right" or "works" without actually loading it and checking.

## Setup (once per session)

Check whether Playwright is already installed before reinstalling:

```bash
node -e "require.resolve('playwright')" 2>/dev/null && echo "installed" || npm install --no-save playwright && npx playwright install --with-deps chromium
```

Only install the Chromium browser unless the task specifically needs Firefox or WebKit (`npx playwright install --with-deps firefox webkit`).

## Defaults for this environment

- **Headless: true.** This is a cloud sandbox with no display - always launch headless here, unlike a local desktop setup.
- Put the target URL in a constant at the top of the script.
- Write throwaway scripts to a scratch path (e.g. `/tmp/pw-check-*.js`); only save a script permanently if the user asks to keep it as a real test file in the project.
- Save screenshots and other artifacts under the working directory (or `/mnt/user-data/outputs/` when the user should receive the file directly), never to `/tmp` if the user needs to see the result.
- If a dev server needs to be running first, start it yourself in the background (`npm run dev &` or similar) and poll until it responds before navigating, rather than assuming it's already up.

## Locator preference order

Prefer locators that describe what a user actually sees, in this order:

1. `page.getByRole()` with an accessible name
2. `page.getByLabel()` for form controls
3. `page.getByText()` for visible content
4. `page.getByTestId()` only when the app provides a test-id contract

Actions auto-wait for actionability. Use web-first assertions (`expect(locator).toBeVisible()`) or a locator's `.waitFor()` instead of `waitForSelector()`, fixed `sleep`/`setTimeout` delays, or `networkidle`, all of which are flaky or slow.

```javascript
await page.getByLabel('Email').fill('test@example.com');
await page.getByRole('button', { name: 'Sign in' }).click();
await page.waitForURL('**/dashboard');
await page.getByRole('heading', { name: 'Dashboard' }).waitFor();
```

## Minimal script template

```javascript
const path = require('node:path');
const { chromium } = require('playwright');

const targetUrl = process.env.TARGET_URL || 'http://localhost:3000';
const outDir = process.env.PW_ARTIFACT_DIR || '.';

(async () => {
  const browser = await chromium.launch({ headless: true });
  try {
    const page = await browser.newPage();
    const errors = [];
    page.on('pageerror', (err) => errors.push(String(err)));
    page.on('console', (msg) => { if (msg.type() === 'error') errors.push(msg.text()); });

    await page.goto(targetUrl, { waitUntil: 'load' });
    console.log('Page loaded:', await page.title());
    await page.screenshot({ path: path.join(outDir, 'page.png'), fullPage: true });

    if (errors.length) {
      console.log('Console/page errors:', errors);
    }
  } finally {
    await browser.close();
  }
})();
```

Run it with `node /tmp/pw-check-page.js`.

## Common tasks

### Responsive / viewport checks

```javascript
const viewports = [
  { name: 'mobile', width: 390, height: 844 },
  { name: 'tablet', width: 768, height: 1024 },
  { name: 'desktop', width: 1440, height: 900 },
];

for (const viewport of viewports) {
  await page.setViewportSize(viewport);
  await page.goto(targetUrl);
  await page.screenshot({ path: `${viewport.name}.png`, fullPage: true });
}
```

### Login flow

Use test credentials the user supplies (via environment variables, never hardcoded or invented). Verify both the navigation and a post-login element actually appear - don't just check the URL changed.

```javascript
await page.goto(`${targetUrl}/login`);
await page.getByLabel('Email').fill(process.env.TEST_EMAIL);
await page.getByLabel('Password').fill(process.env.TEST_PASSWORD);
await page.getByRole('button', { name: /sign in|log in/i }).click();
await page.waitForURL('**/dashboard');
await page.getByRole('heading', { name: /dashboard/i }).waitFor();
```

### Link / navigation check

```javascript
const links = await page.getByRole('link').all();
for (const link of links) {
  const href = await link.getAttribute('href');
  if (href && href.startsWith('http')) {
    const res = await page.request.get(href);
    if (!res.ok()) console.log(`Broken link: ${href} -> ${res.status()}`);
  }
}
```

### Visual verification of an artifact or built page

After building or editing any UI (an HTML artifact, a React app, a landing page), load it in a headless browser and screenshot it before telling the user it's done. This catches layout breakage, missing assets, and console errors that a code review alone would miss.

## Reporting

Always report what was actually observed: page title, screenshot path, any console/page errors captured, and pass/fail per check. Never claim something works without having loaded the page and checked - if the check couldn't run (e.g. dev server never came up), say so plainly instead of assuming success.
</content>
