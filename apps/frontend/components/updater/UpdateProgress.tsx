import React from 'react';
import { DownloadProgress } from '../../types/updateTypes';

interface UpdateProgressProps {
  progress: DownloadProgress;
  onPause: () => void;
  onResume: () => void;
  onCancel: () => void;
  isPaused: boolean;
}

export const UpdateProgress: React.FC<UpdateProgressProps> = ({
  progress,
  onPause,
  onResume,
  onCancel,
  isPaused,
}) => {
  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <div className="w-full space-y-4">
      <div className="flex justify-between text-sm text-gray-300">
        <span>Downloading...</span>
        <span>{progress.percent.toFixed(1)}%</span>
      </div>

      <div className="w-full bg-gray-800 rounded-full h-2.5 overflow-hidden relative">
        <div
          className={`h-2.5 rounded-full transition-all duration-300 ease-in-out ${
            isPaused ? 'bg-yellow-500' : 'bg-blue-600'
          }`}
          style={{ width: `${Math.max(0, Math.min(100, progress.percent))}%` }}
        ></div>
      </div>

      <div className="flex justify-between text-xs text-gray-400">
        <span>
          {formatBytes(progress.bytesDownloaded)} / {formatBytes(progress.totalBytes)}
        </span>
        {!isPaused && progress.speedBps && (
          <span>{formatBytes(progress.speedBps)}/s</span>
        )}
      </div>

      <div className="flex justify-end gap-3 mt-4">
        <button
          onClick={onCancel}
          className="px-4 py-2 text-sm text-gray-400 hover:text-white transition-colors"
        >
          Cancel
        </button>
        {isPaused ? (
          <button
            onClick={onResume}
            className="px-4 py-2 text-sm bg-blue-600 hover:bg-blue-700 text-white rounded-md transition-colors"
          >
            Resume
          </button>
        ) : (
          <button
            onClick={onPause}
            className="px-4 py-2 text-sm bg-gray-700 hover:bg-gray-600 text-white rounded-md transition-colors"
          >
            Pause
          </button>
        )}
      </div>
    </div>
  );
};
