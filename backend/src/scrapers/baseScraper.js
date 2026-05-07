'use strict';

// Set local browsers path for Playwright
const path = require('path');
process.env.PLAYWRIGHT_BROWSERS_PATH = path.join(__dirname, '../../browsers');

const { chromium } = require('playwright');
const config = require('../config/dotenv');
const logger = require('../config/logger');
const proxyHelper = require('../utils/proxyHelper');
const { randomDelay } = require('../utils/retryHelper');

// ─── Browser Pool Singleton ────────────────────────────────────────────────
// Reuses a single Chromium instance across all scraper requests.
// Saves ~3s per request vs launching a new browser each time.
let _browserInstance = null;
let _browserLaunchPromise = null; // prevents duplicate launches on concurrent cold start

async function getSharedBrowser(proxyUrl = null) {
  // Health check — isConnected() is synchronous and reliable
  if (_browserInstance) {
    if (_browserInstance.isConnected && _browserInstance.isConnected()) {
      return _browserInstance;
    }
    logger.warn('[BaseScraper] Browser disconnected, relaunching...');
    _browserInstance = null;
    _browserLaunchPromise = null;
  }

  // If another caller is already launching, wait for that Promise
  if (_browserLaunchPromise) {
    return _browserLaunchPromise;
  }

  // First caller: launch browser, cache the Promise so concurrent callers wait
  _browserLaunchPromise = (async () => {
    try {
      logger.info('[BaseScraper] Launching shared browser pool...');
      const launchOptions = {
        headless: config.scraping.headless,
        executablePath: chromium.executablePath(),
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-blink-features=AutomationControlled',
          '--disable-dev-shm-usage',
          '--disable-accelerated-2d-canvas',
          '--no-first-run',
          '--no-zygote',
          '--disable-gpu',
          '--blink-settings=imagesEnabled=false',
          '--window-size=1366,768',
        ],
      };
      if (proxyUrl) {
        launchOptions.proxy = proxyHelper.buildPlaywrightProxy(proxyUrl);
      }
      _browserInstance = await chromium.launch(launchOptions);
      logger.info('[BaseScraper] Browser pool ready');
      return _browserInstance;
    } finally {
      // Always clear the promise slot — even if launch failed
      _browserLaunchPromise = null;
    }
  })();

  return _browserLaunchPromise;
}

async function closeSharedBrowser() {
  if (_browserInstance) {
    try {
      await _browserInstance.close();
    } catch (err) {
      logger.warn('[BaseScraper] Error closing browser: ' + err.message);
    }
    _browserInstance = null;
    _browserLaunchPromise = null;
    logger.info('[BaseScraper] Browser pool closed');
  }
}

// ─── User Agent Pool ───────────────────────────────────────────────────────
const USER_AGENTS = [
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:132.0) Gecko/20100101 Firefox/132.0',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.1 Safari/605.1.15',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36 Edg/131.0.0.0',
];

// Matching sec-ch-ua values — only Chrome/Edge send this header
const SEC_CH_UA_MAP = {
  'Chrome/131': '"Google Chrome";v="131", "Chromium";v="131", "Not_A Brand";v="24"',
  'Chrome/130': '"Google Chrome";v="130", "Chromium";v="130", "Not_A Brand";v="24"',
  'Edg/131':    '"Microsoft Edge";v="131", "Chromium";v="131", "Not_A Brand";v="24"',
};

function getSecChUa(userAgent) {
  if (userAgent.includes('Edg/131'))    return SEC_CH_UA_MAP['Edg/131'];
  if (userAgent.includes('Chrome/131')) return SEC_CH_UA_MAP['Chrome/131'];
  if (userAgent.includes('Chrome/130')) return SEC_CH_UA_MAP['Chrome/130'];
  return null; // Firefox and Safari don't send sec-ch-ua
}

// ─── Spec Key Normalizer ───────────────────────────────────────────────────
/**
 * Normalise a spec key into a consistent snake_case format for JSONB storage.
 * Preserves human-readable meaning — does NOT strip units like GB or GHz
 * because "ram" is ambiguous but "ram_gb" is not.
 *
 * Examples:
 *   "CPU Type"  → "cpu_type"
 *   "RAM (GB)"  → "ram_gb"
 *   "  Storage" → "storage"
 *
 * @param {string} key
 * @returns {string}
 */
