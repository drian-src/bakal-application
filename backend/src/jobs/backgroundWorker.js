'use strict';

const logger = require('../config/logger');
const jobQueue = require('../repositories/jobQueue');
const freshnessEngine = require('../services/freshnessEngine');
const productRepo = require('../repositories/productRepository');
const { supabase } = require('../config/db');
const pcexpressScraper = require('../scrapers/pcexpressScraper');
const villmanScraper = require('../scrapers/villmanScraper');
const pcworxScraper = require('../scrapers/pcworxScraper');

const scraperMap = {
  pcexpress: pcexpressScraper,
  villman: villmanScraper,
  pcworx: pcworxScraper,
};

/**
 * Format error for logging — handles Error objects, Supabase errors, strings, and unknowns
 */
function formatError(err) {
  if (!err) return 'unknown error (null/undefined thrown)';
  if (typeof err === 'string') return err;
  // Supabase errors: { message, code, details, hint }
  if (err.message) {
    const extra = [err.code, err.details, err.hint].filter(Boolean).join(' | ');
    return extra ? `${err.message} [${extra}]` : err.message;
  }
  // Last resort — stringify the whole object
  try { return JSON.stringify(err); } catch { return String(err); }
}

/**
 * Background Worker Process
 * Runs continuously, processing queued background jobs
 * 
 * - Scrapes stale queries
 * - Updates stale products
 * - Recalculates rankings
 */

class BackgroundWorker {
  constructor(options = {}) {
    this.isRunning = false;
    this.pollInterval = options.pollInterval || 5000; // 5 seconds
    this.batchSize = options.batchSize || 10; // Process 10 jobs per poll
    this.maxRetries = options.maxRetries || 3;
  }

  /**
   * Start the worker (infinite loop)
   */
  async start() {
    if (this.isRunning) {
      logger.warn('[BackgroundWorker] Already running');
      return;
    }

    this.isRunning = true;
    logger.info('[BackgroundWorker] Starting...');

    // Pre-load TTL settings
    await freshnessEngine.loadTTLSettings();

    // Pre-load platform IDs so handleScrapeQuery never hits DB per-product
    await productRepo.loadAllPlatformIds();

    while (this.isRunning) {
      try {
        await this.processBatch();
      } catch (err) {
        logger.error('[BackgroundWorker] Batch processing error: ' + formatError(err));
        logger.error('[BackgroundWorker] Batch processing stack: ' + (err?.stack || 'no stack'));
      }

      // Wait before next poll
      await new Promise(resolve => setTimeout(resolve, this.pollInterval));
    }

    logger.info('[BackgroundWorker] Stopped');
  }

  /**
   * Process one batch of pending jobs
   */
  async processBatch() {
    try {
      // Get next batch of pending jobs (ordered by priority, respecting retry cap)
      const jobs = await jobQueue.getPendingJobs(this.batchSize, this.maxRetries);

      if (jobs.length === 0) {
        // No jobs, silently return
        return;
      }

      logger.info(`[BackgroundWorker] Processing ${jobs.length} jobs...`);

      for (const job of jobs) {
        await this.processJob(job);
      }

      // Reload TTL settings every batch (allows config changes)
      await freshnessEngine.loadTTLSettings(true);
    } catch (err) {
      logger.error('[BackgroundWorker] Batch error: ' + formatError(err));
      logger.error('[BackgroundWorker] Batch stack: ' + (err?.stack || 'no stack'));
    }
  }

  /**
   * Process a single job
   */
  async processJob(job) {
    // GUARD: Never process a job that has already exceeded maxRetries
    const currentAttempts = job.attempts || 0;
    if (currentAttempts >= this.maxRetries) {
      logger.warn(
        `[BackgroundWorker] Job ${job.id} has ${currentAttempts} attempts ` +
        `(max ${this.maxRetries}) — marking failed and skipping.`
      );
      try {
        await jobQueue.updateJob(job.id, {
          status: 'failed',
          error_message: `Exceeded max retries (${this.maxRetries})`,
          attempts: currentAttempts,
        });
      } catch (updateErr) {
        logger.error('[BackgroundWorker] Could not mark job failed: ' + formatError(updateErr));
      }
      return;
    }

    try {
      logger.info(`[BackgroundWorker] Processing job ${job.id} (${job.job_type}) attempt ${currentAttempts + 1}/${this.maxRetries}`);

      // Mark as in progress
      await jobQueue.updateJob(job.id, {
        status: 'in_progress',
        started_at: new Date().toISOString(),
        attempts: currentAttempts + 1,
      });

      let result;

      switch (job.job_type) {
        case 'scrape_query':
          result = await this.handleScrapeQuery(job);
          break;

        case 'refresh_product':
          result = await this.handleRefreshProduct(job);
          break;

        case 'update_metadata':
          result = await this.handleUpdateMetadata(job);
          break;

        default:
          throw new Error(`Unknown job type: ${job.job_type}`);
      }

      // Mark as completed
      await jobQueue.updateJob(job.id, {
        status: 'completed',
        completed_at: new Date().toISOString(),
        result_data: result,
      });

      logger.info(`[BackgroundWorker] Job ${job.id} completed successfully`);
    } catch (err) {
      const attempts = currentAttempts + 1;
      logger.error(`[BackgroundWorker] Job ${job.id} failed (attempt ${attempts}): ${formatError(err)}`);
      logger.error(`[BackgroundWorker] Job ${job.id} stack: ${err?.stack || 'no stack'}`);

      try {
        if (attempts < this.maxRetries) {
          // Exponential backoff: schedule next retry
          const retryDelaySeconds = Math.pow(2, attempts) * 30; // 60s, 120s, 240s
          const nextRunAt = new Date(Date.now() + retryDelaySeconds * 1000).toISOString();

          await jobQueue.updateJob(job.id, {
            status: 'retry',
            attempts,
            error_message: formatError(err).substring(0, 500),
            next_run_at: nextRunAt,
          });

          logger.info(`[BackgroundWorker] Job ${job.id} scheduled for retry in ${retryDelaySeconds}s`);
        } else {
          await jobQueue.updateJob(job.id, {
            status: 'failed',
            error_message: formatError(err).substring(0, 500),
            attempts,
            completed_at: new Date().toISOString(),
          });

          logger.warn(`[BackgroundWorker] Job ${job.id} permanently failed after ${attempts} attempts`);
        }
      } catch (updateErr) {
        logger.error('[BackgroundWorker] CRITICAL — could not update job status: ' + formatError(updateErr));
      }
    }
  }

