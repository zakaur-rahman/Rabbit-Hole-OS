import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('electron', {
  ipcRenderer: {
    send: (channel: string, data: any) => ipcRenderer.send(channel, data),
    on: (channel: string, func: (...args: any[]) => void) => {
      const subscription = (_event: any, ...args: any[]) => func(...args);
      ipcRenderer.on(channel, subscription);
      return () => ipcRenderer.removeListener(channel, subscription);
    },
    invoke: (channel: string, data: any) => ipcRenderer.invoke(channel, data),
  },
  platform: process.platform,
  auth: {
    startLogin: (authUrl: string, port?: number) => {
      return ipcRenderer.invoke('auth:start-login', authUrl, port);
    },
    handleCallback: (data: { code: string; state: string; codeVerifier: string }) => {
      return ipcRenderer.invoke('auth:handle-callback', data);
    },
    onCallback: (callback: (data: { code?: string; state?: string; error?: string }) => void) => {
      const subscription = (_event: any, data: any) => callback(data);
      ipcRenderer.on('auth:callback', subscription);
      return () => ipcRenderer.removeListener('auth:callback', subscription);
    },
  },
});
