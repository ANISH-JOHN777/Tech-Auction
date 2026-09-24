import express from 'express';
import { requireAuth } from '../middleware/auth.js';
import { eventGuard } from '../middleware/eventGuard.js';
import {
  getWorkspaceFiles,
  saveWorkspaceFile,
  resetWorkspace,
} from '../services/workspace.service.js';
import { runControlledWorkspaceTests } from '../services/workspaceRunner.service.js';

const router = express.Router();

// Apply student authentication & event status guarding to all workspace routes
router.use(requireAuth);
router.use(eventGuard({ requireLive: true, requireActiveTeam: true }));

/**
 * GET /api/workspace/files
 * Fetch the authenticated team's workspace file tree and content.
 */
router.get('/files', async (req, res, next) => {
  try {
    const track = req.team.challenge;
    if (!track) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'TRACK_NOT_SELECTED',
          message: 'Team has not locked a challenge track yet.',
        },
      });
    }

    const data = await getWorkspaceFiles(req.team.id, track);
    return res.json({
      success: true,
      data,
    });
  } catch (err) {
    if (err.status) {
      return res.status(err.status).json({
        success: false,
        error: {
          code: err.code || 'WORKSPACE_ERROR',
          message: err.message,
        },
      });
    }
    next(err);
  }
});

/**
 * POST /api/workspace/files
 * Save a single file modification for the authenticated team.
 */
router.post('/files', async (req, res, next) => {
  try {
    const track = req.team.challenge;
    if (!track) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'TRACK_NOT_SELECTED',
          message: 'Team has not locked a challenge track yet.',
        },
      });
    }

    const { file_path, content } = req.body || {};

    const data = await saveWorkspaceFile(req.team.id, track, file_path, content);
    return res.json({
      success: true,
      data,
    });
  } catch (err) {
    if (err.status) {
      return res.status(err.status).json({
        success: false,
        error: {
          code: err.code || 'WORKSPACE_ERROR',
          message: err.message,
        },
      });
    }
    next(err);
  }
});

/**
 * POST /api/workspace/reset
 * Reset the authenticated team's workspace back to default template files.
 */
router.post('/reset', async (req, res, next) => {
  try {
    const track = req.team.challenge;
    if (!track) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'TRACK_NOT_SELECTED',
          message: 'Team has not locked a challenge track yet.',
        },
      });
    }

    const data = await resetWorkspace(req.team.id, track);
    return res.json({
      success: true,
      data,
    });
  } catch (err) {
    if (err.status) {
      return res.status(err.status).json({
        success: false,
        error: {
          code: err.code || 'WORKSPACE_ERROR',
          message: err.message,
        },
      });
    }
    next(err);
  }
});

/**
 * POST /api/workspace/run
 * Execute controlled assertions against the authenticated team's workspace.
 */
router.post('/run', async (req, res, next) => {
  try {
    const track = req.team.challenge;
    if (!track) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'TRACK_NOT_SELECTED',
          message: 'Team has not locked a challenge track yet.',
        },
      });
    }

    const data = await runControlledWorkspaceTests(req.team.id, track);
    return res.json({
      success: true,
      data,
    });
  } catch (err) {
    if (err.status) {
      return res.status(err.status).json({
        success: false,
        error: {
          code: err.code || 'WORKSPACE_RUNNER_ERROR',
          message: err.message,
        },
      });
    }
    next(err);
  }
});

export default router;
