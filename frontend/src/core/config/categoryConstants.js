/**
 * Category & Product Constants
 * 
 * Centralized configuration for:
 * - Platform color mapping (PCWorx, VillMan, PCExpress)
 * - Category metadata and icons
 * - Color gradients and theme values
 */

import {
  Smartphone,
  Tablet,
  Laptop,
  Monitor,
  Headphones,
} from 'lucide-react';

// ─── PLATFORM COLOR MAPPING ─────────────────────────────────────────────────
// Used for: platform badges, gradient accents, product identification
const PLATFORM_COLORS = {
  PCWorx: {
    bg: 'rgba(99,102,241,0.1)',      // indigo-500 at 10% opacity
    border: 'rgba(99,102,241,0.25)',  // indigo-500 at 25% opacity
    text: '#6366f1',                   // indigo-500
    accent: '#6366f1',                 // for left border on card
    gradient: 'linear-gradient(135deg, #6366f1, #4f46e5)', // darker indigo
  },
  VillMan: {
    bg: 'rgba(139,92,246,0.1)',       // violet-500 at 10% opacity
    border: 'rgba(139,92,246,0.25)',  // violet-500 at 25% opacity
    text: '#8b5cf6',                   // violet-500
    accent: '#8b5cf6',                 // for left border on card
    gradient: 'linear-gradient(135deg, #8b5cf6, #7c3aed)', // darker violet
  },
  PCExpress: {
    bg: 'rgba(59,130,246,0.1)',       // blue-500 at 10% opacity
    border: 'rgba(59,130,246,0.25)',  // blue-500 at 25% opacity
    text: '#3b82f6',                   // blue-500
    accent: '#3b82f6',                 // for left border on card
    gradient: 'linear-gradient(135deg, #3b82f6, #2563eb)', // darker blue
  },
};

const getPlatformColor = (platformName) => {
  return PLATFORM_COLORS[platformName] || PLATFORM_COLORS.PCWorx;
};

// ─── CATEGORY ICONS & METADATA ──────────────────────────────────────────────
// Maps category searchTerms to their lucide-react icon components
const CATEGORY_ICONS = {
  phone: Smartphone,
  phones: Smartphone,
  tablet: Tablet,
  tablets: Tablet,
  laptop: Laptop,
  laptops: Laptop,
  desktop: Monitor,
  computers: Monitor,
  accessories: Headphones,
  keyboard: Headphones, // fallback for keyboard → headphones
};

const getCategoryIcon = (searchTerm) => {
  const key = searchTerm?.toLowerCase() || 'phone';
  return CATEGORY_ICONS[key] || Smartphone; // Smartphone as fallback
};

// ─── GRADIENT THEME ─────────────────────────────────────────────────────────
const GRADIENT_THEME = {
  primary: 'linear-gradient(135deg, #6366f1, #8b5cf6)',    // indigo → violet
  primaryReverse: 'linear-gradient(135deg, #8b5cf6, #6366f1)', // violet → indigo
  accent: '#d4af37',                                        // gold accent
  accentGradient: 'linear-gradient(135deg, #d4af37, #cd853f)', // gold → darker gold
};

// ─── EXPORTS ────────────────────────────────────────────────────────────────

export {
  PLATFORM_COLORS,
  getPlatformColor,
  CATEGORY_ICONS,
  getCategoryIcon,
  GRADIENT_THEME,
};
