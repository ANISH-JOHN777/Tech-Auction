import React, { useState } from 'react';
import ImportResult from '../../components/admin/ImportResult';
import { api } from '../../services/api';

const SAMPLE_CSV = `team_name,college,department,member_name,member_email,member_phone,challenge,team_code,pin
Cyber Sentinel,SNS College of Technology,Department of IT,David Miller,david@snscet.ac.in,9876543210,cybersecurity,CY02,1234
Cyber Sentinel,SNS College of Technology,Department of IT,Elena Rostova,elena@snscet.ac.in,9876543211,cybersecurity,CY02,1234
Code Crafters,SNS College of Technology,Department of IT,Alex Rivera,alex@snscet.ac.in,9876543212,full-stack,FS03,1234`;

export default function RegistrationImport({ onImportComplete }) {
  const [csvText, setCsvText] = useState('');
  const [importing, setImporting] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState(null);

  async function handleImport(e) {
    e.preventDefault();
    if (!csvText.trim()) return;
    setImporting(true);
    setError('');
    setResult(null);

    try {
      const data = await api.importRegistrations(csvText);
      setResult(data);
      if (onImportComplete) onImportComplete();
    } catch (err) {
      setError(err.message);
    } finally {
      setImporting(false);
    }
  }

  function handleLoadSample() {
    setCsvText(SAMPLE_CSV);
  }

  return (
    <div className="space-y-6">
      <div className="bg-zinc-900 border border-zinc-800 p-6 rounded-xl">
        <h2 className="text-xl font-black text-white">GOOGLE FORM / CSV REGISTRATION IMPORT</h2>
        <p className="text-xs text-zinc-400 mt-1">
          Paste responses from Google Forms export CSV or custom registration spreadsheet.
        </p>
      </div>

      {error && (
        <div className="bg-red-500/10 border border-red-500/30 text-red-400 text-xs p-3 rounded-lg">
          {error}
        </div>
      )}

      <form onSubmit={handleImport} className="space-y-4 bg-zinc-900 border border-zinc-800 p-6 rounded-xl">
        <div className="flex justify-between items-center">
          <label className="text-xs font-bold text-zinc-400 uppercase">CSV DATA TEXT</label>
          <button
            type="button"
            onClick={handleLoadSample}
            className="text-xs text-amber-400 hover:underline font-mono"
          >
            Load Sample CSV
          </button>
        </div>

        <textarea
          value={csvText}
          onChange={(e) => setCsvText(e.target.value)}
          placeholder="Paste CSV rows here..."
          rows={8}
          className="w-full bg-zinc-950 border border-zinc-800 focus:border-amber-500 text-zinc-100 font-mono text-xs p-4 rounded-lg outline-none"
        />

        <div className="flex justify-end gap-3">
          <button
            type="submit"
            disabled={importing || !csvText.trim()}
            className="gold-button px-6 py-3 rounded-lg font-bold text-xs uppercase"
          >
            {importing ? 'IMPORTING REGISTRATIONS…' : 'IMPORT REGISTRATIONS'}
          </button>
        </div>
      </form>

      {result && <ImportResult result={result} />}
    </div>
  );
}
