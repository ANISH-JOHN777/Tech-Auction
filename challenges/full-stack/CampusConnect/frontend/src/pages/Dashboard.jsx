import React, { useState, useEffect } from 'react';
import OpportunityCard from '../components/OpportunityCard';
import ApplyModal from '../components/ApplyModal';
import { fetchOpportunities, fetchApplications, applyOpportunity } from '../services/api';

export default function Dashboard({ student }) {
  const [opportunities, setOpportunities] = useState([]);
  const [applications, setApplications] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedOpportunity, setSelectedOpportunity] = useState(null);
  const [loading, setLoading] = useState(true);

  async function loadData(query = '') {
    setLoading(true);
    try {
      const oppRes = await fetchOpportunities(query);
      if (oppRes.success) setOpportunities(oppRes.opportunities);

      const appRes = await fetchApplications(student.id);
      if (appRes.success) setApplications(appRes.applications);
    } catch (err) {
      console.error('Failed to load portal data:', err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  function handleSearchSubmit(e) {
    e.preventDefault();
    loadData(searchQuery);
  }

  async function handleApplySubmit(opportunityId, coverLetter, gpa) {
    const res = await applyOpportunity(student.id, opportunityId, coverLetter, gpa);
    if (!res.success) {
      throw new Error(res.error || 'Failed to submit application');
    }

    // BUG-06 Note: Direct state array mutation without calling setApplications triggers stale React render
    applications.push(res.application);
    // setApplications([...applications, res.application]); // Intended fix
  }

  const appliedOppIds = new Set(applications.map((a) => a.opportunity_id));

  return (
    <div className="container">
      <div className="card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 style={{ margin: 0, color: '#60a5fa' }}>Welcome, {student.name}</h1>
          <p style={{ margin: '4px 0 0 0', fontSize: '13px', color: '#94a3b8' }}>
            Department: {student.department} | GPA: {student.gpa}
          </p>
        </div>
        <div style={{ textAlign: 'right' }}>
          <span className="badge badge-approved" style={{ fontSize: '13px' }}>
            MY APPLICATIONS: {applications.length}
          </span>
        </div>
      </div>

      <div style={{ margin: '24px 0' }}>
        <form onSubmit={handleSearchSubmit} style={{ display: 'flex', gap: '8px' }}>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search opportunities by title or company…"
            className="input"
            style={{ marginTop: 0 }}
          />
          <button type="submit" className="btn">
            Search
          </button>
        </form>
      </div>

      <h2 style={{ fontSize: '18px', color: '#f8fafc', marginBottom: '16px' }}>Available Placement & Internship Opportunities</h2>

      {loading ? (
        <div style={{ color: '#94a3b8', fontSize: '14px', textAlign: 'center', padding: '32px' }}>
          Loading placement opportunities…
        </div>
      ) : opportunities.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', color: '#94a3b8' }}>
          No placement opportunities found matching your search.
        </div>
      ) : (
        opportunities.map((opp) => (
          <OpportunityCard
            key={opp.id}
            opportunity={opp}
            isApplied={appliedOppIds.has(opp.id)}
            onApplyClick={(o) => setSelectedOpportunity(o)}
          />
        ))
      )}

      {selectedOpportunity && (
        <ApplyModal
          opportunity={selectedOpportunity}
          student={student}
          onSubmit={handleApplySubmit}
          onClose={() => setSelectedOpportunity(null)}
        />
      )}
    </div>
  );
}
