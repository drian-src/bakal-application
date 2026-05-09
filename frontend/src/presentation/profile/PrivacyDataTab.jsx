import React, { useState } from 'react';
import {
  exportUserDataJson,
  exportUserDataCsv,
  deleteUserAccount,
} from '../../core/services/apiService';
import './PrivacyDataTab.css';

// ── Stroke SVG Icons — matching app icon pattern ────────────────────────

const DownloadIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
    <polyline points="7 10 12 15 17 10" />
    <line x1="12" y1="15" x2="12" y2="3" />
  </svg>
);

const ShieldIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
  </svg>
);

const FileTextIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
    <polyline points="14 2 14 8 20 8" />
    <line x1="16" y1="13" x2="8" y2="13" />
    <line x1="16" y1="17" x2="8" y2="17" />
    <polyline points="10 9 9 9 8 9" />
  </svg>
);

const TableIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="3" width="18" height="18" rx="2" />
    <path d="M3 9h18M3 15h18M9 3v18" />
  </svg>
);

const TrashIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="3 6 5 6 21 6" />
    <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
    <path d="M10 11v6M14 11v6" />
    <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
  </svg>
);

const AlertIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
    <line x1="12" y1="9"  x2="12" y2="13" />
    <line x1="12" y1="17" x2="12.01" y2="17" />
  </svg>
);

const CheckIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="20 6 9 17 4 12" />
  </svg>
);

// ── What data is included (displayed to user) ───────────────────────────
const DATA_CATEGORIES = [
  { label: 'Account profile',         desc: 'Email, name, auth method, creation date' },
  { label: 'Search history',          desc: 'All past search queries and timestamps' },
  { label: 'Saved searches',          desc: 'Bookmarked search queries' },
  { label: 'Cart items',              desc: 'Products saved to your cart' },
  { label: 'Interaction logs',        desc: 'Search, view, click, and cart events' },
  { label: 'Product interactions',    desc: 'View, compare, and wishlist activity' },
  { label: 'Recommendation history',  desc: 'Personalized recommendation records' },
];

