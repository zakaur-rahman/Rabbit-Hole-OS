import { app, BrowserWindow } from 'electron';
import { EventEmitter } from 'events';
import { UpdateChecker } from './updateChecker';
import { UpdateDownloader } from './updateDownloader';
import { UpdateInstaller } from './updateInstaller';
import { UpdateChannel, UpdateState, UpdateInfo } from './types';

export class UpdateEngine extends EventEmitter {
  private state: UpdateState = { status: 'idle' };
  private checker: UpdateChecker;
  private downloader: UpdateDownloader;
  private installer: UpdateInstaller;
  private channel: UpdateChannel = 'stable';
  private autoCheckInterval: NodeJS.Timeout | null = null;
  private mainWindow: BrowserWindow | null = null;

  constructor() {
    super();
    this.checker = new UpdateChecker();
    this.downloader = new UpdateDownloader();
    this.installer = new UpdateInstaller();

    // Bubble up progress events
    this.downloader.on('progress', (progress) => {
       if (this.state.status !== 'downloading') return;
       this.state.progress = progress;
       this.emitStateChange();
    });
  }

  public setMainWindow(window: BrowserWindow | null) {
      this.mainWindow = window;
  }

  public setChannel(channel: UpdateChannel) {
      this.channel = channel;
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
      console.log(`[UpdateEngine] Starting auto check loop on channel '${this.channel}'`);
      
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

     this.setState({ status: 'checking', error: undefined });

     try {
         const updateInfo = await this.checker.checkForUpdates(this.channel);
         
         if (updateInfo) {
             this.setState({ status: 'available', updateInfo });
         } else {
             this.setState({ status: 'up-to-date' });
             // If manual check, reset back to idle after a few seconds so it can be checked again
             if (isManualCheck) {
                 setTimeout(() => {
                    if (this.state.status === 'up-to-date') this.setState({ status: 'idle' });
                 }, 3000);
             }
         }
     } catch (err: any) {
         this.setState({ status: 'error', error: err.message || 'Failed to check for updates' });
     }
  }

  public async downloadUpdate() {
      if (this.state.status !== 'available' && this.state.status !== 'error') {
          console.warn('[UpdateEngine] Cannot download: no update available or already downloading.');
          return;
      }

      if (!this.state.updateInfo) return;

      this.setState({ status: 'downloading', error: undefined, progress: { bytesDownloaded: 0, totalBytes: 0, percent: 0 } });

      try {
          const installerPath = await this.downloader.download(this.state.updateInfo);
          this.setState({ status: 'downloaded', progress: undefined });
      } catch (err: any) {
          console.error('[UpdateEngine] Download failed:', err);
          this.setState({ status: 'error', error: err.message || 'Failed to download update' });
      }
  }

  public pauseDownload() {
      if (this.state.status === 'downloading') {
          this.downloader.pause();
          this.setState({ status: 'available' }); // Revert back to available state so UI can show resume
      }
  }

  public resumeDownload() {
      if (this.state.status === 'available' && this.state.updateInfo) {
          this.setState({ status: 'downloading' });
          this.downloader.resume();
      }
  }

  public cancelDownload() {
     this.downloader.cancel();
     if (this.state.updateInfo) {
         this.setState({ status: 'available', progress: undefined });
     } else {
         this.setState({ status: 'idle', progress: undefined });
     }
  }

  public async installUpdate() {
      if (this.state.status !== 'downloaded') {
          console.warn('[UpdateEngine] Cannot install: download not complete.');
          return;
      }

      const installerPath = this.downloader.getTargetPath();
      
      try {
         await this.installer.install(installerPath);
         
         // Give spawn a moment to detach cleanly before destroying the process
         setTimeout(() => {
            app.quit();
         }, 1000);
      } catch (err: any) {
         console.error('[UpdateEngine] Installation failed:', err);
         this.installer.rollback(installerPath); // Delete corrupted file
         this.setState({ status: 'error', error: err.message || 'Failed to install update. Package may be corrupt.' });
      }
  }
}
