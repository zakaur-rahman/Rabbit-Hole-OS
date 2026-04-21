'use client';

import React, { useEffect, useState } from 'react';

export const ServiceWorkerNotifier: React.FC = () => {
  const [updateWaiting, setUpdateWaiting] = useState(false);
  const [registration, setRegistration] = useState<ServiceWorkerRegistration | null>(null);

  useEffect(() => {
    // Only run in browser, and if SW is supported. Skip in Electron since it has its own updater.
    if (typeof window !== 'undefined' && 'serviceWorker' in navigator && !window.electron) {
      navigator.serviceWorker.register('/sw.js').then((reg) => {
        reg.addEventListener('updatefound', () => {
          if (reg.installing) {
            reg.installing.addEventListener('statechange', () => {
              if (reg.waiting) {
                if (navigator.serviceWorker.controller) {
                  setUpdateWaiting(true);
                  setRegistration(reg);
                }
              }
            });
          }
        });

        // if there's already a waiting SW
        if (reg.waiting) {
          setUpdateWaiting(true);
          setRegistration(reg);
        }
      });

      let refreshing = false;
      navigator.serviceWorker.addEventListener('controllerchange', () => {
        if (!refreshing) {
          refreshing = true;
          window.location.reload();
        }
      });
    }
  }, []);

  const handleUpdate = () => {
    if (registration && registration.waiting) {
      registration.waiting.postMessage('SKIP_WAITING');
    }
    setUpdateWaiting(false);
  };

  if (!updateWaiting) return null;

  return (
    <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-[100] bg-blue-600 text-white px-4 py-2 rounded-full shadow-lg flex items-center justify-between gap-4 animate-in slide-in-from-bottom-5">
      <span className="text-sm font-medium">A new version of the app is available!</span>
      <button 
        onClick={handleUpdate}
        className="px-3 py-1 bg-white text-blue-600 font-semibold text-xs rounded-full hover:bg-gray-100 transition-colors shadow-sm"
      >
        Reload to Update
      </button>
    </div>
  );
};
