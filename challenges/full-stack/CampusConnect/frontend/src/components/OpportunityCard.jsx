import React from 'react';

export default function OpportunityCard({ opportunity, onApplyClick, isApplied }) {
  return (
    <div className="card">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h3 style={{ margin: '0 0 4px 0', color: '#60a5fa' }}>{opportunity.title}</h3>
          
          {/* BUG-02 Note: Renders opportunity.company instead of opportunity.company_name */}
          <div style={{ color: '#e2e8f0', fontWeight: 'bold', fontSize: '14px', marginBottom: '8px' }}>
            {opportunity.company || <span style={{ color: '#64748b', fontStyle: 'italic' }}>Company details unavailable</span>}
          </div>
        </div>

        <span className="badge badge-pending">STIPEND: ₹{opportunity.stipend?.toLocaleString()}/mo</span>
      </div>

      <div style={{ fontSize: '13px', color: '#94a3b8', margin: '12px 0' }}>
        <div><b>Role:</b> {opportunity.role}</div>
        <div><b>Location:</b> {opportunity.location}</div>
        <div><b>Requirements:</b> {opportunity.requirements}</div>
        <div><b>Deadline:</b> {opportunity.deadline}</div>
      </div>

      <div style={{ marginTop: '16px' }}>
        {isApplied ? (
          <button disabled className="btn" style={{ backgroundColor: '#334155', cursor: 'not-allowed' }}>
            Application Submitted
          </button>
        ) : (
          <button onClick={() => onApplyClick(opportunity)} className="btn">
            Apply Now
          </button>
        )}
      </div>
    </div>
  );
}
