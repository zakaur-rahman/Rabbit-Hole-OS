// Helper to use IPC in the renderer
// We exposed 'electron.ipcRenderer' in preload.ts

export const ipc = {
  send: (channel: string, data?: unknown) => {
    if (typeof window !== 'undefined' && window.electron) {
      window.electron.ipcRenderer.send(channel, data);
    } else {
      console.warn('IPC send called outside Electron environment:', channel, data);
    }
  },
  on: (channel: string, func: (...args: unknown[]) => void) => {
    if (typeof window !== 'undefined' && window.electron) {
      return window.electron.ipcRenderer.on(channel, func);
    }
    return () => {};
  },
  invoke: (channel: string, data?: unknown) => {
    if (typeof window !== 'undefined' && window.electron) {
      return window.electron.ipcRenderer.invoke(channel, data);
    }
    return Promise.resolve(null);
  }
};

// Types are now handled in apps/frontend/types/electron.ts
