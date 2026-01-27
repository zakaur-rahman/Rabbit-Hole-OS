export interface ElectronAPI {
  ipcRenderer: {
    send: (channel: string, data?: any) => void;
    on: (channel: string, func: (...args: any[]) => void) => () => void;
    invoke: (channel: string, data?: any) => Promise<any>;
  };
  platform: string;
  auth: {
    startLogin: (authUrl: string, port?: number) => Promise<{ code: string; state: string; error?: string }>;

    handleCallback: (data: { code: string; state: string; codeVerifier: string }) => Promise<any>;
    onCallback: (callback: (data: { code?: string; state?: string; error?: string }) => void) => () => void;
  };
  storage: {
    nodes: {
      list: (whiteboardId: string, userId?: string) => Promise<any[]>;
      get: (id: string) => Promise<any>;
      create: (node: any) => Promise<any>;
      update: (id: string, updates: any) => Promise<any>;
      delete: (id: string) => Promise<void>;
    };
    edges: {
      list: (whiteboardId: string, userId?: string) => Promise<any[]>;
      create: (edge: any) => Promise<any>;
      update: (id: string, updates: any) => Promise<any>;
      delete: (id: string) => Promise<void>;
    };
    whiteboards: {
      list: (userId?: string) => Promise<any[]>;
      create: (whiteboard: any) => Promise<any>;
      update: (id: string, updates: any) => Promise<any>;
    };
    tabs: {
      save: (whiteboardId: string, tabs: any[]) => Promise<void>;
      load: (whiteboardId: string) => Promise<any[]>;
    };
    ui: {
      save: (state: any) => Promise<void>;
      load: (whiteboardId: string) => Promise<any>;
    };
    sync: {
      getChanges: () => Promise<any[]>;
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
