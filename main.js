const { app, BrowserWindow, ipcMain, session } = require('electron');
const path = require('path');
const isDev = require('electron-is-dev');

let mainWindow;
const retailerSessions = new Map();

// Create main window
const createWindow = () => {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
      enableRemoteModule: false,
    },
  });

  const startURL = isDev
    ? 'http://localhost:5173' // Vite dev server
    : `file://${path.join(__dirname, '../build/index.html')}`; // Production build

  mainWindow.loadURL(startURL);

  if (isDev) {
    mainWindow.webContents.openDevTools();
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
};

// Create persistent session for retailer
ipcMain.handle('retailer:create-session', async (event, { platform, userId }) => {
  try {
    const sessionName = `persist:${platform}_${userId}`;
    
    // Create new session with persistent storage
    const ses = session.fromPartition(sessionName, { cache: true });
    
    // Store session reference
    retailerSessions.set(sessionName, {
      session: ses,
      platform,
      userId,
      createdAt: new Date(),
      isActive: true,
    });

    return {
      success: true,
      sessionId: sessionName,
      message: `Session created for ${platform}`,
    };
  } catch (error) {
    console.error('Error creating retailer session:', error);
    return {
      success: false,
      error: error.message,
    };
  }
});

// Load retailer in webview with persistent session
ipcMain.handle('retailer:open-webview', async (event, { sessionId, url }) => {
  try {
    if (!retailerSessions.has(sessionId)) {
      return {
        success: false,
        error: 'Session not found',
      };
    }

    const sessionData = retailerSessions.get(sessionId);
    sessionData.lastAccessed = new Date();

    // Open new window with persistent session
    const retailerWindow = new BrowserWindow({
      width: 1400,
      height: 900,
      webPreferences: {
        partition: sessionId, // Use persistent partition
        nodeIntegration: false,
        contextIsolation: true,
      },
    });

    retailerWindow.loadURL(url);

    retailerWindow.on('closed', () => {
      // Window closed but session persists
    });

    return {
      success: true,
      message: 'Retailer window opened',
    };
  } catch (error) {
    console.error('Error opening retailer webview:', error);
    return {
      success: false,
      error: error.message,
    };
  }
});

// Get all active sessions
ipcMain.handle('retailer:get-sessions', async () => {
  try {
    const sessions = Array.from(retailerSessions.values()).map((s) => ({
      id: s.platform,
      platform: s.platform,
      createdAt: s.createdAt,
      lastAccessed: s.lastAccessed,
      isActive: s.isActive,
    }));

    return {
      success: true,
      sessions,
    };
  } catch (error) {
    console.error('Error getting sessions:', error);
    return {
      success: false,
      error: error.message,
    };
  }
});

// Clear session (logout)
ipcMain.handle('retailer:clear-session', async (event, { sessionId }) => {
  try {
    const sessionData = retailerSessions.get(sessionId);
    if (sessionData) {
      sessionData.isActive = false;
      sessionData.session.clearStorageData();
      retailerSessions.delete(sessionId);
    }

    return {
      success: true,
      message: 'Session cleared',
    };
  } catch (error) {
    console.error('Error clearing session:', error);
    return {
      success: false,
      error: error.message,
    };
  }
});

// App lifecycle
app.on('ready', createWindow);

app.on('window-all-closed', () => {
  // On macOS, don't quit the app
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (mainWindow === null) {
    createWindow();
  }
});

module.exports = { mainWindow, retailerSessions };
