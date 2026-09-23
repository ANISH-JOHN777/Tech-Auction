import React, { useState, useEffect } from 'react';

export default function Timer({ initialSeconds = 7200, label = 'EVENT TIME REMAINING' }) {
  const [secondsLeft, setSecondsLeft] = useState(initialSeconds);

  useEffect(() => {
    if (secondsLeft <= 0) return;
    const interval = setInterval(() => {
      setSecondsLeft((prev) => Math.max(0, prev - 1));
    }, 1000);
    return () => clearInterval(interval);
  }, [secondsLeft]);

  const hours = Math.floor(secondsLeft / 3600);
  const minutes = Math.floor((secondsLeft % 3600) / 60);
  const seconds = secondsLeft % 60;

  const pad = (n) => String(n).padStart(2, '0');

  return (
    <div className="bg-zinc-900 border border-zinc-800 p-4 rounded-xl flex items-center justify-between">
      <span className="text-xs text-zinc-400 font-bold uppercase tracking-wider">{label}</span>
      <div className="font-mono text-xl font-black text-amber-400 tracking-widest">
        {pad(hours)}:{pad(minutes)}:{pad(seconds)}
      </div>
    </div>
  );
}