  /**
   * Handle: Re-scrape a stale query
   */
  async handleScrapeQuery(job) {
    const { query_text } = job;

    if (!query_text || typeof query_text !== 'string' || !query_text.trim()) {
      throw new Error('handleScrapeQuery: job.query_text is missing or empty');
    }

    logger.info(`[BackgroundWorker] Re-scraping query: "${query_text}"`);

    const results = {};
    const startTime = Date.now();

    for (const [storeName, scraper] of Object.entries(scraperMap)) {
      try {
        logger.debug(`[BackgroundWorker] Scraping ${storeName} for "${query_text}"`);

        const scraped = await scraper.search(query_text);
        const productList = Array.isArray(scraped) ? scraped : [];

        results[storeName] = {
          success: true,
          productCount: productList.length,
          timeMs: Date.now() - startTime,
        };

        if (productList.length > 0) {

          // ── RESOLVE PLATFORM ID ONCE PER STORE ─────────────────────────────
          // normalizeProduct() leaves platform_id: null because it doesn't have
          // DB access. The backgroundWorker must resolve it here before upsert.
          const platformId = await productRepo.getPlatformId(storeName);

          if (!platformId) {
            logger.error(
              `[BackgroundWorker] Cannot upsert ${storeName} products — ` +
              `platform_id not found for store key "${storeName}". ` +
              `Ensure the platforms table has a row with name="${storeName}".`
            );
            results[storeName] = {
              success: false,
              error: `platform_id not found for "${storeName}"`,
            };
            continue; // skip this store's products — don't try to upsert nulls
          }

          logger.debug(`[BackgroundWorker] ${storeName} platform_id: ${platformId}`);

          // ── UPSERT EACH PRODUCT WITH RESOLVED PLATFORM ID ──────────────────
          for (const product of productList) {
            try {
              await productRepo.upsertProduct({
                ...product,

                // CRITICAL: inject the resolved UUID before upsert
                platform_id: platformId,

                // Refresh timestamp
                last_scraped: new Date().toISOString(),
              });
            } catch (upsertErr) {
              logger.warn(
                `[BackgroundWorker] Upsert failed for ` +
                `"${(product?.title || 'unknown').substring(0, 40)}": ` +
                formatError(upsertErr)
              );
            }
          }
        }

      } catch (scraperErr) {
        logger.error(
          `[BackgroundWorker] ${storeName} scrape failed: ${formatError(scraperErr)}`
        );
        results[storeName] = {
          success: false,
          error: formatError(scraperErr),
        };
      }
    }

    const totalScraped = Object.values(results).reduce(
      (sum, r) => sum + (r.productCount || 0), 0
    );
    logger.info(
      `[BackgroundWorker] scrape_query "${query_text}" done — ` +
      `${totalScraped} products across ${Object.keys(results).length} stores`
    );

    return results;
  }

  /**
   * Handle: Update stale individual product
   */
  async handleRefreshProduct(job) {
    const { product_id } = job;
    logger.info(`[BackgroundWorker] Refreshing product ${product_id}`);

    // Fetch product to get platform and original details
    const product = await productRepo.getProductById(product_id);
    if (!product) {
      throw new Error(`Product not found: ${product_id}`);
    }

    const staleFields = freshnessEngine.getStaleFields(product, product.platform);
    logger.debug(`[BackgroundWorker] Stale fields: ${staleFields.join(', ')}`);

    // For now, re-scrape product details (in future, could do selective updates)
    // In production, would call scraper-specific refresh logic
    const now = new Date().toISOString();

    // Update only the stale fields
    const updateData = {};
    if (staleFields.includes('price')) updateData.price_updated_at = now;
    if (staleFields.includes('stock')) updateData.stock_updated_at = now;
    if (staleFields.includes('rating')) updateData.rating_updated_at = now;
    if (staleFields.includes('specs')) updateData.specs_updated_at = now;

    await productRepo.updateProduct(product_id, updateData);

    return {
      productId: product_id,
      refreshedFields: staleFields,
      newTimestamp: now,
    };
  }

  /**
   * Handle: Update search metadata
   */
  async handleUpdateMetadata(job) {
    const { query_text } = job;
    logger.debug(`[BackgroundWorker] Updating metadata for query: "${query_text}"`);

    const { data } = await supabase
      .from('search_cache_metadata')
      .select('*')
      .eq('query_text', query_text.toLowerCase().trim())
      .single();

    if (data) {
      const { error } = await supabase
        .from('search_cache_metadata')
        .update({
          is_fresh: true,
          updated_at: new Date().toISOString(),
        })
        .eq('id', data.id);

      if (error) throw error;
    }

    return { query_text, updated: true };
  }

  /**
   * Stop the worker gracefully
   */
  stop() {
    logger.info('[BackgroundWorker] Stopping...');
    this.isRunning = false;
  }
}

module.exports = BackgroundWorker;
