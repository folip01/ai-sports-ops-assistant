import Database from 'better-sqlite3';
import path from 'path';

const dbPath = path.join(__dirname, '../../stats.db');

export const db: Database.Database = new Database(dbPath);

db.pragma('journal_mode = WAL');

db.exec(`
  CREATE TABLE IF NOT EXISTS matches (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    team TEXT NOT NULL,
    opponent TEXT NOT NULL,
    date TEXT NOT NULL,
    result TEXT NOT NULL,
    score TEXT NOT NULL,
    fetchedAt TEXT NOT NULL
  )
`);