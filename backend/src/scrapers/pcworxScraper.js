'use strict';

const { BaseScraper, normalizeProduct } = require('./baseScraper');
const logger = require('../config/logger');
const { withRetry, randomDelay } = require('../utils/retryHelper');

const BASE_URL = 'https://pcworx.ph';

/**
 * PCWorx Scraper — Complete implementation with PCWorx-specific selectors
 * Extends BaseScraper for Bakàl e-commerce price aggregator
 */
class PcWorxScraper extends BaseScraper {
  constructor() {
    super('PcWorxScraper');
  }

  /**
   * Search for products by query.
   * Flow: Shopify Predictive API → HTML Fallback → scrapeMany
   * @param {string} query - Search query
   * @param {number} maxResults - Max products to return
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

        // ─── METHOD 1: SHOPIFY PREDICTIVE SEARCH API (PRIMARY) ───────────────
        const apiUrl = `${BASE_URL}/search/suggest.json?q=${encodeURIComponent(query)}&resources[type]=product&resources[limit]=50`;
        logger.debug(`[PcWorxScraper] Calling API: ${apiUrl}`);

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
          logger.info(`[PcWorxScraper] API found ${productUrls.length} product URLs`);
        } catch (e) {
          logger.warn(`[PcWorxScraper] API parse failed: ${e.message}`);
        }

        // ─── METHOD 2: HTML FALLBACK (if API returns 0 results) ──────────────
        if (productUrls.length === 0) {
          const searchUrl = `${BASE_URL}/search?type=product&q=${encodeURIComponent(query)}`;
          logger.debug(`[PcWorxScraper] Fallback to search page: ${searchUrl}`);

          await page.goto(searchUrl, { waitUntil: 'domcontentloaded', timeout: 25000 });
          await randomDelay(2000, 3000);
          await this.humanScroll(page, 3);

          productUrls = await page.evaluate(() => {
            const links = new Set();
            document.querySelectorAll('a[href*="/products/"]').forEach(a => {
              if (a.href.includes('pcworx.ph') && !a.href.includes('cdn.shopify')) {
                try {
                  const url = new URL(a.href);
                  links.add(`${url.protocol}//${url.hostname}${url.pathname}`);
                } catch {}
              }
            });
            return [...links];
          });

          logger.info(`[PcWorxScraper] Fallback found ${productUrls.length} product URLs`);
        }

        // ─── PROCESS RESULTS ─────────────────────────────────────────────────
        const urlsToScrape = maxResults ? productUrls.slice(0, maxResults) : productUrls;
        return await this.scrapeMany(urlsToScrape, 4, signal);
      } finally {
        if (context) {
          try {
            await context.close();
          } catch (_closeErr) {
            // Ignore close errors
          }
        }
      }
    }, 3, 2000, 'PcWorxScraper.search');
  }

  /**
   * Scrape a single product URL.
   * Flow: Shopify JSON endpoint → DOM Extraction with PCWorx selectors
   * @param {string} url - Product URL to scrape
   * @returns {Promise<Object>} Normalized product object or null
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
        const jsonUrl = cleanUrl + '.json';

        // ─── METHOD 1: SHOPIFY JSON ENDPOINT (PRIORITY 1) ──────────────────
        logger.debug(`[PcWorxScraper] Scraping JSON: ${jsonUrl}`);
        await page.goto(jsonUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });
        const jsonText = await page.evaluate(() => document.body.innerText);

        let productData;
        try { productData = JSON.parse(jsonText)?.product; } catch { productData = null; }

        if (productData) {
          const variant = productData.variants?.[0];
          logger.debug(`[PcWorxScraper] JSON success: ${productData.title}`);

          // Extract specs from product data
          const specs = {};
          if (productData.options && Array.isArray(productData.options)) {
            productData.options.forEach(opt => {
              if (opt.name && opt.values && Array.isArray(opt.values)) {
                specs[opt.name.toLowerCase()] = opt.values.join(', ');
              }
            });
          }
          if (productData.body_html) {
            const html = productData.body_html;
            const liMatches = html.match(/<li>([^<]+)<\/li>/g);
            if (liMatches) {
              liMatches.forEach((li, idx) => {
                const text = li.replace(/<[^>]+>/g, '').trim();
                if (text && idx < 10) specs[`detail_${idx}`] = text;
              });
            }
          }

          const raw = {
            title: productData.title || null,
            price: variant?.price ? parseFloat(variant.price) : null,
            rating: null,
            reviews_count: null,
            seller_name: 'PC Worx',
            image_url: productData.images?.[0]?.src || null,
            product_url: cleanUrl,
            specs: specs,
          };
          return normalizeProduct(raw, 'pcworx', 0);
        }

        // ─── METHOD 2: DOM FALLBACK (if JSON fails) ──────────────────────────
        logger.debug(`[PcWorxScraper] JSON failed, using DOM for ${cleanUrl}`);
        await page.goto(BASE_URL, { waitUntil: 'domcontentloaded', timeout: 20000 });
        await randomDelay(1000, 2000);

        await page.goto(cleanUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });
        await randomDelay(2000, 3000);
        await this.humanScroll(page, 2);

        await page.waitForSelector('h1, [class*="product"]', { timeout: 15000 }).catch(() => {});

        // ─── SAFE DOM EXTRACTION ──────────────────────────────────────────────
        const product = await page.evaluate(() => {
          const getText = (sels) => {
            for (const s of sels) {
              const el = document.querySelector(s);
              if (el?.textContent?.trim()) return el.textContent.trim();
            }
            return null;
          };

          // Try JSON-LD first
          try {
            for (const s of document.querySelectorAll('script[type="application/ld+json"]')) {
              const d = JSON.parse(s.textContent);
              if (d['@type'] === 'Product') {
                const o = Array.isArray(d.offers) ? d.offers[0] : d.offers;
                return {
                  title: d.name,
                  priceRaw: o?.price?.toString(),
                  image_url: Array.isArray(d.image) ? d.image[0] : d.image,
                };
              }
            }
          } catch {}

          // Try window.ShopifyAnalytics
          try {
            if (window.ShopifyAnalytics?.meta?.product) {
              const p = window.ShopifyAnalytics.meta.product;
              return {
                title: p.title,
                priceRaw: p.price ? (p.price / 100).toString() : null,
                image_url: null,
              };
            }
          } catch {}

          // Fallback to CSS selectors
          return {
            title: getText(['h1.product__title', 'h1.product-single__title', '.product-meta__title', 'h1']),
            priceRaw: getText(['span.price-item--regular', '.product__price span', '[class*="price--regular"]', '[class*="price"]']),
            image_url: document.querySelector('.product__media img')?.src || document.querySelector('meta[property="og:image"]')?.content || null,
          };
        });

        if (!product.title) {
          logger.warn(`[PcWorxScraper] Could not extract title from ${cleanUrl}`);
          return null;
        }

        const parsePrice = (raw) => {
          if (!raw) return null;
          const num = parseFloat(String(raw).replace(/[^\d.]/g, ''));
          return isNaN(num) ? null : num;
        };

        // ─── EXTRACT PCWORX-SPECIFIC DATA ─────────────────────────────────────
        const extractedData = await page.evaluate(() => {
          let originalPrice = null;
          let promoLabel = null;
          let sku = null;
          let brand = null;
          let variation = null;
          let rating = null;

          // SKU extraction
          try {
            const skuEl = document.querySelector('div.product-info_sku');
            if (skuEl?.textContent?.trim()) {
              sku = skuEl.textContent.trim();
            }
          } catch {}

          // Variation extraction
          try {
            const varEl = document.querySelector('[data-position="1"].variant-option_selected-value');
            if (varEl?.textContent?.trim()) {
              variation = varEl.textContent.trim();
            }
          } catch {}

          // Brand extraction
          try {
            const brandEl = document.querySelector('[data-position="2"].variant-option_selected-value');
            if (brandEl?.textContent?.trim()) {
              brand = brandEl.textContent.trim();
            }
          } catch {}

          // Rating extraction
          try {
            const ratingEl = document.querySelector('.product-info-rating');
            if (ratingEl?.textContent?.trim()) {
              const ratingText = ratingEl.textContent.trim();
              const ratingNum = parseFloat(ratingText);
              if (!isNaN(ratingNum)) {
                rating = ratingNum;
              }
            }
          } catch {}

          // Original price extraction
          const strikethroughSelectors = ['del', 's', '.old-price', '.original-price', '.compare-price', '[class*="original"]'];
          for (const sel of strikethroughSelectors) {
            const el = document.querySelector(sel);
            if (el?.textContent?.trim()) {
              const val = parseFloat(el.textContent.replace(/[^\d.]/g, ''));
              if (!isNaN(val) && val > 0) {
                originalPrice = val;
                break;
              }
            }
          }

          // Promo label extraction
          const labelSelectors = ['.badge', '.promo', '.sale-tag', '.sale', '.discount', '[class*="badge"]', '[class*="sale"]'];
          for (const sel of labelSelectors) {
            const el = document.querySelector(sel);
            if (el?.textContent?.trim()) {
              const text = el.textContent.trim().toUpperCase();
              if (text && text.length < 50) {
                promoLabel = text;
                break;
              }
            }
          }

          return { originalPrice, promoLabel, sku, brand, variation, rating };
        }).catch(() => ({ originalPrice: null, promoLabel: null, sku: null, brand: null, variation: null, rating: null }));

        // ─── SPECS EXTRACTION FROM DOM ────────────────────────────────────────
        const specsData = await page.evaluate(() => {
          const specs = {};

          // Method 1: Table-based specs
          const specsTables = document.querySelectorAll('table[class*="spec"], table.product-specs, [class*="spec"] table');
          specsTables.forEach(table => {
            table.querySelectorAll('tr').forEach(row => {
              const cells = row.querySelectorAll('td');
              if (cells.length >= 2) {
                const key = cells[0].textContent.trim();
                const value = cells[1].textContent.trim();
                if (key && value && key.length < 100) {
                  specs[key] = value;
                }
              }
            });
          });

          // Method 2: PCWorx specs from list items
          try {
            document.querySelectorAll('.specs-description-list li').forEach(li => {
              const text = li.textContent?.trim();
              if (text && text.includes(':')) {
                const [key, value] = text.split(':').map(s => s.trim());
                if (key && value && key.length < 100) {
                  specs[key.toLowerCase()] = value;
                }
              }
            });
          } catch {}

          // Method 3: Accordion/collapsible specs
          const accordions = document.querySelectorAll('[class*="accordion"], [class*="collapse"], .tab-content');
          accordions.forEach(accordion => {
            const text = accordion.textContent.trim();
            if (text && text.length > 10 && text.length < 500) {
              const lines = text.split('\n').slice(0, 5);
              lines.forEach((line, idx) => {
                if (line.trim()) specs[`spec_${idx}`] = line.trim();
              });
            }
          });

          return specs;
        }).catch(() => ({}));

        // ─── BUILD NORMALIZED PRODUCT ─────────────────────────────────────────
        const rawProduct = {
          title: product.title,
          price: parsePrice(product.priceRaw),
          sku: extractedData.sku,
          brand: extractedData.brand,
          variation: extractedData.variation,
          rating: extractedData.rating,
          originalPrice: extractedData.originalPrice,
          promoLabel: extractedData.promoLabel,
          seller_name: 'PC Worx',
          image_url: product.image_url,
          product_url: cleanUrl,
          specs: specsData,
        };

        return normalizeProduct(rawProduct, 'pcworx', 0);
      } finally {
        if (context) {
          try {
            await context.close();
          } catch (_closeErr) {
            // Ignore close errors
          }
        }
      }
    }, 3, 2000, `PcWorxScraper.scrape(${url})`);
  }

  /**
   * Scrape multiple product URLs with concurrency control.
   * @param {Array<string>} urls - Product URLs to scrape
   * @param {number} concurrency - Concurrent requests (default: 4)
   * @param {AbortSignal} signal - Abort signal for cancellation
   * @returns {Promise<Array>} Array of normalized products
   */
  async scrapeMany(urls, concurrency = 4, signal = null) {
    const results = [];
    for (let i = 0; i < urls.length; i += concurrency) {
      // Check if this scrape has been cancelled
      if (signal?.aborted) {
        logger.warn(`[PcWorxScraper] Scrape aborted — stopping at batch ${i / concurrency}`);
        break;
      }
      const batch = urls.slice(i, i + concurrency);
      const settled = await Promise.allSettled(batch.map(u => this.scrape(u)));
      for (const r of settled) {
        if (r.status === 'fulfilled' && r.value) results.push(r.value);
        else if (r.status === 'rejected') logger.error(`[PcWorxScraper] ${r.reason?.message}`);
      }
      await this.pace();
    }
    return results;
  }
}

module.exports = new PcWorxScraper();   