// ── Component ───────────────────────────────────────────────────────────
export default function PrivacyDataTab({ token, onAccountDeleted }) {
  const [exportState, setExportState]     = useState('idle'); // idle | loading | success | error
  const [exportFormat, setExportFormat]   = useState(null);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [deleteStep, setDeleteStep]       = useState(1); // 1=warn, 2=confirm, 3=deleting, 4=done
  const [deleteError, setDeleteError]     = useState(null);
  const [showDataList, setShowDataList]   = useState(false);

  // ── Export handler ──────────────────────────────────────────────────
  const handleExport = async (format) => {
    setExportFormat(format);
    setExportState('loading');
    try {
      if (format === 'json') {
        await exportUserDataJson(token);
      } else {
        await exportUserDataCsv(token);
      }
      setExportState('success');
      setTimeout(() => setExportState('idle'), 3000);
    } catch (err) {
      console.error('[PrivacyDataTab] Export error:', err);
      setExportState('error');
      setTimeout(() => setExportState('idle'), 4000);
    }
  };

  // ── Delete handler ──────────────────────────────────────────────────
  const handleDeleteConfirm = async () => {
    setDeleteStep(3);
    setDeleteError(null);
    try {
      await deleteUserAccount(token);
      setDeleteStep(4);
      // Give user a moment to see the success state, then call parent callback
      setTimeout(() => {
        onAccountDeleted?.();
      }, 2500);
    } catch (err) {
      setDeleteError(err.message || 'Deletion failed. Please try again.');
      setDeleteStep(2);
    }
  };

  const resetDeleteDialog = () => {
    setShowDeleteDialog(false);
    setDeleteStep(1);
    setDeleteError(null);
  };

  return (
    <div className="privacy-tab">

      {/* ── Section: Your Data ─────────────────────────────────────── */}
      <section className="privacy-section">
        <div className="privacy-section-header">
          <span className="privacy-section-icon"><ShieldIcon /></span>
          <div>
            <h3 className="privacy-section-title">Your Data</h3>
            <p className="privacy-section-desc">
              Bakàl stores the following data associated with your account.
            </p>
          </div>
        </div>

        <button
          className="privacy-data-toggle"
          onClick={() => setShowDataList(v => !v)}
          aria-expanded={showDataList}
        >
          {showDataList ? 'Hide' : 'Show'} what's included
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
            stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
            style={{ transform: showDataList ? 'rotate(180deg)' : 'none', transition: 'transform 200ms' }}>
            <polyline points="6 9 12 15 18 9" />
          </svg>
        </button>

        {showDataList && (
          <ul className="privacy-data-list">
            {DATA_CATEGORIES.map(cat => (
              <li key={cat.label} className="privacy-data-item">
                <span className="privacy-data-check"><CheckIcon /></span>
                <div>
                  <span className="privacy-data-label">{cat.label}</span>
                  <span className="privacy-data-desc">{cat.desc}</span>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* ── Section: Export ────────────────────────────────────────── */}
      <section className="privacy-section">
        <div className="privacy-section-header">
          <span className="privacy-section-icon"><DownloadIcon /></span>
          <div>
            <h3 className="privacy-section-title">Export My Data</h3>
            <p className="privacy-section-desc">
              Download a complete copy of your personal data. Useful for records,
              backups, or if you plan to leave Bakàl.
            </p>
          </div>
        </div>

        {/* Status feedback */}
        {exportState === 'success' && (
          <div className="privacy-status-banner success">
            <CheckIcon /> Download started — check your downloads folder.
          </div>
        )}
        {exportState === 'error' && (
          <div className="privacy-status-banner error">
            <AlertIcon /> Export failed. Please try again or contact support.
          </div>
        )}

        <div className="privacy-export-buttons">
          <button
            className="privacy-export-btn json-btn"
            onClick={() => handleExport('json')}
            disabled={exportState === 'loading'}
            aria-busy={exportState === 'loading' && exportFormat === 'json'}
          >
            <FileTextIcon />
            <span>
              <strong>Export as JSON</strong>
              <small>Structured data — good for backups and developers</small>
            </span>
            {exportState === 'loading' && exportFormat === 'json'
              ? <span className="privacy-spinner" />
              : <DownloadIcon />
            }
          </button>

          <button
            className="privacy-export-btn csv-btn"
            onClick={() => handleExport('csv')}
            disabled={exportState === 'loading'}
            aria-busy={exportState === 'loading' && exportFormat === 'csv'}
          >
            <TableIcon />
            <span>
              <strong>Export as CSV</strong>
              <small>Spreadsheet-compatible — open in Excel or Google Sheets</small>
            </span>
            {exportState === 'loading' && exportFormat === 'csv'
              ? <span className="privacy-spinner" />
              : <DownloadIcon />
            }
          </button>
        </div>
      </section>

      {/* ── Section: Danger Zone ───────────────────────────────────── */}
      <section className="privacy-section danger-section">
        <div className="privacy-section-header">
          <span className="privacy-section-icon danger-icon"><TrashIcon /></span>
          <div>
            <h3 className="privacy-section-title danger-title">Danger Zone</h3>
            <p className="privacy-section-desc">
              Permanently delete my Bakal account and all associated data.
              This action <strong>cannot be undone</strong>.
            </p>
          </div>
        </div>

        <button
          className="privacy-delete-trigger-btn"
          onClick={() => setShowDeleteDialog(true)}
        >
          <TrashIcon /> Delete My Account
        </button>
      </section>

      {/* ── Delete Account Dialog ───────────────────────────────────── */}
      {showDeleteDialog && (
        <div className="privacy-dialog-overlay" role="dialog" aria-modal="true"
          aria-label="Delete account confirmation">
          <div className="privacy-dialog">

            {/* Step 1 — Warning + export nudge */}
            {deleteStep === 1 && (
              <>
                <div className="dialog-icon-wrap danger">
                  <AlertIcon />
                </div>
                <h3 className="dialog-title">Before you delete your account</h3>
                <p className="dialog-body">
                  We recommend downloading your data first. Once your account is deleted,
                  all your search history, saved items, and interaction data will be
                  permanently removed and cannot be recovered.
                </p>
                <div className="dialog-export-nudge">
                  <button
                    className="dialog-nudge-btn"
                    onClick={() => handleExport('json')}
                    disabled={exportState === 'loading'}
                  >
                    <DownloadIcon /> Download my data first (JSON)
                  </button>
                  <button
                    className="dialog-nudge-btn"
                    onClick={() => handleExport('csv')}
                    disabled={exportState === 'loading'}
                  >
                    <DownloadIcon /> Download my data first (CSV)
                  </button>
                </div>
                <div className="dialog-actions">
                  <button className="dialog-cancel-btn" onClick={resetDeleteDialog}>
                    Cancel
                  </button>
                  <button
                    className="dialog-proceed-btn"
                    onClick={() => setDeleteStep(2)}
                  >
                    Continue to deletion
                  </button>
                </div>
              </>
            )}

            {/* Step 2 — Final confirmation */}
            {deleteStep === 2 && (
              <>
                <div className="dialog-icon-wrap danger">
                  <TrashIcon />
                </div>
                <h3 className="dialog-title">Permanently delete account?</h3>
                <p className="dialog-body">
                  This will permanently delete your account, search history, saved items,
                  cart, and all interaction data. This cannot be undone.
                </p>
                {deleteError && (
                  <div className="privacy-status-banner error" style={{ marginTop: 12 }}>
                    <AlertIcon /> {deleteError}
                  </div>
                )}
                <div className="dialog-actions">
                  <button className="dialog-cancel-btn" onClick={resetDeleteDialog}>
                    Cancel
                  </button>
                  <button
                    className="dialog-confirm-delete-btn"
                    onClick={handleDeleteConfirm}
                  >
                    <TrashIcon /> Yes, delete my account
                  </button>
                </div>
              </>
            )}

            {/* Step 3 — Deleting in progress */}
            {deleteStep === 3 && (
              <div className="dialog-loading-state">
                <span className="privacy-spinner large" />
                <p>Deleting your account and all associated data…</p>
              </div>
            )}

            {/* Step 4 — Done */}
            {deleteStep === 4 && (
              <div className="dialog-success-state">
                <div className="dialog-icon-wrap success">
                  <CheckIcon />
                </div>
                <h3 className="dialog-title">Account deleted</h3>
                <p className="dialog-body">
                  Your account and all associated data have been permanently removed.
                  You will be signed out shortly.
                </p>
              </div>
            )}

          </div>
        </div>
      )}

    </div>
  );
}
