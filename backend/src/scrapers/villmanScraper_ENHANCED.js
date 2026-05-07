'use strict';

const { BaseScraper, normalizeProduct } = require('./baseScraper');
const logger = require('../config/logger');
const { withRetry, randomDelay } = require('../utils/retryHelper');

const BASE_URL = 'https://shop.villman.com';

/**
 * VillmanScraper — Complete production implementation for Bakàl e-commerce aggregator
 * Extends BaseScraper with Villman-specific selectors and data extraction
 * 
 * Architecture:
 * - Shopify API → DOM Fallback (graceful degradation)
 * - Spec extraction: JSON API options + HTML body parsing
 * - Free items, promo labels, and brand extraction
 * - SKU generation for deduplication
 * - Fully async/await based with error handling
 */
class VillmanScraper extends BaseScraper {
  constructor() {
    super('VillmanScraper');
  }

  /**
   * Search for products by query.
   * Flow: Shopify Predictive API → HTML Fallback → scrapeMany
   * 
   * @param {string} query - Search query
   * @param {number} maxResults - Max products to return (optional)
   * @param {AbortSignal} signal - Abort signal for cancellation
   * @returns {Promise<Array>} Array of normalized products
   */
  async search(query, maxResults = null, signal = null) {
    return withRetry(async () => {
      let browser, context, page;
      try {
        browser = await this.getBrowser();
        const result = await this.newContext(browser);
        page = result.page;
        context = result.context;

        // ─── SHOPIFY PREDICTIVE SEARCH API (PRIMARY) ──────────────────────
        const apiUrl = `${BASE_URL}/search/suggest.json?q=${encodeURIComponent(query)}&resources[type]=product&resources[limit]=10`;
        logger.debug(`[VillmanScraper] Calling Shopify API: ${apiUrl}`);

        await page.goto(apiUrl, { waitUntil: 'domcontentloaded', timeout: 20000 });
        const jsonText = await page.evaluate(() => document.body.innerText);

        let productUrls = [];
        try {
          const data = JSON.parse(jsonText);
          const products = data?.resources?.results?.products || [];
          productUrls = products
            .map(p => p.url ? `${BASE_URL}${p.url.split('?')[0]}` : null)
            .filter(Boolean);
          if (maxResults) {
            productUrls = productUrls.slice(0, maxResults);
          }
          logger.info(`[VillmanScraper] API found ${productUrls.length} product URLs for "${query}"`);
        } catch (e) {
          logger.warn(`[VillmanScraper] API parse failed: ${e.message}`);
        }

        // ─── HTML FALLBACK (if API returns 0 results) ────────────────────
        if (productUrls.length === 0) {
          const searchUrl = `${BASE_URL}/search?type=product&q=${encodeURIComponent(query)}`;
          logger.debug(`[VillmanScraper] Fallback to search page: ${searchUrl}`);

          await page.goto(searchUrl, { waitUntil: 'domcontentloaded', timeout: 25000 });
          await randomDelay(2000, 3000);
          await this.humanScroll(page, 3);

          productUrls = await page.evaluate(() => {
            const links = new Set();
            document.querySelectorAll('a[href*="/products/"]').forEach(a => {
              if (a.href.includes('shop.villman.com') && !a.href.includes('cdn.shopify')) {
                try {
                  const url = new URL(a.href);
                  links.add(`${url.protocol}//${url.hostname}${url.pathname}`);
                } catch {}
              }
            });
            return [...links];
          });

          if (maxResults) {
            productUrls = productUrls.slice(0, maxResults);
          }
          logger.info(`[VillmanScraper] Fallback found ${productUrls.length} product URLs`);
        }

        // ─── PROCESS RESULTS ───────────────────────────────────────────
        return await this.scrapeMany(productUrls, 4, signal);
      } finally {
        if (context) {
          try {
            await context.close();
          } catch (_closeErr) {
            // Ignore close errors — browser may have crashed
          }
        }
      }
    }, 3, 2000, 'VillmanScraper.search');
  }

