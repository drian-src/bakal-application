/**
 * Minimal JSON → CSV converter.
 * No external dependencies — uses only built-in string operations.
 */

/**
 * Convert an array of flat objects to CSV string.
 */
function arrayToCsv(rows) {
  if (!rows || rows.length === 0) return '';

  const escape = (val) => {
    if (val === null || val === undefined) return '';
    const str = typeof val === 'object' ? JSON.stringify(val) : String(val);
    // Wrap in quotes if contains comma, quote, or newline
    if (str.includes(',') || str.includes('"') || str.includes('\n')) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  };

  const headers = Object.keys(rows[0]);
  const headerRow = headers.map(escape).join(',');
  const dataRows  = rows.map(row =>
    headers.map(h => escape(row[h])).join(',')
  );

  return [headerRow, ...dataRows].join('\r\n');
}

/**
 * Flatten nested cart_items for CSV export.
 */
function flattenCartItems(cartItems) {
  return (cartItems || []).map(item => ({
    product_title:    item.products?.title    || '',
    platform:         item.products?.platforms?.name || '',
    price:            item.products?.price    || '',
    product_url:      item.products?.product_url || '',
    quantity:         item.quantity           || 1,
    added_at:         item.added_at           || '',
  }));
}

/**
 * Build a multi-section CSV export (one section per data category).
 * Returns an array of { filename, content } objects.
 */
function buildCsvExport(userData) {
  const files = [];

  if (userData.profile) {
    files.push({
      filename: 'profile.csv',
      content:  arrayToCsv([userData.profile]),
    });
  }

  if (userData.search_history?.length) {
    files.push({
      filename: 'search_history.csv',
      content:  arrayToCsv(userData.search_history),
    });
  }

  if (userData.saved_searches?.length) {
    files.push({
      filename: 'saved_searches.csv',
      content:  arrayToCsv(userData.saved_searches),
    });
  }

  if (userData.cart_items?.length) {
    files.push({
      filename: 'saved_items.csv',
      content:  arrayToCsv(flattenCartItems(userData.cart_items)),
    });
  }

  if (userData.interactions?.length) {
    files.push({
      filename: 'interactions.csv',
      content:  arrayToCsv(userData.interactions),
    });
  }

  if (userData.product_interactions?.length) {
    files.push({
      filename: 'product_interactions.csv',
      content:  arrayToCsv(userData.product_interactions),
    });
  }

  if (userData.recommendations?.length) {
    files.push({
      filename: 'recommendations.csv',
      content:  arrayToCsv(userData.recommendations),
    });
  }

  return files;
}

module.exports = { arrayToCsv, buildCsvExport, flattenCartItems };
