import { net } from 'electron';
import { GitHubRelease, UpdateChannel, UpdateInfo } from '../updater/types';

// The repository mapped from the user's setup
const GITHUB_REPO = 'zakaur-rahman/Rabbit-Hole-OS';
const API_URL = `https://api.github.com/repos/${GITHUB_REPO}/releases`;

export class ReleaseService {
  /**
   * Fetches releases from GitHub and filters them based on the desired channel.
   * `stable` channel ignores prereleases.
   * `beta` and `nightly` channels accept prereleases, though nightly might have a tag convention.
   */
  public async getLatestRelease(channel: UpdateChannel): Promise<UpdateInfo | null> {
    try {
      // Fetch all releases (GitHub API paginates 30 by default, this is usually enough for recent releases)
      const releases = await this.fetchReleases();

      if (!releases || releases.length === 0) {
        console.warn('[ReleaseService] No releases found.');
        return null;
      }

      // Filter based on channel
      const filteredRelease = releases.find((release) => {
        if (channel === 'stable') {
          return !release.prerelease; // Stable means not a prerelease
        }
        
        // Beta or Nightly: we'll assume prereleases contain some tag info if needed,
        // but for now, any prerelease counts as beta/nightly until tagging conventions are strict.
        if (channel === 'beta') {
          return release.prerelease && release.tag_name.toLowerCase().includes('beta');
        }

        if (channel === 'nightly') {
          return release.prerelease && (release.tag_name.toLowerCase().includes('nightly') || release.tag_name.toLowerCase().includes('alpha'));
        }

        // Fallback for non-stable if specific tagging isn't strict: grab the absolute latest
        return true; 
      });

      // If strict beta/nightly tag wasn't found but requested, fallback to the latest prerelease
      const targetRelease = filteredRelease || (channel !== 'stable' ? releases.find(r => r.prerelease) : releases.find(r => !r.prerelease));

      if (!targetRelease) return null;

      // Identify the correct asset for the current platform
      const isWin = process.platform === 'win32';
      const isMac = process.platform === 'darwin';
      
      const asset = targetRelease.assets.find(a => {
        if (isWin) return a.name.endsWith('.exe');
        if (isMac) return a.name.endsWith('.dmg') || a.name.endsWith('.zip');
        return false;
      });

      if (!asset) {
        console.warn(`[ReleaseService] No compatible ${process.platform} asset found for release ${targetRelease.tag_name}`);
        return null;
      }

      // Format version (remove 'v' prefix if present)
      const version = targetRelease.tag_name.startsWith('v') 
        ? targetRelease.tag_name.substring(1) 
        : targetRelease.tag_name;

      return {
        version,
        changelogUrl: `https://cognode.tech/changelog?version=${version}`, // Link to our web UI for changelogs
        downloadUrl: asset.browser_download_url,
        releaseDate: targetRelease.published_at,
        channel,
        size: asset.size,
        assetName: asset.name
      };
    } catch (error) {
      console.error('[ReleaseService] Failed to fetch latest release:', error);
      throw error;
    }
  }

  /**
   * Uses Electron's native `net` module for HTTPS requests to avoid Node's `http` boilerplate
   * and properly respect system proxy settings.
   */
  private fetchReleases(): Promise<GitHubRelease[]> {
    return new Promise((resolve, reject) => {
      const request = net.request({
        method: 'GET',
        url: API_URL,
        headers: {
          'User-Agent': 'Cognode-Desktop-Updater'
        }
      });

      request.on('response', (response) => {
        if (response.statusCode === 200) {
          let data = '';
          response.on('data', (chunk) => {
            data += chunk.toString();
          });
          response.on('end', () => {
            try {
              const releases = JSON.parse(data) as GitHubRelease[];
              resolve(releases);
            } catch (err) {
              reject(new Error('Failed to parse GitHub JSON response'));
            }
          });
        } else {
          // Consume stream to free memory
          response.on('data', () => {});
          response.on('end', () => {
             reject(new Error(`GitHub API returned status: ${response.statusCode}`));
          });
        }
      });

      request.on('error', (error) => {
        reject(error);
      });

      request.end();
    });
  }
}
