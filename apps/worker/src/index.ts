import 'dotenv/config';
import { chromium } from 'playwright';

/** Opens a page for future form analysis. Deliberately does not click submit. */
async function inspectApplicationPage(url: string) {
  const browser = await chromium.launch({ headless: process.env.PLAYWRIGHT_HEADLESS !== 'false' });
  try {
    const page = await browser.newPage();
    await page.goto(url, { waitUntil: 'domcontentloaded' });
    console.log(`Inspected application page: ${await page.title()}`);
    // Future: identify inputs and prepare a user-reviewed draft. Never submit here.
  } finally {
    await browser.close();
  }
}

const url = process.argv[2];
if (url) void inspectApplicationPage(url);
else console.log('Worker ready. Pass a URL to inspect a page without submitting anything.');
