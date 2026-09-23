import { open } from 'sqlite';
import sqlite3 from 'sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dbPath = path.resolve(__dirname, '../secure_vault.sqlite');

let dbInstance = null;

export async function getDb() {
  if (!dbInstance) {
    dbInstance = await open({
      filename: dbPath,
      driver: sqlite3.Database,
    });
    await initDb(dbInstance);
  }
  return dbInstance;
}

async function initDb(db) {
  await db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      email TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      name TEXT NOT NULL,
      role TEXT DEFAULT 'Analyst',
      department TEXT DEFAULT 'Security Audit'
    );

    CREATE TABLE IF NOT EXISTS documents (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      owner_id INTEGER NOT NULL,
      title TEXT NOT NULL,
      classification TEXT NOT NULL,
      content TEXT NOT NULL,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (owner_id) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS sessions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      token TEXT UNIQUE NOT NULL,
      user_id INTEGER NOT NULL,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id)
    );
  `);

  const count = await db.get('SELECT COUNT(*) as c FROM users');
  if (count.c === 0) {
    await db.run(`
      INSERT INTO users (email, password, name, role, department) VALUES
      ('user1@securevault.local', 'password123', 'Alex Rivera (User 1)', 'Analyst', 'Security Audit'),
      ('user2@securevault.local', 'welcome2026', 'Sarah Chen (User 2)', 'Manager', 'Financial Compliance'),
      ('admin@securevault.local', 'adminpass', 'System Administrator', 'Admin', 'IT Infrastructure')
    `);

    await db.run(`
      INSERT INTO documents (owner_id, title, classification, content) VALUES
      (1, 'Q3 Internal Security Audit Summary', 'RESTRICTED', 'All primary firewalls updated. Minor patch pending on internal port 5001.'),
      (2, 'CONFIDENTIAL: Q4 Financial Compliance & Payroll Draft', 'CONFIDENTIAL - EXECUTIVE ONLY', 'Confidential payroll allocation: Executive bonuses set to 15%. Bank Account: 9876-5432-1098.'),
      (3, 'Root System Recovery Keys & Staging IPs', 'TOP SECRET - ADMIN ONLY', 'Emergency Master Key: SECURE_VAULT_RECOVERY_KEY_9981. Staging Server IP: 192.168.1.100.')
    `);

    console.log('[SecureVault DB] Synthetic laboratory data inserted.');
  }
}
