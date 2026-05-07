'use strict';

const { BaseScraper, normalizeProduct } = require('./baseScraper');
const logger = require('../config/logger');
const { withRetry, randomDelay } = require('../utils/retryHelper');

const BASE_URL = 'https://pcx.com.ph';

// ─── CONSTANTS ────────────────────────────────────────────────────────────────
// Selectors are defined here so they're easy to update without touching logic.
// PCExpress uses a Shopify theme (t4s) — class names follow Shopify conventions.
const SELECTORS = {
  // Search result page — links to individual product pages
  searchResultLinks: [
    'a[href*="/products/"]',                        // Generic Shopify product links
    '.t4s-product-card a[href*="/products/"]',      // Theme-specific product card
    '.t4s-pr-card a[href*="/products/"]',           // Alternate card class
    '[class*="product-card"] a[href*="/products/"]',// Wildcard fallback
  ],

  // Product page — title
  title: [
    'h1.t4s-product_title',
    'h1.product__title',
    'h1.product-single__title',
    '[class*="product"][class*="title"] h1',
    'h1',
  ],

  // Product page — current price
  price: [
    '.t4s-product__price-review div',
    'span.price-item--regular',
    '.product__price span',
    '[class*="price--regular"]',
    '[class*="price"]',
  ],

  // Product page — original (strikethrough) price
  originalPrice: ['del', 's', '.old-price', '.original-price', '.compare-price'],

  // Product page — promo / sale badge
  promoLabel: ['.badge', '.t4s-badge', '.sale-tag', '.sale', '[class*="badge"]', '[class*="sale"]'],

  // Product page — primary image
  image: [
    '.t4s-product__media img',
    '.product__media img',
    '.product-image img',
    'meta[property="og:image"]',                    // OG tag as last resort
  ],

  // Product page — specs / description block
  specs: [
    '.t4s-rte',
    '.product-description',
    '[class*="product-desc"]',
    '[class*="rte"]',
  ],
};

// ─────────────────────────────────────────────────────────────────────────────

class PcExpressScraper extends BaseScraper {
  constructor() {
    super('PcExpressScraper');
  }

  // ══════════════════════════════════════════════════════════════════════════
  // PUBLIC: search(query, maxResults, signal)
  //
  // Strategy: Shopify Predictive Search API (via shared browser) → HTML fallback
  // Both paths use the shared Playwright browser pool — NO axios dependency.
  // ══════════════════════════════════════════════════════════════════════════
  async search(query, maxResults = null, signal = null) {
    return withRetry(async () => {
      let browser, context, page;
      try {
        browser = await this.getBrowser();
        const result = await this.newContext(browser);
        page = result.page;
        context = result.context;

        // ─── METHOD 1: SHOPIFY PREDICTIVE API (PRIMARY) ──────────────────────
        // Same pattern as VillmanScraper / PcWorxScraper: navigate via Playwright,
        // read body text, parse JSON. Avoids a separate axios dependency and keeps
        // all requests going through the shared browser (cookies, headers, UA).
        const apiUrl = `${BASE_URL}/search/suggest.json?q=${encodeURIComponent(query)}&resources[type]=product&resources[limit]=50`;
        logger.info(`[PcExpressScraper] Search API: "${query}" → ${apiUrl}`);

        await page.goto(apiUrl, { waitUntil: 'domcontentloaded', timeout: 20000 });
        const jsonText = await page.evaluate(() => document.body.innerText);

        let productUrls = [];

        try {
          const data = JSON.parse(jsonText);

          // Shopify suggest.json returns results under two possible shapes:
          //   resources.results.products  (newer Shopify versions)
          //   resources.products          (older versions / some themes)
          const products =
            data?.resources?.results?.products ||
            data?.resources?.products ||
            [];

          productUrls = products
            .map(p => {
              // Shopify returns relative URLs like "/products/some-handle"
              // Reconstruct the full absolute URL, stripping query params.
              if (!p.url) return null;
              const relative = p.url.split('?')[0];
              return `${BASE_URL}${relative}`;
            })
            .filter(Boolean);

          logger.info(`[PcExpressScraper] API found ${productUrls.length} product URLs`);
        } catch (e) {
          logger.warn(`[PcExpressScraper] API parse failed: ${e.message}`);
        }

        // ─── METHOD 2: HTML FALLBACK (if API returns 0 results) ─────────────
        if (productUrls.length === 0) {
          logger.info(`[PcExpressScraper] API returned 0 — falling back to HTML search`);
          productUrls = await this._searchViaHTML(page, query);
        }

        if (productUrls.length === 0) {
          logger.warn(`[PcExpressScraper] No product URLs found for "${query}"`);
          return [];
        }

        // Cap to maxResults before scraping (saves time)
        const urlsToScrape = maxResults
          ? productUrls.slice(0, maxResults)
          : productUrls;

        logger.info(`[PcExpressScraper] Scraping ${urlsToScrape.length} product URLs`);

        // scrapeMany is inherited from BaseScraper and handles concurrency + cancellation
        return await this.scrapeMany(urlsToScrape, 4, signal);
      } finally {
        if (context) {
          try { await context.close(); } catch (_) { /* ignore */ }
        }
      }
    }, 3, 2000, 'PcExpressScraper.search');
  }

