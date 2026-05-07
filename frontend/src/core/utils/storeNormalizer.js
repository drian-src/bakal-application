/**
 * Store Name Normalization Utility
 * Handles various platform name formats and normalizes them to standard names
 * 
 * Valid outputs: 'pcexpress', 'pcworx', 'villman'
 */

/**
 * Normalize platform/store name from various input formats
 * Handles: null, undefined, mixed case, spaces, typos
 * 
 * @param {string|null|undefined} platformValue - Raw platform name from API/DB
 * @returns {string|null} - Normalized platform ID or null if not recognized
 */
export const normalizePlatform = (platformValue) => {
  // Handle null/undefined
  if (!platformValue) {
    return null;
  }

  // Convert to lowercase and trim
  const normalized = String(platformValue)
    .toLowerCase()
    .trim()
    .replace(/\s+/g, ''); // Remove all spaces

  // Direct mappings for all variations
  const PLATFORM_MAP = {
    // PCExpress variants
    'pcexpress': 'pcexpress',
    'pc-express': 'pcexpress',
    'pc_express': 'pcexpress',
    'pcx': 'pcexpress',

    // PCWorx variants
    'pcworx': 'pcworx',
    'pc-worx': 'pcworx',
    'pc_worx': 'pcworx',

    // VillMan variants
    'villman': 'villman',
    'vill-man': 'villman',
    'vill_man': 'villman',
    'villmanb2b': 'villman',
  };

  // Return normalized or null if not found
  return PLATFORM_MAP[normalized] || null;
};

/**
 * Get display name for normalized platform ID
 * @param {string|null} normalizedPlatform - Normalized platform ID from normalizePlatform()
 * @returns {string} - Display name (e.g., "PCExpress")
 */
export const getPlatformDisplayName = (normalizedPlatform) => {
  const DISPLAY_NAMES = {
    'pcexpress': 'PCExpress',
    'pcworx': 'PCWorx',
    'villman': 'VillMan',
  };

  return DISPLAY_NAMES[normalizedPlatform] || 'Marketplace';
};

/**
 * Normalize a product's platform field
 * Ensures both normalized ID and display name are available
 * 
 * @param {Object} product - Product object from API
 * @returns {Object} - Product with normalized platform fields added
 */
export const normalizeProductPlatform = (product) => {
  if (!product) return product;

  // Try to extract platform from various possible fields
  const platformValue = product.platform || product.store || product.seller_name || product.source || product.vendor;
  const normalized = normalizePlatform(platformValue);

  return {
    ...product,
    platform_id: normalized,
    platformId: normalized,
    platform: getPlatformDisplayName(normalized),
    // Keep original for debugging
    _original_platform: platformValue,
  };
};

/**
 * Normalize array of products
 * @param {Array} products - Array of product objects
 * @returns {Array} - Products with normalized platform fields
 */
export const normalizeProductsPlatform = (products) => {
  if (!Array.isArray(products)) return [];
  return products.map(normalizeProductPlatform);
};