function normalizeSpecKey(key) {
  if (!key || typeof key !== 'string') return '';
  return key
    .trim()
    .toLowerCase()
    .replace(/[()[\]]/g, '')     // strip bracket characters
    .replace(/\s+/g, '_')        // spaces → underscores
    .replace(/[^a-z0-9_]/g, '')  // remove anything else
    .replace(/__+/g, '_')        // collapse repeated underscores
    .replace(/^_|_$/g, '')       // trim leading/trailing underscores
    .substring(0, 60);           // DB column safety cap
}

// ─── Spec Extractor ────────────────────────────────────────────────────────
/**
 * Build the specs JSONB object from a raw scraper result.
 *
 * Handles two input shapes:
 *   raw.specs      → plain object  { cpu: 'Ryzen 5', ram: '16GB' }
 *   raw.specsArray → array         [{ name: 'CPU', value: 'Ryzen 5' }]
 *
 * Does NOT absorb sku / brand / variation / stock into specs — those
 * are now dedicated columns on the products table and are handled
 * separately in normalizeProduct().
 *
 * @param {object} raw
 * @returns {object} flat key-value map safe for JSONB
 */
function extractSpecs(raw) {
  const specs = {};

  // Shape 1: plain object
  if (raw.specs && typeof raw.specs === 'object' && !Array.isArray(raw.specs)) {
    for (const [key, value] of Object.entries(raw.specs)) {
      if (!value || typeof value !== 'string') continue;
      const k = normalizeSpecKey(key);
      if (k) specs[k] = value.trim().substring(0, 500);
    }
  }

  // Shape 2: array of { name, value } pairs
  if (Array.isArray(raw.specsArray)) {
    for (const spec of raw.specsArray) {
      if (!spec?.name || !spec?.value) continue;
      const k = normalizeSpecKey(spec.name);
      if (k) specs[k] = String(spec.value).trim().substring(0, 500);
    }
  }

  return specs;
}

// ─── normalizeProduct ──────────────────────────────────────────────────────
/**
 * Convert raw scraper output into the exact shape expected by
 * productRepository.upsertProduct() / upsertMany().
 *
 * COLUMN MAPPING (matches DATABASE_SETUP.sql exactly):
 *   title, price, original_price, discount_percent, is_on_sale,
 *   promo_label, rating, reviews_count, seller_name, product_url,
 *   image_url, platform_id*, specs, is_available, last_scraped,
 *   sku, brand, variation, view_count*
 *
 *   * platform_id is a UUID FK resolved by searchService — left null here.
 *   * view_count starts at 0 and is incremented by searchService.
 *
 * NOTE: Do NOT include `id` — the DB generates UUIDs automatically.
 * NOTE: Do NOT include runtime-only fields (_score, _reasons, _source).
 *       Those are added by rankingEngine after the DB round-trip.
 *
 * @param {object} raw   - Raw product object from a store scraper
 * @param {string} store - Store key: 'pcexpress' | 'villman' | 'pcworx'
 * @param {number} index - Position in the batch (used only for logging)
 * @returns {object} DB-ready product row
 */
