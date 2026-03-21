'use strict';

const BaseScraper = require('./baseScraper');
const logger = require('../config/logger');
const { withRetry, randomDelay } = require('../utils/retryHelper');

const BASE_URL = 'https://shop.villman.com';

class VillmanScraper extends BaseScraper {
  constructor() {
    super('VillmanScraper');
  }

  async search(query, maxResults = 5) {
    return withRetry(async () => {
      let browser;
      try {
        browser = await this.launchBrowser();
        const page = await this.newPage(browser);

        // Shopify predictive search API
        const apiUrl = `${BASE_URL}/search/suggest.json?q=${encodeURIComponent(query)}&resources[type]=product&resources[limit]=10`;
        logger.debug(`[VillmanScraper] Calling API: ${apiUrl}`);

        await page.goto(apiUrl, { waitUntil: 'load', timeout: 20000 });
        const jsonText = await page.evaluate(() => document.body.innerText);

        let productUrls = [];
        try {
          const data = JSON.parse(jsonText);
          const products = data?.resources?.results?.products || [];
          productUrls = products
            .map(p => p.url ? `${BASE_URL}${p.url.split('?')[0]}` : null)
            .filter(Boolean)
            .slice(0, maxResults);
          logger.info(`[VillmanScraper] API found ${productUrls.length} product URLs`);
        } catch (e) {
          logger.warn(`[VillmanScraper] API parse failed: ${e.message}`);
        }

        // Fallback — scrape search results page
        if (productUrls.length === 0) {
          const searchUrl = `${BASE_URL}/search?type=product&q=${encodeURIComponent(query)}`;
          logger.debug(`[VillmanScraper] Fallback to search page: ${searchUrl}`);

          // FIX: Removed homepage pre-visit — it cost up to 20s and pushed VillMan over
          // the 90s service timeout. The search page works directly for URL discovery.
          // The Shopify JSON API (/search/suggest.json) does not require cookie pre-loading.
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
            return [...links].slice(0, 10);
          });

          logger.info(`[VillmanScraper] Fallback found ${productUrls.length} product URLs`);
        }

        await browser.close();
        return await this.scrapeMany(productUrls.slice(0, maxResults), 3);
      } finally {
        if (browser) await browser.close().catch(() => {});
      }
    }, 3, 2000, 'VillmanScraper.search');
  }

  async scrape(url) {
    return withRetry(async () => {
      let browser;
      try {
        browser = await this.launchBrowser();
        const page = await this.newPage(browser);

        const cleanUrl = url.split('?')[0];
        const jsonUrl = cleanUrl + '.json';

        logger.debug(`[VillmanScraper] Scraping JSON: ${jsonUrl}`);
        await page.goto(jsonUrl, { waitUntil: 'load', timeout: 30000 });
        const jsonText = await page.evaluate(() => document.body.innerText);

        let productData;
        try { productData = JSON.parse(jsonText)?.product; } catch { productData = null; }

        if (productData) {
          const variant = productData.variants?.[0];
          logger.debug(`[VillmanScraper] JSON success: ${productData.title}`);
          return {
            title: productData.title || null,
            price: variant?.price ? parseFloat(variant.price) : null,
            rating: null,
            reviews_count: null,
            seller_name: 'Villman',
            image_url: productData.images?.[0]?.src || null,
            product_url: cleanUrl,
            platform: 'villman',
          };
        }

        // DOM fallback with homepage cookie pre-load
        logger.debug(`[VillmanScraper] JSON failed, using DOM for ${cleanUrl}`);
        await page.goto(BASE_URL, { waitUntil: 'domcontentloaded', timeout: 20000 });
        await randomDelay(1000, 2000);

        await page.goto(cleanUrl, { waitUntil: 'load', timeout: 30000 });
        await randomDelay(2000, 3000);
        await this.humanScroll(page, 2);

        await page.waitForSelector('h1, [class*="product"]', { timeout: 15000 }).catch(() => {});

        const product = await page.evaluate(() => {
          const getText = (sels) => {
            for (const s of sels) { const el = document.querySelector(s); if (el?.textContent?.trim()) return el.textContent.trim(); }
            return null;
          };
          try {
            for (const s of document.querySelectorAll('script[type="application/ld+json"]')) {
              const d = JSON.parse(s.textContent);
              if (d['@type'] === 'Product') {
                const o = Array.isArray(d.offers) ? d.offers[0] : d.offers;
                return { title: d.name, priceRaw: o?.price?.toString(), image_url: Array.isArray(d.image) ? d.image[0] : d.image };
              }
            }
          } catch {}
          try {
            if (window.ShopifyAnalytics?.meta?.product) {
              const p = window.ShopifyAnalytics.meta.product;
              return { title: p.title, priceRaw: p.price ? (p.price / 100).toString() : null, image_url: null };
            }
          } catch {}
          return {
            title: getText(['h1.product__title', 'h1.product-single__title', '.product-meta__title', 'h1']),
            priceRaw: getText(['span.price-item--regular', '.product__price span', '[class*="price--regular"]', '[class*="price"]']),
            image_url: document.querySelector('.product__media img')?.src || document.querySelector('meta[property="og:image"]')?.content || null,
          };
        });

        if (!product.title) {
          logger.warn(`[VillmanScraper] Could not extract title from ${cleanUrl}`);
          return null;
        }

        const parsePrice = (raw) => {
          if (!raw) return null;
          const num = parseFloat(String(raw).replace(/[^\d.]/g, ''));
          return isNaN(num) ? null : num;
        };

        return {
          title: product.title,
          price: parsePrice(product.priceRaw),
          rating: null,
          reviews_count: null,
          seller_name: 'Villman',
          image_url: product.image_url,
          product_url: cleanUrl,
          platform: 'villman',
        };
      } finally {
        if (browser) await browser.close();
      }
    }, 3, 2000, `VillmanScraper.scrape(${url})`);
  }

  async scrapeMany(urls, concurrency = 2) {
    const results = [];
    for (let i = 0; i < urls.length; i += concurrency) {
      const batch = urls.slice(i, i + concurrency);
      const settled = await Promise.allSettled(batch.map(u => this.scrape(u)));
      for (const r of settled) {
        if (r.status === 'fulfilled' && r.value) results.push(r.value);
        else if (r.status === 'rejected') logger.error(`[VillmanScraper] ${r.reason?.message}`);
      }
      await this.pace();
    }
    return results;
  }
}

module.exports = new VillmanScraper();