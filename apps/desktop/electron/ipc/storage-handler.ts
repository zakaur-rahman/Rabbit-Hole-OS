import { ipcMain } from 'electron';
import { LocalStorageService } from '../services/local-storage';

export function registerStorageHandlers(storageService: LocalStorageService) {
  // ==================== NODES ====================
  
  ipcMain.handle('storage:nodes:list', async (_, whiteboardId: string, userId?: string) => {
    try {
      return storageService.listNodes(whiteboardId, userId);
    } catch (error: any) {
      console.error('[IPC] storage:nodes:list error:', error);
      throw error;
    }
  });
  
  ipcMain.handle('storage:nodes:get', async (_, id: string) => {
    try {
      return storageService.getNode(id);
    } catch (error: any) {
      console.error('[IPC] storage:nodes:get error:', error);
      throw error;
    }
  });
  
  ipcMain.handle('storage:nodes:create', async (_, node: any) => {
    try {
      return storageService.createNode(node);
    } catch (error: any) {
      console.error('[IPC] storage:nodes:create error:', error);
      throw error;
    }
  });
  
  ipcMain.handle('storage:nodes:update', async (_, id: string, updates: any) => {
    try {
      return storageService.updateNode(id, updates);
    } catch (error: any) {
      console.error('[IPC] storage:nodes:update error:', error);
      throw error;
    }
  });
  
  ipcMain.handle('storage:nodes:delete', async (_, id: string) => {
    try {
      return storageService.deleteNode(id);
    } catch (error: any) {
      console.error('[IPC] storage:nodes:delete error:', error);
      throw error;
    }
  });

  // ==================== EDGES ====================
  
  ipcMain.handle('storage:edges:list', async (_, whiteboardId: string, userId?: string) => {
    try {
      return storageService.listEdges(whiteboardId, userId);
    } catch (error: any) {
      console.error('[IPC] storage:edges:list error:', error);
      throw error;
    }
  });
  
  ipcMain.handle('storage:edges:create', async (_, edge: any) => {
    try {
      return storageService.createEdge(edge);
    } catch (error: any) {
      console.error('[IPC] storage:edges:create error:', error);
      throw error;
    }
  });
  
  ipcMain.handle('storage:edges:update', async (_, id: string, updates: any) => {
    try {
      return storageService.updateEdge(id, updates);
    } catch (error: any) {
      console.error('[IPC] storage:edges:update error:', error);
      throw error;
    }
  });
  
  ipcMain.handle('storage:edges:delete', async (_, id: string) => {
    try {
      return storageService.deleteEdge(id);
    } catch (error: any) {
      console.error('[IPC] storage:edges:delete error:', error);
      throw error;
    }
  });

  // ==================== WHITEBOARDS ====================
  
  ipcMain.handle('storage:whiteboards:list', async (_, userId?: string) => {
    try {
      return storageService.listWhiteboards(userId);
    } catch (error: any) {
      console.error('[IPC] storage:whiteboards:list error:', error);
      throw error;
    }
  });
  
  ipcMain.handle('storage:whiteboards:create', async (_, whiteboard: any) => {
    try {
      return storageService.createWhiteboard(whiteboard);
    } catch (error: any) {
      console.error('[IPC] storage:whiteboards:create error:', error);
      throw error;
    }
  });

  ipcMain.handle('storage:whiteboards:update', async (_, id: string, updates: any) => {
    try {
      return storageService.updateWhiteboard(id, updates);
    } catch (error: any) {
      console.error('[IPC] storage:whiteboards:update error:', error);
      throw error;
    }
  });

  // ==================== TABS ====================
  
  ipcMain.handle('storage:tabs:save', async (_, whiteboardId: string, tabs: any[]) => {
    try {
      return storageService.saveTabs(whiteboardId, tabs);
    } catch (error: any) {
      console.error('[IPC] storage:tabs:save error:', error);
      throw error;
    }
  });
  
  ipcMain.handle('storage:tabs:load', async (_, whiteboardId: string) => {
    try {
      return storageService.loadTabs(whiteboardId);
    } catch (error: any) {
      console.error('[IPC] storage:tabs:load error:', error);
      throw error;
    }
  });

  // ==================== UI STATE ====================
  
  ipcMain.handle('storage:ui:save', async (_, state: any) => {
    try {
      return storageService.saveUIState(state);
    } catch (error: any) {
      console.error('[IPC] storage:ui:save error:', error);
      throw error;
    }
  });
  
  ipcMain.handle('storage:ui:load', async (_, whiteboardId: string) => {
    try {
      return storageService.loadUIState(whiteboardId);
    } catch (error: any) {
      console.error('[IPC] storage:ui:load error:', error);
      throw error;
    }
  });

  // ==================== SYNC ====================
  
  ipcMain.handle('storage:sync:getChanges', async () => {
    try {
      return storageService.getUnsyncedChanges();
    } catch (error: any) {
      console.error('[IPC] storage:sync:getChanges error:', error);
      throw error;
    }
  });
  
  ipcMain.handle('storage:sync:markSynced', async (_, entityType: string, entityId: string) => {
    try {
      return storageService.markSynced(entityType, entityId);
    } catch (error: any) {
      console.error('[IPC] storage:sync:markSynced error:', error);
      throw error;
    }
  });
  
  ipcMain.handle('storage:sync:markFailed', async (_, changeId: number, error: string) => {
    try {
      return storageService.markSyncFailed(changeId, error);
    } catch (error: any) {
      console.error('[IPC] storage:sync:markFailed error:', error);
      throw error;
    }
  });

  ipcMain.handle('storage:sync:setToken', async (_, token: string | null) => {
    try {
      // This will be handled in main.ts logic where syncService is available
      // Or we can emit an event
      ipcMain.emit('sync:set-token', token);
      return { success: true };
    } catch (error: any) {
      console.error('[IPC] storage:sync:setToken error:', error);
      throw error;
    }
  });

  console.log('[IPC] Storage handlers registered');
}
