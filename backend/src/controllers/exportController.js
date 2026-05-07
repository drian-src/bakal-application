'use strict';

const { aggregateUserData, deleteUserAccount } = require('../repositories/exportRepository');
const { buildCsvExport } = require('../utils/csvConverter');
const logger = require('../config/logger');

/**
 * GET /api/user/export/json
 * Download all personal data as a single JSON file.
 */
async function exportJson(req, res, next) {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ success: false, message: 'Unauthorized' });

    logger.info(`[exportController] JSON export requested by user: ${userId}`);
    const userData = await aggregateUserData(userId);

    const filename = `bakal-export-${new Date().toISOString().slice(0, 10)}.json`;

    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(JSON.stringify(userData, null, 2));

  } catch (err) {
    logger.error(`[exportController] exportJson error: ${err.message}`);
    next(err);
  }
}

/**
 * GET /api/user/export/csv
 * Download all personal data as a combined CSV with section headers.
 */
async function exportCsv(req, res, next) {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ success: false, message: 'Unauthorized' });

    logger.info(`[exportController] CSV export requested by user: ${userId}`);
    const userData = await aggregateUserData(userId);
    const csvFiles = buildCsvExport(userData);

    // Combine all CSV sections into one file with clear section separators
    const combined = csvFiles
      .map(f => `# === ${f.filename.toUpperCase()} ===\r\n${f.content}`)
      .join('\r\n\r\n');

    const filename = `bakal-export-${new Date().toISOString().slice(0, 10)}.csv`;

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send('\uFEFF' + combined); // BOM for Excel compatibility
  } catch (err) {
    logger.error(`[exportController] exportCsv error: ${err.message}`);
    next(err);
  }
}

/**
 * DELETE /api/user/account
 * Permanently delete the authenticated user's account and all related data.
 * Requires: { confirmText: "DELETE" } in request body for safety.
 */
async function deleteAccount(req, res, next) {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ success: false, message: 'Unauthorized' });

    const { confirmText } = req.body;
    if (confirmText !== 'DELETE') {
      return res.status(400).json({
        success: false,
        message: 'Confirmation required. Send { confirmText: "DELETE" } to proceed.',
      });
    }

    logger.info(`[exportController] Account deletion confirmed for user: ${userId}`);
    const result = await deleteUserAccount(userId);

    // Clear auth — the token is now invalid
    res.json({
      success: true,
      message: 'Account and all associated data have been permanently deleted.',
      steps: result.steps,
    });
  } catch (err) {
    logger.error(`[exportController] deleteAccount error: ${err.message}`);
    next(err);
  }
}

module.exports = { exportJson, exportCsv, deleteAccount };
