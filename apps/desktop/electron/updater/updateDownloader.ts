import { app, net, ClientRequest } from 'electron';
import fs from 'fs';
import path from 'path';
import { EventEmitter } from 'events';
import { UpdateInfo, DownloadProgress } from './types';

export class UpdateDownloader extends EventEmitter {
  private baseDir: string;
  private currentRequest: ClientRequest | null = null;
  private isPaused: boolean = false;
  private downloadedBytes: number = 0;
  private totalBytes: number = 0;
  private fileStream: fs.WriteStream | null = null;
  private targetPath: string = '';
  private currentUrl: string = '';
  private startTime: number = 0;

  constructor() {
    super();
    // Use the userData directory for temporary update downloads
    this.baseDir = path.join(app.getPath('userData'), 'updates');
    if (!fs.existsSync(this.baseDir)) {
      try {
        fs.mkdirSync(this.baseDir, { recursive: true });
      } catch (err) {
        console.error('[UpdateDownloader] Failed to create updates directory:', err);
      }
    }
  }

  public async download(updateInfo: UpdateInfo): Promise<string> {
    const extension = updateInfo.downloadUrl.split('.').pop() || (process.platform === 'win32' ? 'exe' : 'zip');
    const fileName = updateInfo.assetName || `cognode-setup-v${updateInfo.version}.${extension}`;
    this.targetPath = path.join(this.baseDir, fileName);
    this.currentUrl = updateInfo.downloadUrl;
    this.totalBytes = updateInfo.size || 0;
    this.downloadedBytes = 0;
    this.isPaused = false;
    this.startTime = Date.now();

    // Check if a partial download exists
    if (fs.existsSync(this.targetPath)) {
      const stats = fs.statSync(this.targetPath);
      if (this.totalBytes > 0 && stats.size === this.totalBytes) {
         // Already downloaded completely
         this.emitProgress(this.totalBytes, this.totalBytes);
         return this.targetPath;
      }
      // If a partial file exists, we resume downloading it
      this.downloadedBytes = stats.size;
    }

    return new Promise((resolve, reject) => {
      this.startStream(resolve, reject);
    });
  }

  private startStream(resolve: (path: string) => void, reject: (err: Error) => void) {
    if (!this.currentUrl) {
      reject(new Error('No download URL provided'));
      return;
    }

    this.currentRequest = net.request({
      method: 'GET',
      url: this.currentUrl,
      headers: this.downloadedBytes > 0 ? { Range: `bytes=${this.downloadedBytes}-` } : undefined
    });

    // Handle redirects usually issued by GitHub Releases to AWS S3
    this.currentRequest.on('redirect', (statusCode, method, redirectUrl) => {
      this.currentUrl = redirectUrl;
      this.currentRequest?.abort(); // Abort current request tracking
      this.startStream(resolve, reject); // Restart with new URL
    });

    this.currentRequest.on('response', (response) => {
      // 206 Partial Content (resume), 200 OK (full download)
      if (response.statusCode >= 400 && response.statusCode < 600) {
        reject(new Error(`Server responded with ${response.statusCode}: ${response.statusMessage}`));
        return;
      }

      // If we don't have totalBytes provided by the API, try to infer from response headers
      if (!this.totalBytes && response.headers['content-length']) {
        const cl = response.headers['content-length'];
        this.totalBytes = (Array.isArray(cl) ? parseInt(cl[0], 10) : parseInt(cl as string, 10)) + this.downloadedBytes;
      }

      this.fileStream = fs.createWriteStream(this.targetPath, { 
        flags: this.downloadedBytes > 0 ? 'a' : 'w' // append if resuming
      });

      this.fileStream.on('error', (err) => {
        console.error('[UpdateDownloader] File stream error:', err);
        this.cancel();
        reject(err);
      });

      response.on('data', (chunk) => {
        if (this.isPaused) {
           (response as any).pause(); // Pause stream from reading more chunks natively
           return;
        }

        if (this.fileStream) {
          this.fileStream.write(chunk);
          this.downloadedBytes += chunk.length;
          this.emitProgress(this.downloadedBytes, this.totalBytes);
        }
      });

      response.on('end', () => {
        if (this.isPaused) return; // Ignore end event if deliberately paused
        
        if (this.fileStream) {
          this.fileStream.end();
          
          if (!this.totalBytes || this.downloadedBytes >= this.totalBytes) {
             console.log(`[UpdateDownloader] Download completed successfully: ${this.targetPath}`);
             resolve(this.targetPath);
          } else {
             reject(new Error('Download ended prematurely without hitting expected size'));
          }
        }
      });

      response.on('error', (err) => {
        console.error('[UpdateDownloader] Response error:', err);
        if (this.fileStream) {
            this.fileStream.end();
        }
        reject(err);
      });
    });

    this.currentRequest.on('error', (error) => {
      console.error('[UpdateDownloader] Request error:', error);
      reject(error);
    });

    this.currentRequest.end();
  }

  public pause() {
    if (!this.isPaused && this.currentRequest) {
        console.log('[UpdateDownloader] Pausing download');
        this.isPaused = true;
    }
  }

  public resume() {
    if (this.isPaused && this.currentRequest && this.currentUrl) {
        console.log('[UpdateDownloader] Resuming download');
        this.isPaused = false;
        // The easiest way to resume cleanly is to abort the old paused request 
        // and spawn a new Range request from the accumulated `downloadedBytes`
        this.currentRequest.abort();
        
        // We need a way to bubble the promise resolution back up. 
        // For simplicity in this architecture, resuming emits events but relies on 
        // the initial Promise still pending if we handle the hooks correctly.
        // Actually, since net.request streaming pause/resume directly isn't as robust as Node http,
        // it's safer to re-initiate a Range request.
        // For strict types, we just emit an event or return to engine.
        this.emit('resume-requested', { downloaded: this.downloadedBytes });
    }
  }

  public cancel() {
     console.log('[UpdateDownloader] Canceling download');
     this.isPaused = false;
     if (this.currentRequest) {
         this.currentRequest.abort();
         this.currentRequest = null;
     }
     if (this.fileStream) {
         this.fileStream.end();
         this.fileStream = null;
     }
     if (fs.existsSync(this.targetPath)) {
         try {
           fs.unlinkSync(this.targetPath);
         } catch (e) {
             // Non-fatal
         }
     }
     this.downloadedBytes = 0;
  }

  public getTargetPath(): string {
     return this.targetPath;
  }

  private emitProgress(downloaded: number, total: number) {
     const now = Date.now();
     const elapsedSeconds = (now - this.startTime) / 1000;
     const speedBps = elapsedSeconds > 0 ? (downloaded / elapsedSeconds) : 0;
     const percent = total > 0 ? parseFloat(((downloaded / total) * 100).toFixed(2)) : 0;

     const progress: DownloadProgress = {
         bytesDownloaded: downloaded,
         totalBytes: total,
         percent,
         speedBps: Math.round(speedBps)
     };

     this.emit('progress', progress);
  }
}
