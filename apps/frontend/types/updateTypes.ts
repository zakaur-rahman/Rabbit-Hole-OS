export type UpdateChannel = 'stable' | 'beta' | 'nightly';

export interface UpdateInfo {
  version: string;
  changelogUrl: string; // Linking to the web page
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
