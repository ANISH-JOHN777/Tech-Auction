import { open } from 'sqlite';
import sqlite3 from 'sqlite3';
import { config } from '../config/env.js';
import { initializeSchema } from './schema.js';

let dbInstance = null;

export async function initDb() {
  if (!dbInstance) {
    dbInstance = await open({
      filename: config.dbPath,
      driver: sqlite3.Database,
    });
    await initializeSchema(dbInstance);
  }
  return dbInstance;
}

export function getDb() {
  if (!dbInstance) {
    throw new Error('Database not initialized. Call initDb() first.');
  }
  return dbInstance;
}
