const API_URL = 'http://localhost:5000/api';

export async function loginStudent(email, password) {
  const res = await fetch(`${API_URL}/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  return res.json();
}

export async function fetchOpportunities(searchQuery = '') {
  const url = searchQuery
    ? `${API_URL}/opportunities?search=${encodeURIComponent(searchQuery)}`
    : `${API_URL}/opportunities`;
  const res = await fetch(url);
  return res.json();
}

export async function fetchApplications(studentId) {
  const res = await fetch(`${API_URL}/applications?student_id=${studentId}`);
  return res.json();
}

// BUG-07 Note: Uses HTTP PUT method and camelCase payload keys (opportunityId, coverLetter)
// Expected by backend: POST method and snake_case keys (opportunity_id, cover_letter)
export async function applyOpportunity(studentId, opportunityId, coverLetter, gpa) {
  const res = await fetch(`${API_URL}/applications`, {
    method: 'PUT', // BUG-07: Backend expects POST
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      student_id: studentId,
      opportunityId: opportunityId, // BUG-07: Backend expects opportunity_id
      coverLetter: coverLetter, // BUG-07: Backend expects cover_letter
      gpa,
    }),
  });
  return res.json();
}

export async function fetchAdminStudents() {
  const res = await fetch(`${API_URL}/admin/students`);
  return res.json();
}

export async function fetchAdminApplications() {
  const res = await fetch(`${API_URL}/admin/applications`);
  return res.json();
}
