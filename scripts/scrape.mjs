import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';

const DATA_FILE = path.resolve('data.json');

async function scrape() {
  console.log('Starting Playwright scraper for Amex Shop Small NZ...');

  const browser = await chromium.launch({
    headless: true,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-blink-features=AutomationControlled'
    ]
  });

  const context = await browser.newContext({
    viewport: { width: 1366, height: 768 },
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36',
    locale: 'en-NZ',
    timezoneId: 'Pacific/Auckland'
  });

  const page = await context.newPage();

  let existingData = [];
  if (fs.existsSync(DATA_FILE)) {
    try {
      existingData = JSON.parse(fs.readFileSync(DATA_FILE, 'utf-8'));
    } catch {
      existingData = [];
    }
  }

  const merchantsMap = new Map();
  for (const item of existingData) {
    if (item.id) {
      merchantsMap.set(String(item.id), item);
    }
  }

  let capturedNewCount = 0;

  page.on('response', async (response) => {
    const url = response.url();
    const contentType = response.headers()['content-type'] || '';
    if (contentType.includes('json') && (url.includes('merchant') || url.includes('location') || url.includes('search') || url.includes('shop-small'))) {
      try {
        const json = await response.json();
        const records = json.merchants || json.locations || json.results || json.data || (Array.isArray(json) ? json : []);
        for (const r of records) {
          const id = String(r.id || r.merchantId || r.locationId || r.name);
          if (!id) continue;
          const isNew = !merchantsMap.has(id);
          merchantsMap.set(id, {
            id,
            title: r.name || r.businessName || r.tradingName || 'Unnamed Business',
            category: r.category || r.industry || r.merchantCategory || 'Shop Small Retail',
            status: r.shopSmallEligible ? 'Shop Small' : 'Accepts Amex',
            price: r.priceRange || 'N/A',
            notes: [r.address?.street, r.address?.city || r.city, r.address?.postalCode].filter(Boolean).join(', ') || r.formattedAddress || '',
            lastUpdated: new Date().toISOString().split('T')[0]
          });
          if (isNew) capturedNewCount++;
        }
      } catch {
        // Ignore unparseable responses
      }
    }
  });

  try {
    await page.goto('https://directory.americanexpress.com/en-NZ/shop-small/', {
      waitUntil: 'domcontentloaded',
      timeout: 45000
    });
    await page.waitForTimeout(5000);

    const hubs = ['Auckland', 'Wellington', 'Christchurch', 'Hamilton', 'Tauranga', 'Dunedin', 'Queenstown'];
    for (const hub of hubs) {
      console.log(`Searching hub: ${hub}`);
      try {
        const input = await page.$('input[type="text"], input[type="search"]');
        if (input) {
          await input.fill(hub);
          await input.press('Enter');
          await page.waitForTimeout(4000);
        }
      } catch (err) {
        console.warn(`Hub search warning for ${hub}:`, err.message);
      }
    }
  } catch (err) {
    console.error('Scrape execution error:', err.message);
  } finally {
    await browser.close();
  }

  const updatedRecords = Array.from(merchantsMap.values());
  console.log(`Finished run. Total records in catalog: ${updatedRecords.length} (New captured: ${capturedNewCount})`);

  if (updatedRecords.length > 0) {
    fs.writeFileSync(DATA_FILE, JSON.stringify(updatedRecords, null, 2));
    console.log(`Successfully written to ${DATA_FILE}`);
  } else {
    console.warn('No records obtained; preserving existing data.json.');
  }
}

scrape();
