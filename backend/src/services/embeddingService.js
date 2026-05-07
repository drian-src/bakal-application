'use strict';

const logger = require('../config/logger');

// ─── MODEL SINGLETON ─────────────────────────────────────────────────────────
// The model is ~25MB and takes ~3s to load.
// Load it ONCE when the server starts, reuse for every request.
// Never load it inside a per-request function.

let extractorInstance = null;  // holds the loaded pipeline
let loadingPromise = null;      // prevents duplicate loading

const MODEL_NAME = 'Xenova/all-MiniLM-L6-v2';
const EMBEDDING_DIMENSIONS = 384; // this model always produces 384 numbers

// ─── LOAD MODEL ──────────────────────────────────────────────────────────────
async function loadModel() {
  // If already loaded, return immediately
  if (extractorInstance) return extractorInstance;

  // If currently loading, wait for that — don't load twice
  if (loadingPromise) return loadingPromise;

  loadingPromise = (async () => {
    try {
      logger.info('[Embedding] Loading model: ' + MODEL_NAME);
      logger.info('[Embedding] First run downloads ~25MB. Subsequent runs use cache.');

      // Dynamic import needed because @huggingface/transformers is ESM
      // This is the correct pattern for ESM packages in CommonJS projects
      // If this fails, try: const { pipeline } = await import('@xenova/transformers');
      const { pipeline } = await import('@huggingface/transformers');

      extractorInstance = await pipeline(
        'feature-extraction',
        MODEL_NAME,
        {
          // quantized: true uses less memory, slightly less accurate
          // For product titles (short text), quantized is fine
          quantized: true,
        }
      );

      logger.info('[Embedding] Model loaded successfully');
      return extractorInstance;
    } catch (err) {
      loadingPromise = null; // reset so next call retries
      logger.error('[Embedding] Failed to load model: ' + err.message);
      throw err;
    }
  })();

  return loadingPromise;
}

// ─── GENERATE SINGLE EMBEDDING ───────────────────────────────────────────────
// Takes a single text string, returns a plain JS number array [0.04, -0.12, ...]
// Length is always 384 numbers.

async function generateEmbedding(text) {
  if (!text || typeof text !== 'string' || !text.trim()) {
    logger.warn('[Embedding] generateEmbedding called with empty text');
    return null;
  }

  try {
    const extractor = await loadModel();

    // Truncate to 256 tokens max (model limit)
    // Product titles are short so this rarely matters
    const truncated = text.trim().slice(0, 512); // safe char limit

    const output = await extractor([truncated], {
      pooling: 'mean',    // average all token vectors into one
      normalize: true,    // L2 normalize for cosine similarity
    });

    // Convert tensor to plain JS array
    // output.tolist() returns [[...384 numbers...]]
    // We want the inner array [0]: [...384 numbers...]
    return output.tolist()[0];

  } catch (err) {
    logger.error('[Embedding] generateEmbedding error: ' + err.message);
    return null; // return null — caller must handle gracefully
  }
}

// ─── GENERATE BATCH EMBEDDINGS ───────────────────────────────────────────────
// Batch is more efficient than calling generateEmbedding in a loop.
// texts = ['product title 1', 'product title 2', ...]
// Returns array of arrays: [[...384 numbers...], [...384 numbers...], ...]
// Null entries appear for texts that failed — caller should handle.

async function generateEmbeddings(texts) {
  if (!Array.isArray(texts) || texts.length === 0) return [];

  try {
    const extractor = await loadModel();

    const validTexts = texts.map(t =>
      (t && typeof t === 'string') ? t.trim().slice(0, 512) : ''
    );

    const output = await extractor(validTexts, {
      pooling: 'mean',
      normalize: true,
    });

    // tolist() returns array of arrays when multiple inputs given
    return output.tolist();

  } catch (err) {
    logger.error('[Embedding] generateEmbeddings batch error: ' + err.message);
    return texts.map(() => null);
  }
}

// ─── COSINE SIMILARITY ───────────────────────────────────────────────────────
// Compute similarity between two embedding arrays in JavaScript.
// Used by rankingEngine for in-memory comparison without a DB round-trip.
// Returns 0–1 (1 = identical meaning, 0 = completely unrelated).

function cosineSimilarity(vecA, vecB) {
  if (!vecA || !vecB || vecA.length !== vecB.length) return 0;

  let dot = 0, normA = 0, normB = 0;
  for (let i = 0; i < vecA.length; i++) {
    dot   += vecA[i] * vecB[i];
    normA += vecA[i] * vecA[i];
    normB += vecB[i] * vecB[i];
  }

  const denom = Math.sqrt(normA) * Math.sqrt(normB);
  return denom === 0 ? 0 : dot / denom;
}

// ─── PRE-WARM MODEL ON STARTUP ───────────────────────────────────────────────
// Call this from server.js so the model is loaded before the first search.
// Without this, the first search after server start adds ~3s of model loading.

async function warmupModel() {
  try {
    await loadModel();
    logger.info('[Embedding] Model pre-warmed and ready');
  } catch (err) {
    logger.warn('[Embedding] Pre-warm failed (non-critical): ' + err.message);
    // Non-fatal: searches still work, just first one is slower
  }
}

module.exports = {
  generateEmbedding,
  generateEmbeddings,
  cosineSimilarity,
  warmupModel,
  EMBEDDING_DIMENSIONS,
};
