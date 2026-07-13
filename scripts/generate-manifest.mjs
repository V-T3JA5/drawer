// scripts/generate-manifest.mjs
//
// Scans public/content/week1 ... week11 and writes public/content/manifest.json
// describing what exists: which weeks have content, which questions each week has,
// how many steps each question has, and which images are present.
//
// This runs automatically before every `npm run dev` and `npm run build` (see package.json).
// You never need to edit this file or manifest.json by hand — just drop content files
// into public/content/weekN/ following the naming convention in README.md and re-run
// (or just push to GitHub — Vercel will run `npm run build` automatically, which runs this first).

import fs from 'node:fs';
import path from 'node:path';

const TOTAL_WEEKS = 11;
const IMAGE_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.webp', '.svg'];
const CONTENT_DIR = path.join(process.cwd(), 'public', 'content');

function findFileWithAnyExtension(dir, baseName) {
  for (const ext of IMAGE_EXTENSIONS) {
    const candidate = path.join(dir, baseName + ext);
    if (fs.existsSync(candidate)) {
      // Return a web-usable path (relative to /public)
      return `/content/${path.basename(dir)}/${baseName}${ext}`;
    }
  }
  return null;
}

function readTextIfExists(dir, filename) {
  const p = path.join(dir, filename);
  if (!fs.existsSync(p)) return null;
  return fs.readFileSync(p, 'utf-8').trim();
}

function scanWeek(weekNum) {
  const folderName = `week${weekNum}`;
  const dir = path.join(CONTENT_DIR, folderName);
  const warnings = [];

  const base = {
    id: weekNum,
    hasContent: false,
    title: null,
    desc: null,
    cover: null,
    theory: {
      prelab: { hasText: false, image: null },
      postlab: { hasText: false, image: null },
      procedure: { hasText: false, image: null },
    },
    questions: [],
  };

  if (!fs.existsSync(dir)) {
    return { week: base, warnings };
  }

  const titleText = readTextIfExists(dir, `w${weekNum}_title.md`);
  if (!titleText) {
    // Folder exists but no title file yet — treat as not ready, but don't crash the build.
    warnings.push(`week${weekNum}: folder exists but w${weekNum}_title.md is missing — card will show as "coming soon".`);
    return { week: base, warnings };
  }

  base.hasContent = true;
  base.title = titleText;
  base.desc = readTextIfExists(dir, `w${weekNum}_desc.md`) || '';
  base.cover = findFileWithAnyExtension(dir, `w${weekNum}_cover`);
  if (!base.cover) {
    warnings.push(`week${weekNum}: no cover image found (w${weekNum}_cover.jpg/.png/.webp).`);
  }

  // Theory sections
  for (const type of ['prelab', 'postlab', 'procedure']) {
    const hasText = readTextIfExists(dir, `w${weekNum}_${type}.md`) !== null;
    const image = findFileWithAnyExtension(dir, `w${weekNum}_${type}`);
    base.theory[type] = { hasText, image };
  }

  // Questions: find all w{N}_q{Q}_title.md files present
  const files = fs.readdirSync(dir);
  const questionTitleRe = new RegExp(`^w${weekNum}_q(\\d+)_title\\.md$`);
  const questionNumbers = files
    .map((f) => {
      const m = f.match(questionTitleRe);
      return m ? parseInt(m[1], 10) : null;
    })
    .filter((n) => n !== null)
    .sort((a, b) => a - b);

  for (const q of questionNumbers) {
    const qTitle = readTextIfExists(dir, `w${weekNum}_q${q}_title.md`) || `Question ${q}`;

    const stepRe = new RegExp(`^w${weekNum}_q${q}_s(\\d+)\\.md$`);
    const stepNumbers = files
      .map((f) => {
        const m = f.match(stepRe);
        return m ? parseInt(m[1], 10) : null;
      })
      .filter((n) => n !== null)
      .sort((a, b) => a - b);

    if (stepNumbers.length === 0) {
      warnings.push(`week${weekNum} q${q}: has a title but no steps found (w${weekNum}_q${q}_s1.md etc missing).`);
    } else {
      // Gap check: warn if numbering skips (e.g. s1, s2, s4 — missing s3)
      const maxStep = stepNumbers[stepNumbers.length - 1];
      for (let i = 1; i <= maxStep; i++) {
        if (!stepNumbers.includes(i)) {
          warnings.push(`week${weekNum} q${q}: step s${i} is missing (found steps: ${stepNumbers.join(', ')}) — numbering has a gap.`);
        }
      }
    }

    const steps = stepNumbers.map((s) => ({
      id: s,
      hasText: readTextIfExists(dir, `w${weekNum}_q${q}_s${s}.md`) !== null,
      image: findFileWithAnyExtension(dir, `w${weekNum}_q${q}_s${s}`),
    }));

    base.questions.push({ id: q, title: qTitle, stepCount: steps.length, steps });
  }

  if (questionNumbers.length === 0) {
    warnings.push(`week${weekNum}: no questions found yet (w${weekNum}_q1_title.md etc missing).`);
  }

  return { week: base, warnings };
}

function main() {
  const weeks = [];
  const allWarnings = [];

  for (let n = 1; n <= TOTAL_WEEKS; n++) {
    const { week, warnings } = scanWeek(n);
    weeks.push(week);
    allWarnings.push(...warnings);
  }

  const manifest = {
    generatedAt: new Date().toISOString(),
    totalWeeks: TOTAL_WEEKS,
    weeks,
    warnings: allWarnings,
  };

  if (!fs.existsSync(CONTENT_DIR)) {
    fs.mkdirSync(CONTENT_DIR, { recursive: true });
  }

  fs.writeFileSync(
    path.join(CONTENT_DIR, 'manifest.json'),
    JSON.stringify(manifest, null, 2)
  );

  console.log(`[generate-manifest] Wrote manifest.json — ${weeks.filter(w => w.hasContent).length}/${TOTAL_WEEKS} weeks have content.`);
  if (allWarnings.length > 0) {
    console.log(`[generate-manifest] ${allWarnings.length} warning(s):`);
    allWarnings.forEach((w) => console.log('  - ' + w));
  }
}

main();
