// lib/markdown.js
//
// Deliberately NOT using a full markdown library (react-markdown/remark/etc).
// Content here is simple (bold text, bullet lists, paragraphs) and this keeps
// the dependency list small — fewer packages that can go out of date or fail
// to install cleanly. If you later need tables, links, images-in-text, etc.,
// swap this file out for `react-markdown` and update the two components that
// import { renderMarkdownLite } from here.

function escapeHtml(str) {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function inlineFormat(line) {
  // **bold** only — intentionally minimal
  return escapeHtml(line).replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
}

// Returns an array of block descriptors: { type: 'p' | 'ul' | 'h2', html }
// so the calling component can render actual React elements (no dangerouslySetInnerHTML
// needed at the block level — only for the inline bold formatting within each block).
export function parseMarkdownLite(text) {
  if (!text) return [];

  const lines = text.split('\n').map((l) => l.trim());
  const blocks = [];
  let currentList = null;

  for (const line of lines) {
    if (line === '') {
      currentList = null;
      continue;
    }
    if (line.startsWith('## ')) {
      currentList = null;
      blocks.push({ type: 'h2', html: inlineFormat(line.slice(3)) });
    } else if (line.startsWith('- ')) {
      if (!currentList) {
        currentList = { type: 'ul', items: [] };
        blocks.push(currentList);
      }
      currentList.items.push(inlineFormat(line.slice(2)));
    } else if (/^\d+\.\s/.test(line)) {
      if (!currentList || currentList.type !== 'ol') {
        currentList = { type: 'ol', items: [] };
        blocks.push(currentList);
      }
      currentList.items.push(inlineFormat(line.replace(/^\d+\.\s/, '')));
    } else {
      currentList = null;
      blocks.push({ type: 'p', html: inlineFormat(line) });
    }
  }

  return blocks;
}
