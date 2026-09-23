import {
  getSubmissionForTeam,
  createOrUpdateSubmission,
  getAdminSubmissions,
  getAdminSubmissionById,
  evaluateSubmission,
  reopenSubmission,
  getPublicLeaderboard,
  getAdminLeaderboard,
  getEventSettings,
  updateEventSetting,
} from '../services/submission.service.js';

export async function getStudentSubmission(req, res, next) {
  try {
    const team = req.team;
    const submission = await getSubmissionForTeam(team.id, team.challenge);
    const settings = await getEventSettings();
    res.json({
      success: true,
      data: {
        submission,
        settings,
      },
    });
  } catch (err) {
    next(err);
  }
}

export async function postStudentSubmission(req, res, next) {
  try {
    const team = req.team;
    const { submissionType, submissionReference, isFinal } = req.body;
    const result = await createOrUpdateSubmission({
      team,
      submissionType,
      submissionReference,
      isFinal: Boolean(isFinal),
    });
    res.json({
      success: true,
      data: result,
    });
  } catch (err) {
    if (err.code) {
      return res.status(err.statusCode || 400).json({
        success: false,
        error: {
          code: err.code,
          message: err.message,
        },
      });
    }
    next(err);
  }
}

export async function fetchPublicLeaderboard(req, res, next) {
  try {
    const data = await getPublicLeaderboard();
    res.json({
      success: true,
      data,
    });
  } catch (err) {
    next(err);
  }
}

export async function fetchEventSettings(req, res, next) {
  try {
    const settings = await getEventSettings();
    res.json({
      success: true,
      data: settings,
    });
  } catch (err) {
    next(err);
  }
}

export async function listAdminSubmissions(req, res, next) {
  try {
    const { track, status, search } = req.query;
    const submissions = await getAdminSubmissions({ track, status, search });
    res.json({
      success: true,
      data: submissions,
    });
  } catch (err) {
    next(err);
  }
}

export async function showAdminSubmission(req, res, next) {
  try {
    const { id } = req.params;
    const detail = await getAdminSubmissionById(id);
    res.json({
      success: true,
      data: detail,
    });
  } catch (err) {
    if (err.code) {
      return res.status(err.statusCode || 404).json({
        success: false,
        error: { code: err.code, message: err.message },
      });
    }
    next(err);
  }
}

export async function evaluateAdminSubmission(req, res, next) {
  try {
    const { id } = req.params;
    const adminUser = req.admin?.username || 'admin';
    const result = await evaluateSubmission({
      adminUser,
      submissionId: id,
      ...req.body,
    });
    res.json({
      success: true,
      data: result,
    });
  } catch (err) {
    if (err.code) {
      return res.status(err.statusCode || 400).json({
        success: false,
        error: { code: err.code, message: err.message },
      });
    }
    next(err);
  }
}

export async function reopenAdminSubmission(req, res, next) {
  try {
    const { id } = req.params;
    const adminUser = req.admin?.username || 'admin';
    const { notes } = req.body;
    const result = await reopenSubmission({
      adminUser,
      submissionId: id,
      notes,
    });
    res.json({
      success: true,
      data: result,
    });
  } catch (err) {
    if (err.code) {
      return res.status(err.statusCode || 400).json({
        success: false,
        error: { code: err.code, message: err.message },
      });
    }
    next(err);
  }
}

export async function fetchAdminLeaderboard(req, res, next) {
  try {
    const data = await getAdminLeaderboard();
    res.json({
      success: true,
      data,
    });
  } catch (err) {
    next(err);
  }
}

export async function updateAdminEventSetting(req, res, next) {
  try {
    const { key, value } = req.body;
    const settings = await updateEventSetting(key, value);
    res.json({
      success: true,
      data: settings,
    });
  } catch (err) {
    next(err);
  }
}
