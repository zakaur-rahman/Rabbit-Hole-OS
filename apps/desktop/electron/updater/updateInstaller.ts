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

    console.log(`[UpdateInstaller] Triggering installation: ${installerPath}`);

    return new Promise((resolve, reject) => {
      // NSIS Silent install flags: /S represents silent mode.
      // /force-run is optionally used in some custom NSIS scripts to relaunch after finish.
      // /D= sets destination dir if we wanted, but native update doesn't need it.
      
      const args = ['/S'];

      const installerProcess = spawn(installerPath, args, {
        detached: true,     // Detaches the child from the parent (Electron)
        stdio: 'ignore'     // Ignores all stdio tying it to Electron
      });

      installerProcess.on('error', (err) => {
         console.error('[UpdateInstaller] Failed to spawn installer:', err);
         reject(err);
      });

      // Detach forces the child to run independently in the background OS 
      installerProcess.unref();

      console.log('[UpdateInstaller] Spawning successful. App will now gracefully quit to allow overwriting.');

      // We resolve cleanly, then let the Engine trigger an app quit.
      resolve();
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
