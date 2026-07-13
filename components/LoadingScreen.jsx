'use client';

import { useEffect, useState } from 'react';

// Total time before the loading screen dismisses itself and calls onDone().
// Keep in sync with the CSS animation durations below if you change timing.
const TOTAL_DURATION_MS = 2200;

export default function LoadingScreen({ onDone }) {
  const [hidden, setHidden] = useState(false);

  useEffect(() => {
    const dismissTimer = setTimeout(() => setHidden(true), TOTAL_DURATION_MS);
    const doneTimer = setTimeout(() => onDone?.(), TOTAL_DURATION_MS + 500); // +500ms = CSS fade-out duration
    return () => {
      clearTimeout(dismissTimer);
      clearTimeout(doneTimer);
    };
  }, [onDone]);

  return (
    <div className={`loading-screen${hidden ? ' hidden' : ''}`}>
      <div style={{ textAlign: 'center' }}>
        {/* Drafting-compass line-drawing, traced via stroke-dashoffset */}
        <svg viewBox="0 0 280 220" xmlns="http://www.w3.org/2000/svg">
          <path
            className="loading-trace"
            d="M140 30 L60 178"
            style={{ strokeDasharray: 220, strokeDashoffset: 220, animation: 'traceLine 0.7s ease forwards 0.1s' }}
          />
          <path
            className="loading-trace"
            d="M140 30 L220 178"
            style={{ strokeDasharray: 220, strokeDashoffset: 220, animation: 'traceLine 0.7s ease forwards 0.35s' }}
          />
          <path
            className="loading-trace"
            d="M140 30 L140 8"
            style={{ strokeDasharray: 40, strokeDashoffset: 40, animation: 'traceLine 0.3s ease forwards 0.05s' }}
          />
          <path
            className="loading-trace"
            d="M 60 178 A 90 90 0 0 0 220 178"
            style={{ strokeDasharray: 260, strokeDashoffset: 260, animation: 'traceLine 0.9s ease forwards 0.75s' }}
          />
        </svg>

        <div
          style={{
            fontFamily: 'var(--font-heading)',
            fontSize: 22,
            letterSpacing: '0.15em',
            color: 'var(--text)',
            marginTop: 8,
            opacity: 0,
            animation: 'fadeInText 0.6s ease forwards 1.5s',
          }}
        >
          DRAW<span style={{ color: 'var(--amber)' }}>ER</span>
        </div>
      </div>

      <style>{`
        @keyframes traceLine {
          to { stroke-dashoffset: 0; }
        }
        @keyframes fadeInText {
          to { opacity: 1; }
        }
      `}</style>
    </div>
  );
}
