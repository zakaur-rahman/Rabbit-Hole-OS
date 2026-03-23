import Database from 'better-sqlite3';

export interface NodeRow {
  id: string;
  type: string;
  url?: string;
  title: string;
  content?: string;
  whiteboard_id: string;
  user_id: string;
  position_x: number;
  position_y: number;
  width?: number;
  height?: number;
  metadata?: string; // JSON string
  created_at: number;
  updated_at: number;
  local_version: number;
  synced_at?: number;
  is_deleted: number;
}

export interface EdgeRow {
  id: string;
  source_id: string;
  target_id: string;
  label?: string;
  whiteboard_id: string;
  user_id: string;
  edge_type: string;
  animated: number;
  style?: string; // JSON string
  source_handle?: string;
  target_handle?: string;
  created_at: number;
  updated_at: number;
  local_version: number;
  synced_at?: number;
  is_deleted: number;
}

export interface WhiteboardRow {
  id: string;
  name: string;
  user_id: string;
  created_at: number;
  updated_at: number;
  local_version: number;
  synced_at?: number;
  is_deleted: number;
}

export interface ChangeLogRow {
  id: number;
  entity_type: 'node' | 'edge' | 'whiteboard';
  entity_id: string;
  operation: 'create' | 'update' | 'delete';
  timestamp: number;
  synced: number;
  sync_attempts: number;
  last_sync_error?: string;
}

export interface TabRow {
  id: string;
  whiteboard_id: string;
  url: string;
  title?: string;
  display_input?: string;
  is_loading: number;
  last_node_id?: string;
  created_at: number;
  updated_at: number;
}

export interface UIStateRow {
  whiteboard_id: string;
  active_tab_id?: string;
  viewport_x: number;
  viewport_y: number;
  viewport_zoom: number;
  selected_node_ids?: string; // JSON array
  updated_at: number;
}

export class LocalStorageService {
  private db: Database.Database;
  
  constructor(db: Database.Database) {
    this.db = db;
  }

  // ==================== NODES ====================
  
  listNodes(whiteboardId: string, userId?: string): NodeRow[] {
    let stmt;
    if (userId) {
      stmt = this.db.prepare(`
        SELECT * FROM nodes 
        WHERE whiteboard_id = ? AND user_id = ? AND is_deleted = 0
        ORDER BY created_at DESC
      `);
      return stmt.all(whiteboardId, userId) as NodeRow[];
    } else {
      stmt = this.db.prepare(`
        SELECT * FROM nodes 
        WHERE whiteboard_id = ? AND is_deleted = 0
        ORDER BY created_at DESC
      `);
      return stmt.all(whiteboardId) as NodeRow[];
    }
  }

  getNode(id: string, includeDeleted = false): NodeRow | undefined {
    const query = includeDeleted 
      ? 'SELECT * FROM nodes WHERE id = ?' 
      : 'SELECT * FROM nodes WHERE id = ? AND is_deleted = 0';
    const stmt = this.db.prepare(query);
    return stmt.get(id) as NodeRow | undefined;
  }

  nodeExists(id: string): boolean {
    const stmt = this.db.prepare('SELECT 1 FROM nodes WHERE id = ?');
    return !!stmt.get(id);
  }

  private ensureWhiteboardExists(whiteboardId: string, userId: string): void {
    const whiteboard = this.db.prepare('SELECT id FROM whiteboards WHERE id = ?').get(whiteboardId);
    if (!whiteboard) {
      const now = Date.now();
      console.log(`[Storage] Auto-creating whiteboard "${whiteboardId}" for user "${userId}"`);
      this.db.prepare(`
        INSERT INTO whiteboards (id, name, user_id, created_at, updated_at, local_version)
        VALUES (?, ?, ?, ?, ?, 1)
      `).run(whiteboardId, `Board ${whiteboardId}`, userId, now, now);
      this.logChange('whiteboard', whiteboardId, 'create');
    }
  }

