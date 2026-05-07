import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { getCategoryProducts } from '../../../../core/services/apiService';
import { PLATFORM_COLORS, getPlatformColor, getCategoryIcon, GRADIENT_THEME } from '../../../../core/config/categoryConstants';
import {
  LayoutGrid,
  ChevronRight,
  ArrowUpRight,
  RefreshCw,
} from 'lucide-react';
import './CategoriesGrid.css';

/**
 * CategoriesGrid
 *
 * On mount: fetches real products from the database for all 5 categories
 * in parallel. No scraping — reads from already-scraped products table.
 *
 * On category click: shows the pre-loaded products inline in a panel below
 * the category cards. If no products exist in the DB yet (empty table),
 * falls back to navigating to /search?q=keyword to trigger a fresh scrape.
 *
 * searchTerm: the keyword sent to the DB query (.ilike title search).
 * Separate from display name because product titles use specific terms.
 */
const CATEGORIES = [
  {
    id:         1,
    name:       'Phones',
    searchTerm: 'phone',
    image:      'https://cdn.thewirecutter.com/wp-content/media/2025/08/BEST-ANDROID-PHONES-00864.jpg?auto=webp&quality=75&width=1024',
  },
  {
    id:         2,
    name:       'Tablets',
    searchTerm: 'tablet',
    image:      'https://cdn.thewirecutter.com/wp-content/media/2025/04/BEST-TABLETS-2048px-3x2-1.jpg?auto=webp&quality=75&crop=1:1,smart&width=1024',
  },
  {
    id:         3,
    name:       'Laptops',
    searchTerm: 'laptop',
    image:      'https://www.cnet.com/a/img/resize/bb8a2aa9c31f8ec08d82228a51eabf05f00e54d2/hub/2025/03/10/d190e21d-9634-440d-8f33-396c8cb3da6a/m4-macbook-air-15-11.jpg?auto=webp&height=500',
  },
  {
    id:         4,
    name:       'Computers',
    searchTerm: 'desktop',
    image:      'https://dlcdnrog.asus.com/rog/media/172782111228.webp',
  },
  {
    id:         5,
    name:       'Accessories',
    searchTerm: 'keyboard',
    image:      'https://media.istockphoto.com/id/1267943701/photo/gamer-work-space-concept-top-view-a-gaming-gear-mouse-keyboard-joystick-headset-mobile.jpg?s=612x612&w=0&k=20&c=dkYaZvcgbpArPJ2WwjQQKRnOmQSM57d88E0RZjpFYZo=',
  },
];

