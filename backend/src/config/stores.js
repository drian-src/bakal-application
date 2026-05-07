'use strict';

/**
 * Store Registry — Single source of truth for all supported scraping stores.
 * To add a new store: add an entry here + create its scraper file.
 * To disable a store: set `enabled: false`.
 */
const STORES = [
  {
    id: 'pcexpress',
    name: 'PCExpress',
    icon: '🖥️',
    color: '#004080',
    baseUrl: 'https://www.pcexpress.ph',
    enabled: true,
  },
  {
    id: 'villman',
    name: 'VillMan',
    icon: '🛒',
    color: '#008000',
    baseUrl: 'https://www.villman.com',
    enabled: true,
  },
  {
    id: 'pcworx',
    name: 'PCWorx',
    icon: '⚙️',
    color: '#800080',
    baseUrl: 'https://www.pcworx.com.ph',
    enabled: true,
  },
];

// Helper: get only enabled stores
const getEnabledStores = () => STORES.filter((s) => s.enabled);

// Helper: get store metadata by id
const getStoreById = (id) => STORES.find((s) => s.id === id);

// Helper: get store metadata by name
const getStoreByName = (name) => STORES.find((s) => s.name === name);

module.exports = {
  STORES,
  getEnabledStores,
  getStoreById,
  getStoreByName,
};
