const { contextBridge, ipcRenderer } = require('electron');

/**
 * Preload script - Bridges renderer and main process
 * All IPC calls must go through this file to maintain security
 */

contextBridge.exposeInMainWorld('electron', {
  // Retailer session management APIs
  retailer: {
    // Create a new persistent session for a retailer platform
    createSession: async (platform, userId) => {
      return await ipcRenderer.invoke('retailer:create-session', {
        platform,
        userId,
      });
    },

    // Open a webview with persistent session
    openWebview: async (sessionId, url) => {
      return await ipcRenderer.invoke('retailer:open-webview', {
        sessionId,
        url,
      });
    },

    // Get all active retailer sessions
    getSessions: async () => {
      return await ipcRenderer.invoke('retailer:get-sessions');
    },

    // Clear/logout a session
    clearSession: async (sessionId) => {
      return await ipcRenderer.invoke('retailer:clear-session', {
        sessionId,
      });
    },
  },

  // App lifecycle
  app: {
    quit: () => ipcRenderer.invoke('app:quit'),
    minimize: () => ipcRenderer.invoke('app:minimize'),
    maximize: () => ipcRenderer.invoke('app:maximize'),
  },

  // File system operations
  fs: {
    openFile: async (options) => {
      return await ipcRenderer.invoke('fs:open-file', options);
    },
    saveFile: async (options) => {
      return await ipcRenderer.invoke('fs:save-file', options);
    },
  },
});

// Version information
contextBridge.exposeInMainWorld('versions', {
  chrome: process.versions.chrome,
  electron: process.versions.electron,
  node: process.versions.node,
});
