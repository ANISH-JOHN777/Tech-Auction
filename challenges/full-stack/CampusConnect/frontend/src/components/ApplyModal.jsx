import React, { useState } from 'react';

export default function ApplyModal({ opportunity, student, onSubmit, onClose }) {
  const [coverLetter, setCoverLetter] = useState('');
  const [gpa, setGpa] = useState(student.gpa || '3.8');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // BUG-04 Note: Rigid regex enforces 2 decimal places e.g., 3.80 instead of allowing 3.8 or floats
  const gpaRegex = /^[0-4]\.[0-9]{2}$/;

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');

    // BUG-04 validation failure:
    if (!gpaRegex.test(gpa.toString())) {
      setError('GPA format invalid. Must be formatted with exactly 2 decimal places (e.g. 3.80)');
      return;
    }

    setSubmitting(true);
    try {
      await onSubmit(opportunity.id, coverLetter, parseFloat(gpa));
      onClose();
    } catch (err) {
      setError(err.message || 'Failed to submit application');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyCenter: 'center', padding: '16px', zIndex: 100 }}>
      <div className="card" style={{ maxWidth: '500px', width: '100%', margin: '0 auto' }}>
        <h2 style={{ margin: '0 0 8px 0', color: '#60a5fa' }}>Apply to {opportunity.title}</h2>
        <p style={{ fontSize: '13px', color: '#94a3b8', marginBottom: '16px' }}>{opportunity.company_name}</p>

        {error && (
          <div style={{ backgroundColor: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.3)', color: '#f87171', padding: '10px', borderRadius: '6px', fontSize: '13px', marginBottom: '12px' }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: '12px' }}>
            <label style={{ fontSize: '12px', fontWeight: 'bold', color: '#cbd5e1' }}>CURRENT GPA</label>
            <input
              type="text"
              value={gpa}
              onChange={(e) => setGpa(e.target.value)}
              className="input"
            />
          </div>

          <div style={{ marginBottom: '16px' }}>
            <label style={{ fontSize: '12px', fontWeight: 'bold', color: '#cbd5e1' }}>COVER LETTER (OPTIONAL)</label>
            <textarea
              value={coverLetter}
              onChange={(e) => setCoverLetter(e.target.value)}
              rows={4}
              placeholder="Why are you a good fit for this role?"
              className="input"
            />
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
            <button type="button" onClick={onClose} className="btn" style={{ backgroundColor: '#475569' }}>
              Cancel
            </button>
            <button type="submit" disabled={submitting} className="btn">
              {submitting ? 'Submitting…' : 'Submit Application'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
