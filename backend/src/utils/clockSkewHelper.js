'use strict';

const logger = require('../config/logger');

/**
 * 🕐 CLOCK SKEW DETECTION & CORRECTION
 * 
 * Detects when client/server clocks are out of sync
 * and provides diagnostics and correction strategies.
 * 
 * Typical causes:
 * - Client system clock is ahead (future date)
 * - Client system clock is behind (past date)
 * - Server clock is out of sync
 * - Timezone issues (rare, tokens use UTC)
 */

class ClockSkewHelper {
  constructor() {
    this.serverTime = Date.now();
    this.clientTimeOffset = 0; // milliseconds, positive if client is ahead
  }

  /**
   * Get the current server-side timestamp (seconds, UTC)
   */
  getNowSeconds() {
    return Math.floor(Date.now() / 1000);
  }

  /**
   * Check if a token is valid considering clock skew
   * @param {number} issuedAt - Token iat (issued at time, seconds)
   * @param {number} expiresAt - Token exp (expiration time, seconds)
   * @param {number} skewToleranceSec - How many seconds of skew to tolerate (default 5 min = 300 sec)
   * @returns {Object} { valid: bool, remainingSeconds: number, errorMsg: string }
   */
  validateTokenTiming(issuedAt, expiresAt, skewToleranceSec = 300) {
    const now = this.getNowSeconds();
    const result = {
      valid: false,
      remainingSeconds: 0,
      skewDetected: false,
      errorMsg: null,
      diagnostics: {
        tokenIssuedAt: new Date(issuedAt * 1000).toISOString(),
        tokenExpiresAt: new Date(expiresAt * 1000).toISOString(),
        currentTime: new Date(now * 1000).toISOString(),
        skewSeconds: 0,
      }
    };

    // Calculate skew
    const skewSeconds = now - expiresAt;
    result.diagnostics.skewSeconds = skewSeconds;

    // Token not yet issued? (should never happen with Google tokens)
    if (now < issuedAt) {
      result.errorMsg = `Token not yet valid (issued in ${issuedAt - now} seconds)`;
      result.skewDetected = true;
      return result;
    }

    // Token is expired
    if (now > expiresAt) {
      result.remainingSeconds = expiresAt - now; // negative number
      
      if (Math.abs(skewSeconds) <= skewToleranceSec) {
        // Within tolerance
        logger.warn("[ClockSkewHelper] Token expired but within tolerance", {
          expiredBy: skewSeconds,
          tolerance: skewToleranceSec
        });
        result.valid = true;
        return result;
      } else {
        // Expired beyond tolerance
        result.errorMsg = `Token expired ${skewSeconds} seconds ago (tolerance: ${skewToleranceSec}s)`;
        result.skewDetected = true;
        return result;
      }
    }

    // Check if token is too old, even if not expired yet (e.g., very long-lived tokens)
    const MAX_TOKEN_AGE_SEC = 24 * 60 * 60; // 24 hours (configurable)
    const tokenAge = now - issuedAt;
    if (tokenAge > MAX_TOKEN_AGE_SEC) {
      result.errorMsg = `Token is too old (${tokenAge}s) even if not expired (max age: ${MAX_TOKEN_AGE_SEC}s)`;
      result.skewDetected = true; // Consider old tokens as a skew/timing issue
      return result;
    }

    // Token is still valid
    result.valid = true;
    result.remainingSeconds = expiresAt - now;
    return result;
  }

  /**
   * Generate diagnostic message for user/logs
   * when token validation fails
   */
  getDiagnosticMessage(issuedAt, expiresAt) {
    const now = this.getNowSeconds();
    const diagnosis = this.validateTokenTiming(issuedAt, expiresAt, 300);

    if (diagnosis.valid) {
      return `✅ Token is valid. Expires in ${diagnosis.remainingSeconds}s`;
    }

    const messages = [
      `❌ Token validation failed: ${diagnosis.errorMsg}`,
      `\nDiagnostics:`,
      `  • Token issued: ${diagnosis.diagnostics.tokenIssuedAt}`,
      `  • Token expires: ${diagnosis.diagnostics.tokenExpiresAt}`,
      `  • Current time: ${diagnosis.diagnostics.currentTime}`,
      `  • Skew: ${diagnosis.diagnostics.skewSeconds}s`,
    ];

    if (diagnosis.skewDetected) {
      messages.push(
        `\n⚠️  Clock skew detected! Please check your system clock.`,
        `  • Go to Settings → Time & Language → Date & time`,
        `  • Enable "Set time automatically"`,
        `  • Click "Sync now"`
      );
    }

    return messages.join('\n');
  }

  /**
   * Log detailed skew diagnostics to server logs
   */
  logDiagnostics(tokenIssuedAt, tokenExpiresAt, context = 'GoogleAuth') {
    const now = this.getNowSeconds();
    const skew = now - tokenExpiresAt;
    
    logger.warn(`[${context}] Clock skew detected`, {
      context,
      tokenIssuedAtUTC: new Date(tokenIssuedAt * 1000).toISOString(),
      tokenExpiresAtUTC: new Date(tokenExpiresAt * 1000).toISOString(),
      currentTimeUTC: new Date(now * 1000).toISOString(),
      skewSeconds: skew,
      skewMinutes: (skew / 60).toFixed(2),
      skewHours: (skew / 3600).toFixed(2),
      recommendation: skew > 0 
        ? 'Token is expired. Client system clock may be ahead.' 
        : 'Token not yet valid. Client system clock may be behind.',
    });
  }
}

module.exports = new ClockSkewHelper();
