#!/usr/bin/env node
'use strict';

/**
 * CLEANUP_FAKE_DISCOUNTS.js
 * 
 * Removes corrupted/fake discount data from products table.
 * Fake discounts are records where:
 *   - discount_percent > 0 but original_price IS NULL
 *   - discount_percent > 0 but original_price <= price
 * 
 * These cause false "Save ₱X" calculations on carousel/comparison.
 * 
 * Usage: node scripts/cleanupFakeDiscounts.js
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

// Initialize Supabase
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY environment variables required in .env file');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function cleanupFakeDiscounts() {
  console.log('🧹 Starting fake discount cleanup...\n');

  try {
    // Step 1: Get all products with discount_percent > 0
    console.log('📊 Scanning for fake discounts...');
    
    const { data: allDiscountedProducts, error: scanError } = await supabase
      .from('products')
      .select('id, title, price, original_price, discount_percent')
      .gt('discount_percent', 0);
    
    if (scanError) throw scanError;

    // Filter for fake discounts in JavaScript
    const fakeDiscounts = allDiscountedProducts.filter(p => 
      p.original_price === null || p.original_price <= p.price
    );

    console.log(`   Found: ${fakeDiscounts.length} products with fake/invalid discounts\n`);

    if (fakeDiscounts.length === 0) {
      console.log('✅ No fake discounts found! Database is clean.\n');
      return;
    }

    // Show examples of what will be fixed
    console.log('📋 Examples of fake discounts (first 5):');
    const examples = fakeDiscounts.slice(0, 5);
    examples.forEach((product, idx) => {
      console.log(`   ${idx + 1}. ${product.title}`);
      console.log(`      Price: ₱${product.price} | Original: ${product.original_price || 'NULL'} | Discount: ${product.discount_percent}%`);
    });
    console.log('');

    // Step 2: Update all fake discount records
    console.log(`🔧 Fixing ${fakeDiscounts.length} records...`);

    const ids = fakeDiscounts.map(r => r.id);

    // Update in batches to avoid timeout
    const batchSize = 100;
    let updated = 0;

    for (let i = 0; i < ids.length; i += batchSize) {
      const batch = ids.slice(i, i + batchSize);
      
      const { error: updateError, count: batchCount } = await supabase
        .from('products')
        .update({
          discount_percent: 0,
          is_on_sale: false,
          updated_at: new Date().toISOString()
        })
        .in('id', batch);

      if (updateError) throw updateError;
      
      updated += batchCount || batch.length;
      console.log(`   ✓ Updated ${updated}/${ids.length} records...`);
    }

    // Step 3: Verify the fix
    console.log(`\n✔️ Cleanup complete! Verifying...\n`);

    const { count: remaining, error: verifyError } = await supabase
      .from('products')
      .select('id', { count: 'exact' })
      .gt('discount_percent', 0)
      .or('original_price.is.null,original_price.lte.price');

    if (verifyError) throw verifyError;

    if (remaining === 0) {
      console.log('✅ SUCCESS! All fake discounts removed.');
      console.log(`   - Fixed: ${count} records`);
      console.log(`   - Remaining fake discounts: 0\n`);
    } else {
      console.warn(`⚠️  WARNING: ${remaining} fake discounts still remain (expected 0)`);
    }

    // Step 4: Show that valid discounts still exist
    console.log('📈 Verification - valid discounts still in database:\n');
    
    const { data: validDiscounts, error: validError } = await supabase
      .from('products')
      .select('id, title, price, original_price, discount_percent')
      .gt('discount_percent', 0)
      .gt('original_price', 'price')
      .limit(5);

    if (!validError && validDiscounts && validDiscounts.length > 0) {
      console.log(`   Found ${validDiscounts.length}+ products with VALID discounts:`);
      validDiscounts.forEach(p => {
        const savings = p.original_price - p.price;
        console.log(`   - ${p.title}`);
        console.log(`     Price: ₱${p.price} | Original: ₱${p.original_price} | Save: ₱${savings} (${p.discount_percent}%)`);
      });
    }

    console.log('\n🎉 Fake discount cleanup complete!');
    console.log('   The carousel and comparison modal will now display correctly.');

  } catch (error) {
    console.error('❌ Cleanup failed:', error.message);
    process.exit(1);
  }
}

// Run the cleanup
cleanupFakeDiscounts().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
