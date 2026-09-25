import { getWorkspaceFiles, validateTrack, checkWorkspaceUnlocked } from './workspace.service.js';
import { scoreRepository } from '../db/repositories/score.repository.js';
import { walletRepository } from '../db/repositories/wallet.repository.js';

/**
 * Controlled Assertion Runner Engine for Tech Auction 2026 Debug Workspace.
 * Runs deterministic behavioral assertions against a team's active challenge workspace.
 * Uses zero shell commands, zero sub-processes, and zero eval().
 */
export async function runControlledWorkspaceTests(teamId, track) {
  validateTrack(track);
  await checkWorkspaceUnlocked(teamId, track);

  const workspaceData = await getWorkspaceFiles(teamId, track);
  const fileMap = new Map((workspaceData.files || []).map((f) => [f.path, f.content || '']));

  let testResults = [];

  if (track === 'full-stack') {
    testResults = runFullStackAssertions(fileMap);
  } else if (track === 'cybersecurity') {
    testResults = runCybersecurityAssertions(fileMap);
  }

  // Filter allowed assertion IDs for team's assigned track to prevent cross-track assertion crediting
  const allowedAssertionIds = track === 'full-stack'
    ? ['FS_SEARCH_FILTER', 'FS_API_RESPONSE', 'FS_STATUS_UPDATE', 'FS_SUBMISSION']
    : ['CY_PASSWORD_EXPOSURE', 'CY_IDOR_AUTHORIZATION', 'CY_SESSION_REVOCATION', 'CY_XSS_PROTECTION'];

  for (const r of testResults) {
    if (r.status === 'PASS' && allowedAssertionIds.includes(r.id)) {
      await scoreRepository.recordClearedBug(teamId, track, r.id);
    }
  }

  const clearedList = await scoreRepository.getClearedBugs(teamId);
  const wallet = await walletRepository.findByTeamId(teamId);
  const remainingCredits = wallet ? (wallet.balance - wallet.held_balance) : 1000;

  const passedCount = testResults.filter((r) => r.status === 'PASS').length;
  const failedCount = testResults.filter((r) => r.status === 'FAIL').length;

  return {
    summary: {
      passed: passedCount,
      failed: failedCount,
      total: testResults.length,
      bugsCleared: clearedList.length,
      bugsTotal: allowedAssertionIds.length,
      remainingCredits,
    },
    clearedBugs: clearedList.map((b) => b.assertion_key),
    results: testResults,
  };
}

/**
 * Controlled Assertions for Full Stack — CampusConnect
 */
function runFullStackAssertions(fileMap) {
  const results = [];

  // FS_SEARCH_FILTER: Verify backend SQL query uses LIKE wildcards
  const backendIndex = fileMap.get('backend/src/index.js') || '';
  const hasLikeClause = backendIndex.includes('LIKE') || backendIndex.includes('like');
  const hasWildcardPattern = backendIndex.includes('%') || backendIndex.includes('searchPattern');
  const usesExactEquals = backendIndex.includes('WHERE title = ?') || backendIndex.includes('title = ? OR company_name = ?');

  if (hasLikeClause && hasWildcardPattern && !usesExactEquals) {
    results.push({
      id: 'FS_SEARCH_FILTER',
      name: 'Search Query Filtering',
      status: 'PASS',
      message: 'SQL search query uses LIKE wildcards for flexible title and company search.',
    });
  } else {
    results.push({
      id: 'FS_SEARCH_FILTER',
      name: 'Search Query Filtering',
      status: 'FAIL',
      message: 'Backend query uses exact string equality instead of SQL LIKE wildcards.',
      expected: 'WHERE title LIKE %?%',
      actual: 'WHERE title = ?',
    });
  }

  // FS_API_RESPONSE: Verify login response payload binding
  const loginJsx = fileMap.get('frontend/src/pages/Login.jsx') || '';
  const checksUserKey = loginJsx.includes('res.user') || loginJsx.includes('data.user') || loginJsx.includes('user:');
  const checksObsoleteStudentKey = loginJsx.includes('res.student') || loginJsx.includes('data.student');

  if (checksUserKey && !checksObsoleteStudentKey) {
    results.push({
      id: 'FS_API_RESPONSE',
      name: 'Login API Data Contract',
      status: 'PASS',
      message: 'Frontend login handler correctly checks res.user matching backend payload.',
    });
  } else {
    results.push({
      id: 'FS_API_RESPONSE',
      name: 'Login API Data Contract',
      status: 'FAIL',
      message: 'Frontend checks res.student instead of res.user returned by authentication API.',
      expected: 'res.user',
      actual: 'res.student',
    });
  }

  // FS_STATUS_UPDATE: Verify OpportunityCard property rendering
  const cardJsx = fileMap.get('frontend/src/components/OpportunityCard.jsx') || '';
  const rendersCompanyName = cardJsx.includes('company_name');

  if (rendersCompanyName) {
    results.push({
      id: 'FS_STATUS_UPDATE',
      name: 'Opportunity Property Data Binding',
      status: 'PASS',
      message: 'Opportunity card renders database company_name property correctly.',
    });
  } else {
    results.push({
      id: 'FS_STATUS_UPDATE',
      name: 'Opportunity Property Data Binding',
      status: 'FAIL',
      message: 'Opportunity card attempts to access opportunity.company instead of opportunity.company_name.',
      expected: 'opportunity.company_name',
      actual: 'opportunity.company',
    });
  }

  // FS_SUBMISSION: Verify ApplyModal GPA validation
  const modalJsx = fileMap.get('frontend/src/components/ApplyModal.jsx') || '';
  const hasRigidDecimalRegex = modalJsx.includes('^[0-4]\\.[0-9]{2}$') || modalJsx.includes('[0-9]{2}');
  const hasRangeCheck = modalJsx.includes('parseFloat') || modalJsx.includes('numGpa') || modalJsx.includes('4.0');

  if (!hasRigidDecimalRegex || hasRangeCheck) {
    results.push({
      id: 'FS_SUBMISSION',
      name: 'GPA Validation Range Check',
      status: 'PASS',
      message: 'GPA form validation allows flexible decimal points between 0.0 and 4.0.',
    });
  } else {
    results.push({
      id: 'FS_SUBMISSION',
      name: 'GPA Validation Range Check',
      status: 'FAIL',
      message: 'GPA validation uses rigid regex requiring exactly 2 decimal places.',
      expected: 'parseFloat(gpa) range check (0.0 - 4.0)',
      actual: 'Rigid /^[0-4]\\.[0-9]{2}$/ regex',
    });
  }

  return results;
}

