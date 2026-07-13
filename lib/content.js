// lib/content.js
//
// These functions only ever run on the server / at build time (inside Next.js
// Server Components), never in the browser — that's what makes it safe to use
// Node's `fs` here. They read public/content/manifest.json (already generated
// by scripts/generate-manifest.mjs) plus the actual .md text files, and hand
// back plain JS objects/arrays ready to pass into Client Components as props.

import fs from 'node:fs';
import path from 'node:path';

const CONTENT_DIR = path.join(process.cwd(), 'public', 'content');

let cachedManifest = null;

export function getManifest() {
  if (cachedManifest) return cachedManifest;
  const manifestPath = path.join(CONTENT_DIR, 'manifest.json');
  if (!fs.existsSync(manifestPath)) {
    // Should not normally happen — `npm run dev`/`build` always regenerate it first.
    // Fallback keeps the site from hard-crashing if someone runs `next dev` directly.
    return { totalWeeks: 11, weeks: [], warnings: ['manifest.json not found — run `npm run manifest`.'] };
  }
  cachedManifest = JSON.parse(fs.readFileSync(manifestPath, 'utf-8'));
  return cachedManifest;
}

function readText(weekId, filename) {
  const p = path.join(CONTENT_DIR, `week${weekId}`, filename);
  if (!fs.existsSync(p)) return '';
  return fs.readFileSync(p, 'utf-8').trim();
}

// All 11 weeks, for the home page card list. Weeks without content still appear
// (as a locked/coming-soon card) — the site always shows all 11, per the brief.
export function getAllWeekSummaries() {
  const manifest = getManifest();
  return manifest.weeks.map((w) => ({
    id: w.id,
    hasContent: w.hasContent,
    title: w.title || `Week ${w.id}`,
    desc: w.desc || 'Content coming soon.',
    cover: w.cover,
  }));
}

// Full detail for a single week page: theory text/images + question list (titles only).
export function getWeekDetail(weekId) {
  const manifest = getManifest();
  const week = manifest.weeks.find((w) => w.id === Number(weekId));
  if (!week || !week.hasContent) return null;

  const theory = {};
  for (const type of ['prelab', 'postlab', 'procedure']) {
    theory[type] = {
      text: week.theory[type].hasText ? readText(weekId, `w${weekId}_${type}.md`) : '',
      image: week.theory[type].image,
    };
  }

  return {
    id: week.id,
    title: week.title,
    desc: week.desc,
    cover: week.cover,
    theory,
    questions: week.questions.map((q) => ({ id: q.id, title: q.title, stepCount: q.stepCount })),
  };
}

// Full step-by-step content for one question (used by the tutorial page).
// All step text is read once at build time and baked into the static page —
// prev/next navigation at runtime is just array-index changes, no fetching.
export function getQuestionSteps(weekId, questionId) {
  const manifest = getManifest();
  const week = manifest.weeks.find((w) => w.id === Number(weekId));
  if (!week) return null;
  const question = week.questions.find((q) => q.id === Number(questionId));
  if (!question) return null;

  const steps = question.steps.map((s) => ({
    id: s.id,
    text: s.hasText ? readText(weekId, `w${weekId}_q${questionId}_s${s.id}.md`) : '',
    image: s.image,
  }));

  return {
    weekId: Number(weekId),
    weekTitle: week.title,
    questionId: Number(questionId),
    questionTitle: question.title,
    steps,
  };
}

// Every (weekId, questionId) pair that currently exists — used by
// generateStaticParams so Next.js knows which tutorial pages to pre-build.
export function getAllQuestionParams() {
  const manifest = getManifest();
  const params = [];
  for (const week of manifest.weeks) {
    for (const q of week.questions) {
      params.push({ weekId: String(week.id), questionId: String(q.id) });
    }
  }
  return params;
}

export function getAllWeekParams() {
  const manifest = getManifest();
  return manifest.weeks.map((w) => ({ weekId: String(w.id) }));
}
