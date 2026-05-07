/**
 * Pagination System Tests
 * Tests the paginateResults helper function with various edge cases
 */

const logger = {
  info: (msg) => console.log('  [INFO]', msg),
  warn: (msg) => console.log('  [WARN]', msg),
  error: (msg) => console.log('  [ERROR]', msg),
};

/**
 * Paginate ranked results with metadata.
 * (Copy of implementation for testing)
 */
function paginateResults(rankedProducts, page = 1, pageSize = 20) {
  // Ensure valid numbers
  const validPage = Math.max(1, parseInt(page) || 1);
  const validPageSize = Math.max(1, Math.min(parseInt(pageSize) || 20, 100)); // Cap at 100

  const totalCount = rankedProducts.length;
  const totalPages = totalCount === 0 ? 0 : Math.ceil(totalCount / validPageSize);

  // Calculate slice boundaries
  const startIndex = (validPage - 1) * validPageSize;
  const endIndex = startIndex + validPageSize;

  // Apply slice (returns empty array if page exceeds totalPages)
  const results = validPage <= totalPages ? rankedProducts.slice(startIndex, endIndex) : [];

  logger.info(
    `[Pagination] Page ${validPage}/${totalPages}, PageSize ${validPageSize}, TotalCount ${totalCount}, Returned ${results.length}`
  );

  return {
    results,
    totalCount,
    totalPages,
    page: validPage,
    pageSize: validPageSize,
  };
}

/**
 * Test Suite
 */