  createNode(node: Partial<NodeRow>): NodeRow {
    const now = Date.now();
    console.log(`[Storage] Creating node ${node.id} in whiteboard ${node.whiteboard_id}`);
    
    // Ensure parent whiteboard exists to prevent FK failure
    this.ensureWhiteboardExists(node.whiteboard_id!, node.user_id || 'local');
    
    try {
      const stmt = this.db.prepare(`
        INSERT OR REPLACE INTO nodes (
          id, type, url, title, content, whiteboard_id, user_id,
          position_x, position_y, width, height, metadata, 
          created_at, updated_at, local_version
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)
      `);
      
      stmt.run(
        node.id!,
        node.type!,
        node.url || null,
        node.title || '',
        node.content || null,
        node.whiteboard_id!,
        node.user_id!,
        node.position_x || 0,
        node.position_y || 0,
        node.width || null,
        node.height || null,
        node.metadata || null,
        now,
        now
      );
      
      this.logChange('node', node.id!, 'create');
      return this.getNode(node.id!)!;
    } catch (error: any) {
      if (error.code === 'SQLITE_CONSTRAINT_FOREIGNKEY') {
        // Check if whiteboard exists
        const wb = this.db.prepare('SELECT id FROM whiteboards WHERE id = ?').get(node.whiteboard_id);
        if (!wb) {
          console.error(`[Storage] FOREIGN KEY ERROR: Whiteboard "${node.whiteboard_id}" does not exist in local database.`);
        }
      }
      throw error;
    }
  }

  updateNode(id: string, updates: Partial<NodeRow>): NodeRow | undefined {
    const current = this.getNode(id);
    if (!current) {
        console.warn(`[Storage] Node ${id} not found for update. This may be a race condition during creation.`);
        return undefined;
    }
    
    const now = Date.now();
    const newVersion = current.local_version + 1;
    
    const stmt = this.db.prepare(`
      UPDATE nodes 
      SET title = ?, content = ?, position_x = ?, position_y = ?,
          width = ?, height = ?, metadata = ?, 
          updated_at = ?, local_version = ?
      WHERE id = ?
    `);
    
    stmt.run(
      updates.title ?? current.title,
      updates.content ?? current.content,
      updates.position_x ?? current.position_x,
      updates.position_y ?? current.position_y,
      updates.width ?? current.width,
      updates.height ?? current.height,
      updates.metadata ?? current.metadata,
      now,
      newVersion,
      id
    );
    
    this.logChange('node', id, 'update');
    return this.getNode(id)!;
  }

  deleteNode(id: string): void {
    const stmt = this.db.prepare(`
      UPDATE nodes 
      SET is_deleted = 1, updated_at = ?, local_version = local_version + 1
      WHERE id = ?
    `);
    stmt.run(Date.now(), id);
    this.logChange('node', id, 'delete');
  }

  // ==================== EDGES ====================
  
  listEdges(whiteboardId: string, userId?: string): EdgeRow[] {
    let stmt;
    if (userId) {
      stmt = this.db.prepare(`
        SELECT * FROM edges 
        WHERE whiteboard_id = ? AND user_id = ? AND is_deleted = 0
      `);
      return stmt.all(whiteboardId, userId) as EdgeRow[];
    } else {
      stmt = this.db.prepare(`
        SELECT * FROM edges 
        WHERE whiteboard_id = ? AND is_deleted = 0
      `);
      return stmt.all(whiteboardId) as EdgeRow[];
    }
  }

  createEdge(edge: Partial<EdgeRow>): EdgeRow {
    const now = Date.now();
    console.log(`[Storage] Creating edge ${edge.id} in whiteboard ${edge.whiteboard_id}`);

    // Ensure parent whiteboard exists
    this.ensureWhiteboardExists(edge.whiteboard_id!, edge.user_id || 'local');

    try {
      const stmt = this.db.prepare(`
        INSERT OR REPLACE INTO edges (
          id, source_id, target_id, label, whiteboard_id, user_id,
          edge_type, animated, style, source_handle, target_handle,
          created_at, updated_at, local_version
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)
      `);
      
      stmt.run(
        edge.id!,
        edge.source_id!,
        edge.target_id!,
        edge.label || null,
        edge.whiteboard_id!,
        edge.user_id!,
        edge.edge_type || 'default',
        edge.animated || 0,
        edge.style || null,
        edge.source_handle || null,
        edge.target_handle || null,
        now,
        now
      );
      
      this.logChange('edge', edge.id!, 'create');
      return { ...edge, created_at: now, updated_at: now, local_version: 1 } as EdgeRow;
    } catch (error: any) {
      if (error.code === 'SQLITE_CONSTRAINT_FOREIGNKEY') {
        const wb = this.db.prepare('SELECT id FROM whiteboards WHERE id = ?').get(edge.whiteboard_id);
        const source = this.db.prepare('SELECT id FROM nodes WHERE id = ?').get(edge.source_id);
        const target = this.db.prepare('SELECT id FROM nodes WHERE id = ?').get(edge.target_id);
        
        if (!wb) console.error(`[Storage] FOREIGN KEY ERROR: Whiteboard "${edge.whiteboard_id}" missing`);
        if (!source) console.error(`[Storage] FOREIGN KEY ERROR: Source node "${edge.source_id}" missing`);
        if (!target) console.error(`[Storage] FOREIGN KEY ERROR: Target node "${edge.target_id}" missing`);
      }
      throw error;
    }
  }