function normalizeProduct(raw, store, index) {
  // ── Price fields ──────────────────────────────────────────────────────────
  const price = parseFloat(raw.price) || 0;

  // originalPrice must be a valid positive number — null otherwise
  let originalPrice = null;
  if (raw.originalPrice !== null && raw.originalPrice !== undefined) {
    const parsed = parseFloat(raw.originalPrice);
    if (!isNaN(parsed) && parsed > 0) originalPrice = parsed;
  }

  // Discount: only computed when original is valid AND strictly higher than price
  let discountPercent = null;
  let isOnSale = false;

  if (originalPrice && originalPrice > price) {
    discountPercent = ((originalPrice - price) / originalPrice) * 100;
    isOnSale = true;
  } else if (typeof raw.promoLabel === 'string' && raw.promoLabel.trim()) {
    // No price-based discount but a promo label exists — still mark as on-sale
    isOnSale = true;
  }

  // Guard: never store NaN in the DB
  if (discountPercent !== null && isNaN(discountPercent)) {
    discountPercent = null;
  }

  // ── Specs ────────────────────────────────────────────────────────────────
  const specs = extractSpecs(raw);

  // ── Promo label ──────────────────────────────────────────────────────────
  const promoLabel =
    typeof raw.promoLabel === 'string' && raw.promoLabel.trim()
      ? raw.promoLabel.trim()
      : null;

  // ── Deal logging ─────────────────────────────────────────────────────────
  if (isOnSale || discountPercent) {
    logger.info(
      `[normalizeProduct] Deal: "${(raw.title || '').substring(0, 50)}"` +
      ` | store=${store}` +
      ` | price=${price}` +
      ` | original=${originalPrice}` +
      ` | discount=${discountPercent?.toFixed(1) ?? 'n/a'}%` +
      ` | promo="${promoLabel ?? 'none'}"` +
      ` | specs=${Object.keys(specs).length} keys`
    );
  }

  // ── is_available ─────────────────────────────────────────────────────────
  // Scrapers use snake_case (is_available) — check both forms defensively
  const isAvailable =
    raw.is_available !== false && raw.isAvailable !== false;

  // ── Return: ONLY columns that exist in the products table ─────────────────
  // searchService resolves platform_id and adds it before calling upsertMany.
  // NOTE: We do NOT include _source or other internal fields here
  //       All products now include proper ID generation in productRepository.upsertProductsBatch
  return {
    // Core identification (no `id` — DB generates UUID)
    title:            raw.title       || 'Unknown Product',
    product_url:      raw.product_url || raw.productUrl || '',
    image_url:        raw.image_url   || raw.imageUrl   || null,
    seller_name:      raw.seller_name || raw.sellerName || store,

    // NEW dedicated columns (added in migrations)
    brand:            raw.brand     || null,
    sku:              raw.sku       || null,
    variation:        raw.variation || null,

    // Pricing
    price,
    original_price:   originalPrice,
    discount_percent: discountPercent,
    is_on_sale:       isOnSale,
    promo_label:      promoLabel,

    // Ratings
    rating:           parseFloat(raw.rating) || null,
    reviews_count:    parseInt(raw.reviews_count ?? raw.reviewCount ?? 0, 10) || 0,

    // Details
    specs,
    free_items:       Array.isArray(raw.free_items) ? raw.free_items : null,
    is_available:     isAvailable,
    stock:            Number.isInteger(raw.stock) ? raw.stock : null,

    // Metadata
    last_scraped:     new Date().toISOString(),
    view_count:       0,   // searchService increments this after the upsert

    // platform_id is a UUID FK — searchService resolves and injects this
    // before calling productRepository.upsertMany().
    platform_id:      null,
  };
}

// ─── BaseScraper Class ─────────────────────────────────────────────────────
class BaseScraper {
  constructor(name) {
    this.name = name;
  }