  /**
   * Scrape a single product URL.
   * Flow: Shopify JSON endpoint → DOM Extraction with Villman selectors
   * 
   * @param {string} url - Product URL to scrape
   * @returns {Promise<object|null>} Normalized product object or null on failure
   */
  async scrape(url) {
    return withRetry(async () => {
      let browser, context, page;
      try {
        browser = await this.getBrowser();
        const result = await this.newContext(browser);
        page = result.page;
        context = result.context;

        const cleanUrl = url.split('?')[0];

        // ─────────────────────────────────────────────────────────────
        // STEP 1: TRY SHOPIFY JSON API (FASTEST — ~8s)
        // ─────────────────────────────────────────────────────────────
        const jsonUrl = cleanUrl + '.json';
        logger.debug(`[VillmanScraper] Trying Shopify JSON: ${jsonUrl}`);
        
        try {
          await page.goto(jsonUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });
          const jsonText = await page.evaluate(() => document.body.innerText);
          const productData = JSON.parse(jsonText)?.product;

          if (productData && productData.title) {
            logger.debug(`[VillmanScraper] JSON success: ${productData.title}`);
            return this._normalizeVillmanProduct(
              this._extractFromShopifyJson(productData),
              cleanUrl
            );
          }
        } catch (err) {
          logger.debug(`[VillmanScraper] JSON failed: ${err.message}`);
        }

        // ─────────────────────────────────────────────────────────────
        // STEP 2: DOM EXTRACTION WITH VILLMAN SELECTORS (~20s)
        // ─────────────────────────────────────────────────────────────
        logger.debug(`[VillmanScraper] Fallback to DOM extraction: ${cleanUrl}`);

        // Pre-load homepage for cookies (optional but helps with page state)
        await page.goto(BASE_URL, { waitUntil: 'domcontentloaded', timeout: 20000 });
        await randomDelay(1000, 2000);

        // Load product page
        await page.goto(cleanUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });
        await randomDelay(2000, 3000);
        await this.humanScroll(page, 2);

        // Wait for product section to render
        await page.waitForSelector('h1, body > section', { timeout: 15000 }).catch(() => {});

        // Extract all data in one page.evaluate() call
        const extractedData = await page.evaluate(() => {
          // Safe selector helper with fallbacks
          const safeText = (selector, fallbacks = []) => {
            let sels = [selector, ...fallbacks];
            for (const s of sels) {
              try {
                const el = document.querySelector(s);
                if (el && el.textContent?.trim()) {
                  return el.textContent.trim();
                }
              } catch {}
            }
            return null;
          };

          // Safe image source helper with scoping
          const getSrc = (selector, primaryScope = null) => {
            try {
              let container = document.body;
              if (primaryScope) {
                const scope = document.querySelector(primaryScope);
                if (scope) container = scope;
              }
              const img = container.querySelector(selector);
              return img?.src || null;
            } catch {}
            return null;
          };

          return {
            // ─── TITLE EXTRACTION ─────────────────────────────────────────
            // Primary: body > section > h1
            // Fallbacks: product title classes, generic h1
            title: safeText('body > section > h1', [
              'h1.product__title',
              'h1.product-single__title',
              '[class*="product"][class*="title"]',
              'h1'
            ]),

            // ─── SPECS EXTRACTION ─────────────────────────────────────────
            // Primary: body > section > div > div.div_mid > div.prod2_summ > div.prod2_info > div.prod2_desc
            // Fallbacks: common spec/detail/description classes
            specs_raw: safeText(
              'body > section > div > div.div_mid > div.prod2_summ > div.prod2_info > div.prod2_desc',
              ['[class*="spec"]', '[class*="detail"]', '[class*="description"]', '[class*="product-details"]']
            ),

            // ─── FREE ITEMS EXTRACTION ─────────────────────────────────────
            // Primary: body > section > div > div.div_mid > div.prod2_summ > div.prod2_info > div.prod2_free
            // Fallbacks: free/bonus/gift classes
            free_items_raw: safeText(
              'body > section > div > div.div_mid > div.prod2_summ > div.prod2_info > div.prod2_free',
              ['[class*="free"]', '[class*="bonus"]', '[class*="gift"]', '[class*="includes"]']
            ),

            // ─── PROMO EXTRACTION ─────────────────────────────────────────
            // Primary: body > section > div > div.div_mid > div.prod2_summ > div.prod2_info > div.prod2_promo
            // Fallbacks: promo/discount/sale classes
            promo_raw: safeText(
              'body > section > div > div.div_mid > div.prod2_summ > div.prod2_info > div.prod2_promo',
              ['[class*="promo"]', '[class*="discount"]', '[class*="sale"]', '.badge', '[class*="offer"]']
            ),

            // ─── IMAGE EXTRACTION (SCOPED) ────────────────────────────────
            // Scope: product section container to avoid page-wide images
            // Primary scope: body > section > div > div.div_mid > div.prod2_summ
            // Fallback: meta[property="og:image"]
            image_url: getSrc(
              'img',
              'body > section > div > div.div_mid > div.prod2_summ'
            ) || (
              () => {
                try {
                  return document.querySelector('meta[property="og:image"]')?.content || null;
                } catch {
                  return null;
                }
              }
            )(),

            // ─── ORIGINAL PRICE & DISCOUNT ─────────────────────────────────
            // Extract strikethrough price and promo badges
            original_price: (() => {
              const strikethroughSelectors = ['del', 's', '.old-price', '.original-price', '.compare-price', '[class*="original"]'];
              for (const sel of strikethroughSelectors) {
                try {
                  const el = document.querySelector(sel);
                  if (el && el.textContent?.trim()) {
                    const val = parseFloat(el.textContent.replace(/[^\d.]/g, ''));
                    if (!isNaN(val) && val > 0) return val;
                  }
                } catch {}
              }
              return null;
            })(),

            // ─── BRAND EXTRACTION ──────────────────────────────────────────
            brand: safeText('[class*="brand"]', ['[class*="vendor"]', '[class*="manufacturer"]']),

            // ─── STOCK/AVAILABILITY ────────────────────────────────────────
            is_available: !document.querySelector('[class*="sold-out"], [class*="unavailable"], [aria-disabled="true"]'),
          };
        });

        // Validate title — required field
        if (!extractedData.title) {
          logger.warn(`[VillmanScraper] Could not extract title from ${cleanUrl}`);
          return null;
        }

        // Return normalized product
        return this._normalizeVillmanProduct(extractedData, cleanUrl);

      } finally {
        if (context) {
          try {
            await context.close();
          } catch (_closeErr) {
            // Ignore close errors — browser may have crashed
          }
        }
      }
    }, 3, 2000, `VillmanScraper.scrape(${url})`);
  }

  /**
   * Extract product data from Shopify JSON API response.
   * Parses options, variants, and HTML body for specifications.
   * 
   * @private
   * @param {object} productData - Shopify product JSON object
   * @returns {object} Extracted data ready for normalization
   */
  _extractFromShopifyJson(productData) {
    const variant = productData.variants?.[0];
    
    // ─── SPECS FROM SHOPIFY OPTIONS ────────────────────────────────────
    // Shopify stores product attributes in options array
    // Example: Color, Size, Style → each with values array
    const specs = {};
    if (productData.options && Array.isArray(productData.options)) {
      productData.options.forEach(opt => {
        if (opt.name && opt.values && Array.isArray(opt.values)) {
          const normalizedKey = opt.name.toLowerCase().replace(/\s+/g, '_');
          specs[normalizedKey] = opt.values.join(', ');
        }
      });
    }

    // ─── SPECS FROM HTML BODY ──────────────────────────────────────────
    // Extract list items from product description HTML
    if (productData.body_html) {
      const html = productData.body_html;
      const liMatches = html.match(/<li>([^<]+)<\/li>/g);
      if (liMatches) {
        liMatches.forEach((li, idx) => {
          const text = li.replace(/<[^>]+>/g, '').trim();
          if (text && idx < 10) {
            specs[`detail_${idx}`] = text;
          }
        });
      }
    }

    return {
      title: productData.title || null,
      price: variant?.price ? parseFloat(variant.price) : null,
      image_url: productData.images?.[0]?.src || null,
      specs: specs,
      free_items_raw: null,
      promo_raw: null,
      original_price: null,
      brand: null,
      is_available: true,
    };
  }

  /**
   * Normalize extracted Villman product data into standard format.
   * Applies all parsing, validation, and transformation rules.
   * 
   * @private
   * @param {object} extractedData - Raw extracted data
   * @param {string} productUrl - Product URL for reference
   * @returns {object} Normalized product (passed to normalizeProduct())
   */
  _normalizeVillmanProduct(extractedData, productUrl) {
    // ─── NORMALIZE SPECS ───────────────────────────────────────────────
    const specs = this._parseSpecs(extractedData.specs_raw || extractedData.specs || {});

    // ─── PARSE FREE ITEMS ──────────────────────────────────────────────
    const freeItems = this._parseFreeItems(extractedData.free_items_raw);

    // ─── CLEAN PROMO TEXT ─────────────────────────────────────────────
    const promo = (extractedData.promo_raw && extractedData.promo_raw.trim())
      ? extractedData.promo_raw.trim()
      : null;

    // ─── VALIDATE IMAGE URL ───────────────────────────────────────────
    const imageUrl = extractedData.image_url;
    const validImageUrl = imageUrl && (imageUrl.startsWith('http://') || imageUrl.startsWith('https://'))
      ? imageUrl
      : null;

    // ─── BUILD RAW PRODUCT OBJECT ─────────────────────────────────────
    const raw = {
      title: extractedData.title || null,
      price: extractedData.price || null,
      originalPrice: extractedData.original_price || null,
      specs: specs,
      image_url: validImageUrl,
      product_url: productUrl.split('?')[0],
      seller_name: 'Villman',
      free_items: freeItems,
      promo_label: promo,
      brand: extractedData.brand || null,
      is_available: extractedData.is_available !== false,
      sku: this._extractSkuFromUrl(productUrl),
    };

    // ─── NORMALIZE & RETURN ────────────────────────────────────────────
    return normalizeProduct(raw, 'villman', 0);
  }

  /**
   * Parse specs from raw text or object.
   * Handles "Key: Value" text format and object format.
   * Normalizes keys: lowercase, underscores, remove units.
   * 
   * @private
   * @param {string|object} rawSpecs - Raw specs (text or object)
   * @returns {object} Normalized specs object
   * 
   * @example
   * _parseSpecs("CPU: Ryzen 5\nRAM: 16GB") → { cpu: "Ryzen 5", ram: "16GB" }
   * _parseSpecs({ "CPU Type": "AMD Ryzen 5" }) → { cpu_type: "AMD Ryzen 5" }
   */
  _parseSpecs(rawSpecs) {
    const specs = {};

    if (typeof rawSpecs === 'string' && rawSpecs.trim()) {
      // Parse "Key: Value" format
      const lines = rawSpecs.split(/[\n;]+/);
      lines.forEach((line) => {
        const colonIdx = line.indexOf(':');
        if (colonIdx === -1) return;

        const key = line.substring(0, colonIdx).trim();
        const value = line.substring(colonIdx + 1).trim();

        if (key && value && key.length < 100) {
          const normalizedKey = key
            .toLowerCase()
            .replace(/[()]/g, '')          // Remove parentheses: "RAM (GB)" → "ram gb"
            .replace(/\s+/g, '_')          // Replace spaces with underscores
            .replace(/_gb|_mb|_ghz|_\d+/g, '') // Remove units
            .substring(0, 50);             // Max 50 chars

          if (normalizedKey) {
            specs[normalizedKey] = value.substring(0, 500);
          }
        }
      });
    } else if (typeof rawSpecs === 'object' && rawSpecs !== null && !Array.isArray(rawSpecs)) {
      // Already an object, just normalize keys
      Object.entries(rawSpecs).forEach(([key, value]) => {
        if (value && typeof value === 'string' && value.trim()) {
          const normalizedKey = key
            .toLowerCase()
            .replace(/[()]/g, '')
            .replace(/\s+/g, '_')
            .replace(/_gb|_mb|_ghz|_\d+/g, '')
            .substring(0, 50);

          if (normalizedKey) {
            specs[normalizedKey] = value.trim().substring(0, 500);
          }
        }
      });
    }

    return specs;
  }

  /**
   * Parse free items from raw text.
   * Splits by common delimiters: comma, semicolon, newline, plus sign.
   * Returns array of items or null if empty.
   * 
   * @private
   * @param {string} rawFreeItems - Raw free items text
   * @returns {Array<string>|null} Array of items or null
   * 
   * @example
   * _parseFreeItems("USB Cable, Warranty Card") → ["USB Cable", "Warranty Card"]
   * _parseFreeItems("Item 1; Item 2") → ["Item 1", "Item 2"]
   * _parseFreeItems(null) → null
   */
  _parseFreeItems(rawFreeItems) {
    if (!rawFreeItems || typeof rawFreeItems !== 'string') {
      return null;
    }

    const trimmed = rawFreeItems.trim();
    if (!trimmed) return null;

    // Split by common delimiters: comma, semicolon, newline, plus sign
    const items = trimmed
      .split(/[,;+\n]+/)
      .map(item => item.trim())
      .filter(item => item.length > 0 && item.length < 200);

    return items.length > 0 ? items : null;
  }

  /**
   * Extract SKU from product URL.
   * Shopify URLs: /products/product-name or /products/product-name-variant-id
   * Returns prefixed SKU: villman_product-name
   * 
   * @private
   * @param {string} url - Product URL
   * @returns {string|null} SKU or null if not extractable
   * 
   * @example
   * _extractSkuFromUrl("https://shop.villman.com/products/cpu-ryzen-5-123456")
   *   → "villman_cpu-ryzen-5"
   */
  _extractSkuFromUrl(url) {
    try {
      const pathname = new URL(url).pathname;
      // Match /products/product-handle
      const matches = pathname.match(/\/products\/(.+?)(?:\?|$)/);
      if (matches && matches[1]) {
        // Remove trailing variant ID (usually dash followed by numbers)
        const handle = matches[1].split('-').slice(0, -1).join('-') || matches[1];
        return `villman_${handle}`;
      }
    } catch {}
    return null;
  }

  /**
   * Scrape multiple product URLs with concurrency control.
   * Respects AbortSignal for early termination.
   * Uses pacing to avoid overwhelming the site.
   * 
   * @param {Array<string>} urls - Array of product URLs
   * @param {number} concurrency - Max parallel scrapes (default: 4)
   * @param {AbortSignal} signal - Abort signal for cancellation
   * @returns {Promise<Array>} Array of normalized products
   */
  async scrapeMany(urls, concurrency = 4, signal = null) {
    const results = [];

    for (let i = 0; i < urls.length; i += concurrency) {
      // Check abort signal before each batch
      if (signal?.aborted) {
        logger.warn(`[VillmanScraper] Scrape aborted — stopping at batch ${Math.ceil(i / concurrency)}`);
        break;
      }

      const batch = urls.slice(i, i + concurrency);
      const settled = await Promise.allSettled(batch.map(u => this.scrape(u)));

      // Collect successful results
      for (const r of settled) {
        if (r.status === 'fulfilled' && r.value) {
          results.push(r.value);
        } else if (r.status === 'rejected') {
          logger.error(`[VillmanScraper] Scrape error: ${r.reason?.message}`);
        }
      }

      // Pace between batches
      await this.pace();
    }

    logger.info(`[VillmanScraper] Scraped ${results.length}/${urls.length} products successfully`);
    return results;
  }
}

module.exports = VillmanScraper;
