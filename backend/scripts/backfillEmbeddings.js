'use strict';

require('../src/config/dotenv'); // load env vars
const { supabase } = require('../src/config/db');
const { generateEmbeddings } = require('../src/services/embeddingService');
const logger = require('../src/config/logger');

async function backfill() {
  logger.info('[Backfill] Starting embedding backfill...');

  try {
    // Fetch all products without embeddings
    const { data: products, error } = await supabase
      .from('products')
      .select('id, title')
      .is('embedding', null)   // only products with no embedding yet
      .limit(500);             // process in batches of 500

    if (error) {
      logger.error('[Backfill] Failed to fetch products: ' + error.message);
      return;
    }

    if (!products || products.length === 0) {
      logger.info('[Backfill] All products already have embeddings.');
      return;
    }

    logger.info(`[Backfill] Processing ${products.length} products...`);

    // Generate embeddings in batch (more efficient than one-by-one)
    const titles = products.map(p => p.title || '');
    const embeddings = await generateEmbeddings(titles);

    // Update each product with its embedding
    let successCount = 0;
    let failureCount = 0;
    for (let i = 0; i < products.length; i++) {
      if (!embeddings[i]) {
        failureCount++;
        continue; // skip if embedding failed for this product
      }

      const { error: updateError } = await supabase
        .from('products')
        .update({ embedding: embeddings[i] })
        .eq('id', products[i].id);

      if (updateError) {
        logger.warn(`[Backfill] Failed to update product ${products[i].id}: ${updateError.message}`);
        failureCount++;
      } else {
        successCount++;
      }
    }

    logger.info(`[Backfill] Done: ${successCount}/${products.length} products updated successfully.`);
    if (failureCount > 0) {
      logger.warn(`[Backfill] ${failureCount} products failed to update.`);
    }
    logger.info('[Backfill] Run again if there are more than 500 products without embeddings.');
    process.exit(0);
  } catch (err) {
    logger.error('[Backfill] Fatal error: ' + err.message);
    console.error(err);
    process.exit(1);
  }
}

backfill().catch(err => {
  console.error('[Backfill] Uncaught error:', err);
  process.exit(1);
});