const CategoriesGrid = () => {
  const navigate = useNavigate();

  // productMap: { [categoryId]: { products: [], loading: bool, loaded: bool } }
  const [productMap, setProductMap]       = useState({});
  const [activeCategory, setActiveCategory] = useState(null);

  // ── Pre-fetch all categories on mount ──────────────────────────────────────
  useEffect(() => {
    const fetchAll = async () => {
      // Mark all as loading
      const initial = {};
      CATEGORIES.forEach(cat => {
        initial[cat.id] = { products: [], loading: true, loaded: false };
      });
      setProductMap(initial);

      // Fetch all 5 categories in parallel
      const results = await Promise.allSettled(
        CATEGORIES.map(cat => getCategoryProducts(cat.searchTerm, 8))
      );

      // Update state with results
      setProductMap(prev => {
        const updated = { ...prev };
        CATEGORIES.forEach((cat, index) => {
          const result = results[index];
          updated[cat.id] = {
            loading: false,
            loaded:  true,
            products: result.status === 'fulfilled'
              ? (result.value?.products || [])
              : [],
          };
        });
        return updated;
      });
    };

    fetchAll();
  }, []); // run once on mount

  // ── Handle category card click ─────────────────────────────────────────────
  const handleCategoryClick = useCallback((cat) => {
    // Toggle: clicking the active category collapses the panel
    if (activeCategory?.id === cat.id) {
      setActiveCategory(null);
      return;
    }

    setActiveCategory(cat);

    const state = productMap[cat.id];

    // Fallback: if no products in DB yet, trigger a fresh scrape via search page
    if (state?.loaded && state.products.length === 0) {
      navigate(`/search?q=${encodeURIComponent(cat.searchTerm)}`);
    }
  }, [activeCategory, productMap, navigate]);

  // ── Get active category products ──────────────────────────────────────────
  const activeProducts  = activeCategory ? (productMap[activeCategory.id]?.products || []) : [];
  const activeLoading   = activeCategory ? (productMap[activeCategory.id]?.loading ?? false) : false;
  const activeLoaded    = activeCategory ? (productMap[activeCategory.id]?.loaded ?? false) : false;

  return (
    <section className="categories-section">
      {/* ── Enhanced Section Header with Gradient Left Border ──────────────── */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        marginBottom: '24px',
        paddingLeft: '16px',
        borderLeft: '4px solid',
        borderImageSource: GRADIENT_THEME.primary,
        borderImageSlice: 1,
      }}>
        <LayoutGrid size={24} strokeWidth={1.5} style={{ color: '#6366f1' }} />
        <div>
          <h2 style={{
            margin: '0 0 4px',
            fontSize: '20px',
            fontWeight: '600',
            color: '#111827',
          }}>
            Browse Categories
          </h2>
          <p style={{
            margin: 0,
            fontSize: '13px',
            color: '#9ca3af',
          }}>
            Find the best prices across all stores
          </p>
        </div>
      </div>

      {/* ── Category tabs ────────────────────────────────────────────────── */}
      <div className="categories-grid" style={{
        display: 'flex',
        gap: '12px',
        marginBottom: '24px',
        overflowX: 'auto',
        paddingBottom: '8px',
        scrollBehavior: 'smooth',
      }}>
        {CATEGORIES.map((cat) => {
          const isActive   = activeCategory?.id === cat.id;
          const state      = productMap[cat.id];
          const count      = state?.products?.length || 0;
          const isLoading  = state?.loading ?? true;
          const IconComponent = getCategoryIcon(cat.searchTerm);

          return (
            <button
              key={cat.id}
              onClick={() => handleCategoryClick(cat)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: isActive ? '10px 18px' : '8px 16px',
                borderRadius: '24px',
                border: isActive ? 'none' : '1px solid #e5e7eb',
                background: isActive 
                  ? GRADIENT_THEME.primary
                  : '#ffffff',
                color: isActive ? '#ffffff' : '#374151',
                fontWeight: isActive ? '600' : '500',
                fontSize: '14px',
                cursor: 'pointer',
                transition: 'all 150ms ease',
                whiteSpace: 'nowrap',
                boxShadow: isActive 
                  ? '0 4px 12px rgba(99,102,241,0.25)'
                  : 'none',
                flexShrink: 0,
              }}
              onMouseEnter={(e) => {
                if (!isActive) {
                  e.currentTarget.style.borderColor = '#c7d2fe';
                  e.currentTarget.style.color = '#6366f1';
                }
              }}
              onMouseLeave={(e) => {
                if (!isActive) {
                  e.currentTarget.style.borderColor = '#e5e7eb';
                  e.currentTarget.style.color = '#374151';
                }
              }}
              role="tab"
              aria-selected={isActive}
              aria-label={`View ${cat.name}`}
            >
              <IconComponent size={18} strokeWidth={1.5} />
              <span>{cat.name}</span>
              
              {/* Product count badge */}
              {!isLoading && count > 0 && (
                <span style={{
                  marginLeft: '4px',
                  padding: '2px 6px',
                  borderRadius: '12px',
                  fontSize: '11px',
                  fontWeight: '700',
                  background: isActive 
                    ? 'rgba(255,255,255,0.25)'
                    : 'rgba(99,102,241,0.1)',
                  color: isActive ? '#ffffff' : '#6366f1',
                }}>
                  {count}
                </span>
              )}

              {/* Loading indicator */}
              {isLoading && (
                <div style={{
                  width: '12px',
                  height: '12px',
                  border: '2px solid',
                  borderColor: isActive ? 'rgba(255,255,255,0.4)' : '#e5e7eb',
                  borderTopColor: isActive ? '#ffffff' : '#6366f1',
                  borderRadius: '50%',
                  animation: 'catgrid-spin 0.7s linear infinite',
                }} />
              )}
            </button>
          );
        })}
      </div>

      {/* ── Product panel (expands below grid on category click) ─────────── */}
      {activeCategory && (
        <div style={{
          marginTop:    '16px',
          background:   'var(--card-bg, #ffffff)',
          border:       '1px solid var(--border-color, #e5e7eb)',
          borderRadius: '12px',
          padding:      '20px',
          boxShadow:    '0 2px 12px rgba(0,0,0,0.06)',
        }}>

          {/* Panel header */}
          <div style={{
            display:        'flex',
            alignItems:     'center',
            justifyContent: 'space-between',
            marginBottom:   '16px',
          }}>
            <h3 style={{
              margin:     0,
              fontSize:   '16px',
              fontWeight: '700',
              color:      'var(--text-primary, #111827)',
            }}>
              {activeCategory.name}
              {activeLoaded && activeProducts.length > 0 && (
                <span style={{
                  marginLeft: '8px',
                  fontSize:   '13px',
                  fontWeight: '500',
                  color:      'var(--text-muted, #6b7280)',
                }}>
                  {activeProducts.length} products
                </span>
              )}
            </h3>

            {/* "See all" link — triggers full search */}
            <button
              onClick={() => navigate(`/search?q=${encodeURIComponent(activeCategory.searchTerm)}`)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '8px 12px',
                borderRadius: '8px',
                border: 'none',
                background: GRADIENT_THEME.primary,
                color: '#ffffff',
                fontSize: '13px',
                fontWeight: '600',
                cursor: 'pointer',
                transition: 'all 150ms ease',
                boxShadow: '0 2px 8px rgba(99,102,241,0.2)',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-2px)';
                e.currentTarget.style.boxShadow = '0 4px 12px rgba(99,102,241,0.3)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = '0 2px 8px rgba(99,102,241,0.2)';
              }}
            >
              See all
              <ChevronRight size={14} strokeWidth={2} />
            </button>
          </div>

          {/* Loading state */}
          {activeLoading && (
            <div style={{
              display:        'flex',
              justifyContent: 'center',
              alignItems:     'center',
              padding:        '32px 0',
              gap:            '10px',
              color:          'var(--text-muted, #6b7280)',
              fontSize:       '14px',
            }}>
              <div style={{
                width:          '20px',
                height:         '20px',
                border:         '2px solid #e5e7eb',
                borderTopColor: 'var(--accent-gold, #d4af37)',
                borderRadius:   '50%',
                animation:      'catgrid-spin 0.7s linear infinite',
              }} />
              Loading products...
            </div>
          )}

          {/* Empty state — fallback message */}
          {activeLoaded && activeProducts.length === 0 && (
            <div style={{
              textAlign: 'center',
              padding:   '24px 0',
              color:     'var(--text-muted, #6b7280)',
              fontSize:  '14px',
            }}>
              <p style={{ margin: '0 0 12px' }}>
                No {activeCategory.name.toLowerCase()} in database yet.
              </p>
              <button
                onClick={() => navigate(`/search?q=${encodeURIComponent(activeCategory.searchTerm)}`)}
                style={{
                  padding:      '8px 20px',
                  borderRadius: '8px',
                  background:   'var(--accent-gold, #d4af37)',
                  color:        '#0a1a3a',
                  border:       'none',
                  fontWeight:   '600',
                  fontSize:     '13px',
                  cursor:       'pointer',
                }}
              >
                Search {activeCategory.name} now
              </button>
            </div>
          )}

          {/* Product cards — grid layout with enhanced styling */}
          {activeLoaded && activeProducts.length > 0 && (
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))',
              gap: '12px',
            }}>
              {activeProducts.map((product) => {
                // Safe field access with fallbacks
                const imageUrl = product.imageUrl || product.image_url || null;
                const productUrl = product.productUrl || product.product_url || '#';
                const title = product.title || product.name || 'Unknown Product';
                const price = product.price || 0;
                const platform = product.platform || 'Unknown';
                const platformColor = getPlatformColor(platform);
                
                return (
                  <a
                    key={product.id}
                    href={productUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      borderRadius: '12px',
                      border: '1px solid #e5e7eb',
                      background: '#ffffff',
                      textDecoration: 'none',
                      overflow: 'hidden',
                      transition: 'all 200ms ease',
                      cursor: 'pointer',
                      boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
                      position: 'relative',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.transform = 'translateY(-4px)';
                      e.currentTarget.style.boxShadow = '0 8px 16px rgba(0,0,0,0.1)';
                      e.currentTarget.style.borderColor = platformColor.accent;
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.transform = 'translateY(0)';
                      e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.05)';
                      e.currentTarget.style.borderColor = '#e5e7eb';
                    }}
                  >
                    {/* Product image — 120px height */}
                    <div style={{
                      width: '100%',
                      height: '120px',
                      background: '#f9fafb',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      overflow: 'hidden',
                      position: 'relative',
                    }}>
                      {imageUrl ? (
                        <img
                          src={imageUrl}
                          alt={title}
                          style={{
                            width: '100%',
                            height: '100%',
                            objectFit: 'contain',
                            padding: '8px',
                          }}
                          onError={(e) => {
                            e.currentTarget.style.display = 'none';
                          }}
                        />
                      ) : (
                        <svg width="32" height="32" viewBox="0 0 24 24" fill="none"
                          stroke="#9ca3af" strokeWidth="1.5" strokeLinecap="round"
                          strokeLinejoin="round">
                          <rect x="2" y="3" width="20" height="14" rx="2"/>
                          <line x1="8" y1="21" x2="16" y2="21"/>
                          <line x1="12" y1="17" x2="12" y2="21"/>
                        </svg>
                      )}
                      
                      {/* Platform badge overlay — absolute positioning */}
                      {platform && (
                        <span style={{
                          position: 'absolute',
                          bottom: '8px',
                          left: '8px',
                          padding: '4px 8px',
                          borderRadius: '6px',
                          background: platformColor.bg,
                          border: `1px solid ${platformColor.border}`,
                          color: platformColor.text,
                          fontSize: '10px',
                          fontWeight: '700',
                          textTransform: 'uppercase',
                          letterSpacing: '0.3px',
                          lineHeight: '1.2',
                        }}>
                          {platform}
                        </span>
                      )}
                    </div>

                    {/* Card content — title and price */}
                    <div style={{
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '8px',
                      padding: '12px',
                      flex: 1,
                    }}>
                      {/* Product title — 2-line clamp */}
                      <p style={{
                        margin: 0,
                        fontSize: '12px',
                        fontWeight: '600',
                        color: '#111827',
                        lineHeight: '1.4',
                        display: '-webkit-box',
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: 'vertical',
                        overflow: 'hidden',
                      }}>
                        {title}
                      </p>

                      {/* Price — bold formatting */}
                      <p style={{
                        margin: 0,
                        fontSize: '14px',
                        fontWeight: '800',
                        color: '#111827',
                        marginTop: 'auto',
                      }}>
                        {typeof price === 'number'
                          ? `₱${Math.round(price).toLocaleString('en-PH')}`
                          : 'Price N/A'}
                      </p>

                      {/* "View Deal" button — gradient styling */}
                      <button
                        onClick={(e) => {
                          e.preventDefault();
                          window.open(productUrl, '_blank', 'noopener,noreferrer');
                        }}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '4px',
                          marginTop: '8px',
                          padding: '6px 10px',
                          borderRadius: '6px',
                          border: 'none',
                          background: GRADIENT_THEME.primary,
                          color: '#ffffff',
                          fontSize: '11px',
                          fontWeight: '600',
                          cursor: 'pointer',
                          transition: 'all 150ms ease',
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.transform = 'scale(1.05)';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.transform = 'scale(1)';
                        }}
                      >
                        View Deal
                        <ArrowUpRight size={12} strokeWidth={2} />
                      </button>
                    </div>
                  </a>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Scoped keyframe for spinners — named to avoid global conflicts */}
      <style>{`
        @keyframes catgrid-spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </section>
  );
};

export default CategoriesGrid;
