import { config } from '../config/env.js';
import { aiRepository } from '../db/repositories/ai.repository.js';

export async function getAIEntitlementStatus(teamId, track) {
  let entitlement = await aiRepository.findActiveOrAvailableEntitlement(teamId, track);
  if (!entitlement) {
    const past = await aiRepository.findLatestEntitlement(teamId, track);
    if (!past) {
      return { hasEntitlement: false, status: 'LOCKED', remainingSeconds: 0, requestCount: 0, maxRequests: config.aiMaxRequests };
    }
    entitlement = past;
  }

  const now = new Date();
  let remainingSeconds = 0;

  if (entitlement.status === 'ACTIVE' && entitlement.expires_at) {
    const expiresAt = new Date(entitlement.expires_at);
    if (now >= expiresAt) {
      // Auto-expire on server
      await aiRepository.updateEntitlementStatus(entitlement.id, 'EXPIRED');
      entitlement.status = 'EXPIRED';
    } else {
      remainingSeconds = Math.max(0, Math.floor((expiresAt.getTime() - now.getTime()) / 1000));
    }
  } else if (entitlement.status === 'AVAILABLE') {
    remainingSeconds = entitlement.duration_seconds || config.aiDurationSeconds;
  }

  return {
    hasEntitlement: true,
    entitlementId: entitlement.id,
    status: entitlement.status,
    startedAt: entitlement.started_at,
    expiresAt: entitlement.expires_at,
    remainingSeconds,
    requestCount: entitlement.request_count || 0,
    maxRequests: config.aiMaxRequests,
  };
}

export async function startAIEntitlement(teamId, track) {
  const entitlement = await aiRepository.findAvailableEntitlement(teamId, track);

  if (!entitlement) {
    const active = await aiRepository.findActiveEntitlement(teamId, track);
    if (active) {
      return await getAIEntitlementStatus(teamId, track);
    }

    const err = new Error('No available AI Assist entitlement to start. Win the AI ASSIST auction item first.');
    err.statusCode = 403;
    err.code = 'NO_ENTITLEMENT';
    throw err;
  }

  const now = new Date();
  const durSecs = Number(entitlement.duration_seconds);
  const duration = (durSecs && durSecs > 0) ? durSecs : (config.aiDurationSeconds || 900);
  const expiresAt = new Date(now.getTime() + duration * 1000).toISOString();

  await aiRepository.updateEntitlementStatus(entitlement.id, 'ACTIVE', {
    started_at: now.toISOString(),
    expires_at: expiresAt,
  });

  return await getAIEntitlementStatus(teamId, track);
}

export async function stopAIEntitlement(teamId, track) {
  const entitlement = await aiRepository.findActiveEntitlement(teamId, track);

  if (entitlement) {
    await aiRepository.updateEntitlementStatus(entitlement.id, 'EXPIRED');
  }

  return await getAIEntitlementStatus(teamId, track);
}

