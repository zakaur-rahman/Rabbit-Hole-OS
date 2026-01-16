import { shell, BrowserWindow } from 'electron';
import { waitForOAuthCallback, stopOAuthCallbackServer, OAuthCallback } from './oauth-server';

/**
 * Opens the system browser for OAuth login and waits for the callback
 * Uses loopback redirect (http://127.0.0.1:PORT/oauth/callback) - Google recommended
 * @param authUrl - The Google OAuth authorization URL
 * @param port - Port for the callback server (default: 53682)
 * @param mainWindow - The main application window
 * @returns Promise that resolves with the OAuth callback (code and state)
 */
export async function openAuthBrowserAndWait(
  authUrl: string,
  port: number = 53682,
  mainWindow: BrowserWindow | null
): Promise<OAuthCallback> {
  // Start the callback server first
  const callbackPromise = waitForOAuthCallback(port);

  // Open the browser
  shell.openExternal(authUrl);

  // Wait for the callback
  const callback = await callbackPromise;
  
  // Also send callback to renderer process via IPC (for event listeners)
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send('auth:callback', callback);
  }
  
  return callback;
}

/**
 * Opens the system browser for OAuth login (legacy - for compatibility)
 * @param authUrl - The Google OAuth authorization URL
 */
export function openAuthBrowser(authUrl: string): void {
  shell.openExternal(authUrl);
}

/**
 * Stops the OAuth callback server if running
 */
export function stopOAuthServer(): void {
  stopOAuthCallbackServer();
}
