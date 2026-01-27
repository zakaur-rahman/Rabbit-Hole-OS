import Database from 'better-sqlite3';
import path from 'path';
import { app } from 'electron';

export class SQLiteDatabase {
  private db: Database.Database;
  private dbPath: string;
  
  constructor() {
    const userDataPath = app.getPath('userData');
    this.dbPath = path.join(userDataPath, 'cognode.db');
    this.db = new Database(this.dbPath);
    this.initialize();
  }
  
  private initialize() {
    // Enable Write-Ahead Logging for better performance
    this.db.pragma('journal_mode = WAL');
    this.db.pragma('synchronous = NORMAL');
    this.db.pragma('foreign_keys = ON');
    this.db.pragma('temp_store = MEMORY');
    
    console.log(`[SQLite] Database initialized at: ${this.dbPath}`);
  }
  
  getDb(): Database.Database {
    return this.db;
  }
  
  close() {
    if (this.db) {
      this.db.close();
      console.log('[SQLite] Database closed');
    }
  }
  
  vacuum() {
    this.db.exec('VACUUM');
    console.log('[SQLite] Database vacuumed');
  }
}