  getRandomUserAgent() {
    return USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)];
  }

  async getBrowser() {
    const proxyUrl = proxyHelper.getNextProxy();
    if (proxyUrl) {
      logger.debug(`[${this.name}] Using proxy: ${proxyUrl.split('@')[1] || proxyUrl}`);
    }
    return getSharedBrowser(proxyUrl);
  }

  async newContext(browser) {
    const userAgent = this.getRandomUserAgent();
    const secChUa   = getSecChUa(userAgent);

    const extraHeaders = {
      'Accept':                  'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
      'Accept-Language':         'en-US,en;q=0.9',
      'Accept-Encoding':         'gzip, deflate, br',
      'Cache-Control':           'max-age=0',
      'Upgrade-Insecure-Requests': '1',
    };

    if (secChUa) {
      extraHeaders['sec-ch-ua']          = secChUa;
      extraHeaders['sec-ch-ua-mobile']   = '?0';
      extraHeaders['sec-ch-ua-platform'] = userAgent.includes('Macintosh') ? '"macOS"' : '"Windows"';
    }

    const context = await browser.newContext({
      userAgent,
      viewport: {
        width:  1280 + Math.floor(Math.random() * 200),
        height:  768 + Math.floor(Math.random() * 200),
      },
      locale:            'en-US',
      timezoneId:        'Asia/Manila',
      extraHTTPHeaders:  extraHeaders,
      deviceScaleFactor: Math.random() > 0.5 ? 1 : 1.25,
    });

    // Stealth: hide automation fingerprints
    await context.addInitScript(() => {
      Object.defineProperty(navigator, 'webdriver', { get: () => undefined });
      Object.defineProperty(navigator, 'plugins', {
        get: () => [
          { name: 'Chrome PDF Plugin',  filename: 'internal-pdf-viewer' },
          { name: 'Chrome PDF Viewer',  filename: 'mhjfbmdgcfjbbpaeojofohoefgiehjai' },
          { name: 'Native Client',      filename: 'internal-nacl-plugin' },
        ],
      });
      Object.defineProperty(navigator, 'languages', { get: () => ['en-US', 'en'] });
      window.chrome = { runtime: {}, loadTimes: () => {}, csi: () => {}, app: {} };
      const orig = window.navigator.permissions?.query;
      if (orig) {
        window.navigator.permissions.query = (p) =>
          p.name === 'notifications'
            ? Promise.resolve({ state: Notification.permission })
            : orig(p);
      }
    });

    const page = await context.newPage();

    // Playwright timeout (45s) stays inside the service-level timeout (90s),
    // so Playwright errors surface cleanly through Promise.allSettled.
    page.setDefaultTimeout(45000);
    page.setDefaultNavigationTimeout(45000);

    // Block images — cuts page load time by ~40% with no scraping impact
    await page.route('**/*.{png,jpg,jpeg,gif,webp,svg,ico}', route => route.abort());

    return { page, context };
  }

  /**
   * Scrape multiple product URLs with concurrency control.
   * Inherited by all store scrapers — do not override unless you have a
   * store-specific reason (PCExpress overrides to add abort support).
   *
   * @param {string[]} urls
   * @param {number}   concurrency  Max parallel pages (keep ≤4 to avoid rate-limiting)
   * @param {AbortSignal} signal    Optional cancellation signal from searchService
   * @returns {Promise<object[]>}  Array of normalised products (nulls filtered out)
   */
  async scrapeMany(urls, concurrency = 4, signal = null) {
    const results = [];

    for (let i = 0; i < urls.length; i += concurrency) {
      if (signal?.aborted) {
        logger.warn(`[${this.name}] scrapeMany aborted at batch ${Math.floor(i / concurrency)}`);
        break;
      }

      const batch   = urls.slice(i, i + concurrency);
      const settled = await Promise.allSettled(batch.map(url => this.scrape(url)));

      for (const result of settled) {
        if (result.status === 'fulfilled' && result.value) {
          results.push(result.value);
        } else if (result.status === 'rejected') {
          logger.warn(`[${this.name}] scrape failed: ${result.reason?.message}`);
        }
      }

      // Pace between batches — randomised to avoid rate-limit triggers
      await this.pace();
    }

    return results;
  }

  /**
   * Human-like scroll — variable speed with occasional upward jitter.
   * @param {Page}   page
   * @param {number} scrolls  Number of scroll steps
   */
  async humanScroll(page, scrolls = 3) {
    for (let i = 0; i < scrolls; i++) {
      const amount = (0.5 + Math.random() * 0.5) * 500;
      await page.evaluate(a => window.scrollBy({ top: a, behavior: 'smooth' }), amount);
      await randomDelay(600, 1500);

      // Occasionally scroll back a little (mimics real reading behaviour)
      if (Math.random() > 0.7) {
        await page.evaluate(() => window.scrollBy({ top: -100, behavior: 'smooth' }));
        await randomDelay(300, 600);
      }
    }
  }

  /** Randomised inter-request delay — configured via dotenv. */
  async pace() {
    await randomDelay(config.scraping.delayMin, config.scraping.delayMax);
  }

  /** Randomised mouse move — adds realism, non-critical. */
  async randomMouseMove(page) {
    try {
      const x = 100 + Math.floor(Math.random() * 900);
      const y = 100 + Math.floor(Math.random() * 500);
      await page.mouse.move(x, y, { steps: 10 });
    } catch {
      // Ignore — this is cosmetic only
    }
  }

  /** Must be implemented by every store scraper subclass. */
  async scrape(url) {
    throw new Error(`${this.name}.scrape() is not implemented`);
  }
}

module.exports = {
  BaseScraper,
  normalizeProduct,
  getSharedBrowser,
  closeSharedBrowser,
  extractSpecs,
  normalizeSpecKey,
};