  updateEdge(id: string, updates: Partial<EdgeRow>): EdgeRow {
    const stmt = this.db.prepare(`
      UPDATE edges 
      SET label = ?, updated_at = ?, local_version = local_version + 1
      WHERE id = ?
    `);
    stmt.run(updates.label, Date.now(), id);
    this.logChange('edge', id, 'update');
    
    const result = this.db.prepare('SELECT * FROM edges WHERE id = ?').get(id);
    return result as EdgeRow;
  }

  deleteEdge(id: string): void {
    const stmt = this.db.prepare(`
      UPDATE edges 
      SET is_deleted = 1, updated_at = ?, local_version = local_version + 1
      WHERE id = ?
    `);
    stmt.run(Date.now(), id);
    this.logChange('edge', id, 'delete');
  }

  getEdge(id: string, includeDeleted = false): EdgeRow | undefined {
    const query = includeDeleted 
      ? 'SELECT * FROM edges WHERE id = ?' 
      : 'SELECT * FROM edges WHERE id = ? AND is_deleted = 0';
    const stmt = this.db.prepare(query);
    return stmt.get(id) as EdgeRow | undefined;
  }

  edgeExists(id: string): boolean {
    const stmt = this.db.prepare('SELECT 1 FROM edges WHERE id = ?');
    return !!stmt.get(id);
  }

  // ==================== WHITEBOARDS ====================
  
  listWhiteboards(userId?: string): WhiteboardRow[] {
    let stmt;
    if (userId) {
      stmt = this.db.prepare(`
        SELECT * FROM whiteboards 
        WHERE user_id = ? AND is_deleted = 0
        ORDER BY updated_at DESC
      `);
      return stmt.all(userId) as WhiteboardRow[];
    } else {
      stmt = this.db.prepare(`
        SELECT * FROM whiteboards 
        WHERE is_deleted = 0
        ORDER BY updated_at DESC
      `);
      return stmt.all() as WhiteboardRow[];
    }
  }

  createWhiteboard(whiteboard: Partial<WhiteboardRow>): WhiteboardRow {
    const now = Date.now();
    const stmt = this.db.prepare(`
      INSERT INTO whiteboards (id, name, user_id, created_at, updated_at, local_version)
      VALUES (?, ?, ?, ?, ?, 1)
    `);
    
    stmt.run(whiteboard.id!, whiteboard.name!, whiteboard.user_id!, now, now);
    this.logChange('whiteboard', whiteboard.id!, 'create');
    
    return { ...whiteboard, created_at: now, updated_at: now, local_version: 1 } as WhiteboardRow;
  }

  updateWhiteboard(id: string, updates: Partial<WhiteboardRow>): WhiteboardRow {
    const current = this.getWhiteboard(id);
    if (!current) throw new Error(`Whiteboard ${id} not found`);

    const now = Date.now();
    const newVersion = current.local_version + 1;

    const stmt = this.db.prepare(`
      UPDATE whiteboards 
      SET name = ?, updated_at = ?, local_version = ?
      WHERE id = ?
    `);

    stmt.run(
      updates.name ?? current.name,
      now,
      newVersion,
      id
    );

    this.logChange('whiteboard', id, 'update');
    return this.getWhiteboard(id)!;
  }

  deleteWhiteboard(id: string): void {
    if (id === 'main') return; // Protect main whiteboard
    
    const stmt = this.db.prepare(`
      UPDATE whiteboards 
      SET is_deleted = 1, updated_at = ?, local_version = local_version + 1
      WHERE id = ?
    `);
    
    stmt.run(Date.now(), id);
    this.logChange('whiteboard', id, 'delete');
  }

  getWhiteboard(id: string, includeDeleted = false): WhiteboardRow | undefined {
    const query = includeDeleted 
      ? 'SELECT * FROM whiteboards WHERE id = ?' 
      : 'SELECT * FROM whiteboards WHERE id = ? AND is_deleted = 0';
    const stmt = this.db.prepare(query);
    return stmt.get(id) as WhiteboardRow | undefined;
  }

  whiteboardExists(id: string): boolean {
    const stmt = this.db.prepare('SELECT 1 FROM whiteboards WHERE id = ?');
    return !!stmt.get(id);
  }

  // ==================== CHANGE LOG ====================
  
