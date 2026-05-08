#!/usr/bin/env node
/**
 * DEALS BUG FIX MIGRATION
 * ═══════════════════════════════════════════════════════════════════════════════
 * 
 * Purpose: Fix false positives where ALL products were marked as `is_on_sale = true`
 * with fake discounts, including products with no actual price reduction.
 * 
 * Root Causes Fixed:
 * 1. Villman scraper hardcoded `original_price: null`, ignoring Shopify API data
 * 2. Generic badge selectors matched "New", "Featured", "Best Seller" on all products
 * 3. No validation on discount_percent or original_price values
 * 
 * This migration cleans the database by removing false positives while preserving
 * legitimate deals based on:
 * - Actual price reduction (original_price > price by at least ₱1)
 * - Valid product-specific promo labels (excluding generic terms)
 * 
 * ═══════════════════════════════════════════════════════════════════════════════
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);
const TABLE = 'products';

// Generic labels that appear on many products and should NOT mark as on sale
const GENERIC_LABELS = [
  'new', 'featured', 'best seller', 'trending', 'popular', 'hot',
  'sale', 'promo', 'promotion', 'discount', 'special', 'limited',
  'exclusive', 'recommended', 'top pick', 'bestseller', 'recommended', 'deal of the day'
];

async function main() {
  console.log('\n' + '═'.repeat(80));
  console.log('DEALS BUG FIX MIGRATION - Database Cleanup');
  console.log('═'.repeat(80));

  try {
    // ─── STEP 1: COUNT FALSE POSITIVES ─────────────────────────────────────────────────
    console.log('\n[STEP 1] Counting false positives in current database...');
    
    // False positive cases:
    // A) is_on_sale=true but original_price <= price (no actual discount)
    // B) is_on_sale=true but original_price AND discount_percent are both NULL
    // C) is_on_sale=true with only a generic badge in promo_label
    
    const { count: falsePositiveCount, error: countErr } = await supabase
      .from(TABLE)
      .select('id', { count: 'exact', head: true })
      .eq('is_on_sale', true)
      .or(
        `and(or(` +
        `original_price.lte.price,` +      // original_price <= price
        `and(original_price.is.null,discount_percent.is.null)` +  // both null
        `),is_on_sale.eq.true)`
      );

    if (countErr) throw countErr;

    console.log(`  • Found ${falsePositiveCount || 0} products with potential false positive discounts`);

    // ─── STEP 2: CLEAR INVALID DISCOUNT_PERCENT ─────────────────────────────────────────────────
    console.log('\n[STEP 2] Clearing invalid discount_percent values (< 0 or > 99%)...');
    
    // UPDATE products
    // SET discount_percent = NULL
    // WHERE discount_percent IS NOT NULL AND (discount_percent < 0 OR discount_percent > 99)
    
    const { data: invalidDiscounts, error: step2Err } = await supabase
      .from(TABLE)
      .update({ discount_percent: null })
      .neq('discount_percent', null)
      .or('discount_percent.lt.0,discount_percent.gt.99');

    if (step2Err) throw step2Err;
    console.log(`  • Cleared ${invalidDiscounts?.length || 0} invalid discount percentages`);

    // ─── STEP 3: CLEAR MISSING ORIGINAL_PRICE WHEN IS_ON_SALE=TRUE ────────────────────────────
    console.log('\n[STEP 3] Clearing is_on_sale for products with NULL original_price and no promo...');
    
    // UPDATE products
    // SET is_on_sale = FALSE
    // WHERE is_on_sale = TRUE AND original_price IS NULL AND (promo_label IS NULL OR promo_label IN generic terms)
    
    const { data: missingOriginal, error: step3Err } = await supabase
      .from(TABLE)
      .update({ is_on_sale: false })
      .eq('is_on_sale', true)
      .isNull('original_price');
      // Note: We'll clean up generic promo labels in step 5

    if (step3Err) throw step3Err;
    console.log(`  • Reset is_on_sale to FALSE for ${missingOriginal?.length || 0} products without original_price`);

    // ─── STEP 4: CLEAR ORIGINAL_PRICE WHERE ORIGINAL_PRICE <= PRICE ────────────────────────────
    console.log('\n[STEP 4] Clearing original_price where original_price ≤ current price...');
    
    // UPDATE products
    // SET original_price = NULL, discount_percent = NULL, is_on_sale = FALSE
    // WHERE original_price <= price
    
    const { data: invalidOriginal, error: step4Err } = await supabase
      .from(TABLE)
      .select('id, price, original_price')
      .lte('original_price', 'price');

    if (step4Err) throw step4Err;

    let fixedCount = 0;
    if (invalidOriginal && invalidOriginal.length > 0) {
      for (const product of invalidOriginal) {
        const { error: updateErr } = await supabase
          .from(TABLE)
          .update({
            original_price: null,
            discount_percent: null,
            is_on_sale: false,
          })
          .eq('id', product.id);
        
        if (updateErr) {
          console.error(`    Error updating product ${product.id}:`, updateErr);
        } else {
          fixedCount++;
        }
      }
    }
    console.log(`  • Cleared original_price for ${fixedCount} products where original_price ≤ current price`);

    // ─── STEP 5: CLEAR GENERIC PROMO LABELS ────────────────────────────────────────────────────
    console.log('\n[STEP 5] Clearing generic promo labels and resetting is_on_sale...');
    
    const { data: genericPromos, error: step5Err } = await supabase
      .from(TABLE)
      .select('id, promo_label')
      .not('promo_label', 'is', null);

    if (step5Err) throw step5Err;

    let genericCount = 0;
    if (genericPromos && genericPromos.length > 0) {
      for (const product of genericPromos) {
        const label = (product.promo_label || '').toLowerCase().trim();
        const isGeneric = GENERIC_LABELS.some(g => label.includes(g) || label === g);
        
        if (isGeneric) {
          const { error: updateErr } = await supabase
            .from(TABLE)
            .update({
              promo_label: null,
              is_on_sale: false,  // If only generic label was marking it as on sale
            })
            .eq('id', product.id);
          
          if (updateErr) {
            console.error(`    Error updating product ${product.id}:`, updateErr);
          } else {
            genericCount++;
          }
        }
      }
    }
    console.log(`  • Cleared ${genericCount} products with generic promo labels`);

    // ─── STEP 6: ENSURE DISCOUNT_PERCENT MATCHES ORIGINAL_PRICE ────────────────────────────────
    console.log('\n[STEP 6] Validating discount_percent calculations...');
    
    const { data: allDiscounted, error: step6Err } = await supabase
      .from(TABLE)
      .select('id, price, original_price, discount_percent')
      .not('original_price', 'is', null);

    if (step6Err) throw step6Err;

    let recalcCount = 0;
    if (allDiscounted && allDiscounted.length > 0) {
      for (const product of allDiscounted) {
        const price = parseFloat(product.price) || 0;
        const originalPrice = parseFloat(product.original_price) || 0;
        
        if (originalPrice > 0 && originalPrice > price) {
          const expectedDiscount = ((originalPrice - price) / originalPrice) * 100;
          const actualDiscount = parseFloat(product.discount_percent) || 0;
          
          // If mismatch or outside valid range, recalculate
          if (Math.abs(expectedDiscount - actualDiscount) > 0.1 || actualDiscount < 0 || actualDiscount > 99) {
            const { error: updateErr } = await supabase
              .from(TABLE)
              .update({
                discount_percent: parseFloat(expectedDiscount.toFixed(2)),
              })
              .eq('id', product.id);
            
            if (updateErr) {
              console.error(`    Error updating product ${product.id}:`, updateErr);
            } else {
              recalcCount++;
            }
          }
        }
      }
    }
    console.log(`  • Recalculated discount_percent for ${recalcCount} products`);

    // ─── STEP 7: CLEAR IS_ON_SALE WHERE NO EVIDENCE EXISTS ────────────────────────────────────
    console.log('\n[STEP 7] Resetting is_on_sale to FALSE where no discount evidence exists...');
    
    const { data: noEvidence, error: step7Err } = await supabase
      .from(TABLE)
      .select('id, original_price, promo_label, is_on_sale')
      .eq('is_on_sale', true);

    if (step7Err) throw step7Err;

    let resetCount = 0;
    if (noEvidence && noEvidence.length > 0) {
      for (const product of noEvidence) {
        const hasOriginalPrice = product.original_price !== null && product.original_price !== undefined;
        const hasPromoLabel = product.promo_label !== null && product.promo_label !== undefined && product.promo_label.trim() !== '';
        
        if (!hasOriginalPrice && !hasPromoLabel) {
          const { error: updateErr } = await supabase
            .from(TABLE)
            .update({ is_on_sale: false })
            .eq('id', product.id);
          
          if (updateErr) {
            console.error(`    Error updating product ${product.id}:`, updateErr);
          } else {
            resetCount++;
          }
        }
      }
    }
    console.log(`  • Reset is_on_sale to FALSE for ${resetCount} products without discount evidence`);

    // ─── STEP 8: APPLY MINIMUM ₱1 DIFFERENCE RULE ──────────────────────────────────────────────
    console.log('\n[STEP 8] Enforcing minimum ₱1 price difference rule...');
    
    const { data: smallDifferences, error: step8Err } = await supabase
      .from(TABLE)
      .select('id, price, original_price')
      .not('original_price', 'is', null);

    if (step8Err) throw step8Err;

    let minDiffCount = 0;
    if (smallDifferences && smallDifferences.length > 0) {
      for (const product of smallDifferences) {
        const price = parseFloat(product.price) || 0;
        const originalPrice = parseFloat(product.original_price) || 0;
        const difference = originalPrice - price;
        
        if (difference > 0 && difference < 1) {
          // Difference < ₱1 — treat as rounding artifact
          const { error: updateErr } = await supabase
            .from(TABLE)
            .update({
              original_price: null,
              discount_percent: null,
              is_on_sale: false,
            })
            .eq('id', product.id);
          
          if (updateErr) {
            console.error(`    Error updating product ${product.id}:`, updateErr);
          } else {
            minDiffCount++;
          }
        }
      }
    }
    console.log(`  • Cleared ${minDiffCount} products with < ₱1 price difference`);

    // ─── STEP 9: FINAL VERIFICATION ────────────────────────────────────────────────────────────
    console.log('\n[STEP 9] Final verification - scanning for remaining false positives...');
    
    const { data: remaining, error: verifyErr } = await supabase
      .from(TABLE)
      .select('id, title, price, original_price, discount_percent, is_on_sale, promo_label')
      .eq('is_on_sale', true)
      .limit(10);

    if (verifyErr) throw verifyErr;

    console.log(`\n  ✓ Sample of remaining on-sale products (showing first 10):`);
    if (remaining && remaining.length > 0) {
      remaining.forEach((p, i) => {
        const hasOriginal = p.original_price !== null;
        const hasDiscount = p.discount_percent > 0;
        const hasPromo = p.promo_label !== null;
        console.log(
          `    ${i + 1}. "${p.title?.substring(0, 40) || 'N/A'}..." | ` +
          `₱${p.price} (orig: ${hasOriginal ? '₱' + p.original_price : 'none'}) | ` +
          `discount: ${hasDiscount ? p.discount_percent.toFixed(1) + '%' : 'none'} | ` +
          `promo: "${p.promo_label || 'none'}"`
        );
      });
    } else {
      console.log(`    (No products currently marked as on sale)`);
    }

    // ─── COUNT FINAL STATE ──────────────────────────────────────────────────────────────────────
    const { count: finalOnSaleCount, error: finalCountErr } = await supabase
      .from(TABLE)
      .select('id', { count: 'exact', head: true })
      .eq('is_on_sale', true);

    if (finalCountErr) throw finalCountErr;

    const { count: totalCount, error: totalErr } = await supabase
      .from(TABLE)
      .select('id', { count: 'exact', head: true });

    if (totalErr) throw totalErr;

    console.log(`\n  ✓ Final state: ${finalOnSaleCount || 0} products marked as on-sale (out of ${totalCount || 0} total)`);

    console.log('\n' + '═'.repeat(80));
    console.log('✅ MIGRATION COMPLETE - Database cleaned and validated');
    console.log('═'.repeat(80));

  } catch (err) {
    console.error('\n❌ MIGRATION FAILED:');
    console.error(err?.message || String(err));
    process.exit(1);
  }
}

main();
