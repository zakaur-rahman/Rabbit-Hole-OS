import { app, BrowserWindow, ipcMain, shell, dialog } from 'electron';
import path from 'path';
import fs from 'fs';
import url from 'url';
import { spawn, ChildProcess } from 'child_process';
import { openAuthBrowserAndWait, stopOAuthServer } from './auth';
import { SQLiteDatabase } from './database/sqlite';
import { initializeSchema } from './database/schema';
import { LocalStorageService } from './services/local-storage';
import { registerStorageHandlers } from './ipc/storage-handler';
import { SyncService } from './services/sync-service';

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
    if (errorString.includes('GUEST_VIEW_MANAGER_CALL') && (errorString.includes('ERR_ABORTED') || errorString.includes('(-3)'))) {
        return;
    }
    console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

// Also catch uncaughtException for the same pattern
process.on('uncaughtException', (error) => {
    const errorString = String(error);
    if (errorString.includes('GUEST_VIEW_MANAGER_CALL') && (errorString.includes('ERR_ABORTED') || errorString.includes('(-3)'))) {
        return;
    }
    console.error('Uncaught Exception:', error);
});

let mainWindow: BrowserWindow | null = null;
let backendProcess: ChildProcess | null = null;
let database: SQLiteDatabase | null = null;
let storageService: LocalStorageService | null = null;
let syncService: SyncService | null = null;

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
    frame: true, // Use default frame for Windows compatibility
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
      webviewTag: true,
    },
    backgroundColor: '#0a0a0a',
    titleBarStyle: 'hidden',
    titleBarOverlay: { 
        color: '#00000000',
        symbolColor: '#ffffff', 
        height: 56
    },
    autoHideMenuBar: true,
  });
  
  mainWindow.setMenuBarVisibility(false);

    const indexPath = path.join(process.resourcesPath, 'frontend', 'index.html');
    const hasProdAssets = fs.existsSync(indexPath);

    if (isDev && !hasProdAssets) {
        console.log('Running in development mode, loading from localhost:3000');
        
        // Retry logic for when frontend isn't ready yet
        const loadURL = () => {
          mainWindow?.loadURL('http://localhost:3000').then(() => {
            console.log('[Lifecycle] Successfully loaded localhost:3000');
          }).catch((err) => {
            console.log('[Lifecycle] Frontend not ready, retrying in 1s...', err.message);
            setTimeout(loadURL, 1000); // Retry every second
          });
        };
        
        loadURL(); // Use the retry-capable loader
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
    console.log('[Lifecycle] MainWindow closed');
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
  console.log('[Lifecycle] window-all-closed event fired');
  if (database) {
    database.close();
    database = null;
  }
  if (backendProcess) {
    backendProcess.kill();
  }
  // Stop OAuth callback server
  stopOAuthServer();
  if (process.platform !== 'darwin') {
    console.log('[Lifecycle] Quitting app (not darwin)');
    app.quit();
  }
});

// Graceful shutdown: sync before quit
let hasShutdownSynced = false;
app.on('before-quit', async (event) => {
  console.log('[Lifecycle] before-quit event fired');
  if (syncService && !hasShutdownSynced) {
    event.preventDefault();
    console.log('[App] Performing final sync before quit...');
    
    try {
      await syncService.syncNow();
      console.log('[App] Final sync complete');
    } catch (error) {
      console.error('[App] Final sync failed:', error);
    }
    
    // Mark that we've done the shutdown sync
    hasShutdownSynced = true;
    
    // Stop sync service
    syncService.stop();
    
    // Now allow quit
    console.log('[Lifecycle] Re-triggering quit after sync');
    app.quit();
  }
});

app.on('ready', () => {
    // Initialize local database
    console.log('[App] Initializing local database...');
    database = new SQLiteDatabase();
    initializeSchema(database.getDb());
    
    // Initialize storage service
    storageService = new LocalStorageService(database.getDb());
    
    // Register IPC handlers for storage
    registerStorageHandlers(storageService);
    
    console.log('[App] Local storage ready');
    
    // Initialize sync service
    syncService = new SyncService(storageService, {
      apiBaseUrl: 'http://127.0.0.1:8000',
      syncIntervalMs: 5 * 60 * 1000, // 5 minutes
    });
    
    // Start sync service
    syncService.start();
    console.log('[App] Sync service started');

    // Listen for auth token updates (emitted from storage-handler or other main process parts)
    ipcMain.on('sync:set-token', (token: any) => {
        console.log(`[Main] sync:set-token received (internal)`);
        if (syncService) {
            syncService.setAuthToken(token);
            syncService.syncNow().catch(err => console.error('[Sync] Immediate sync error:', err));
        }
    });

    // Also listen directly for IPC from renderer if preferred
    ipcMain.on('storage:sync:setToken', (event, token) => {
        console.log(`[Main] storage:sync:setToken received (IPC)`);
        if (syncService) {
            syncService.setAuthToken(token);
            syncService.syncNow().catch(err => console.error('[Sync] Immediate sync error:', err));
        }
    });
    
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