export async function processAIChat({ team, message, forceMock = false }) {
  if (!message || typeof message !== 'string' || !message.trim()) {
    const err = new Error('Message content cannot be empty.');
    err.statusCode = 400;
    err.code = 'INVALID_MESSAGE';
    throw err;
  }

  const trimmedMessage = message.trim();
  if (trimmedMessage.length > 4000) {
    const err = new Error('Message exceeds the maximum limit of 4000 characters.');
    err.statusCode = 400;
    err.code = 'MESSAGE_TOO_LONG';
    throw err;
  }

  const track = team.challenge;
  if (!track || !['full-stack', 'cybersecurity'].includes(track)) {
    const err = new Error('Valid challenge track required for AI Assist.');
    err.statusCode = 400;
    err.code = 'INVALID_TRACK';
    throw err;
  }

  const status = await getAIEntitlementStatus(team.id, track);

  if (!status.hasEntitlement || status.status === 'LOCKED') {
    const err = new Error('Win the AI ASSIST auction item to unlock AI access.');
    err.statusCode = 403;
    err.code = 'NO_ENTITLEMENT';
    throw err;
  }

  if (status.status === 'AVAILABLE') {
    const err = new Error("Please click 'Start AI Assist' to activate your session timer before sending questions.");
    err.statusCode = 400;
    err.code = 'SESSION_NOT_STARTED';
    throw err;
  }

  if (status.status === 'EXPIRED' || status.remainingSeconds <= 0) {
    const err = new Error('AI Assist time has expired.');
    err.statusCode = 403;
    err.code = 'AI_SESSION_EXPIRED';
    throw err;
  }

  if (status.status === 'REVOKED') {
    const err = new Error('AI Assist session was revoked by the organizer.');
    err.statusCode = 403;
    err.code = 'SESSION_REVOKED';
    throw err;
  }

  if (status.requestCount >= config.aiMaxRequests) {
    const err = new Error(`Request limit reached (${config.aiMaxRequests}/${config.aiMaxRequests} requests used).`);
    err.statusCode = 429;
    err.code = 'AI_REQUEST_LIMIT_REACHED';
    throw err;
  }

  const nextCount = status.requestCount + 1;

  // Increment request count on server
  await aiRepository.updateEntitlementStatus(status.entitlementId, status.status, {
    request_count: nextCount,
  });

  let aiReplyText = '';
  let isSuccess = 1;
  let errorCode = null;

  try {
    if (!config.geminiApiKey || forceMock) {
      // Synthetic Mock Response for testing / offline environments
      aiReplyText = `[AI ASSIST — ${track.toUpperCase()} MODE]\nHello Team ${team.name}! Here is guidance for your prompt: "${trimmedMessage.substring(0, 50)}…"\n\n- Verify API parameter names match between client and server.\n- Check browser network tab for exact HTTP status codes.\n- Inspect backend log output for error tracebacks.`;
    } else {
      // Call Gemini REST API Server-Side (API Key strictly server-side)
      const systemPrompt = track === 'full-stack'
        ? 'You are a supportive technical assistant for a college Full-Stack web development hackathon challenge. Provide clear debugging guidance, explain REST API concepts, database syntax, and React state management. Do NOT reveal solution keys, answer files, or passwords.'
        : 'You are a supportive technical assistant for a college Cybersecurity laboratory challenge. Provide guidance on vulnerability concepts (XSS, BOPA/IDOR, auth flaws, log analysis). Do NOT reveal direct exploit flags or solution keys.';

      const url = `https://generativelanguage.googleapis.com/v1beta/models/${config.geminiModel}:generateContent?key=${config.geminiApiKey}`;

      const apiRes = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                {
                  text: `${systemPrompt}\n\nStudent Question: ${trimmedMessage}`,
                },
              ],
            },
          ],
        }),
      });

      const apiData = await apiRes.json();
      if (!apiRes.ok) {
        throw new Error(apiData.error?.message || 'Gemini API provider error');
      }

      aiReplyText = apiData.candidates?.[0]?.content?.parts?.map((x) => x.text).join('') || 'No response generated.';
    }
  } catch (err) {
    isSuccess = 0;
    errorCode = 'AI_PROVIDER_ERROR';
    console.error('[AI SERVICE] Provider error:', err.message);
    const providerErr = new Error('AI service is temporarily unavailable. Please try again.');
    providerErr.statusCode = 502;
    providerErr.code = 'AI_PROVIDER_ERROR';

    // Log failed attempt metadata
    await aiRepository.logUsage({
      teamId: team.id,
      entitlementId: status.entitlementId,
      requestNumber: nextCount,
      userMessageLength: trimmedMessage.length,
      responseLength: 0,
      model: config.geminiModel,
      success: false,
      errorCode,
    });

    throw providerErr;
  }

  // Log successful usage metadata (Without storing sensitive full prompt/key)
  await aiRepository.logUsage({
    teamId: team.id,
    entitlementId: status.entitlementId,
    requestNumber: nextCount,
    userMessageLength: trimmedMessage.length,
    responseLength: aiReplyText.length,
    model: config.geminiModel,
    success: true,
    errorCode: null,
  });

  const updatedStatus = await getAIEntitlementStatus(team.id, track);

  return {
    text: aiReplyText,
    remainingSeconds: updatedStatus.remainingSeconds,
    requestCount: updatedStatus.requestCount,
    maxRequests: updatedStatus.maxRequests,
  };
}

export async function getAdminAISessions() {
  return await aiRepository.getAdminSessions();
}

export async function revokeAISession(entitlementId) {
  await aiRepository.updateEntitlementStatus(entitlementId, 'REVOKED');
  return { success: true, message: 'AI entitlement revoked successfully.' };
}
