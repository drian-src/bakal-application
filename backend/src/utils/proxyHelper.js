'use strict';

const config = require('../config/dotenv');
const logger = require('../config/logger');

class ProxyHelper {
  constructor() {
    this.proxies = config.scraping.proxyList || [];
    this.currentIndex = 0;
  }

  /**
   * Get the next proxy in round-robin order.
   * Returns null if no proxies configured.
   */
  getNextProxy() {
    if (this.proxies.length === 0) return null;
    const proxy = this.proxies[this.currentIndex];
    this.currentIndex = (this.currentIndex + 1) % this.proxies.length;
    return proxy;
  }

  /**
   * Get a random proxy.
   */
  getRandomProxy() {
    if (this.proxies.length === 0) return null;
    return this.proxies[Math.floor(Math.random() * this.proxies.length)];
  }

  /**
   * Build Playwright proxy config object from proxy URL string.
   */
  buildPlaywrightProxy(proxyUrl) {
    if (!proxyUrl) return undefined;
    try {
      const url = new URL(proxyUrl);
      return {
        server: `${url.protocol}//${url.hostname}:${url.port}`,
        username: url.username || undefined,
        password: url.password || undefined,
      };
    } catch {
      logger.warn(`[Proxy] Invalid proxy URL: ${proxyUrl}`);
      return undefined;
    }
  }

  hasProxies() {
    return this.proxies.length > 0;
  }
}

module.exports = new ProxyHelper();