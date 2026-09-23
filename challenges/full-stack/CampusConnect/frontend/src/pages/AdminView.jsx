import React, { useState, useEffect } from 'react';
import { fetchAdminStudents, fetchAdminApplications } from '../services/api';

export default function AdminView() {
  const [students, setStudents] = useState([]);
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadAdminData() {
      setLoading(true);
      try {
        const sRes = await fetchAdminStudents();
        if (sRes.success) setStudents(sRes.students);

        const aRes = await fetchAdminApplications();
        if (aRes.success) setApplications(aRes.applications);
      } catch (err) {
        console.error('Failed to load admin data:', err);
      } finally {
        setLoading(false);
      }
    }
    loadAdminData();
  }, []);

  return (
    <div className="container">
      <div className="card">
        <h2 style={{ margin: '0 0 4px 0', color: '#60a5fa' }}>CampusConnect Administration</h2>
        <p style={{ margin: 0, fontSize: '12px', color: '#94a3b8' }}>Campus placement office administration & audit overview</p>
      </div>

      {loading ? (
        <div style={{ color: '#94a3b8', padding: '32px', textAlign: 'center' }}>Loading admin records…</div>
      ) : (
        <>
          <div className="card">
            <h3 style={{ marginTop: 0, color: '#f8fafc' }}>Registered Students ({students.length})</h3>
            <table style={{ width: '100%', textLeft: 'left', borderCollapse: 'collapse', fontSize: '13px' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid #334155', color: '#94a3b8' }}>
                  <th style={{ padding: '8px' }}>ID</th>
                  <th style={{ padding: '8px' }}>Name</th>
                  <th style={{ padding: '8px' }}>Email</th>
                  <th style={{ padding: '8px' }}>Department</th>
                  <th style={{ padding: '8px' }}>GPA</th>
                </tr>
              </thead>
              <tbody>
                {students.map((s) => (
                  <tr key={s.id} style={{ borderBottom: '1px solid #1e293b' }}>
                    <td style={{ padding: '8px' }}>{s.id}</td>
                    <td style={{ padding: '8px', fontWeight: 'bold' }}>{s.name}</td>
                    <td style={{ padding: '8px' }}>{s.email}</td>
                    <td style={{ padding: '8px' }}>{s.department}</td>
                    <td style={{ padding: '8px' }}>{s.gpa}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="card">
            <h3 style={{ marginTop: 0, color: '#f8fafc' }}>Submitted Applications ({applications.length})</h3>
            <table style={{ width: '100%', textLeft: 'left', borderCollapse: 'collapse', fontSize: '13px' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid #334155', color: '#94a3b8' }}>
                  <th style={{ padding: '8px' }}>App ID</th>
                  <th style={{ padding: '8px' }}>Student</th>
                  <th style={{ padding: '8px' }}>Company</th>
                  <th style={{ padding: '8px' }}>Opportunity Title</th>
                  <th style={{ padding: '8px' }}>Status</th>
                </tr>
              </thead>
              <tbody>
                {applications.map((a) => (
                  <tr key={a.id} style={{ borderBottom: '1px solid #1e293b' }}>
                    <td style={{ padding: '8px' }}>#{a.id}</td>
                    <td style={{ padding: '8px', fontWeight: 'bold' }}>{a.student_name}</td>
                    <td style={{ padding: '8px' }}>{a.company_name}</td>
                    <td style={{ padding: '8px' }}>{a.title}</td>
                    <td style={{ padding: '8px' }}>
                      <span className="badge badge-pending">{a.status}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
