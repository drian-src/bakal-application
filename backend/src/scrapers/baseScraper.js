'use strict';

const { chromium } = require('playwright');
const config = require('../config/dotenv');
const logger = require('../config/logger');
const proxyHelper = require('../utils/proxyHelper');
const { randomDelay } = require('../utils/retryHelper');

// Realistic modern user agents — updated for 2025
const USER_AGENTS = [
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:132.0) Gecko/20100101 Firefox/132.0',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.1 Safari/605.1.15',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36 Edg/131.0.0.0',
];

// Matching sec-ch-ua headers for each user agent
const SEC_CH_UA_MAP = {
  'Chrome/131': '"Google Chrome";v="131", "Chromium";v="131", "Not_A Brand";v="24"',
  'Chrome/130': '"Google Chrome";v="130", "Chromium";v="130", "Not_A Brand";v="24"',
  'Firefox/132': null, // Firefox doesn't send sec-ch-ua
  'Safari/605': null,  // Safari doesn't send sec-ch-ua
  'Edg/131': '"Microsoft Edge";v="131", "Chromium";v="131", "Not_A Brand";v="24"',
};

function getSecChUa(userAgent) {
  if (userAgent.includes('Edg/131')) return SEC_CH_UA_MAP['Edg/131'];
  if (userAgent.includes('Chrome/131')) return SEC_CH_UA_MAP['Chrome/131'];
  if (userAgent.includes('Chrome/130')) return SEC_CH_UA_MAP['Chrome/130'];
  return null;
}

class BaseScraper {
  constructor(name) {
    this.name = name;
    this.browser = null;
  }

  getRandomUserAgent() {
    return USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)];
  }

  async launchBrowser() {
    const proxyUrl = proxyHelper.getNextProxy();
    const launchOptions = {
      headless: config.scraping.headless,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-blink-features=AutomationControlled',
        '--disable-dev-shm-usage',
        '--disable-accelerated-2d-canvas',
        '--no-first-run',
        '--no-zygote',
        '--disable-gpu',
        // Make window size realistic
        '--window-size=1366,768',
      ],
    };
    if (proxyUrl) {
      launchOptions.proxy = proxyHelper.buildPlaywrightProxy(proxyUrl);
      logger.debug(`[${this.name}] Using proxy: ${proxyUrl.split('@')[1] || proxyUrl}`);
    }
    this.browser = await chromium.launch(launchOptions);
    return this.browser;
  }

  async newPage(browser) {
    const userAgent = this.getRandomUserAgent();
    const secChUa = getSecChUa(userAgent);
    const isMobile = false;

    // Build realistic headers matching the chosen user agent
    const extraHeaders = {
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
      'Accept-Language': 'en-US,en;q=0.9',
      'Accept-Encoding': 'gzip, deflate, br',
      'Cache-Control': 'max-age=0',
      'Upgrade-Insecure-Requests': '1',
    };

    // Only add sec-ch-ua for Chrome/Edge (not Firefox/Safari)
    if (secChUa) {
      extraHeaders['sec-ch-ua'] = secChUa;
      extraHeaders['sec-ch-ua-mobile'] = '?0';
      extraHeaders['sec-ch-ua-platform'] = userAgent.includes('Macintosh') ? '"macOS"' : '"Windows"';
    }

    const context = await browser.newContext({
      userAgent,
      viewport: {
        width: 1280 + Math.floor(Math.random() * 200),
        height: 768 + Math.floor(Math.random() * 200),
      },
      locale: 'en-US',
      timezoneId: 'Asia/Manila',
      extraHTTPHeaders: extraHeaders,
      // Randomize device pixel ratio like a real browser
      deviceScaleFactor: Math.random() > 0.5 ? 1 : 1.25,
    });

    // Inject stealth scripts to hide automation fingerprints
    await context.addInitScript(() => {
      // Remove webdriver property
      Object.defineProperty(navigator, 'webdriver', { get: () => undefined });

      // Fake plugins list like a real browser
      Object.defineProperty(navigator, 'plugins', {
        get: () => [
          { name: 'Chrome PDF Plugin', filename: 'internal-pdf-viewer' },
          { name: 'Chrome PDF Viewer', filename: 'mhjfbmdgcfjbbpaeojofohoefgiehjai' },
          { name: 'Native Client', filename: 'internal-nacl-plugin' },
        ],
      });

      // Fake languages
      Object.defineProperty(navigator, 'languages', {
        get: () => ['en-US', 'en'],
      });

      // Hide automation in chrome object
      window.chrome = {
        runtime: {},
        loadTimes: () => {},
        csi: () => {},
        app: {},
      };

      // Prevent detection via permissions API
      const originalQuery = window.navigator.permissions?.query;
      if (originalQuery) {
        window.navigator.permissions.query = (parameters) =>
          parameters.name === 'notifications'
            ? Promise.resolve({ state: Notification.permission })
            : originalQuery(parameters);
      }
    });

    const page = await context.newPage();
    page.setDefaultTimeout(config.scraping.timeout);
    return page;
  }

  async closeBrowser() {
    if (this.browser) {
      await this.browser.close();
      this.browser = null;
    }
  }

  /**
   * Human-like scrolling — variable speed, occasional pause, scroll back up slightly.
   */
  async humanScroll(page, scrolls = 3) {
    for (let i = 0; i < scrolls; i++) {
      // Vary scroll distance like a human
      const scrollAmount = (0.5 + Math.random() * 0.5) * 500;
      await page.evaluate((amount) => {
        window.scrollBy({ top: amount, behavior: 'smooth' });
      }, scrollAmount);

      await randomDelay(600, 1500);

      // Occasionally scroll back up a little (human behavior)
      if (Math.random() > 0.7) {
        await page.evaluate(() => {
          window.scrollBy({ top: -100, behavior: 'smooth' });
        });
        await randomDelay(300, 600);
      }
    }
  }

  /**
   * Apply random delay to simulate human pacing.
   */
  async pace() {
    await randomDelay(config.scraping.delayMin, config.scraping.delayMax);
  }

  /**
   * Move mouse to a random position — adds realism.
   */
  async randomMouseMove(page) {
    try {
      const x = 100 + Math.floor(Math.random() * 900);
      const y = 100 + Math.floor(Math.random() * 500);
      await page.mouse.move(x, y, { steps: 10 });
    } catch {
      // Non-critical — ignore if it fails
    }
  }

  /**
   * To be implemented by subclasses.
   */
  async scrape(url) {
    throw new Error(`${this.name}.scrape() not implemented`);
  }
}

module.exports = BaseScraper;