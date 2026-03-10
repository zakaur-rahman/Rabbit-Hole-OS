export type UpdateChannel = 'stable' | 'beta' | 'nightly';

export interface UpdateInfo {
  version: string;
  changelogUrl: string;
  downloadUrl: string;
  releaseDate: string;
  channel: UpdateChannel;
  size?: number;
}

export interface DownloadProgress {
  bytesDownloaded: number;
  totalBytes: number;
  percent: number;
  speedBps?: number;
}

export interface UpdateState {
  status: 'idle' | 'checking' | 'available' | 'downloading' | 'downloaded' | 'error' | 'up-to-date';
  progress?: DownloadProgress;
  updateInfo?: UpdateInfo;
  error?: string;
}

export interface ReleaseAsset {
  name: string;
  browser_download_url: string;
  size: number;
  content_type: string;
}

export interface GitHubRelease {
  tag_name: string;
  name: string;
  prerelease: boolean;
  published_at: string;
  assets: ReleaseAsset[];
  body: string;
}
