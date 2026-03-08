export interface RawNode {
  id: string;
  type: string;
  title: string;
  url: string;
  content?: string;
  whiteboard_id: string;
  user_id: string;
  position_x: number;
  position_y: number;
  metadata?: string;
  created_at?: number;
  updated_at?: number;
}

export interface RawEdge {
  id: string;
  source_id: string;
  target_id: string;
  source_handle?: string;
  target_handle?: string;
  whiteboard_id: string;
  created_at?: number;
}

export interface RawWhiteboard {
  id: string;
  name: string;
  user_id: string;
  created_at?: number;
  updated_at?: number;
}

export interface RawTab {
  id: string;
  url: string;
  display_input?: string;
  title?: string;
  last_node_id?: string;
  is_loading?: boolean;
}

export interface RawUIState {
  whiteboard_id: string;
  active_tab_id: string;
  viewport_x: number;
  viewport_y: number;
  viewport_zoom: number;
  updated_at: number;
}

export interface ElectronAPI {
  ipcRenderer: {
    send: (channel: string, data?: unknown) => void;
    on: (channel: string, func: (...args: unknown[]) => void) => () => void;
    invoke: (channel: string, data?: unknown) => Promise<unknown>;
  };
  platform: string;
  auth: {
    openLogin: (loginUrl: string) => Promise<void>;
    onDeepLinkAuth: (callback: (data: { code: string }) => void) => () => void;
    onDirectTokensReceived: (callback: (data: { access_token: string; refresh_token: string }) => void) => () => void;
  };
  storage: {
    nodes: {
      list: (whiteboardId: string, userId?: string) => Promise<RawNode[]>;
      get: (id: string) => Promise<RawNode | null>;
      create: (node: Partial<RawNode>) => Promise<RawNode>;
      update: (id: string, updates: Partial<RawNode>) => Promise<RawNode>;
      delete: (id: string) => Promise<void>;
    };
    edges: {
      list: (whiteboardId: string, userId?: string) => Promise<RawEdge[]>;
      create: (edge: Partial<RawEdge>) => Promise<RawEdge>;
      update: (id: string, updates: Partial<RawEdge>) => Promise<RawEdge>;
      delete: (id: string) => Promise<void>;
    };
    whiteboards: {
      list: (userId?: string) => Promise<RawWhiteboard[]>;
      create: (whiteboard: Partial<RawWhiteboard>) => Promise<RawWhiteboard>;
      update: (id: string, whiteboard: Partial<RawWhiteboard>) => Promise<RawWhiteboard>;
      delete: (id: string) => Promise<void>;
      sync: (id: string) => Promise<void>;
    };
    tabs: {
      save: (whiteboardId: string, tabs: RawTab[]) => Promise<void>;
      load: (whiteboardId: string) => Promise<RawTab[]>;
    };
    ui: {
      save: (state: RawUIState) => Promise<void>;
      load: (whiteboardId: string) => Promise<RawUIState | null>;
    };
    sync: {
      getChanges: () => Promise<unknown[]>;
      markSynced: (entityType: string, entityId: string) => Promise<void>;
      markFailed: (changeId: number, error: string) => Promise<void>;
      setToken: (token: string | null) => Promise<void>;
    };
  };
}

declare global {
  interface Window {
    electron: ElectronAPI;
  }
}
