import { open } from 'sqlite';
import sqlite3 from 'sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dbPath = path.resolve(__dirname, '../campus_connect.sqlite');

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
    CREATE TABLE IF NOT EXISTS students (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      email TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      name TEXT NOT NULL,
      department TEXT NOT NULL,
      gpa REAL DEFAULT 3.5
    );

    CREATE TABLE IF NOT EXISTS opportunities (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      company_name TEXT NOT NULL,
      role TEXT NOT NULL,
      location TEXT NOT NULL,
      stipend INTEGER NOT NULL,
      requirements TEXT,
      deadline TEXT
    );

    CREATE TABLE IF NOT EXISTS applications (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      student_id INTEGER NOT NULL,
      opportunity_id INTEGER NOT NULL,
      cover_letter TEXT,
      gpa REAL,
      status TEXT DEFAULT 'PENDING',
      applied_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (student_id) REFERENCES students(id),
      FOREIGN KEY (opportunity_id) REFERENCES opportunities(id)
    );
  `);

  const count = await db.get('SELECT COUNT(*) as c FROM students');
  if (count.c === 0) {
    await db.run(`
      INSERT INTO students (email, password, name, department, gpa) VALUES
      ('alex@campus.edu', 'student123', 'Alex Johnson', 'Computer Science', 3.8),
      ('maria@campus.edu', 'student123', 'Maria Garcia', 'Information Technology', 3.9),
      ('sam@campus.edu', 'student123', 'Sam Wilson', 'Cybersecurity', 3.6)
    `);

    await db.run(`
      INSERT INTO opportunities (title, company_name, role, location, stipend, requirements, deadline) VALUES
      ('Full-Stack Software Engineer Intern', 'TechCorp Solutions', 'Full-Stack Developer', 'Coimbatore / Remote', 25000, 'React, Node.js, SQL', '2026-10-15'),
      ('Cyber Security Analyst Apprentice', 'SecureNet Labs', 'Security Analyst', 'Chennai', 22000, 'Network Security, Linux, Python', '2026-10-20'),
      ('Frontend UI/UX Engineering Intern', 'DesignCraft Studio', 'Frontend Engineer', 'Bangalore', 20000, 'React, Tailwind CSS, JavaScript', '2026-10-18'),
      ('Backend API Systems Engineer', 'DataFlow Tech', 'Backend Developer', 'Remote', 28000, 'Node.js, Express, SQLite/PostgreSQL', '2026-10-25')
    `);

    await db.run(`
      INSERT INTO applications (student_id, opportunity_id, cover_letter, gpa, status, applied_at) VALUES
      (1, 2, 'Excited to apply for the security analyst position.', 3.8, 'UNDER_REVIEW', '2026-09-20 10:30:00')
    `);

    console.log('[CampusConnect DB] Synthetic seed data inserted.');
  }
}
