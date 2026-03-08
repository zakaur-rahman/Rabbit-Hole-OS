// Local storage wrapper for renderer process
// This wraps the Electron IPC storage API for cleaner usage in frontend code

import type { RawNode, RawEdge, RawWhiteboard, RawTab, RawUIState } from '@/types/electron';

export const localStorage = {
  nodes: {
    list: (whiteboardId: string, userId?: string) => 
      window.electron.storage.nodes.list(whiteboardId, userId),
    get: (id: string) => 
      window.electron.storage.nodes.get(id),
    create: (node: Partial<RawNode>) => 
      window.electron.storage.nodes.create(node),
    update: (id: string, updates: Partial<RawNode>) => 
      window.electron.storage.nodes.update(id, updates),
    delete: (id: string) => 
      window.electron.storage.nodes.delete(id),
  },
  edges: {
    list: (whiteboardId: string, userId?: string) => 
      window.electron.storage.edges.list(whiteboardId, userId),
    create: (edge: Partial<RawEdge>) => 
      window.electron.storage.edges.create(edge),
    update: (id: string, updates: Partial<RawEdge>) => 
      window.electron.storage.edges.update(id, updates),
    delete: (id: string) => 
      window.electron.storage.edges.delete(id),
  },
  whiteboards: {
    list: (userId?: string) => 
      window.electron.storage.whiteboards.list(userId),
    create: (whiteboard: Partial<RawWhiteboard>) => 
      window.electron.storage.whiteboards.create(whiteboard),
    update: (id: string, updates: Partial<RawWhiteboard>) => 
      window.electron.storage.whiteboards.update(id, updates),
    delete: (id: string) => 
      window.electron.storage.whiteboards.delete(id),
  },
  tabs: {
    save: (whiteboardId: string, tabs: RawTab[]) => 
      window.electron.storage.tabs.save(whiteboardId, tabs),
    load: (whiteboardId: string) => 
      window.electron.storage.tabs.load(whiteboardId),
  },
  ui: {
    save: (state: RawUIState) => 
      window.electron.storage.ui.save(state),
    load: (whiteboardId: string) => 
      window.electron.storage.ui.load(whiteboardId),
  },
  sync: {
    getChanges: () => 
      window.electron.storage.sync.getChanges(),
    markSynced: (entityType: string, entityId: string) => 
      window.electron.storage.sync.markSynced(entityType, entityId),
    markFailed: (changeId: number, error: string) => 
      window.electron.storage.sync.markFailed(changeId, error),
  },
};

// Helper to check if running in Electron
export function isElectron(): boolean {
  return typeof window !== 'undefined' && !!window.electron;
}

// Helper to get appropriate storage (local for Electron, API for web)
export function getStorage() {
  if (isElectron()) {
    return localStorage;
  }
  // Fallback to API for web version (future)
  throw new Error('Web version not yet implemented');
}
