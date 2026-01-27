export const SCHEMA_VERSION = 2;

export const SCHEMA = `
  -- Metadata table for versioning and app state
  CREATE TABLE IF NOT EXISTS _meta (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL
  );

  -- Whiteboards (Canvases)
  CREATE TABLE IF NOT EXISTS whiteboards (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    user_id TEXT NOT NULL,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL,
    local_version INTEGER NOT NULL DEFAULT 1,
    synced_at INTEGER,
    is_deleted INTEGER DEFAULT 0 CHECK(is_deleted IN (0,1))
  );

  -- Nodes
  CREATE TABLE IF NOT EXISTS nodes (
    id TEXT PRIMARY KEY,
    type TEXT NOT NULL,
    url TEXT,
    title TEXT NOT NULL,
    content TEXT,
    whiteboard_id TEXT NOT NULL,
    user_id TEXT NOT NULL,
    position_x REAL DEFAULT 0,
    position_y REAL DEFAULT 0,
    width REAL,
    height REAL,
    metadata TEXT, -- JSON
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL,
    local_version INTEGER NOT NULL DEFAULT 1,
    synced_at INTEGER,
    is_deleted INTEGER DEFAULT 0 CHECK(is_deleted IN (0,1)),
    FOREIGN KEY (whiteboard_id) REFERENCES whiteboards(id) ON DELETE CASCADE
  );

  -- Edges (Connections)
  CREATE TABLE IF NOT EXISTS edges (
    id TEXT PRIMARY KEY,
    source_id TEXT NOT NULL,
    target_id TEXT NOT NULL,
    label TEXT,
    whiteboard_id TEXT NOT NULL,
    user_id TEXT NOT NULL,
    edge_type TEXT DEFAULT 'default',
    animated INTEGER DEFAULT 0 CHECK(animated IN (0,1)),
    style TEXT, -- JSON
    source_handle TEXT,
    target_handle TEXT,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL,
    local_version INTEGER NOT NULL DEFAULT 1,
    synced_at INTEGER,
    is_deleted INTEGER DEFAULT 0 CHECK(is_deleted IN (0,1)),
    FOREIGN KEY (source_id) REFERENCES nodes(id) ON DELETE CASCADE,
    FOREIGN KEY (target_id) REFERENCES nodes(id) ON DELETE CASCADE,
    FOREIGN KEY (whiteboard_id) REFERENCES whiteboards(id) ON DELETE CASCADE
  );

  -- Change log for sync tracking
  CREATE TABLE IF NOT EXISTS change_log (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    entity_type TEXT NOT NULL CHECK(entity_type IN ('node', 'edge', 'whiteboard')),
    entity_id TEXT NOT NULL,
    operation TEXT NOT NULL CHECK(operation IN ('create', 'update', 'delete')),
    timestamp INTEGER NOT NULL,
    synced INTEGER DEFAULT 0 CHECK(synced IN (0,1)),
    sync_attempts INTEGER DEFAULT 0,
    last_sync_error TEXT
  );

  -- Tabs state for workspace restoration
  CREATE TABLE IF NOT EXISTS tabs (
    id TEXT PRIMARY KEY,
    whiteboard_id TEXT NOT NULL,
    url TEXT NOT NULL,
    title TEXT,
    display_input TEXT,
    is_loading INTEGER DEFAULT 0 CHECK(is_loading IN (0,1)),
    last_node_id TEXT,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL,
    FOREIGN KEY (whiteboard_id) REFERENCES whiteboards(id) ON DELETE CASCADE
  );

  -- UI state for workspace continuity
  CREATE TABLE IF NOT EXISTS ui_state (
    whiteboard_id TEXT PRIMARY KEY,
    active_tab_id TEXT,
    viewport_x REAL DEFAULT 0,
    viewport_y REAL DEFAULT 0,
    viewport_zoom REAL DEFAULT 1,
    selected_node_ids TEXT, -- JSON array
    updated_at INTEGER NOT NULL,
    FOREIGN KEY (whiteboard_id) REFERENCES whiteboards(id) ON DELETE CASCADE
  );

  -- Indexes for performance
  CREATE INDEX IF NOT EXISTS idx_nodes_whiteboard ON nodes(whiteboard_id) WHERE is_deleted = 0;
  CREATE INDEX IF NOT EXISTS idx_nodes_user ON nodes(user_id) WHERE is_deleted = 0;
  CREATE INDEX IF NOT EXISTS idx_nodes_updated ON nodes(updated_at DESC);
  CREATE INDEX IF NOT EXISTS idx_edges_whiteboard ON edges(whiteboard_id) WHERE is_deleted = 0;
  CREATE INDEX IF NOT EXISTS idx_edges_user ON edges(user_id) WHERE is_deleted = 0;
  CREATE INDEX IF NOT EXISTS idx_edges_source ON edges(source_id) WHERE is_deleted = 0;
  CREATE INDEX IF NOT EXISTS idx_edges_target ON edges(target_id) WHERE is_deleted = 0;
  CREATE INDEX IF NOT EXISTS idx_whiteboards_user ON whiteboards(user_id) WHERE is_deleted = 0;
  CREATE INDEX IF NOT EXISTS idx_change_log_synced ON change_log(synced, timestamp);
  CREATE INDEX IF NOT EXISTS idx_change_log_entity ON change_log(entity_type, entity_id);
  CREATE INDEX IF NOT EXISTS idx_tabs_whiteboard ON tabs(whiteboard_id);
`;

