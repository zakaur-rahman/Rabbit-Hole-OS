import { LocalStorageService } from './local-storage';

// Use native fetch API (available in Electron)

interface SyncConfig {
  apiBaseUrl: string;
  syncIntervalMs: number; // 5 minutes = 300000ms
}

export class SyncService {
  private syncInterval: NodeJS.Timeout | null = null;
  private isSyncing = false;
  private authToken: string | null = null;
  
  constructor(
    private storage: LocalStorageService,
    private config: SyncConfig
  ) {}

  setAuthToken(token: string | null) {
    this.authToken = token;
    console.log(`[Sync] Auth token ${token ? 'set' : 'cleared'}`);
  }

  start() {
    if (this.syncInterval) {
      console.log('[Sync] Service already running');
      return;
    }

    console.log(`[Sync] Starting service (interval: ${this.config.syncIntervalMs}ms)`);
    
    // Sync every configured interval (default 5 minutes)
    this.syncInterval = setInterval(() => {
      this.syncNow().catch(err => {
        console.error('[Sync] Periodic sync error:', err);
      });
    }, this.config.syncIntervalMs);
    
    // Initial sync on start
    this.syncNow().catch(err => {
      console.error('[Sync] Initial sync error:', err);
    });
  }

  stop() {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
      this.syncInterval = null;
      console.log('[Sync] Service stopped');
    }
  }

  async syncNow(): Promise<{ synced: number; failed: number }> {
    if (this.isSyncing) {
      console.log('[Sync] Sync already in progress, skipping');
      return { synced: 0, failed: 0 };
    }
    
    try {
      this.isSyncing = true;
      
      // Check auth token
      if (!this.authToken) {
        console.log('[Sync] Skipping sync - no auth token');
        return { synced: 0, failed: 0 };
      }
      
      // 1. Pull changes from cloud
      await this.pullSync();

      // 2. Push local changes
      const changes = this.storage.getUnsyncedChanges(100);
      
      if (changes.length === 0) {
        console.log('[Sync] No local changes to push');
        return { synced: 0, failed: 0 };
      }
      
      console.log(`[Sync] Pushing ${changes.length} changes...`);
      
      let synced = 0;
      let failed = 0;
      
      for (const change of changes) {
        try {
          await this.syncChange(change);
          synced++;
        } catch (error) {
          failed++;
          console.error(`[Sync] Failed to push change ${change.id} (${change.entity_type}:${change.entity_id}):`, error);
          
          this.storage.markSyncFailed(
            change.id,
            error instanceof Error ? error.message : String(error)
          );
          
          // Stop processing further changes in this batch if one fails.
          // This preserves dependency order (e.g. don't try Edges if Node creation failed).
          break;
        }
      }
      
      console.log(`[Sync] Push complete early? ${failed > 0}: ${synced} pushed, ${failed} failed`);
      return { synced, failed };
      
    } catch (error) {
      console.error('[Sync] Sync error:', error);
      throw error;
    } finally {
      this.isSyncing = false;
    }
  }

  async pullSync(): Promise<void> {
    if (!this.authToken) return;
    
    console.log('[Sync] Pulling data from cloud...');
    try {
      // 1. Fetch Whiteboards
      const wbResponse = await fetch(`${this.config.apiBaseUrl}/api/v1/whiteboards/`, {
        headers: { 'Authorization': `Bearer ${this.authToken}` }
      });
      if (wbResponse.ok) {
        const whiteboards = await wbResponse.json();
        for (const wb of whiteboards) {
          // UPSERT whiteboard (manually check)
          const existing = this.storage.listWhiteboards().find(w => w.id === wb.id);
          if (!existing) {
            this.storage.createWhiteboard({ ...wb, user_id: 'cloud-sync' });
          }
        }

        // 2. Fetch Nodes & Edges for each whiteboard
        for (const wb of whiteboards) {
          const [nRes, eRes] = await Promise.all([
            fetch(`${this.config.apiBaseUrl}/api/v1/nodes/?whiteboard_id=${wb.id}`, {
              headers: { 'Authorization': `Bearer ${this.authToken}` }
            }),
            fetch(`${this.config.apiBaseUrl}/api/v1/edges/?whiteboard_id=${wb.id}`, {
              headers: { 'Authorization': `Bearer ${this.authToken}` }
            })
          ]);

          if (nRes.ok) {
            const nodes = await nRes.json();
            for (const node of nodes) {
              if (!this.storage.nodeExists(node.id)) {
                 this.storage.createNode({
                   id: node.id,
                   type: node.type,
                   title: node.title,
                   content: node.content,
                   url: node.url,
                   whiteboard_id: wb.id,
                   user_id: 'cloud-sync',
                   position_x: node.data?.position?.x || 0,
                   position_y: node.data?.position?.y || 0,
                   metadata: JSON.stringify(node.data)
                 });
                 this.storage.markSynced('node', node.id);
              }
            }
          }

          if (eRes.ok) {
            const edges = await eRes.json();
            for (const edge of edges) {
               if (!this.storage.edgeExists(edge.id)) {
                 this.storage.createEdge({
                   id: edge.id,
                   source_id: edge.source,
                   target_id: edge.target,
                   label: edge.label,
                   whiteboard_id: wb.id,
                   user_id: 'cloud-sync',
                   edge_type: edge.type || 'default',
                   source_handle: edge.sourceHandle,
                   target_handle: edge.targetHandle
                 });
                 this.storage.markSynced('edge', edge.id);
               }
            }
          }
        }
      }
    } catch (error) {
       console.error('[Sync] Pull error:', error);
    }
  }

  private async syncChange(change: any): Promise<void> {
    const { entity_type, entity_id, operation } = change;
    
    try {
      if (operation === 'create' || operation === 'update') {
        // Get the entity from local storage
        let entity: any;
        if (entity_type === 'node') {
          entity = this.storage.getNode(entity_id);
        } else if (entity_type === 'edge') {
          entity = this.storage.getEdge(entity_id);
        } else if (entity_type === 'whiteboard') {
          entity = this.storage.getWhiteboard(entity_id);
        }
        
        if (!entity) {
          console.warn(`[Sync] Entity ${entity_type}:${entity_id} not found locally`);
          return;
        }
        
        // Transform to API format
        const apiData = this.transformToApiFormat(entity_type, entity);
        
        // Send to API
        const url = new URL(`${this.config.apiBaseUrl}/api/v1/${entity_type}s/${operation === 'update' ? entity_id : ''}`);
        
        // Always include whiteboard_id in query if it's an edge (Backend requires it)
        if (entity_type === 'edge') {
            if (operation === 'update') {
                console.log('[Sync] Skipping edge update (immutable)');
                this.storage.markSynced('edge', entity_id); // Auto-resolve
                return;
            }
            if (entity.whiteboard_id) {
                url.searchParams.append('whiteboard_id', entity.whiteboard_id);
            }
        }
        
        const method = operation === 'create' ? 'POST' : 'PUT';
        
        const response = await fetch(url.toString(), {
          method,
          headers: {
            'Authorization': `Bearer ${this.authToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(apiData),
        });
        
        if (!response.ok) {
          const errorBody = await response.text();
          
          // Dependency Recovery: If an edge fails because a node is missing on server
          if (response.status === 400 && entity_type === 'edge') {
            try {
              const errorObj = JSON.parse(errorBody);
              const detail = errorObj.detail || '';
              if (typeof detail === 'string' && detail.includes('node') && detail.includes('not found')) {
                // Extract node ID: "Source node node-xxx not found"
                const match = detail.match(/node\s+([^\s]+)\s+not found/i);
                if (match && match[1]) {
                  console.log(`[Sync] Attempting recovery for missing node: ${match[1]}`);
                  this.storage.forceSyncNode(match[1]);
                  
                  // Re-queue this edge to try again later (after the node is synced)
                  // We do this by logging a new update for it, which gives it a higher change ID
                  this.storage.logChange(entity_type, entity_id, 'update');
                  
                  // Mark the CURRENT failure as "done" (synced) or just return to avoid throwing
                  // We'll effectively skip this specific change ID since we made a new one
                  return; 
                }
              }
            } catch (e) {
              console.error('[Sync] Failed to parse 400 error detail', e);
            }
          }

          throw new Error(`HTTP ${response.status}: ${errorBody}`);
        }
        
        // Mark as synced
        this.storage.markSynced(entity_type, entity_id);
        
      } else if (operation === 'delete') {
        // We need the whiteboard_id to delete nodes/edges in the API
        let wbId: string | null = null;
        if (entity_type === 'node') {
            const node = this.storage.getNode(entity_id, true);
            wbId = node?.whiteboard_id || null;
        } else if (entity_type === 'edge') {
            const edge = this.storage.getEdge(entity_id, true);
            wbId = edge?.whiteboard_id || null;
        }

        const url = new URL(`${this.config.apiBaseUrl}/api/v1/${entity_type}s/${entity_id}`);
        if (wbId) {
            url.searchParams.append('whiteboard_id', wbId);
        }
        
        const response = await fetch(url.toString(), {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${this.authToken}`,
          },
        });
        
        if (response.ok || response.status === 404) {
          // Mark as synced (404 means already deleted on server)
          this.storage.markSynced(entity_type, entity_id);
        } else {
          throw new Error(`HTTP ${response.status}: ${await response.text()}`);
        }
      }
    } catch (error) {
      console.error(`[Sync] Failed to sync ${entity_type}:${entity_id}`, error);
      throw error;
    }
  }

  private transformToApiFormat(entityType: string, entity: any): any {
    if (entityType === 'node') {
      return {
        id: entity.id,
        type: entity.type,
        url: entity.url,
        title: entity.title,
        content: entity.content,
        data: {
          whiteboard_id: entity.whiteboard_id,
          position: {
            x: entity.position_x,
            y: entity.position_y,
          },
          ...(typeof entity.metadata === 'string' ? JSON.parse(entity.metadata) : entity.metadata),
        },
      };
    } else if (entityType === 'edge') {
      return {
        id: entity.id,
        source: entity.source_id,
        target: entity.target_id,
        label: entity.label,
        type: entity.edge_type || 'default',
        sourceHandle: entity.source_handle,
        targetHandle: entity.target_handle,
      };
    } else if (entityType === 'whiteboard') {
      return {
        id: entity.id,
        name: entity.name,
      };
    }
    
    return entity;
  }
}
