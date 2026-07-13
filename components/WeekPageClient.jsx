'use client';

import { useState } from 'react';
import Link from 'next/link';
import { parseMarkdownLite } from '@/lib/markdown';
import MarkdownBlocks from '@/components/MarkdownBlocks';

const TABS = [
  { key: 'prelab', label: 'Pre-Lab' },
  { key: 'postlab', label: 'Post-Lab' },
  { key: 'procedure', label: 'Procedure' },
];

export default function WeekPageClient({ week }) {
  const [activeTab, setActiveTab] = useState('prelab');
  const activeContent = week.theory[activeTab];
  const blocks = parseMarkdownLite(activeContent?.text);

  return (
    <div className="week-detail">
      <Link href="/" className="back-link">
        ← Back to home
      </Link>

      <h1>{week.title}</h1>
      <p className="week-desc">{week.desc}</p>

      <div className="tabs" role="tablist">
        {TABS.map((tab) => (
          <button
            key={tab.key}
            role="tab"
            aria-selected={activeTab === tab.key}
            className={`tab-button${activeTab === tab.key ? ' active' : ''}`}
            onClick={() => setActiveTab(tab.key)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="tab-panel" role="tabpanel">
        {activeContent?.image && <img src={activeContent.image} alt={`${activeTab} diagram`} />}
        {blocks.length > 0 ? (
          <MarkdownBlocks blocks={blocks} />
        ) : (
          <p style={{ color: 'var(--text-muted)' }}>No {activeTab} content added yet.</p>
        )}
      </div>

      <h2 style={{ marginTop: 48, marginBottom: 16, fontSize: 20 }}>Questions</h2>

      {week.questions.length === 0 ? (
        <p style={{ color: 'var(--text-muted)' }}>No questions added yet for this week.</p>
      ) : (
        <div className="question-list">
          {week.questions.map((q) => (
            <Link key={q.id} href={`/week/${week.id}/question/${q.id}`} className="question-item">
              <span>{q.title}</span>
              <span className="q-meta">{q.stepCount} steps</span>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
