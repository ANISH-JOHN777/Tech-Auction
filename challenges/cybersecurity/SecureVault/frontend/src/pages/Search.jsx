import React, { useState } from 'react';
import { searchVault } from '../services/api';

export default function Search() {
  const [query, setQuery] = useState('');
  const [lastQuery, setLastQuery] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);

  async function handleSearch(e) {
    e.preventDefault();
    if (!query) return;
    setLoading(true);

    try {
      const res = await searchVault(query);
      if (res.success) {
        setResults(res.results);
        setLastQuery(res.query);
      }
    } catch (err) {
      console.error('Search failed:', err);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="container">
      <div className="card">
        <h2 style={{ margin: '0 0 4px 0', color: '#38bdf8' }}>Vault Records Search</h2>
        <p style={{ margin: '0 0 16px 0', fontSize: '12px', color: '#8b949e' }}>
          Search confidential documents by keywords (CASE-03 Reflected XSS Test Target).
        </p>

        <form onSubmit={handleSearch} style={{ display: 'flex', gap: '8px' }}>
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Enter search query parameter…"
            className="input"
            style={{ marginTop: 0 }}
          />
          <button type="submit" className="btn">
            Search
          </button>
        </form>
      </div>

      {lastQuery && (
        <div className="card">
          {/* CASE-03: Reflected XSS vulnerability parameter dangerouslySetInnerHTML */}
          <div
            style={{ fontSize: '14px', color: '#f0f6fc', marginBottom: '16px', borderBottom: '1px solid #30363d', paddingBottom: '8px' }}
            dangerouslySetInnerHTML={{ __html: `Search Results for query parameter: <b>${lastQuery}</b>` }}
          />

          {loading ? (
            <div style={{ color: '#8b949e', padding: '16px', textAlign: 'center' }}>Searching database…</div>
          ) : results.length === 0 ? (
            <div style={{ color: '#8b949e', fontSize: '13px' }}>No records match your query term.</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {results.map((r) => (
                <div key={r.id} style={{ backgroundColor: '#0d1117', padding: '10px 14px', borderRadius: '4px', border: '1px solid #30363d', fontSize: '13px' }}>
                  <b style={{ color: '#38bdf8' }}>#{r.id} {r.title}</b> — <span className="badge badge-secret">{r.classification}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
