'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { parseMarkdownLite } from '@/lib/markdown';
import MarkdownBlocks from '@/components/MarkdownBlocks';

export default function TutorialClient({ data }) {
  const { weekId, weekTitle, questionTitle, steps } = data;
  const [index, setIndex] = useState(0);

  const isFirst = index === 0;
  const isLast = index === steps.length - 1;
  const currentStep = steps[index];
  const progressPercent = ((index + 1) / steps.length) * 100;

  const goPrev = useCallback(() => {
    setIndex((i) => Math.max(0, i - 1));
  }, []);

  const goNext = useCallback(() => {
    setIndex((i) => Math.min(steps.length - 1, i + 1));
  }, [steps.length]);

  // Keyboard navigation — a small, genuinely helpful touch for a step-by-step
  // guide; not a "motion effect", so it's fine on this deliberately calm page.
  useEffect(() => {
    function handleKey(e) {
      if (e.key === 'ArrowLeft') goPrev();
      if (e.key === 'ArrowRight') goNext();
    }
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [goPrev, goNext]);

  const blocks = parseMarkdownLite(currentStep.text);

  return (
    <div className="tutorial-shell">
      <div className="tutorial-header">
        <Link href={`/week/${weekId}`} className="back-link">
          ← Back to Week {weekId}
        </Link>
        <div className="eyebrow" style={{ marginTop: 12 }}>
          {weekTitle}
        </div>
        <h1 style={{ fontSize: 28 }}>{questionTitle}</h1>
      </div>

      <div className="progress-track">
        <div className="progress-fill" style={{ width: `${progressPercent}%` }} />
      </div>

      <div className="step-content">
        <div className="step-content-inner" key={currentStep.id}>
          <div className="step-number-badge">{index + 1}</div>
          {currentStep.image && <img src={currentStep.image} alt={`Step ${index + 1}`} />}
          {blocks.length > 0 ? (
            <MarkdownBlocks blocks={blocks} />
          ) : (
            <p style={{ color: 'var(--text-muted)' }}>No text added for this step yet.</p>
          )}
        </div>
      </div>

      <div className="step-nav">
        <button className="nav-button" onClick={goPrev} disabled={isFirst}>
          ← Previous
        </button>
        <span className="step-counter">
          Step {index + 1} of {steps.length}
        </span>
        {isLast ? (
          <Link href={`/week/${weekId}`} className="nav-button primary">
            Finish
          </Link>
        ) : (
          <button className="nav-button primary" onClick={goNext}>
            Next →
          </button>
        )}
      </div>
    </div>
  );
}
