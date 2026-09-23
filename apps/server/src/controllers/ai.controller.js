import {
  getAIEntitlementStatus,
  startAIEntitlement,
  stopAIEntitlement,
  processAIChat,
  getAdminAISessions,
  revokeAISession,
} from '../services/ai.service.js';

export async function getStatus(req, res, next) {
  try {
    const team = req.team;
    const status = await getAIEntitlementStatus(team.id, team.challenge);
    res.json({
      success: true,
      data: status,
    });
  } catch (err) {
    next(err);
  }
}

export async function startAI(req, res, next) {
  try {
    const team = req.team;
    const status = await startAIEntitlement(team.id, team.challenge);
    res.json({
      success: true,
      data: status,
    });
  } catch (err) {
    next(err);
  }
}

export async function stopAI(req, res, next) {
  try {
    const team = req.team;
    const status = await stopAIEntitlement(team.id, team.challenge);
    res.json({
      success: true,
      data: status,
    });
  } catch (err) {
    next(err);
  }
}

export async function chatAI(req, res, next) {
  try {
    const team = req.team;
    const { message, forceMock } = req.body;
    const result = await processAIChat({ team, message, forceMock });
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

export async function listAdminSessions(req, res, next) {
  try {
    const sessions = await getAdminAISessions();
    res.json({
      success: true,
      data: sessions,
    });
  } catch (err) {
    next(err);
  }
}

export async function revokeAdminSession(req, res, next) {
  try {
    const { id } = req.params;
    const result = await revokeAISession(id);
    res.json({
      success: true,
      data: result,
    });
  } catch (err) {
    next(err);
  }
}

