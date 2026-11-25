// takes the organizer, admin and event-detail readme screenshots.
// needs the demo api (cd backend && npm run demo) and the dev server
// (npm run dev) running. usage: node scripts/screenshots.mjs [out dir]
import { chromium } from 'playwright';

const WEB = process.env.WEB_URL || 'http://localhost:5173';
const OUT = process.argv[2] || '../docs/img';

async function login(page, email) {
  await page.goto(`${WEB}/login`);
  await page.fill('input[type=email]', email);
  await page.fill('input[type=password]', 'demo1234');
  await page.click('button[type=submit]');
  await page.waitForURL(`${WEB}/dashboard`);
  await page.reload(); // drops the login toast
  await page.waitForLoadState('networkidle');
}

async function shot(page, name) {
  await page.waitForTimeout(500);
  await page.screenshot({ path: `${OUT}/${name}.png` });
  console.log(`wrote ${OUT}/${name}.png`);
}

const browser = await chromium.launch();
const viewport = { width: 1440, height: 900 };

for (const [email, name] of [['music@example.com', 'organizer'], ['admin@example.com', 'admin']]) {
  const ctx = await browser.newContext({ viewport });
  const page = await ctx.newPage();
  await login(page, email);
  await shot(page, name);
  await ctx.close();
}

// a normal (non-merch) event, seen by a participant
const res = await fetch('http://localhost:3000/api/events');
const { events } = await res.json();
const ev = events.find((e) => e.type === 'normal');
const ctx = await browser.newContext({ viewport });
const page = await ctx.newPage();
await login(page, 'vikram@example.com');
await page.goto(`${WEB}/events/${ev._id}`);
await page.waitForLoadState('networkidle');
await shot(page, 'event');

await browser.close();
