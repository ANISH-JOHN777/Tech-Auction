import { query } from '../db/postgres.js';
import { teamRepository } from '../db/repositories/team.repository.js';

function parseCSVLine(line) {
  const result = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === ',' && !inQuotes) {
      result.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }
  result.push(current.trim());
  return result;
}

export async function parseAndImportCSV(csvText) {
  if (!csvText || typeof csvText !== 'string' || !csvText.trim()) {
    throw new Error('CSV content is empty.');
  }

  const lines = csvText.split(/\r?\n/).filter((l) => l.trim().length > 0);
  if (lines.length < 2) {
    throw new Error('CSV must contain a header row and at least one data row.');
  }

  const rawHeaders = parseCSVLine(lines[0]);
  const headers = rawHeaders.map((h) => h.toLowerCase().replace(/[^a-z0-9_]/g, '_'));

  // Mandatory header checks
  const requiredFields = ['team_name', 'member_name'];
  const missingHeaders = requiredFields.filter((f) => !headers.includes(f));

  if (missingHeaders.length > 0) {
    throw new Error(`CSV is missing required header columns: ${missingHeaders.join(', ')}`);
  }

  const getColIndex = (name) => headers.indexOf(name);
  const teamNameIdx = getColIndex('team_name');
  const memberNameIdx = getColIndex('member_name');
  const collegeIdx = getColIndex('college');
  const deptIdx = getColIndex('department');
  const emailIdx = getColIndex('member_email') !== -1 ? getColIndex('member_email') : getColIndex('email');
  const phoneIdx = getColIndex('member_phone') !== -1 ? getColIndex('member_phone') : getColIndex('phone');
  const challengeIdx = getColIndex('challenge');
  const teamCodeIdx = getColIndex('team_code') !== -1 ? getColIndex('team_code') : getColIndex('code');
  const pinIdx = getColIndex('pin');

  const rows = [];
  const invalidRows = [];

  for (let i = 1; i < lines.length; i++) {
    const cols = parseCSVLine(lines[i]);
    const teamName = cols[teamNameIdx];
    const memberName = cols[memberNameIdx];

    if (!teamName || !memberName) {
      invalidRows.push({ row: i + 1, text: lines[i], reason: 'Missing team_name or member_name' });
      continue;
    }

    rows.push({
      line: i + 1,
      teamName,
      memberName,
      college: collegeIdx !== -1 && cols[collegeIdx] ? cols[collegeIdx] : 'SNS College of Technology',
      department: deptIdx !== -1 && cols[deptIdx] ? cols[deptIdx] : 'Department of IT',
      email: emailIdx !== -1 ? cols[emailIdx] : '',
      phone: phoneIdx !== -1 ? cols[phoneIdx] : '',
      challenge: challengeIdx !== -1 && cols[challengeIdx] ? cols[challengeIdx].toLowerCase() : null,
      teamCode: teamCodeIdx !== -1 && cols[teamCodeIdx] ? cols[teamCodeIdx].toUpperCase() : null,
      pin: pinIdx !== -1 && cols[pinIdx] ? cols[pinIdx] : '1234',
    });
  }

  // Group rows by team
  const teamsMap = new Map();
  for (const row of rows) {
    const key = row.teamCode || row.teamName.toLowerCase().replace(/\s+/g, '_');
    if (!teamsMap.has(key)) {
      teamsMap.set(key, {
        teamName: row.teamName,
        teamCode: row.teamCode,
        college: row.college,
        department: row.department,
        challenge: row.challenge,
        pin: row.pin,
        members: [],
      });
    }
    teamsMap.get(key).members.push({
      name: row.memberName,
      email: row.email,
      phone: row.phone,
    });
  }

  let importedTeamsCount = 0;
  let importedMembersCount = 0;
  let skippedDuplicateTeamsCount = 0;
  const importedTeamsDetails = [];

  let codeCounter = 101;

  for (const [key, teamData] of teamsMap.entries()) {
    let existing = null;
    if (teamData.teamCode) {
      existing = await teamRepository.findByCode(teamData.teamCode);
    }
    if (!existing) {
      existing = await teamRepository.findByName(teamData.teamName);
    }

    let teamId;
    let teamCode = teamData.teamCode;

    if (existing) {
      skippedDuplicateTeamsCount++;
      teamId = existing.id;
      teamCode = existing.code;
    } else {
      if (!teamCode) {
        while (true) {
          const generated = `TA${codeCounter++}`;
          const check = await teamRepository.findByCode(generated);
          if (!check) {
            teamCode = generated;
            break;
          }
        }
      }

      const validChallenge = ['full-stack', 'cybersecurity'].includes(teamData.challenge) ? teamData.challenge : null;
      const createdTeam = await teamRepository.createTeam({
        code: teamCode,
        name: teamData.teamName,
        pin: teamData.pin || '1234',
        college: teamData.college,
        department: teamData.department,
        challenge: validChallenge,
        wallet: 1000,
        auction_eligible: 1,
        login_enabled: 1,
      });
      teamId = createdTeam.id;
      importedTeamsCount++;

      const regCode = `REG_${teamCode}_${Date.now()}`;
      await query(
        `INSERT INTO registrations (registration_code, team_id, source, imported_at) VALUES ($1, $2, 'csv_import', NOW())`,
        [regCode, teamId]
      );
    }

    for (const member of teamData.members) {
      const existingMembers = await teamRepository.getMembers(teamId);
      const existingMember = existingMembers.find((m) => m.name.toLowerCase() === member.name.toLowerCase());
      if (!existingMember) {
        await teamRepository.addMember(teamId, member);
        importedMembersCount++;
      }
    }

    importedTeamsDetails.push({
      teamCode,
      name: teamData.teamName,
      membersCount: teamData.members.length,
      status: existing ? 'SKIPPED_EXISTING' : 'IMPORTED',
    });
  }

  return {
    importedTeamsCount,
    importedMembersCount,
    skippedDuplicateTeamsCount,
    invalidRowsCount: invalidRows.length,
    invalidRows,
    importedTeamsDetails,
  };
}