  // ══════════════════════════════════════════════════════════════════════════
  // PUBLIC: scrape(url)
  //
  // Scrape a single product page.
  // Strategy: Shopify .json endpoint (fast ~8s) → LD+JSON → CSS selectors
  // ══════════════════════════════════════════════════════════════════════════
  async scrape(url) {
    return withRetry(async () => {
      let browser, context, page;
      try {
        browser = await this.getBrowser();
        const result = await this.newContext(browser);
        page = result.page;
        context = result.context;

        const cleanUrl = url.split('?')[0];

        // ─── STEP 1: SHOPIFY JSON ENDPOINT ───────────────────────────────────
        // Fastest path — structured data, no DOM rendering needed.
        // PCExpress JSON endpoints can be slow; 15s is enough without blocking.
        const jsonUrl = cleanUrl + '.json';
        logger.debug(`[PcExpressScraper] Trying JSON: ${jsonUrl}`);

        try {
          await page.goto(jsonUrl, { waitUntil: 'domcontentloaded', timeout: 15000 });
          const jsonText = await page.evaluate(() => document.body.innerText);
          const productData = JSON.parse(jsonText)?.product;

          if (productData?.title) {
            logger.debug(`[PcExpressScraper] JSON success: ${productData.title}`);
            return normalizeProduct(
              this._extractFromShopifyJson(productData, cleanUrl),
              'pcexpress',
              0
            );
          }
        } catch (jsonErr) {
          // JSON 404/timeout/parse failure — continue to DOM fallback
          logger.debug(`[PcExpressScraper] JSON failed (${jsonErr.message}), trying DOM`);
        }

        // ─── STEP 2: DOM EXTRACTION FALLBACK ─────────────────────────────────
        // Pre-load homepage to get session cookies, then navigate to product.
        // This mirrors the VillmanScraper / PcWorxScraper pattern exactly.
        logger.debug(`[PcExpressScraper] DOM fallback: ${cleanUrl}`);
        await page.goto(BASE_URL, { waitUntil: 'domcontentloaded', timeout: 20000 });
        await randomDelay(1000, 2000);

        await page.goto(cleanUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });
        await randomDelay(1500, 2500);
        await this.humanScroll(page, 2);

        // Wait for either the title or a generic product wrapper — fail fast (10s)
        await page
          .waitForSelector(
            ['h1', '[class*="product"]', 'main'].join(', '),
            { timeout: 10000 }
          )
          .catch(() => {});

        // ─── STEP 2a: TRY JSON-LD FIRST (structured, reliable) ───────────────
        const jsonLdProduct = await page.evaluate(() => {
          try {
            for (const script of document.querySelectorAll(
              'script[type="application/ld+json"]'
            )) {
              const d = JSON.parse(script.textContent);
              if (d['@type'] === 'Product') {
                const offer = Array.isArray(d.offers) ? d.offers[0] : d.offers;
                return {
                  title: d.name || null,
                  priceRaw: offer?.price?.toString() || null,
                  image_url:
                    Array.isArray(d.image) ? d.image[0] : d.image || null,
                };
              }
            }
          } catch {}
          return null;
        });

        // ─── STEP 2b: CSS SELECTOR EXTRACTION ────────────────────────────────
        // One page.evaluate() call for all fields (faster than multiple calls).
        const domData = await page.evaluate((SELS) => {
          // Multi-selector safe getter — tries each selector in order
          const getText = (selList) => {
            for (const s of selList) {
              try {
                const el = document.querySelector(s);
                if (el?.textContent?.trim()) return el.textContent.trim();
              } catch {}
            }
            return null;
          };

          // Price from strikethrough elements
          const getOriginalPrice = (selList) => {
            for (const s of selList) {
              try {
                const el = document.querySelector(s);
                const val = parseFloat(
                  (el?.textContent || '').replace(/[^\d.]/g, '')
                );
                if (!isNaN(val) && val > 0) return val;
              } catch {}
            }
            return null;
          };

          // Image: try src then OG meta
          const getImage = () => {
            for (const s of SELS.image) {
              try {
                const el = document.querySelector(s);
                if (el) return el.src || el.content || null;
              } catch {}
            }
            return null;
          };

          // Specs: parse <li> items and key:value pairs from description block
          const getSpecs = () => {
            const specs = {};
            let idx = 0;

            // Table-based specs (most reliable if present)
            document
              .querySelectorAll('table[class*="spec"] tr, .product-specs tr')
              .forEach(row => {
                const cells = row.querySelectorAll('td');
                if (cells.length >= 2) {
                  const key = cells[0].textContent.trim();
                  const value = cells[1].textContent.trim();
                  if (key && value && key.length < 80) specs[key] = value;
                }
              });

            // List-based specs from description block
            if (Object.keys(specs).length === 0) {
              for (const s of SELS.specs) {
                const container = document.querySelector(s);
                if (!container) continue;

                container.querySelectorAll('li').forEach(li => {
                  const text = li.textContent.trim();
                  if (!text || text.length > 200) return;

                  if (text.includes(':')) {
                    const colonIdx = text.indexOf(':');
                    const key = text.slice(0, colonIdx).trim();
                    const value = text.slice(colonIdx + 1).trim();
                    if (key && value && key.length < 80) {
                      specs[key.toLowerCase()] = value;
                    }
                  } else {
                    specs[`detail_${idx++}`] = text;
                  }
                });

                if (Object.keys(specs).length > 0) break; // stop at first match
              }
            }

            return specs;
          };

          return {
            title: getText(SELS.title),
            priceRaw: getText(SELS.price),
            originalPrice: getOriginalPrice(SELS.originalPrice),
            promoLabel: getText(SELS.promoLabel),
            image_url: getImage(),
            specs: getSpecs(),
          };
        }, SELECTORS);

        // Prefer JSON-LD title/price if available (more reliable), fall back to CSS
        const title = jsonLdProduct?.title || domData.title;
        const priceRaw = jsonLdProduct?.priceRaw || domData.priceRaw;
        const image_url = jsonLdProduct?.image_url || domData.image_url;

        if (!title) {
          logger.warn(`[PcExpressScraper] Could not extract title from ${cleanUrl}`);
          return null;
        }

        const rawProduct = {
          title,
          price: this._parsePrice(priceRaw),
          originalPrice: domData.originalPrice,
          promoLabel: domData.promoLabel,
          rating: null,
          reviews_count: null,
          seller_name: 'PC Express',
          image_url,
          product_url: cleanUrl,
          specs: domData.specs,
          is_available: true,
        };

        return normalizeProduct(rawProduct, 'pcexpress', 0);
      } finally {
        if (context) {
          try { await context.close(); } catch (_) { /* ignore */ }
        }
      }
    }, 3, 2000, `PcExpressScraper.scrape(${url})`);
  }

  // ══════════════════════════════════════════════════════════════════════════
  // PRIVATE: _searchViaHTML(page, query)
  //
  // Reuses the already-open page from search() — no new context needed.
  // ══════════════════════════════════════════════════════════════════════════
  async _searchViaHTML(page, query) {
    try {
      const searchUrl = `${BASE_URL}/search?type=product&q=${encodeURIComponent(query)}`;
      logger.debug(`[PcExpressScraper] HTML fallback: ${searchUrl}`);

      await page.goto(searchUrl, { waitUntil: 'domcontentloaded', timeout: 25000 });
      await randomDelay(1500, 2500);
      await this.humanScroll(page, 3);

      const productUrls = await page.evaluate((selList) => {
        const links = new Set();

        for (const selector of selList) {
          document.querySelectorAll(selector).forEach(a => {
            try {
              const href = a.getAttribute('href') || a.href || '';
              if (!href.includes('/products/')) return;
              if (href.includes('cdn.shopify')) return; // skip CDN image links

              const url = new URL(href, location.origin);
              // Strip query params for canonical URL
              links.add(`${url.protocol}//${url.hostname}${url.pathname}`);
            } catch {}
          });

          if (links.size > 0) break; // stop at first selector that yields results
        }

        return [...links];
      }, SELECTORS.searchResultLinks);

      logger.info(`[PcExpressScraper] HTML fallback found ${productUrls.length} URLs`);
      return productUrls;
    } catch (err) {
      logger.warn(`[PcExpressScraper] HTML fallback failed: ${err.message}`);
      return [];
    }
  }

  // ══════════════════════════════════════════════════════════════════════════
  // PRIVATE: _extractFromShopifyJson(productData, cleanUrl)
  //
  // Extracts and normalises data from a Shopify product .json endpoint.
  // Mirrors the pattern used in VillmanScraper._extractFromShopifyJson().
  // ══════════════════════════════════════════════════════════════════════════
  _extractFromShopifyJson(productData, cleanUrl) {
    const variant = productData.variants?.[0] || {};

    // ─── Specs from Shopify options + body_html ───────────────────────────
    const specs = {};

    // Shopify options (e.g. Color, Storage) — reliable, always present
    if (Array.isArray(productData.options)) {
      productData.options.forEach(opt => {
        if (opt.name && Array.isArray(opt.values) && opt.values.length > 0) {
          specs[opt.name.toLowerCase()] = opt.values.join(', ');
        }
      });
    }

    // body_html — parse <li> items for additional spec details
    if (productData.body_html) {
      let liIdx = 0;
      const liRegex = /<li[^>]*>([\s\S]*?)<\/li>/gi;
      let match;
      while ((match = liRegex.exec(productData.body_html)) !== null && liIdx < 15) {
        // Strip inner HTML tags, collapse whitespace
        const text = match[1].replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
        if (!text) continue;

        if (text.includes(':')) {
          const colonIdx = text.indexOf(':');
          const key = text.slice(0, colonIdx).trim().toLowerCase();
          const value = text.slice(colonIdx + 1).trim();
          if (key && value && key.length < 80) specs[key] = value;
        } else {
          specs[`detail_${liIdx}`] = text;
        }
        liIdx++;
      }
    }

    // ─── Original price & sale status ────────────────────────────────────
    // Shopify stores compare_at_price as a string like "15000.00"
    const compareAtPrice = variant.compare_at_price
      ? parseFloat(variant.compare_at_price)
      : null;

    return {
      title: productData.title || null,
      price: variant.price ? parseFloat(variant.price) : null,
      originalPrice: compareAtPrice,
      rating: null,       // Shopify JSON doesn't include ratings natively
      reviews_count: null,
      seller_name: productData.vendor || 'PC Express',
      image_url:
        productData.images?.[0]?.src ||
        productData.featured_image?.src ||
        null,
      product_url: cleanUrl,
      specs,
      promoLabel: null,   // Shopify JSON metafields not always available
      is_available: variant.available !== false,
    };
  }

  // ══════════════════════════════════════════════════════════════════════════
  // PRIVATE: _parsePrice(raw)
  //
  // Strips currency symbols / commas and returns a float, or null.
  // ══════════════════════════════════════════════════════════════════════════
  _parsePrice(raw) {
    if (!raw) return null;
    const num = parseFloat(String(raw).replace(/[^\d.]/g, ''));
    return isNaN(num) ? null : num;
  }
}

// Export singleton instance — consistent with other scrapers in the codebase
module.exports = new PcExpressScraper();