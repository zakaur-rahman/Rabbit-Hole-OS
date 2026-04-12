import { spawn } from 'child_process';
import { app } from 'electron';
import fs from 'fs';
import path from 'path';

export class UpdateInstaller {
  /**
   * Triggers a silent installation of the downloaded NSIS executable.
   * If the installation is initiated, the application is forcibly closed
   * so the installer can replace the locked binaries safely.
   */
  public async install(installerPath: string): Promise<void> {
    if (!fs.existsSync(installerPath)) {
      throw new Error(`Installer file not found at: ${installerPath}`);
    }

    const isWin = process.platform === 'win32';
    const isMac = process.platform === 'darwin';

    console.log(`[UpdateInstaller] Triggering installation on ${process.platform}: ${installerPath}`);

    if (isWin) {
      return this.installWindows(installerPath);
    } else if (isMac) {
      return this.installMac(installerPath);
    } else {
      throw new Error(`Auto-update installation is not supported on ${process.platform}`);
    }
  }

  private installWindows(installerPath: string): Promise<void> {
    return new Promise((resolve, reject) => {
      // NSIS Silent install flags: /S represents silent mode.
      const args = ['/S'];
      const installerProcess = spawn(installerPath, args, {
        detached: true,
        stdio: 'ignore'
      });

      installerProcess.on('error', (err) => {
         console.error('[UpdateInstaller] Failed to spawn Windows installer:', err);
         reject(err);
      });

      installerProcess.unref();
      resolve();
    });
  }

  private async installMac(installerPath: string): Promise<void> {
    const extension = path.extname(installerPath).toLowerCase();
    
    if (extension === '.dmg') {
       await this.installMacDmg(installerPath);
    } else if (extension === '.zip') {
       await this.installMacZip(installerPath);
    } else {
       throw new Error(`Unsupported macOS installer extension: ${extension}`);
    }
  }

  private async installMacDmg(installerPath: string): Promise<void> {
    return new Promise((resolve, reject) => {
      // 1. Mount the DMG
      const mountCmd = `hdiutil attach -nobrowse -readonly "${installerPath}"`;
      const mountProcess = spawn('sh', ['-c', mountCmd]);
      
      let mountOutput = '';
      mountProcess.stdout.on('data', (data) => mountOutput += data.toString());

      mountProcess.on('close', (code) => {
        if (code !== 0) return reject(new Error(`Failed to mount DMG: exit code ${code}`));

        // 2. Find the mount point (e.g. /Volumes/Cognode)
        // Usually the last line of output contains the /Volumes/... path
        const lines = mountOutput.split('\n');
        const mountLine = lines.find(l => l.includes('/Volumes/'));
        if (!mountLine) return reject(new Error('Could not find mount point for DMG'));
        
        const mountPoint = mountLine.split('\t').pop()?.trim();
        if (!mountPoint) return reject(new Error('Could not parse mount point'));

        // 3. Find the .app inside the mount point
        const files = fs.readdirSync(mountPoint);
        const appBundle = files.find(f => f.endsWith('.app'));
        if (!appBundle) return reject(new Error('No .app bundle found in DMG'));

        // 4. Copy to /Applications (usually requires permission if not in a user-writable path, 
        // but for app updates it's often the same location)
        const targetPath = '/Applications';
        const copyCmd = `cp -R "${path.join(mountPoint, appBundle)}" "${targetPath}"`;
        
        spawn('sh', ['-c', copyCmd]).on('close', (copyCode) => {
           // 5. Unmount regardless of success
           spawn('hdiutil', ['detach', mountPoint]).on('close', () => {
              if (copyCode === 0) resolve();
              else reject(new Error(`Failed to copy app to /Applications: exit code ${copyCode}`));
           });
        });
      });
    });
  }

  private async installMacZip(installerPath: string): Promise<void> {
    return new Promise((resolve, reject) => {
      // Using ditto is more reliable on Mac for preserving permissions/symlinks
      const targetPath = '/Applications';
      const unzipCmd = `ditto -xk "${installerPath}" "${targetPath}"`;
      
      spawn('sh', ['-c', unzipCmd]).on('close', (code) => {
        if (code === 0) resolve();
        else reject(new Error(`Failed to extract ZIP to /Applications: exit code ${code}`));
      });
    });
  }

  /**
   * If an update fails before finishing, we want to roll back (delete corrupt installers).
   * Note: A true rollback in an NSIS environment requires either an A/B partition (Squirrel) 
   * or a rollback script. For standard NSIS, "rollback" generally means aborting the current 
   * broken download/install process and notifying the user.
   */
  public rollback(installerPath: string) {
      console.log(`[UpdateInstaller] Initiating rollback procedure: cleaning up ${installerPath}`);
      if (fs.existsSync(installerPath)) {
          try {
             fs.unlinkSync(installerPath);
             console.log('[UpdateInstaller] Rollback complete: corrupted installer destroyed.');
          } catch (e) {
             console.error('[UpdateInstaller] Rollback failed to remove file:', e);
          }
      }
  }
}