  logChange(entityType: string, entityId: string, operation: string): void {
    const stmt = this.db.prepare(`
      INSERT INTO change_log (entity_type, entity_id, operation, timestamp)
      VALUES (?, ?, ?, ?)
    `);
    stmt.run(entityType, entityId, operation, Date.now());
  }

  getUnsyncedChanges(limit = 100): ChangeLogRow[] {
    const stmt = this.db.prepare(`
      SELECT * FROM change_log 
      WHERE synced = 0 
      ORDER BY timestamp ASC
      LIMIT ?
    `);
    return stmt.all(limit) as ChangeLogRow[];
  }

  markSynced(entityType: string, entityId: string): void {
    const now = Date.now();
    
    // Mark change log as synced
    const stmt = this.db.prepare(`
      UPDATE change_log 
      SET synced = 1 
      WHERE entity_type = ? AND entity_id = ? AND synced = 0
    `);
    stmt.run(entityType, entityId);
    
    // Update entity synced_at timestamp
    const table = `${entityType}s`;
    const updateStmt = this.db.prepare(`
      UPDATE ${table} 
      SET synced_at = ? 
      WHERE id = ?
    `);
    updateStmt.run(now, entityId);
  }

  forceSyncNode(id: string): void {
    const node = this.getNode(id);
    if (!node) return;

    // Reset synced_at
    this.db.prepare('UPDATE nodes SET synced_at = NULL WHERE id = ?').run(id);
    
    this.logChange('node', id, 'create');
  }

  forceSyncWhiteboard(id: string): void {
    const nodes = this.listNodes(id);
    const edges = this.listEdges(id);

    const syncTx = this.db.transaction(() => {
        // Sync Whiteboard
        this.logChange('whiteboard', id, 'update');
        
        // Sync Nodes
        for (const node of nodes) {
            this.logChange('node', node.id, 'update');
        }

        // Sync Edges
        for (const edge of edges) {
            this.logChange('edge', edge.id, 'update');
        }
    });

    syncTx();
  }

  markSyncFailed(changeId: number, error: string): void {
    const stmt = this.db.prepare(`
      UPDATE change_log 
      SET sync_attempts = sync_attempts + 1, last_sync_error = ?
      WHERE id = ?
    `);
    stmt.run(error, changeId);
  }

  // ==================== TABS STATE ====================
  
  saveTabs(whiteboardId: string, tabs: Partial<TabRow>[]): void {
    // Delete existing tabs for this whiteboard
    this.db.prepare('DELETE FROM tabs WHERE whiteboard_id = ?').run(whiteboardId);
    
    // Insert new tabs
    const stmt = this.db.prepare(`
      INSERT OR REPLACE INTO tabs (id, whiteboard_id, url, title, display_input, is_loading, last_node_id, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    
    const now = Date.now();
    for (const tab of tabs) {
      // Map frontend camelCase to backend snake_case
      const t = tab as any;
      stmt.run(
        t.id,
        whiteboardId,
        t.url,
        t.title || null,
        t.displayInput || t.display_input || null,
        t.isLoading ? 1 : (t.is_loading || 0),
        t.lastNodeId || t.last_node_id || null,
        now,
        now
      );
    }
  }

  loadTabs(whiteboardId: string): any[] {
    const stmt = this.db.prepare('SELECT * FROM tabs WHERE whiteboard_id = ? ORDER BY created_at');
    const rows = stmt.all(whiteboardId) as any[];
    
    return rows.map(r => ({
        id: r.id,
        url: r.url,
        title: r.title,
        displayInput: r.display_input,
        isLoading: !!r.is_loading,
        lastNodeId: r.last_node_id,
        whiteboardId: r.whiteboard_id
    }));
  }

  // ==================== UI STATE ====================
  
  saveUIState(state: UIStateRow): void {
    const stmt = this.db.prepare(`
      INSERT OR REPLACE INTO ui_state (
        whiteboard_id, active_tab_id, viewport_x, viewport_y, viewport_zoom,
        selected_node_ids, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?)
    `);
    
    stmt.run(
      state.whiteboard_id,
      state.active_tab_id || null,
      state.viewport_x,
      state.viewport_y,
      state.viewport_zoom,
      state.selected_node_ids || null,
      Date.now()
    );
  }

  loadUIState(whiteboardId: string): UIStateRow | undefined {
    const stmt = this.db.prepare('SELECT * FROM ui_state WHERE whiteboard_id = ?');
    return stmt.get(whiteboardId) as UIStateRow | undefined;
  }
}
