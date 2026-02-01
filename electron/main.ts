/**
 * Electron Main Process
 * Entry point for the Electron application
 */

import { app, BrowserWindow, ipcMain, session } from 'electron';
import path from 'path';
import { setupWalletIpc } from './ipc/wallet.ipc';
import { setupTransactionIpc } from './ipc/transaction.ipc';
import { setupCryptoIpc } from './ipc/crypto.ipc';

/** Main window reference */
let mainWindow: BrowserWindow | null = null;

/** Application mode (offline/online) */
const APP_MODE = process.env.WALLET_ROOM_MODE || 'offline';

/**
 * Creates the main application window
 */
function createWindow(): void {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 900,
    minHeight: 600,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: true,
    },
    titleBarStyle: 'hiddenInset',
    show: false,
  });

  // Security: Disable navigation to external URLs
  mainWindow.webContents.on('will-navigate', (event, url) => {
    const parsedUrl = new URL(url);
    if (parsedUrl.origin !== 'http://localhost:5173') {
      event.preventDefault();
    }
  });

  // Security: Disable opening new windows
  mainWindow.webContents.setWindowOpenHandler(() => {
    return { action: 'deny' };
  });

  // Load the app
  if (process.env.NODE_ENV === 'development') {
    mainWindow.loadURL('http://localhost:5173');
    mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
  }

  // Show window when ready
  mainWindow.once('ready-to-show', () => {
    mainWindow?.show();
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

/**
 * Configures security settings
 */
function configureSecuritySettings(): void {
  // Disable remote module
  app.on('remote-require', (event) => event.preventDefault());
  app.on('remote-get-global', (event) => event.preventDefault());
  app.on('remote-get-builtin', (event) => event.preventDefault());
  app.on('remote-get-current-window', (event) => event.preventDefault());
  app.on('remote-get-current-web-contents', (event) => event.preventDefault());

  // Disable navigation to external protocols
  app.on('web-contents-created', (_, contents) => {
    contents.on('will-navigate', (event, navigationUrl) => {
      const parsedUrl = new URL(navigationUrl);
      if (!['http:', 'https:'].includes(parsedUrl.protocol)) {
        event.preventDefault();
      }
    });
  });
}

/**
 * Configures offline mode restrictions
 */
function configureOfflineMode(): void {
  if (APP_MODE === 'offline') {
    // Block all network requests in offline mode
    session.defaultSession.webRequest.onBeforeRequest((details, callback) => {
      const url = new URL(details.url);

      // Allow localhost for development
      if (url.hostname === 'localhost' || url.hostname === '127.0.0.1') {
        callback({});
        return;
      }

      // Allow chrome-extension and devtools
      if (url.protocol === 'chrome-extension:' || url.protocol === 'devtools:') {
        callback({});
        return;
      }

      // Block all other requests
      console.warn(`[OFFLINE MODE] Blocked network request: ${details.url}`);
      callback({ cancel: true });
    });
  }
}

/**
 * Sets up IPC handlers
 */
function setupIpcHandlers(): void {
  // Application info
  ipcMain.handle('app:getMode', () => APP_MODE);
  ipcMain.handle('app:getVersion', () => app.getVersion());

  // Set up module-specific IPC handlers
  setupWalletIpc(ipcMain);
  setupTransactionIpc(ipcMain);
  setupCryptoIpc(ipcMain);
}

// Application lifecycle
app.whenReady().then(() => {
  configureSecuritySettings();
  configureOfflineMode();
  setupIpcHandlers();
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// Security: Prevent new window creation
app.on('web-contents-created', (_, contents) => {
  contents.setWindowOpenHandler(() => ({ action: 'deny' }));
});
