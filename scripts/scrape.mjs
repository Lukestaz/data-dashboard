import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';

const outputDir = path.resolve(process.env.AMEX_OUTPUT_DIR || 'data/imports');
const date = new Date().toISOString().replace(/[:.]/g, '-');
const outputFile = path.join(outputDir, `amex-raw-${date}.json`);

async function scrape() {
  fs.mkdirSync(outputDir, { recursive: true });
  console.log(`Starting Amex Shop Small NZ staging scrape. Output: ${outputFile}`);

  const browser = await chromium.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const context = await browser.newContext({
    viewport: { width: 1366, height: 768 },
    locale: 'en-NZ',
    timezoneId: 'Pacific/Auckland'
  });
  const page = await context.newPage();
  const rawResponses = [];

  page.on('response', async (response) => {
    const contentType = response.headers()['content-type'] || '';
    const url = response.url();
    if (!contentType.includes('json')) return;
    if (!/(merchant|location|search|shop-small|campaign)/i.test(url)) return;

    try {
      rawResponses.push({ url, payload: await response.json() });
    } catch {
      // Ignore JSON responses that cannot be decoded.
    }
  });

  try {
    await page.goto('https://directory.americanexpress.com/en-NZ/shop-small/', {
      waitUntil: 'domcontentloaded',
      timeout: 45000
    });
    await page.waitForTimeout(6000);
  } finally {
    await browser.close();
  }

  const artifact = {
    source: 'https://directory.americanexpress.com/en-NZ/shop-small/',
    scrapedAt: new Date().toISOString(),
    responseCount: rawResponses.length,
    responses: rawResponses
  };

  fs.writeFileSync(outputFile, JSON.stringify(artifact, null, 2));
  console.log(`Saved ${rawResponses.length} captured JSON responses to ${outputFile}`);
}

scrape().catch((error) => {
  console.error(error);
  process.exit(1);
});
