import { app } from 'electron';
import { ReleaseService } from '../services/releaseService';
import { UpdateChannel, UpdateInfo } from './types';

export class UpdateChecker {
  private releaseService: ReleaseService;

  constructor() {
    this.releaseService = new ReleaseService();
  }

  /**
   * Checks if an update is available on the specified channel by comparing Versions.
   */
  public async checkForUpdates(channel: UpdateChannel): Promise<UpdateInfo | null> {
    try {
      const latestRelease = await this.releaseService.getLatestRelease(channel);
      
      if (!latestRelease) {
         console.log('[UpdateChecker] No releases found in target channel.');
         return null;
      }

      const currentVersion = app.getVersion();
      console.log(`[UpdateChecker] Current: ${currentVersion} | Latest in ${channel}: ${latestRelease.version}`);

      if (this.isVersionGreater(latestRelease.version, currentVersion)) {
         return latestRelease;
      }

      return null;
    } catch (e) {
      console.error('[UpdateChecker] Failure during update check:', e);
      throw e;
    }
  }

  /**
   * Minimal semantic versioning comparison: 
   * Returns true if v1 > v2.
   * Format usually: 1.0.0, 1.0.1-beta, etc.
   */
  private isVersionGreater(v1: string, v2: string): boolean {
    const semVerV1 = v1.split(/[-.]/).map((n) => parseInt(n, 10) || 0);
    const semVerV2 = v2.split(/[-.]/).map((n) => parseInt(n, 10) || 0);

    const len = Math.max(semVerV1.length, semVerV2.length);

    for (let i = 0; i < len; i++) {
       const p1 = semVerV1[i] || 0;
       const p2 = semVerV2[i] || 0;

       if (p1 > p2) return true;
       if (p1 < p2) return false;
    }

    return false; // Equal versions
  }
}
