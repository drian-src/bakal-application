import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { getCategoryProducts } from '../../../../core/services/apiService';
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
    searchTerm: 'smartphone',
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
      <h2 className="categories-title">CATEGORIES</h2>

      {/* ── Category cards ───────────────────────────────────────────────── */}
      <div className="categories-grid">
        {CATEGORIES.map((cat) => {
          const isActive   = activeCategory?.id === cat.id;
          const state      = productMap[cat.id];
          const count      = state?.products?.length || 0;
          const isLoading  = state?.loading ?? true;

          return (
            <div
              key={cat.id}
              className={`category-item${isActive ? ' category-item--active' : ''}`}
              style={{ '--bg-image': `url(${cat.image})` }}
              onClick={() => handleCategoryClick(cat)}
              role="button"
              tabIndex={0}
              aria-label={`Browse ${cat.name}`}
              aria-expanded={isActive}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  handleCategoryClick(cat);
                }
              }}
            >
              <div className="category-name">{cat.name}</div>

              {/* Product count badge — shown once data loads */}
              {!isLoading && count > 0 && (
                <div style={{
                  position:     'absolute',
                  top:          '8px',
                  right:        '8px',
                  background:   'rgba(212,175,55,0.92)',
                  color:        '#0a1a3a',
                  fontSize:     '10px',
                  fontWeight:   '700',
                  padding:      '2px 6px',
                  borderRadius: '999px',
                  lineHeight:   '1.4',
                }}>
                  {count} items
                </div>
              )}

              {/* Loading indicator per card */}
              {isLoading && (
                <div style={{
                  position:     'absolute',
                  top:          '8px',
                  right:        '8px',
                  width:        '14px',
                  height:       '14px',
                  border:       '2px solid rgba(255,255,255,0.3)',
                  borderTopColor: 'var(--accent-gold, #d4af37)',
                  borderRadius: '50%',
                  animation:    'catgrid-spin 0.7s linear infinite',
                }} />
              )}
            </div>
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
                background:   'transparent',
                border:       'none',
                color:        'var(--accent-gold, #d4af37)',
                fontSize:     '13px',
                fontWeight:   '600',
                cursor:       'pointer',
                padding:      '4px 8px',
                borderRadius: '6px',
                display:      'flex',
                alignItems:   'center',
                gap:          '4px',
              }}
            >
              See all
              {/* Chevron right SVG */}
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
                stroke="currentColor" strokeWidth="2.5"
                strokeLinecap="round" strokeLinejoin="round">
                <path d="m9 18 6-6-6-6"/>
              </svg>
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

          {/* Product cards — horizontal scroll */}
          {activeLoaded && activeProducts.length > 0 && (
            <div style={{
              display:              'grid',
              gridTemplateColumns:  'repeat(auto-fill, minmax(160px, 1fr))',
              gap:                  '12px',
            }}>
              {activeProducts.map((product) => (
                <a
                  key={product.id}
                  href={product.productUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    display:        'flex',
                    flexDirection:  'column',
                    gap:            '8px',
                    padding:        '12px',
                    borderRadius:   '8px',
                    border:         '1px solid var(--border-color, #e5e7eb)',
                    background:     'var(--card-bg, #fff)',
                    textDecoration: 'none',
                    transition:     'box-shadow 0.2s ease, border-color 0.2s ease',
                    cursor:         'pointer',
                  }}
                  onMouseEnter={e => {
                    e.currentTarget.style.boxShadow   = '0 4px 16px rgba(0,0,0,0.10)';
                    e.currentTarget.style.borderColor = 'var(--accent-gold, #d4af37)';
                  }}
                  onMouseLeave={e => {
                    e.currentTarget.style.boxShadow   = 'none';
                    e.currentTarget.style.borderColor = 'var(--border-color, #e5e7eb)';
                  }}
                >
                  {/* Product image */}
                  <div style={{
                    width:          '100%',
                    paddingBottom:  '100%',
                    position:       'relative',
                    borderRadius:   '6px',
                    overflow:       'hidden',
                    background:     'var(--image-bg, #f9fafb)',
                    flexShrink:     0,
                  }}>
                    {product.imageUrl ? (
                      <img
                        src={product.imageUrl}
                        alt={product.title}
                        style={{
                          position:   'absolute',
                          inset:      0,
                          width:      '100%',
                          height:     '100%',
                          objectFit:  'contain',
                        }}
                        onError={e => { e.currentTarget.style.display = 'none'; }}
                      />
                    ) : (
                      // Fallback icon — no external placeholder service
                      <div style={{
                        position:       'absolute',
                        inset:          0,
                        display:        'flex',
                        alignItems:     'center',
                        justifyContent: 'center',
                      }}>
                        <svg width="32" height="32" viewBox="0 0 24 24" fill="none"
                          stroke="var(--text-muted,#9ca3af)" strokeWidth="1.5"
                          strokeLinecap="round" strokeLinejoin="round">
                          <rect x="2" y="3" width="20" height="14" rx="2"/>
                          <line x1="8" y1="21" x2="16" y2="21"/>
                          <line x1="12" y1="17" x2="12" y2="21"/>
                        </svg>
                      </div>
                    )}
                  </div>

                  {/* Platform badge */}
                  {product.platform && (
                    <span style={{
                      fontSize:     '10px',
                      fontWeight:   '600',
                      color:        'var(--text-muted, #6b7280)',
                      textTransform: 'uppercase',
                      letterSpacing: '0.3px',
                    }}>
                      {product.platform}
                    </span>
                  )}

                  {/* Product title */}
                  <p style={{
                    margin:               0,
                    fontSize:             '12px',
                    fontWeight:           '600',
                    color:                'var(--text-primary, #111827)',
                    lineHeight:           '1.4',
                    display:              '-webkit-box',
                    WebkitLineClamp:      2,
                    WebkitBoxOrient:      'vertical',
                    overflow:             'hidden',
                    flex:                 1,
                  }}>
                    {product.title}
                  </p>

                  {/* Price */}
                  <p style={{
                    margin:     0,
                    fontSize:   '14px',
                    fontWeight: '800',
                    color:      'var(--text-primary, #111827)',
                  }}>
                    {typeof product.price === 'number'
                      ? `₱${product.price.toLocaleString('en-PH')}`
                      : 'Price N/A'}
                  </p>
                </a>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Scoped keyframe for spinners — named to avoid global conflicts */}
      <style>{`
        @keyframes catgrid-spin {
          to { transform: rotate(360deg); }
        }
        .category-item {
          cursor: pointer;
          position: relative;
        }
        .category-item--active {
          outline: 2px solid var(--accent-gold, #d4af37);
          outline-offset: 2px;
        }
        .category-item:hover {
          transform: scale(1.03);
          transition: transform 0.2s ease;
        }
      `}</style>
    </section>
  );
};

export default CategoriesGrid;
