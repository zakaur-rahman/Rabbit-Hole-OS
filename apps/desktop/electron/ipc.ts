import { ipcMain } from 'electron';

export function setupIpcHandlers() {
  ipcMain.handle('app:version', () => {
    return require('../../package.json').version;
  });

  // Navigation events
  ipcMain.on('browser:navigate', (event, url) => {
    // This might control the BrowserView or a specific <webview> if we manage it from Main.
    // If using <webview> in Renderer, the Renderer controls navigation directly via the DOM element.
    // So this might be unused if we stick to <webview> tag entirely.
    console.log('Navigate to:', url);
  });
}
