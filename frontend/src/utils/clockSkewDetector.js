/**
 * 🕐 FRONTEND CLOCK SKEW DETECTOR
 * 
 * Detects system clock issues before OAuth login
 * and displays helpful warnings to users.
 */

class ClockSkewDetector {
  constructor() {
    this.serverTimeEstimate = null;
  }

  /**
   * Estimate server time by comparing with API response headers
   * Useful for detecting client clock skew early
   */
  async estimateServerTime() {
    try {
      // Use a lightweight API call to get server timestamp
      const response = await fetch('/api/health', {
        method: 'GET',
        headers: { 'X-Debug-Clock': 'true' }
      });
      
      if (!response.ok) return null;
      
      // Try to get timestamp from response header (if server sends it)
      const serverTimestamp = response.headers.get('X-Server-Time');
      if (serverTimestamp) {
        this.serverTimeEstimate = parseInt(serverTimestamp, 10);
        return this.serverTimeEstimate;
      }
    } catch (err) {
      console.warn('[ClockSkewDetector] Failed to estimate server time:', err.message);
    }
    return null;
  }

  /**
   * Check if client clock is significantly ahead/behind server
   * Returns: { skewed: bool, offset: number_in_seconds, direction: 'ahead'|'behind' }
   */
  detectSkew(serverTimeMs) {
    if (!serverTimeMs) return { skewed: false, offset: 0, direction: null };

    const clientTimeMs = Date.now();
    const offsetMs = clientTimeMs - serverTimeMs;
    const offsetSeconds = Math.round(offsetMs / 1000);
    
    // Tolerance: 30 seconds (allows for network latency)
    const TOLERANCE_SECONDS = 30;
    const isSkewed = Math.abs(offsetSeconds) > TOLERANCE_SECONDS;

    return {
      skewed: isSkewed,
      offset: offsetSeconds,
      direction: offsetSeconds > 0 ? 'ahead' : 'behind',
      diagnostics: {
        clientTime: new Date(clientTimeMs).toISOString(),
        serverTime: new Date(serverTimeMs).toISOString(),
        offsetSeconds: offsetSeconds
      }
    };
  }

  /**
   * Display warning banner to user if clock is skewed
   */
  displayClockSkewWarning(skewInfo) {
    if (!skewInfo.skewed) return;

    const message = `
⚠️  SYSTEM CLOCK ERROR

Your computer's clock appears to be ${skewInfo.direction} by ${Math.abs(skewInfo.offset)} seconds.
This may cause Google login to fail.

🔧 TO FIX:
  1. Open Settings
  2. Go to Time & Language → Date & time
  3. Turn ON "Set time automatically"
  4. Click "Sync now"
  5. Refresh this page and try again

Current time: ${skewInfo.diagnostics.clientTime}
Server time:  ${skewInfo.diagnostics.serverTime}
    `.trim();

    // Show browser notification if available
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification('System Clock Error', {
        body: `Your system clock is ${skewInfo.offset}s ${skewInfo.direction}. Login may fail.`,
        icon: '⚠️'
      });
    }

    // Log to console for developers
    console.warn('[ClockSkewDetector]', message);

    // Optionally display in app UI
    return message;
  }

  /**
   * Request notification permission for warnings
   */
  async requestNotificationPermission() {
    if (!('Notification' in window)) {
      console.warn('[ClockSkewDetector] Notifications not supported');
      return false;
    }

    if (Notification.permission === 'granted') {
      return true;
    }

    if (Notification.permission !== 'denied') {
      try {
        const permission = await Notification.requestPermission();
        return permission === 'granted';
      } catch (err) {
        console.warn('[ClockSkewDetector] Failed to request notification permission:', err.message);
        return false;
      }
    }

    return false;
  }

  /**
   * Check system clock before Google auth flow
   * Call this on login page load or before OAuth redirect
   */
  async checkBeforeGoogleAuth() {
    try {
      const serverTime = await this.estimateServerTime();
      if (!serverTime) {
        console.info('[ClockSkewDetector] Could not estimate server time, skipping check');
        return true; // Don't block auth if we can't check
      }

      const skewInfo = this.detectSkew(serverTime);
      
      if (skewInfo.skewed) {
        console.warn('[ClockSkewDetector] Clock skew detected before OAuth', skewInfo);
        this.displayClockSkewWarning(skewInfo);
        
        // Store skew info in sessionStorage for debugging
        sessionStorage.setItem('clockSkewWarning', JSON.stringify(skewInfo));
        
        return false; // Indicate that clock is skewed
      }

      return true; // Clock is fine
    } catch (err) {
      console.error('[ClockSkewDetector] Unexpected error:', err);
      return true; // Don't block on error
    }
  }
}

export default new ClockSkewDetector();
