// Helper to use IPC in the renderer
// We exposed 'electron.ipcRenderer' in preload.ts

export const ipc = {
  send: (channel: string, data?: any) => {
    if (typeof window !== 'undefined' && window.electron) {
      window.electron.ipcRenderer.send(channel, data);
    } else {
      console.warn('IPC send called outside Electron environment:', channel, data);
    }
  },
  on: (channel: string, func: (...args: any[]) => void) => {
    if (typeof window !== 'undefined' && window.electron) {
      return window.electron.ipcRenderer.on(channel, func);
    }
    return () => {};
  },
  invoke: (channel: string, data?: any) => {
    if (typeof window !== 'undefined' && window.electron) {
      return window.electron.ipcRenderer.invoke(channel, data);
    }
    return Promise.resolve(null);
  }
};

// Add typescript definition for window.electron
declare global {
  interface Window {
    electron: {
      ipcRenderer: {
        send: (channel: string, data: any) => void;
        on: (channel: string, func: (...args: any[]) => void) => () => void;
        invoke: (channel: string, data: any) => Promise<any>;
      };
      platform: string;
    };
  }
}
