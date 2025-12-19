import { app, BrowserWindow, ipcMain, shell } from 'electron';
import path from 'path';

// Use app.isPackaged instead of electron-is-dev (which is ESM-only now)
const isDev = !app.isPackaged;

// Global error handlers to prevent console spam from benign Electron errors
process.on('unhandledRejection', (reason, promise) => {
    const errorString = String(reason);
    // Ignore ERR_ABORTED errors from GUEST_VIEW_MANAGER_CALL (common in webviews during redirects/cancellations)
    if (errorString.includes('GUEST_VIEW_MANAGER_CALL') && errorString.includes('ERR_ABORTED')) {
        return;
    }
    console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

let mainWindow: BrowserWindow | null = null;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 800,
    minHeight: 600,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
      webviewTag: true, // Enable <webview> tag for the browser integration
    },
    backgroundColor: '#0a0a0a',
    // Custom title bar style
    titleBarStyle: 'hidden',
    titleBarOverlay: { 
        color: '#00000000', // Transparent to match app header
        symbolColor: '#ffffff', 
        height: 56 // Matches h-14 (56px) header
    },
    // Hide the standard menu bar
    autoHideMenuBar: true,
  });
  
  mainWindow.setMenuBarVisibility(false);

  if (isDev) {
    mainWindow.loadURL('http://localhost:3000');
    mainWindow.webContents.openDevTools();
  } else {
    // Usually we would serve the static export
    // mainWindow.loadFile(...) 
    // But let's keep it simple for now and focus on Dev
    mainWindow.loadURL('http://localhost:3000'); 
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  // Open external links in default browser? 
  // Or handle them in-app. For a "Browser OS", we likely want to handle them in new tabs.
  // But strictly external things (like "Help" menu) might go to system browser.
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    // Only strictly external or specific protocol links might trigger this
    // Regular clicks inside the <webview> don't bubble up here the same way
    return { action: 'allow' }; 
  });
}

app.on('ready', createWindow);

app.on('web-contents-created', (event, contents) => {
  // Intercept navigation errors in webviews to prevent console spam for aborted requests
  contents.on('did-fail-load', (e, errorCode, errorDescription, validatedURL) => {
    // -3 is ERR_ABORTED (common during redirects or stop loading)
    if (errorCode !== -3) {
      console.error(`Page failed to load (${errorCode}): ${errorDescription} - ${validatedURL}`);
    } else {
        // Silently ignore aborted requests
        e.preventDefault();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (mainWindow === null) {
    createWindow();
  }
});

// IPC Handlers
ipcMain.handle('app:version', () => app.getVersion());

// Example: Persist node creation from Renderer
ipcMain.on('node:create', (event, data) => {
  console.log('Main Process: Creating Node', data);
  // Here we would call the Backend API or Database directly?
  // Ideally, the Renderer calls the Backend API directly via fetch/axios.
  // Electron just might handle OS-level things or proxying if CORS is strictly an issue.
  // Since we set CORS to * in FastAPI, Renderer can talk to Backend directly.
});
