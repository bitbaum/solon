#!/usr/bin/env node
/**
 * Ironclad design gate. Same contract as OrangeCat / FleetCrown:
 * tokens live in globals.css; components use semantic Tailwind names;
 * no palette utilities, no arbitrary hex, no pillowy radii, no shadows
 * standing in for hierarchy.
 */
const fs = require('fs');
const path = require('path');

const ROOT = process.cwd();
const TARGETS = ['src'];
const EXTENSIONS = new Set(['.ts', '.tsx']);
const SKIP_NAMES = new Set(['opengraph-image.tsx']);

const FORBIDDEN = [
  {
    pattern: /\b(?:text|bg|border|ring|divide)-(?:slate|gray|zinc|neutral)-\d+\b/,
    message: 'Use text-fg-primary / text-fg-secondary / bg-surface-* / border-default.',
  },
  {
    pattern: /(?:bg|text|border)-\[[#']/,
    message: 'No arbitrary hex. Define a CSS var in globals.css.',
  },
  {
    pattern: /\b(?:text|bg|border|ring)-white\/\d+\b/,
    message: 'Use bg-surface-* / border-* tokens, not white with an opacity.',
  },
  {
    // The vocabulary is shared with OrangeCat and FleetCrown. These were Solon's
    // private, blue-tinted palette — the reason the three sites looked like three
    // companies. They are gone from tailwind.config.js; this keeps them gone.
    pattern: /\b(?:text|bg|border|ring|from|to|via|divide)-(?:navy|navy-light|navy-dark|solon-[a-z]+)\b/,
    message:
      'Legacy Solon palette. Use the shared tokens: bg-surface-*, text-fg-*, bg-accent, text-bitcoin.',
  },
  {
    // Radii are named by role so all three products round corners the same way.
    pattern: /\brounded-(?:sm|md|lg|xl|2xl|3xl|full)\b/,
    message: 'Use rounded-control / rounded-surface / rounded-pill.',
  },
  {
    pattern: /\bshadow-(?:sm|md|lg|xl|2xl|navy|card)\b/,
    message: 'Hierarchy is border + type, not drop shadow.',
  },
  {
    pattern: /\b(?:bg-gradient|linear-gradient)\b/,
    message: 'No component gradients. Brand surfaces live in globals.css.',
  },
  {
    // max-w-7xl was the old per-page container. Width is one decision now.
    pattern: /\bmax-w-7xl\b/,
    message: 'Use the .section-shell class (or max-w-shell) so every page lines up.',
  },
];

function walk(dir, files = []) {
  if (!fs.existsSync(dir)) return files;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === 'node_modules' || entry.name === '.next') continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full, files);
    else if (EXTENSIONS.has(path.extname(entry.name)) && !SKIP_NAMES.has(entry.name)) {
      files.push(full);
    }
  }
  return files;
}

const violations = [];
for (const target of TARGETS) {
  for (const file of walk(path.join(ROOT, target))) {
    const rel = path.relative(ROOT, file);
    const lines = fs.readFileSync(file, 'utf8').split('\n');
    lines.forEach((line, i) => {
      for (const rule of FORBIDDEN) {
        if (rule.pattern.test(line)) {
          violations.push({ file: rel, line: i + 1, message: rule.message, source: line.trim() });
        }
      }
    });
  }
}

if (violations.length) {
  console.error(`design-system check failed: ${violations.length} violation(s)`);
  for (const v of violations.slice(0, 80)) {
    console.error(`${v.file}:${v.line} — ${v.message}\n  ${v.source}`);
  }
  process.exit(1);
}
console.log('design-system check: ok');
