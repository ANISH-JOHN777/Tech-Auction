import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { query } from '../db/postgres.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const CHALLENGES_ROOT = path.resolve(__dirname, '../../../../challenges');

const TRACK_BASE_DIRS = {
  'full-stack': path.join(CHALLENGES_ROOT, 'full-stack/CampusConnect'),
  'cybersecurity': path.join(CHALLENGES_ROOT, 'cybersecurity/SecureVault'),
};

export const ALLOWED_FILES = {
  'full-stack': [
    'frontend/src/App.jsx',
    'frontend/src/main.jsx',
    'frontend/src/styles.css',
    'frontend/src/services/api.js',
    'frontend/src/pages/Login.jsx',
    'frontend/src/pages/Dashboard.jsx',
    'frontend/src/pages/AdminView.jsx',
    'frontend/src/components/Navbar.jsx',
    'frontend/src/components/OpportunityCard.jsx',
    'frontend/src/components/ApplyModal.jsx',
    'backend/src/index.js',
    'backend/src/db.js',
  ],
  'cybersecurity': [
    'frontend/src/App.jsx',
    'frontend/src/main.jsx',
    'frontend/src/styles.css',
    'frontend/src/services/api.js',
    'frontend/src/pages/Login.jsx',
    'frontend/src/pages/Dashboard.jsx',
    'frontend/src/pages/Search.jsx',
    'frontend/src/pages/ConfigViewer.jsx',
    'frontend/src/components/Navbar.jsx',
    'frontend/src/components/DocumentViewer.jsx',
    'frontend/src/components/LogViewer.jsx',
    'backend/src/index.js',
    'backend/src/db.js',
  ],
};

const MAX_FILE_SIZE_BYTES = 200 * 1024; // 200 KB

export function validateTrack(track) {
  if (!track || !ALLOWED_FILES[track]) {
    const err = new Error(`Invalid challenge track: ${track}. Track must be 'full-stack' or 'cybersecurity'.`);
    err.code = 'INVALID_TRACK';
    err.status = 400;
    throw err;
  }
}

export function sanitizeFilePath(filePath, track) {
  validateTrack(track);

  if (!filePath || typeof filePath !== 'string' || !filePath.trim()) {
    const err = new Error('File path cannot be empty.');
    err.code = 'INVALID_FILE_PATH';
    err.status = 400;
    throw err;
  }

  // Reject path traversal attempts or absolute paths
  if (filePath.includes('..') || path.isAbsolute(filePath) || filePath.includes('\0')) {
    const err = new Error('Path traversal or invalid file path detected.');
    err.code = 'PATH_TRAVERSAL_DETECTED';
    err.status = 400;
    throw err;
  }

  const normalized = path.normalize(filePath).replace(/\\/g, '/').replace(/^\/+/, '');
  const allowlist = ALLOWED_FILES[track];
  if (!allowlist.includes(normalized)) {
    const err = new Error(`Access denied. File '${normalized}' is not in the approved workspace allowlist for ${track}.`);
    err.code = 'FORBIDDEN_FILE';
    err.status = 403;
    throw err;
  }

  return normalized;
}

export async function getWorkspaceFiles(teamId, track) {
  validateTrack(track);

  const baseDir = TRACK_BASE_DIRS[track];
  const allowlist = ALLOWED_FILES[track];

  // Fetch team's saved file edits from DB
  const dbRes = await query(
    'SELECT file_path, content FROM team_workspace_files WHERE team_id = $1 AND track = $2',
    [teamId, track]
  );
  const savedMap = new Map(dbRes.rows.map((r) => [r.file_path, r.content]));

  const files = [];

  for (const relPath of allowlist) {
    let content = '';
    if (savedMap.has(relPath)) {
      content = savedMap.get(relPath);
    } else {
      const fullPath = path.join(baseDir, relPath);
      try {
        if (fs.existsSync(fullPath)) {
          content = fs.readFileSync(fullPath, 'utf-8');
        }
      } catch (e) {
        console.warn(`[WORKSPACE] Could not read default file template: ${fullPath}`, e.message);
      }
    }

    files.push({
      path: relPath,
      content,
      editable: true,
    });
  }

  return {
    track,
    files,
  };
}

export async function checkWorkspaceUnlocked(teamId, track) {
  const subRes = await query(
    'SELECT status FROM submissions WHERE team_id = $1 AND track = $2 ORDER BY id DESC LIMIT 1',
    [teamId, track]
  );
  if (subRes.rows.length > 0 && subRes.rows[0].status === 'FINAL') {
    const err = new Error('Your workspace is locked because your final solution has been submitted.');
    err.code = 'WORKSPACE_LOCKED';
    err.status = 403;
    throw err;
  }
}

export async function saveWorkspaceFile(teamId, track, filePath, content) {
  validateTrack(track);
  await checkWorkspaceUnlocked(teamId, track);

  const sanitizedPath = sanitizeFilePath(filePath, track);

  if (typeof content !== 'string') {
    const err = new Error('File content must be a string.');
    err.code = 'INVALID_CONTENT';
    err.status = 400;
    throw err;
  }

  if (Buffer.byteLength(content, 'utf-8') > MAX_FILE_SIZE_BYTES) {
    const err = new Error(`File size exceeds maximum limit of 200KB.`);
    err.code = 'PAYLOAD_TOO_LARGE';
    err.status = 413;
    throw err;
  }

  // Upsert into team_workspace_files
  await query(
    `INSERT INTO team_workspace_files (team_id, track, file_path, content, updated_at)
     VALUES ($1, $2, $3, $4, NOW())
     ON CONFLICT (team_id, file_path)
     DO UPDATE SET content = EXCLUDED.content, track = EXCLUDED.track, updated_at = NOW()`,
    [teamId, track, sanitizedPath, content]
  );

  return {
    path: sanitizedPath,
    saved: true,
  };
}

export async function resetWorkspace(teamId, track) {
  validateTrack(track);
  await checkWorkspaceUnlocked(teamId, track);

  await query(
    'DELETE FROM team_workspace_files WHERE team_id = $1 AND track = $2',
    [teamId, track]
  );

  return await getWorkspaceFiles(teamId, track);
}