export function initializeSchema(db: any): void {
  // Execute schema creation
  db.exec(SCHEMA);
  
  // Check/set schema version
  const meta = db.prepare('SELECT value FROM _meta WHERE key = ?').get('schema_version');
  
  if (!meta) {
    db.prepare('INSERT INTO _meta (key, value) VALUES (?, ?)').run('schema_version', SCHEMA_VERSION.toString());
    console.log(`[Schema] Initialized database with schema version ${SCHEMA_VERSION}`);
  } else {
    const currentVersion = parseInt(meta.value);
    if (currentVersion < SCHEMA_VERSION) {
      console.log(`[Schema] Migration needed: ${currentVersion} -> ${SCHEMA_VERSION}`);
      runMigrations(db, currentVersion, SCHEMA_VERSION);
    }
  }
  
  // Ensure default whiteboard exists
  ensureDefaultWhiteboard(db);
}

function ensureDefaultWhiteboard(db: any): void {
  const whiteboard = db.prepare('SELECT id FROM whiteboards WHERE id = ?').get('main');
  if (!whiteboard) {
    const now = Date.now();
    db.prepare(`
      INSERT INTO whiteboards (id, name, user_id, created_at, updated_at, local_version)
      VALUES (?, ?, ?, ?, ?, 1)
    `).run('main', 'Main Brain', 'local', now, now);
    console.log('[Schema] Created default "main" whiteboard');
  }
}

function runMigrations(db: any, fromVersion: number, toVersion: number): void {
  console.log(`[Schema] Running migrations from v${fromVersion} to v${toVersion}`);
  
  // Migration 1 -> 2: Add handle columns to edges
  if (fromVersion < 2) {
    console.log('[Schema] Migration: Adding handle columns to edges table');
    try {
      db.exec('ALTER TABLE edges ADD COLUMN source_handle TEXT');
      db.exec('ALTER TABLE edges ADD COLUMN target_handle TEXT');
    } catch (e) {
      console.warn('[Schema] Migration error (handles might already exist):', e);
    }
  }
  
  // Update schema version
  db.prepare('UPDATE _meta SET value = ? WHERE key = ?').run(toVersion.toString(), 'schema_version');
  console.log(`[Schema] Migration to v${toVersion} complete`);
}
