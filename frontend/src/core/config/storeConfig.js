/**
 * Frontend Store Configuration
 * Mirrors the backend store registry for fallback when API is unavailable
 */

export const STORE_CONFIG = {
  pcexpress: {
    id: 'pcexpress',
    name: 'PCExpress',
    icon: '🖥️',
    color: '#004080',
  },
  villman: {
    id: 'villman',
    name: 'VillMan',
    icon: '🛒',
    color: '#008000',
  },
  pcworx: {
    id: 'pcworx',
    name: 'PCWorx',
    icon: '⚙️',
    color: '#800080',
  },
};

/**
 * Get store metadata by platform name or ID
 * Normalized to work with both lowercase and mixed-case inputs
 */
export const getStoreConfig = (platformNameOrId) => {
  if (!platformNameOrId) return null;
  
  const normalized = platformNameOrId.toLowerCase();
  
  // Direct match by ID
  if (STORE_CONFIG[normalized]) {
    return STORE_CONFIG[normalized];
  }
  
  // Search by name (case-insensitive)
  for (const [key, config] of Object.entries(STORE_CONFIG)) {
    if (config.name.toLowerCase() === normalized) {
      return config;
    }
  }
  
  return null;
};

/**
 * Get store color by platform name
 * Returns a default color if platform not found
 */
export const getStoreColor = (platformName) => {
  const config = getStoreConfig(platformName);
  return config?.color || '#888888';
};