async function runTests() {
  console.log('\n=== PAGINATION TESTS ===\n');

  let passed = 0;
  let failed = 0;

  // Mock data: 45 products
  const products = Array.from({ length: 45 }, (_, i) => ({
    id: i + 1,
    title: `Product ${i + 1}`,
    price: 100 + i * 10,
  }));

  // Test 1: First page with default size (20)
  console.log('TEST 1: First page (default size)');
  try {
    const result = paginateResults(products, 1, 20);
    assert(result.results.length === 20, `Expected 20 results, got ${result.results.length}`);
    assert(result.totalCount === 45, `Expected totalCount 45, got ${result.totalCount}`);
    assert(result.totalPages === 3, `Expected totalPages 3, got ${result.totalPages}`);
    assert(result.page === 1, `Expected page 1, got ${result.page}`);
    assert(result.pageSize === 20, `Expected pageSize 20, got ${result.pageSize}`);
    assert(result.results[0].id === 1, 'First result should be product 1');
    console.log('  ✓ PASSED\n');
    passed++;
  } catch (err) {
    console.log(`  ✗ FAILED: ${err.message}\n`);
    failed++;
  }

  // Test 2: Second page
  console.log('TEST 2: Second page');
  try {
    const result = paginateResults(products, 2, 20);
    assert(result.results.length === 20, `Expected 20 results, got ${result.results.length}`);
    assert(result.totalPages === 3, `Expected totalPages 3`);
    assert(result.page === 2, `Expected page 2`);
    assert(result.results[0].id === 21, 'First result on page 2 should be product 21');
    assert(result.results[19].id === 40, 'Last result on page 2 should be product 40');
    console.log('  ✓ PASSED\n');
    passed++;
  } catch (err) {
    console.log(`  ✗ FAILED: ${err.message}\n`);
    failed++;
  }

  // Test 3: Last page (partial)
  console.log('TEST 3: Last page (partial results)');
  try {
    const result = paginateResults(products, 3, 20);
    assert(result.results.length === 5, `Expected 5 results, got ${result.results.length}`);
    assert(result.totalPages === 3, `Expected totalPages 3`);
    assert(result.page === 3, `Expected page 3`);
    assert(result.results[0].id === 41, 'First result on page 3 should be product 41');
    assert(result.results[4].id === 45, 'Last result on page 3 should be product 45');
    console.log('  ✓ PASSED\n');
    passed++;
  } catch (err) {
    console.log(`  ✗ FAILED: ${err.message}\n`);
    failed++;
  }

  // Test 4: Page exceeds totalPages
  console.log('TEST 4: Page exceeds totalPages');
  try {
    const result = paginateResults(products, 4, 20);
    assert(result.results.length === 0, `Expected 0 results, got ${result.results.length}`);
    assert(result.totalPages === 3, `Expected totalPages 3`); // Still shows correct total
    assert(result.page === 4, `Expected page 4`);
    assert(result.totalCount === 45, `Expected totalCount 45`); // Unchanged
    console.log('  ✓ PASSED\n');
    passed++;
  } catch (err) {
    console.log(`  ✗ FAILED: ${err.message}\n`);
    failed++;
  }

  // Test 5: Empty product list
  console.log('TEST 5: Empty product list');
  try {
    const result = paginateResults([], 1, 20);
    assert(result.results.length === 0, 'Expected 0 results');
    assert(result.totalCount === 0, 'Expected totalCount 0');
    assert(result.totalPages === 0, 'Expected totalPages 0');
    console.log('  ✓ PASSED\n');
    passed++;
  } catch (err) {
    console.log(`  ✗ FAILED: ${err.message}\n`);
    failed++;
  }

  // Test 6: Invalid page (negative)
  console.log('TEST 6: Invalid page (negative) → defaults to 1');
  try {
    const result = paginateResults(products, -5, 20);
    assert(result.page === 1, 'Negative page should default to 1');
    assert(result.results.length === 20, 'Should return first page');
    console.log('  ✓ PASSED\n');
    passed++;
  } catch (err) {
    console.log(`  ✗ FAILED: ${err.message}\n`);
    failed++;
  }

  // Test 7: Invalid pageSize → defaults to 20
  console.log('TEST 7: Invalid pageSize (0) → defaults to 20');
  try {
    const result = paginateResults(products, 1, 0);
    assert(result.pageSize === 20, 'Invalid pageSize should default to 20');
    assert(result.results.length === 20, 'Expected 20 results');
    console.log('  ✓ PASSED\n');
    passed++;
  } catch (err) {
    console.log(`  ✗ FAILED: ${err.message}\n`);
    failed++;
  }

  // Test 8: PageSize exceeds cap (> 100)
  console.log('TEST 8: PageSize exceeds cap (200 → capped at 100)');
  try {
    const result = paginateResults(products, 1, 200);
    assert(result.pageSize === 100, `Expected pageSize 100, got ${result.pageSize}`);
    assert(result.results.length === 45, 'All 45 products should fit in single page');
    assert(result.totalPages === 1, 'Expected totalPages 1');
    console.log('  ✓ PASSED\n');
    passed++;
  } catch (err) {
    console.log(`  ✗ FAILED: ${err.message}\n`);
    failed++;
  }

  // Test 9: Custom pageSize (10)
  console.log('TEST 9: Custom pageSize (10)');
  try {
    const result = paginateResults(products, 1, 10);
    assert(result.pageSize === 10, 'Expected pageSize 10');
    assert(result.results.length === 10, 'Expected 10 results');
    assert(result.totalPages === 5, `Expected totalPages 5, got ${result.totalPages}`);
    console.log('  ✓ PASSED\n');
    passed++;
  } catch (err) {
    console.log(`  ✗ FAILED: ${err.message}\n`);
    failed++;
  }

  // Test 10: String parameters (from URL query string)
  console.log('TEST 10: String parameters (parsed from URL)');
  try {
    const result = paginateResults(products, '2', '15');
    assert(result.page === 2, 'Page should be parsed to 2');
    assert(result.pageSize === 15, 'PageSize should be parsed to 15');
    assert(result.results.length === 15, 'Expected 15 results');
    assert(result.results[0].id === 16, 'First result should be product 16');
    console.log('  ✓ PASSED\n');
    passed++;
  } catch (err) {
    console.log(`  ✗ FAILED: ${err.message}\n`);
    failed++;
  }

  // Test 11: Exact multiple of pageSize
  console.log('TEST 11: Exact multiple of pageSize');
  try {
    const result = paginateResults(products, 3, 15);
    assert(result.results.length === 15, 'Expected 15 results');
    assert(result.totalPages === 3, 'Expected totalPages 3');
    assert(result.results[0].id === 31, 'First result on page 3 should be product 31');
    assert(result.results[14].id === 45, 'Last result should be product 45');
    console.log('  ✓ PASSED\n');
    passed++;
  } catch (err) {
    console.log(`  ✗ FAILED: ${err.message}\n`);
    failed++;
  }

  // Test 12: Large dataset
  console.log('TEST 12: Large dataset (10000 products)');
  try {
    const largeProducts = Array.from({ length: 10000 }, (_, i) => ({ id: i + 1 }));
    const result = paginateResults(largeProducts, 500, 20);
    assert(result.totalCount === 10000, 'Expected totalCount 10000');
    assert(result.totalPages === 500, 'Expected totalPages 500');
    assert(result.page === 500, 'Expected page 500');
    assert(result.results.length === 20, 'Expected 20 results');
    assert(result.results[0].id === 9981, 'First result should be product 9981');
    console.log('  ✓ PASSED\n');
    passed++;
  } catch (err) {
    console.log(`  ✗ FAILED: ${err.message}\n`);
    failed++;
  }

  // Summary
  console.log('=== TEST SUMMARY ===');
  console.log(`Passed: ${passed}`);
  console.log(`Failed: ${failed}`);
  console.log(`Total:  ${passed + failed}\n`);

  if (failed === 0) {
    console.log('✓ ALL TESTS PASSED\n');
    process.exit(0);
  } else {
    console.log('✗ SOME TESTS FAILED\n');
    process.exit(1);
  }
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

// Run tests
runTests().catch((err) => {
  console.error('Test execution error:', err);
  process.exit(1);
});
