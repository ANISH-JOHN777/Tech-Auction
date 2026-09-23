import express from 'express';
import cors from 'cors';
import { getDb } from './db.js';

const app = express();
app.use(cors({ origin: '*' }));
app.use(express.json());

const PORT = 5000;

// Health Check
app.get('/api/health', (req, res) => {
  res.json({ ok: true, app: 'CampusConnect Backend' });
});

// LOGIN ENDPOINT
// BUG-01 Note: Backend returns key 'user'
app.post('/api/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const db = await getDb();
    const student = await db.get(
      'SELECT id, email, name, department, gpa FROM students WHERE email = ? AND password = ?',
      [email, password]
    );

    if (!student) {
      return res.status(401).json({ success: false, error: 'Invalid email or password' });
    }

    res.json({
      success: true,
      user: student, // BUG-01: Frontend expects data.student
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// OPPORTUNITIES LIST & SEARCH
// BUG-03 Note: Uses exact equality = instead of LIKE %query%
app.get('/api/opportunities', async (req, res) => {
  try {
    const { search } = req.query;
    const db = await getDb();
    let opportunities;

    if (search && search.trim()) {
      // BUG-03: Exact match search query instead of SQL LIKE '%search%'
      opportunities = await db.all(
        'SELECT * FROM opportunities WHERE title = ? OR company_name = ? ORDER BY id DESC',
        [search.trim(), search.trim()]
      );
    } else {
      opportunities = await db.all('SELECT * FROM opportunities ORDER BY id DESC');
    }

    res.json({
      success: true,
      opportunities,
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// OPPORTUNITY DETAILS BY ID
app.get('/api/opportunities/:id', async (req, res) => {
  try {
    const db = await getDb();
    const opportunity = await db.get('SELECT * FROM opportunities WHERE id = ?', [req.params.id]);

    if (!opportunity) {
      return res.status(404).json({ success: false, error: 'Opportunity not found' });
    }

    res.json({ success: true, opportunity });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// STUDENT APPLICATIONS LIST
// BUG-05 Note: SELECT * FROM applications JOIN opportunities causes opportunities.id to overwrite applications.id!
app.get('/api/applications', async (req, res) => {
  try {
    const { student_id } = req.query;
    if (!student_id) {
      return res.status(400).json({ success: false, error: 'student_id required' });
    }

    const db = await getDb();
    // BUG-05: SELECT * causes collision of id column from opportunities onto applications.id
    const applications = await db.all(
      `SELECT * FROM applications 
       JOIN opportunities ON applications.opportunity_id = opportunities.id 
       WHERE applications.student_id = ? 
       ORDER BY applications.id DESC`,
      [student_id]
    );

    res.json({ success: true, applications });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// SUBMIT APPLICATION
// BUG-08 Note: Direct call to cover_letter.trim() without null check crashes server when cover_letter is omitted!
app.post('/api/applications', async (req, res) => {
  try {
    const { student_id, opportunity_id, cover_letter, gpa } = req.body;

    if (!student_id || !opportunity_id) {
      return res.status(400).json({ success: false, error: 'student_id and opportunity_id required' });
    }

    // BUG-08: Unhandled Exception on missing optional cover_letter field
    const processedLetter = cover_letter.trim();

    const db = await getDb();
    const existing = await db.get(
      'SELECT id FROM applications WHERE student_id = ? AND opportunity_id = ?',
      [student_id, opportunity_id]
    );

    if (existing) {
      return res.status(409).json({ success: false, error: 'You have already applied for this opportunity' });
    }

    const result = await db.run(
      `INSERT INTO applications (student_id, opportunity_id, cover_letter, gpa, status, applied_at)
       VALUES (?, ?, ?, ?, 'PENDING', datetime('now'))`,
      [student_id, opportunity_id, processedLetter, gpa || 3.5]
    );

    const newApp = await db.get('SELECT * FROM applications WHERE id = ?', [result.lastID]);

    res.json({ success: true, application: newApp });
  } catch (err) {
    // Unhandled crash propagates if cover_letter is undefined
    res.status(500).json({ success: false, error: err.message });
  }
});

// ADMIN VIEW — ALL REGISTERED STUDENTS
app.get('/api/admin/students', async (req, res) => {
  try {
    const db = await getDb();
    const students = await db.all('SELECT id, name, email, department, gpa FROM students');
    res.json({ success: true, students });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ADMIN VIEW — ALL APPLICATIONS
app.get('/api/admin/applications', async (req, res) => {
  try {
    const db = await getDb();
    const applications = await db.all(`
      SELECT applications.id, students.name as student_name, students.email, opportunities.title, opportunities.company_name, applications.status, applications.applied_at
      FROM applications
      JOIN students ON applications.student_id = students.id
      JOIN opportunities ON applications.opportunity_id = opportunities.id
    `);
    res.json({ success: true, applications });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.listen(PORT, () => {
  console.log(`[CampusConnect Backend] Listening on http://localhost:${PORT}`);
});
