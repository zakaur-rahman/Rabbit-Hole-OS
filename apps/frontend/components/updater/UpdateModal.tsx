'use client';

import React, { useEffect, useState } from 'react';
import { UpdateState } from '../../types/updateTypes';
import { UpdateProgress } from './UpdateProgress';

export const UpdateModal: React.FC = () => {
  const [updateState, setUpdateState] = useState<UpdateState>({ status: 'idle' });
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    // Only run in Electron environment
    if (!window.electron?.updater) return;

    // Fetch initial state
    window.electron.updater.getState().then((state) => {
      setUpdateState(state);
      if (['available', 'downloaded', 'error'].includes(state.status)) {
        setIsOpen(true);
      }
    });

    // Listen for updates
    const unsubscribe = window.electron.updater.onStateChanged((newState) => {
      setUpdateState(newState);
      if (['available', 'downloaded', 'error'].includes(newState.status)) {
        setIsOpen(true);
      }
    });

    return () => {
      unsubscribe();
    };
  }, []);

  const handleDownload = () => window.electron?.updater.download();
  const handleInstall = () => window.electron?.updater.install();
  const handlePause = () => window.electron?.updater.pause();
  const handleResume = () => window.electron?.updater.resume();
  const handleCancel = () => {
    window.electron?.updater.cancel();
    setIsOpen(false);
  };
  const handleClose = () => setIsOpen(false);

  const handleOpenChangelog = (e: React.MouseEvent) => {
    e.preventDefault();
    if (updateState.updateInfo?.changelogUrl && window.electron?.shell) {
      window.electron.shell.openExternal(updateState.updateInfo.changelogUrl);
    }
  };

  if (updateState.status === 'idle' || updateState.status === 'checking' || updateState.status === 'up-to-date') {
    return null; // Don't show modal during checking phases unless explicitly requested via specific UI button.
  }

  if (!isOpen) {
    if (updateState.status === 'downloading') {
      return (
        <div className="fixed bottom-6 right-6 z-[100] bg-[#121212] border border-[#2a2a2a] shadow-xl p-4 rounded-xl flex flex-col gap-2 w-80 animate-in slide-in-from-bottom-5">
           <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-white flex items-center gap-2">
                <svg className="animate-spin text-blue-500" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="12" y1="2" x2="12" y2="6"></line>
                  <line x1="12" y1="18" x2="12" y2="22"></line>
                  <line x1="4.93" y1="4.93" x2="7.76" y2="7.76"></line>
                  <line x1="16.24" y1="16.24" x2="19.07" y2="19.07"></line>
                  <line x1="2" y1="12" x2="6" y2="12"></line>
                  <line x1="18" y1="12" x2="22" y2="12"></line>
                  <line x1="4.93" y1="19.07" x2="7.76" y2="16.24"></line>
                  <line x1="16.24" y1="7.76" x2="19.07" y2="4.93"></line>
                </svg>
                Downloading Update... {updateState.progress?.percent.toFixed(1)}%
              </span>
              <button onClick={() => setIsOpen(true)} className="text-gray-400 hover:text-white transition-colors" title="Maximize">
                 <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                   <polyline points="15 3 21 3 21 9"></polyline>
                   <polyline points="9 21 3 21 3 15"></polyline>
                   <line x1="21" y1="3" x2="14" y2="10"></line>
                   <line x1="3" y1="21" x2="10" y2="14"></line>
                 </svg>
              </button>
           </div>
           <div className="w-full bg-gray-800 rounded-full h-1.5 mt-2 overflow-hidden">
             <div className="bg-blue-600 h-1.5 rounded-full transition-all duration-300" style={{ width: `${Math.max(0, Math.min(100, updateState.progress?.percent || 0))}%` }}></div>
           </div>
        </div>
      );
    }
    return null;
  }

  return (
    <div className="fixed inset-0 z-100 flex items-center justify-center bg-black/50 backdrop-blur-sm shadow-black">
      <div className="bg-[#121212] border border-[#2a2a2a] w-full max-w-md rounded-xl p-6 shadow-2xl relative overflow-hidden animate-in fade-in zoom-in duration-200">
        
        {/* Header */}
        <div className="flex items-start justify-between mb-6">
          <div>
            <h2 className="text-xl font-semibold text-white">Update Available</h2>
            {updateState.updateInfo && (
              <p className="text-sm text-gray-400 mt-1">
                Version {updateState.updateInfo.version} ({updateState.updateInfo.channel})
              </p>
            )}
          </div>
          <button
            onClick={handleClose}
            className="text-gray-400 hover:text-white transition-colors p-1"
          >
            <span className="sr-only">Close</span>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="mb-6">
          {updateState.status === 'available' && (
            <div className="space-y-4">
              <p className="text-gray-300 text-sm leading-relaxed">
                A new version of Cognode is available. It is recommended to update to stay secure and enjoy new features.
              </p>
              {updateState.updateInfo?.changelogUrl && (
                <div className="pt-2">
                  <a href="#" onClick={handleOpenChangelog} className="text-blue-400 hover:text-blue-300 text-sm font-medium flex items-center gap-1 group">
                    <span>Read Release Notes</span>
                    <svg className="group-hover:translate-x-0.5 transition-transform" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <line x1="5" y1="12" x2="19" y2="12"></line>
                      <polyline points="12 5 19 12 12 19"></polyline>
                    </svg>
                  </a>
                </div>
              )}
            </div>
          )}

          {updateState.status === 'downloading' && updateState.progress && (
            <UpdateProgress
              progress={updateState.progress}
              onPause={handlePause}
              onResume={handleResume}
              onCancel={handleCancel}
              onBackground={handleClose}
              isPaused={false} // The engine sets to 'available' when paused
            />
          )}

          {updateState.status === 'downloaded' && (
            <div className="p-4 bg-green-500/10 border border-green-500/20 rounded-lg">
              <p className="text-green-400 text-sm flex items-center gap-2">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
                  <polyline points="22 4 12 14.01 9 11.01"></polyline>
                </svg>
                Download complete. Ready to install!
              </p>
              <p className="text-xs text-gray-400 mt-2">The application will restart during installation.</p>
            </div>
          )}

          {updateState.status === 'error' && (
            <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-lg">
              <p className="text-red-400 text-sm font-medium">Update Error</p>
              <p className="text-gray-300 text-xs mt-1">{updateState.error}</p>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-3 mt-4">
          {(updateState.status === 'available' || updateState.status === 'error') && (
            <>
              <button
                onClick={handleClose}
                className="px-4 py-2 text-sm text-gray-400 hover:text-white transition-colors"
              >
                Remind Me Later
              </button>
              <button
                onClick={handleDownload}
                className="px-4 py-2 text-sm bg-blue-600 hover:bg-blue-700 text-white rounded-md transition-colors"
              >
                {updateState.status === 'error' ? 'Try Again' : 'Download Update'}
              </button>
            </>
          )}

          {updateState.status === 'downloaded' && (
            <>
              <button
                onClick={handleClose}
                className="px-4 py-2 text-sm text-gray-400 hover:text-white transition-colors"
              >
                Install on Next Launch
              </button>
              <button
                onClick={handleInstall}
                className="px-4 py-2 text-sm bg-blue-600 hover:bg-blue-700 text-white rounded-md transition-colors font-medium flex items-center gap-2"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                  <polyline points="7 10 12 15 17 10"></polyline>
                  <line x1="12" y1="15" x2="12" y2="3"></line>
                </svg>
                Install & Relaunch
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