/**
 * Controlled Assertions for Cybersecurity — SecureVault
 */
function runCybersecurityAssertions(fileMap) {
  const results = [];

  // CY_PASSWORD_EXPOSURE: Verify profile API does not leak debug passwords
  const backendIndex = fileMap.get('backend/src/index.js') || '';
  const leaksPlaintextDebug = backendIndex.includes('plaintext_password_debug');

  if (!leaksPlaintextDebug) {
    results.push({
      id: 'CY_PASSWORD_EXPOSURE',
      name: 'Plaintext Credential Sanitization',
      status: 'PASS',
      message: 'User profile API responses omit debug plaintext password properties.',
    });
  } else {
    results.push({
      id: 'CY_PASSWORD_EXPOSURE',
      name: 'Plaintext Credential Sanitization',
      status: 'FAIL',
      message: 'API profile response leaks plaintext_password_debug in JSON payload.',
      expected: 'Omit plaintext password attributes',
      actual: 'plaintext_password_debug present in payload',
    });
  }

  // CY_IDOR_AUTHORIZATION: Verify document queries enforce owner authorization
  const checksDocumentOwnership =
    backendIndex.includes('owner_id = ?') ||
    backendIndex.includes('owner_id = req.user') ||
    backendIndex.includes('req.user.id') ||
    backendIndex.includes('WHERE id = ? AND owner_id = ?');

  const unauthenticatedQuery = backendIndex.includes('SELECT * FROM documents WHERE id = ?') && !backendIndex.includes('owner_id');

  if (checksDocumentOwnership && !unauthenticatedQuery) {
    results.push({
      id: 'CY_IDOR_AUTHORIZATION',
      name: 'Object Level Authorization (IDOR)',
      status: 'PASS',
      message: 'Document endpoint verifies owner_id authorization before returning records.',
    });
  } else {
    results.push({
      id: 'CY_IDOR_AUTHORIZATION',
      name: 'Object Level Authorization (IDOR)',
      status: 'FAIL',
      message: 'Document route allows retrieving other users confidential files without owner_id check.',
      expected: 'WHERE id = ? AND owner_id = ?',
      actual: 'SELECT * FROM documents WHERE id = ?',
    });
  }

  // CY_SESSION_REVOCATION: Verify logout deletes session from database
  const handlesLogoutDelete =
    backendIndex.includes('DELETE FROM sessions WHERE token = ?') ||
    backendIndex.includes('DELETE FROM sessions WHERE') ||
    (backendIndex.includes('/api/auth/logout') && backendIndex.includes('DELETE FROM sessions'));

  if (handlesLogoutDelete) {
    results.push({
      id: 'CY_SESSION_REVOCATION',
      name: 'Server-Side Session Revocation',
      status: 'PASS',
      message: 'Logout endpoint revokes session tokens in database state.',
    });
  } else {
    results.push({
      id: 'CY_SESSION_REVOCATION',
      name: 'Server-Side Session Revocation',
      status: 'FAIL',
      message: 'Logout endpoint returns success without invalidating session token in database.',
      expected: 'DELETE FROM sessions WHERE token = ?',
      actual: 'Token retained in sessions table post-logout',
    });
  }

  // CY_XSS_PROTECTION: Verify Search page removes dangerouslySetInnerHTML
  const searchJsx = fileMap.get('frontend/src/pages/Search.jsx') || '';
  const usesDangerouslySetInnerHTML = searchJsx.includes('dangerouslySetInnerHTML');

  if (!usesDangerouslySetInnerHTML) {
    results.push({
      id: 'CY_XSS_PROTECTION',
      name: 'Reflected XSS Output Encoding',
      status: 'PASS',
      message: 'Search page uses safe text node rendering instead of dangerouslySetInnerHTML.',
    });
  } else {
    results.push({
      id: 'CY_XSS_PROTECTION',
      name: 'Reflected XSS Output Encoding',
      status: 'FAIL',
      message: 'Search query string rendered using dangerouslySetInnerHTML, enabling XSS injection.',
      expected: 'Safe text binding {lastQuery}',
      actual: 'dangerouslySetInnerHTML={{ __html: lastQuery }}',
    });
  }

  return results;
}
