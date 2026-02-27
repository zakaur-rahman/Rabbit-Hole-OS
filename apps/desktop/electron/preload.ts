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
    openLogin: (loginUrl: string) => {
      return ipcRenderer.invoke('auth:open-login', loginUrl);
    },
    onDeepLinkAuth: (callback: (data: { code: string }) => void) => {
      const subscription = (_event: any, data: any) => callback(data);
      ipcRenderer.on('auth:deep-link-received', subscription);
      return () => ipcRenderer.removeListener('auth:deep-link-received', subscription);
    },
    onDirectTokensReceived: (callback: (data: { access_token: string; refresh_token: string }) => void) => {
      const subscription = (_event: any, data: any) => callback(data);
      ipcRenderer.on('auth:tokens-received', subscription);
      return () => ipcRenderer.removeListener('auth:tokens-received', subscription);
    },
  },
  shell: {
    openExternal: (url: string) => ipcRenderer.invoke('shell:open-external', url)
  },
  storage: {
    // Nodes
    nodes: {
      list: (whiteboardId: string, userId?: string) => 
        ipcRenderer.invoke('storage:nodes:list', whiteboardId, userId),
      get: (id: string) => 
        ipcRenderer.invoke('storage:nodes:get', id),
      create: (node: any) => 
        ipcRenderer.invoke('storage:nodes:create', node),
      update: (id: string, updates: any) => 
        ipcRenderer.invoke('storage:nodes:update', id, updates),
      delete: (id: string) => 
        ipcRenderer.invoke('storage:nodes:delete', id),
    },
    // Edges
    edges: {
      list: (whiteboardId: string, userId?: string) => 
        ipcRenderer.invoke('storage:edges:list', whiteboardId, userId),
      create: (edge: any) => 
        ipcRenderer.invoke('storage:edges:create', edge),
      update: (id: string, updates: any) => 
        ipcRenderer.invoke('storage:edges:update', id, updates),
      delete: (id: string) => 
        ipcRenderer.invoke('storage:edges:delete', id),
    },
    // Whiteboards
    whiteboards: {
      list: (userId?: string) => 
        ipcRenderer.invoke('storage:whiteboards:list', userId),
      create: (whiteboard: any) => 
        ipcRenderer.invoke('storage:whiteboards:create', whiteboard),
      update: (id: string, updates: any) => 
        ipcRenderer.invoke('storage:whiteboards:update', id, updates),
      delete: (id: string) => 
        ipcRenderer.invoke('storage:whiteboards:delete', id),
      sync: (id: string) => 
        ipcRenderer.invoke('storage:whiteboards:sync', id),
    },
    // Tabs
    tabs: {
      save: (whiteboardId: string, tabs: any[]) => 
        ipcRenderer.invoke('storage:tabs:save', whiteboardId, tabs),
      load: (whiteboardId: string) => 
        ipcRenderer.invoke('storage:tabs:load', whiteboardId),
    },
    // UI State
    ui: {
      save: (state: any) => 
        ipcRenderer.invoke('storage:ui:save', state),
      load: (whiteboardId: string) => 
        ipcRenderer.invoke('storage:ui:load', whiteboardId),
    },
    // Sync
    sync: {
      getChanges: () => 
        ipcRenderer.invoke('storage:sync:getChanges'),
      markSynced: (entityType: string, entityId: string) => 
        ipcRenderer.invoke('storage:sync:markSynced', entityType, entityId),
      markFailed: (changeId: number, error: string) => 
        ipcRenderer.invoke('storage:sync:markFailed', changeId, error),
      setToken: (token: string | null) => 
        ipcRenderer.invoke('storage:sync:setToken', token),
    },
  },
});
