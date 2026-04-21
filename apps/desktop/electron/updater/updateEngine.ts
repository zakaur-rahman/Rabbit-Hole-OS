import { app, BrowserWindow } from 'electron';
import { EventEmitter } from 'events';
import log from 'electron-log';
import { autoUpdater } from 'electron-updater';
import { UpdateChannel, UpdateState } from './types';

// Configure structured logging
autoUpdater.logger = log;
(autoUpdater.logger as any).transports.file.level = 'info';

export class UpdateEngine extends EventEmitter {
  private state: UpdateState = { status: 'idle' };
  private channel: UpdateChannel = 'stable';
  private autoCheckInterval: NodeJS.Timeout | null = null;
  private mainWindow: BrowserWindow | null = null;

  constructor() {
    super();

    // Configure autoUpdater
    autoUpdater.autoDownload = false; // We trigger download manually for better UI control, or can be true for totally silent
    autoUpdater.autoInstallOnAppQuit = true;

    // Hook up events
    autoUpdater.on('checking-for-update', () => {
      this.setState({ status: 'checking', error: undefined });
    });

    autoUpdater.on('update-available', (info) => {
      this.setState({ 
        status: 'available', 
        updateInfo: {
          version: info.version,
          changelogUrl: '', // electron-updater handles release notes naturally
          downloadUrl: '',
          releaseDate: info.releaseDate || new Date().toISOString(),
          channel: this.channel,
          assetName: info.files?.[0]?.url || 'update'
        } 
      });
    });

    autoUpdater.on('update-not-available', (info) => {
      this.setState({ status: 'up-to-date' });
      // Clear up-to-date status after a bit so user can re-check later
      setTimeout(() => {
        if (this.state.status === 'up-to-date') this.setState({ status: 'idle' });
      }, 3000);
    });

    autoUpdater.on('error', (err) => {
      log.error('UpdateError:', err);
      this.setState({ status: 'error', error: err == null ? "unknown" : (err.stack || err).toString() });
    });

    autoUpdater.on('download-progress', (progressObj) => {
      this.setState({
        status: 'downloading',
        progress: {
          bytesDownloaded: progressObj.transferred,
          totalBytes: progressObj.total,
          percent: progressObj.percent,
          speedBps: progressObj.bytesPerSecond
        }
      });
    });

    autoUpdater.on('update-downloaded', (info) => {
      this.setState({ status: 'downloaded', progress: undefined });
      log.info('Update downloaded. Will install on quit or manually.');
    });
  }

  public setMainWindow(window: BrowserWindow | null) {
      this.mainWindow = window;
  }

  public setChannel(channel: UpdateChannel) {
      this.channel = channel;
      autoUpdater.channel = channel === 'stable' ? 'latest' : channel;
  }

  public getChannel(): UpdateChannel {
      return this.channel;
  }

  public getState(): UpdateState {
      return this.state;
  }

  private setState(state: Partial<UpdateState>) {
      this.state = { ...this.state, ...state };
      this.emitStateChange();
  }

  private emitStateChange() {
      this.emit('state-changed', this.state);
      if (this.mainWindow && !this.mainWindow.isDestroyed()) {
          this.mainWindow.webContents.send('updater:state-changed', this.state);
      }
  }

  /**
   * Initializes background auto-update checks.
   * Runs on startup and every 6 hours by default.
   */
  public startAutoCheck(intervalHours: number = 6) {
      log.info(`[UpdateEngine] Starting auto check loop on channel '${this.channel}'`);
      
      this.setChannel(this.channel); // synchronize internal channel state

      // Delay initial check slightly so app startup isn't bogged down
      setTimeout(() => this.checkForUpdates(false), 5 * 1000);

      if (this.autoCheckInterval) {
          clearInterval(this.autoCheckInterval);
      }

      const ms = intervalHours * 60 * 60 * 1000;
      this.autoCheckInterval = setInterval(() => {
          this.checkForUpdates(false);
      }, ms);
  }

  /**
   * Manual or automatic check for updates.
   */
  public async checkForUpdates(isManualCheck: boolean = true) {
     if (this.state.status === 'checking' || this.state.status === 'downloading') {
         return; // Already working
     }

     log.info(`Checking for updates... (Manual: ${isManualCheck})`);
     try {
        await autoUpdater.checkForUpdates();
     } catch (err: any) {
        log.error('Check for updates failed', err);
        // Handled via error event
     }
  }

  public async downloadUpdate() {
      if (this.state.status !== 'available' && this.state.status !== 'error') {
          log.warn('[UpdateEngine] Cannot download: no update available or already downloading.');
          // Don't early return if it's auto-downloading natively just in case, but keep the guard
      }

      log.info('Downloading update...');
      try {
        await autoUpdater.downloadUpdate();
      } catch (err: any) {
        log.error('[UpdateEngine] Download start failed:', err);
      }
  }

  public pauseDownload() {
      log.warn('[UpdateEngine] Pause not directly supported by basic electron-updater without custom provider.');
      // Stub for compatibility with previous UI expectations
  }

  public resumeDownload() {
      log.warn('[UpdateEngine] Resume not directly supported by basic electron-updater without custom provider.');
  }

  public cancelDownload() {
      // Stub for compatibility
      this.setState({ status: 'available', progress: undefined });
  }

  public async installUpdate() {
      if (this.state.status !== 'downloaded') {
          log.warn('[UpdateEngine] Cannot install: download not complete.');
          return;
      }

      log.info('[UpdateEngine] Quitting and installing...');
      autoUpdater.quitAndInstall(true, true);
  }
}
