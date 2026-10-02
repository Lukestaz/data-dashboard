import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';

const outputDir = path.resolve(process.env.AMEX_OUTPUT_DIR || 'data/imports');
fs.mkdirSync(outputDir, { recursive: true });

const targetUrl = 'https://directory.americanexpress.com/en-NZ/shop-small/';
const outputFile = path.join(outputDir, 'amex-online-raw.json');

async function scrapeOnline() {
  console.log('Launching browser to capture Amex Shop Small NZ Online merchants...');
  const browser = await chromium.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const context = await browser.newContext({
    viewport: { width: 1440, height: 1000 },
    locale: 'en-NZ',
    timezoneId: 'Pacific/Auckland'
  });

  const page = await context.newPage();
  const capturedPayloads = [];

  page.on('response', async (response) => {
    const url = response.url();
    const contentType = response.headers()['content-type'] || '';
    if (contentType.includes('json') && !url.includes('analytics') && !url.includes('telemetry')) {
      try {
        const json = await response.json();
        capturedPayloads.push({
          url,
          status: response.status(),
          data: json
        });
        console.log(`Intercepted JSON response from: ${url}`);
      } catch {
        // Ignore unparseable frames
      }
    }
  });

  try {
    console.log(`Navigating to ${targetUrl}...`);
    await page.goto(targetUrl, { waitUntil: 'domcontentloaded', timeout: 60000 });
    await page.waitForTimeout(6000);

    console.log('Locating Filter drawer...');
    const filterBtn = await page.locator('button:has-text("Filter"), [aria-label*="Filter"], [role="button"]:has-text("Filter")').first();
    if (await filterBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
      console.log('Clicking Filter button...');
      await filterBtn.click();
      await page.waitForTimeout(2000);
    }

    console.log('Selecting "Available Online" option...');
    const onlineOption = page.locator('text="Available Online", label:has-text("Available Online"), input[value*="online" i], input[type="radio"]:near(:text("Available Online"))').first();
    
    if (await onlineOption.isVisible({ timeout: 7000 }).catch(() => false)) {
      await onlineOption.click();
      console.log('Clicked "Available Online" successfully!');
      await page.waitForTimeout(4000);
    } else {
      console.log('Direct click not found; searching text nodes...');
      await page.getByText('Available Online', { exact: false }).first().click().catch(e => console.log('Click error:', e.message));
      await page.waitForTimeout(4000);
    }

    const applyBtn = page.locator('button:has-text("Apply"), button:has-text("Done"), button:has-text("Show"), button:has-text("View")').first();
    if (await applyBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
      console.log('Clicking Apply button...');
      await applyBtn.click();
      await page.waitForTimeout(5000);
    }

    await page.screenshot({ path: path.join(outputDir, 'online-filter-state.png'), fullPage: true });
    console.log('Saved state screenshot to data/imports/online-filter-state.png');

  } catch (err) {
    console.error('Error during online scraping:', err.message);
  } finally {
    await browser.close();
  }

  const result = {
    source: targetUrl,
    timestamp: new Date().toISOString(),
    totalPayloads: capturedPayloads.length,
    payloads: capturedPayloads
  };

  fs.writeFileSync(outputFile, JSON.stringify(result, null, 2));
  console.log(`Saved ${capturedPayloads.length} payloads to ${outputFile}`);
}

scrapeOnline().catch(err => {
  console.error(err);
  process.exit(1);
});
