import { app, BrowserWindow, ipcMain, shell, dialog } from 'electron';
import path from 'path';
import fs from 'fs';
import url from 'url';
import { spawn, ChildProcess } from 'child_process';
import { openAuthBrowserAndWait, stopOAuthServer } from './auth';

// Prevent multiple instances (Windows/Linux)
const gotTheLock = app.requestSingleInstanceLock();

if (!gotTheLock) {
  app.quit();
}

// Robust production detection: check if app is inside an asar archive
const appPath = app.getAppPath();
const isPackagedApp = appPath.includes('app.asar') || fs.existsSync(path.join(process.resourcesPath, 'app.asar'));
const isDev = !isPackagedApp;

console.log('App Path:', appPath);
console.log('Is Packaged App:', isPackagedApp, 'Is Dev:', isDev);

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
let backendProcess: ChildProcess | null = null;

function startBackend() {
    const storageDir = isDev 
        ? path.join(__dirname, '..', '..', '..', 'backend', 'storage')
        : path.join(app.getPath('userData'), 'storage');
    
    console.log('Using storage directory:', storageDir);

    if (!fs.existsSync(storageDir)) {
        try {
            fs.mkdirSync(storageDir, { recursive: true });
        } catch (e) {
            console.error('Failed to create storage directory:', e);
        }
    }

    // Cross-platform backend path detection
    const backendExeWin = path.join(process.resourcesPath, 'bin', 'rabbit-hole-backend.exe');
    const backendExeMac = path.join(process.resourcesPath, 'bin', 'rabbit-hole-backend');
    const prodBackendPath = fs.existsSync(backendExeWin) ? backendExeWin : backendExeMac;
    
    if (fs.existsSync(prodBackendPath)) {
        console.log('Starting production backend from:', prodBackendPath);
        backendProcess = spawn(prodBackendPath, [], {
            env: { ...process.env, PORT: '8000', STORAGE_DIR: storageDir },
            shell: false
        });

        backendProcess.stdout?.on('data', (data) => console.log(`Backend: ${data}`));
        backendProcess.stderr?.on('data', (data) => console.error(`Backend Error: ${data}`));
        backendProcess.on('close', (code) => console.log(`Backend process exited with code ${code}`));
    } else {
        console.log('Production backend not found at:', prodBackendPath, '- assuming development mode or external backend.');
    }
}

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

    const indexPath = path.join(process.resourcesPath, 'frontend', 'index.html');
    const hasProdAssets = fs.existsSync(indexPath);

    if (isDev && !hasProdAssets) {
        console.log('Running in development mode, loading from localhost:3000');
        mainWindow.loadURL('http://localhost:3000');
        mainWindow.webContents.openDevTools();
    } else {
        // Serve static files from the bundled frontend
        console.log('Running in production mode, attempting to load index.html from:', indexPath);
        
        if (hasProdAssets) {
            const fileUrl = url.pathToFileURL(indexPath).toString();
            console.log('Loading frontend from URL:', fileUrl);
            mainWindow.loadURL(fileUrl).catch(err => {
                console.error('Failed to load local index.html:', err);
            });
        } else {
            const errorMsg = `Critical Error: Frontend assets not found at ${indexPath}`;
            console.error(errorMsg);
            dialog.showErrorBox('Startup Error', errorMsg);
        }
    }

  // Allow opening DevTools in production with a shortcut for debugging
  mainWindow.webContents.on('before-input-event', (event, input) => {
    if (input.control && input.shift && input.key.toLowerCase() === 'i') {
      mainWindow?.webContents.openDevTools();
    }
  });

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
  if (backendProcess) {
    backendProcess.kill();
  }
  // Stop OAuth callback server
  stopOAuthServer();
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('ready', () => {
    startBackend();
    createWindow();
});

// Handle second instance (focus window)
app.on('second-instance', () => {
  if (mainWindow) {
    if (mainWindow.isMinimized()) mainWindow.restore();
    mainWindow.focus();
  }
});

app.on('activate', () => {
  if (mainWindow === null) {
    createWindow();
  }
});

// IPC Handlers
ipcMain.handle('app:version', () => app.getVersion());

// Auth IPC Handlers - Using loopback redirect (Google recommended for desktop apps)
ipcMain.handle('auth:start-login', async (event, authUrl: string, port: number = 53682) => {
  try {
    // Open browser and wait for callback on loopback server
    // Returns callback directly (code, state) or error
    const callback = await openAuthBrowserAndWait(authUrl, port, mainWindow);
    return {
      code: callback.code,
      state: callback.state,
    };
  } catch (error) {
    console.error('Auth login error:', error);
    // Return error in callback format instead of throwing
    return {
      error: error instanceof Error ? error.message : 'Authentication failed',
    };
  }
});

ipcMain.handle('auth:handle-callback', (event, data: { code: string; state: string; codeVerifier: string }) => {
  // This IPC handler is for the renderer to send the code to backend
  return data;
});

// Example: Persist node creation from Renderer
ipcMain.on('node:create', (event, data) => {
  console.log('Main Process: Creating Node', data);
  // Here we would call the Backend API or Database directly?
  // Ideally, the Renderer calls the Backend API directly via fetch/axios.
  // Electron just might handle OS-level things or proxying if CORS is strictly an issue.
  // Since we set CORS to * in FastAPI, Renderer can talk to Backend directly.
});
