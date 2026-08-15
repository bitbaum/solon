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
  {
    // The display face (Instrument Serif) ships ONE weight. Asking for a bolder
    // one makes the browser synthesize a fake bold, which looks cheap and is
    // invisible in code review. Weight belongs to the face, in the token
    // package, not to the component — that is what keeps a face swap one line.
    pattern: /\bfont-display\b[^"']*\bfont-(?:medium|semibold|bold|extrabold|black)\b|\bfont-(?:medium|semibold|bold|extrabold|black)\b[^"']*\bfont-display\b/,
    message:
      'Do not set a weight next to font-display — the display face has one weight, owned by @fleet/design-tokens.',
  },
  {
    // .font-display already applies the face's tracking. Re-declaring it means
    // a future face swap silently keeps the OLD face's tracking.
    pattern: /\bfont-display\b[^"']*\btracking-display\b|\btracking-display\b[^"']*\bfont-display\b/,
    message: 'Redundant: .font-display already applies --tracking-display.',
  },
  {
    pattern: /font-\[['"]?[A-Z]/,
    message: 'Never name a typeface in a component. Use font-display / font-sans / font-mono.',
  },
  {
    // Size floor. The display face is a high-contrast serif: its thin strokes
    // thin out further as type shrinks, so an 18px display heading renders
    // LIGHTER than the 16px sans paragraph under it and the hierarchy inverts.
    // Display type starts at text-2xl; below that use the sans at font-semibold.
    // The uppercase, open-tracked wordmark is the sanctioned exception (.wordmark).
    pattern: /\bfont-display\b[^"']*\btext-(?:xs|sm|base|lg|xl)\b|\btext-(?:xs|sm|base|lg|xl)\b[^"']*\bfont-display\b/,
    message:
      'Display face below its size floor — use text-2xl+ with font-display, or the sans at font-semibold.',
  },
];

/**
 * The inverse of the size floor, and the rule the other one could never catch:
 * every rule above only fires once `font-display` is already present, so a
 * heading that simply never opted in was invisible to the gate. That blind spot
 * is how 21 headings — the whole dashboard — ended up in bold Inter while the
 * marketing pages ran the serif, which is the drift this gate exists to stop.
 *
 * Above the floor, the display face is the default, not a choice. `font-mono`
 * is exempt: a balance or a hash is data, and data is set in the mono face at
 * whatever size it needs.
 */
const DISPLAY_SCALE = /\btext-(?:2xl|3xl|4xl|5xl|6xl|7xl|display-[123])\b/;
function missingDisplayFace(line) {
  for (const m of line.matchAll(/className=(?:"([^"]*)"|\{`([^`]*)`\})/g)) {
    const cls = m[1] ?? m[2] ?? '';
    if (!DISPLAY_SCALE.test(cls)) continue;
    if (/\bfont-(?:display|mono)\b/.test(cls)) continue;
    if (/\bwordmark\b/.test(cls)) continue;
    return true;
  }
  return false;
}

/**
 * Tokens are defined in @fleet/design-tokens and nowhere else. A local
 * redefinition is precisely how the three products drifted apart, so treat any
 * app-level `--token: value` in globals.css as a build failure rather than a
 * convenience.
 */
const TOKEN_REDEFINITION =
  /^\s*--(?:surface|text|border|accent|public-accent|status|radius|font|tracking|shell|bitcoin)[a-z-]*\s*:/;

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
      if (missingDisplayFace(line)) {
        violations.push({
          file: rel,
          line: i + 1,
          message:
            'Heading at display size without font-display. Above text-2xl the display face is the default — add font-display (or font-mono if this is data).',
          source: line.trim(),
        });
      }
    });
  }
}

// globals.css must stay free of token definitions — the package owns them.
const GLOBALS = path.join(ROOT, 'src/app/globals.css');
if (fs.existsSync(GLOBALS)) {
  fs.readFileSync(GLOBALS, 'utf8')
    .split('\n')
    .forEach((line, i) => {
      if (TOKEN_REDEFINITION.test(line)) {
        violations.push({
          file: 'src/app/globals.css',
          line: i + 1,
          message:
            'Token redefined locally. Tokens live in @fleet/design-tokens so all three products share them.',
          source: line.trim(),
        });
      }
    });
}

if (violations.length) {
  console.error(`design-system check failed: ${violations.length} violation(s)`);
  for (const v of violations.slice(0, 80)) {
    console.error(`${v.file}:${v.line} — ${v.message}\n  ${v.source}`);
  }
  process.exit(1);
}
console.log('design-system check: ok');
