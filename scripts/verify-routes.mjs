import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative, sep } from 'node:path';

const root = process.cwd();
const appRoot = join(root, 'src', 'app');
const sourceRoot = join(root, 'src');
const routeCatalogPath = join(root, 'src', 'lib', 'site-config.ts');

function filesUnder(directory) {
  return readdirSync(directory).flatMap((entry) => {
    const path = join(directory, entry);
    return statSync(path).isDirectory() ? filesUnder(path) : [path];
  });
}

function filesystemRoute(pagePath) {
  const directory = relative(appRoot, pagePath).split(sep).slice(0, -1);
  const visibleSegments = directory.filter((segment) => !/^\(.+\)$/.test(segment));
  return visibleSegments.length ? `/${visibleSegments.join('/')}` : '/';
}

const catalogSource = readFileSync(routeCatalogPath, 'utf8');
const routesBlock = catalogSource.match(/export const ROUTES = \{([\s\S]*?)\} as const;/)?.[1];
if (!routesBlock) throw new Error('Could not read ROUTES from src/lib/site-config.ts');

const catalogRoutes = [...routesBlock.matchAll(/:\s*'([^']+)'/g)].map((match) => match[1]).sort();
const pageRoutes = filesUnder(appRoot)
  .filter((path) => path.endsWith(`${sep}page.tsx`) && !path.includes(`${sep}api${sep}`))
  .map(filesystemRoute)
  .sort();

const missingFromCatalog = pageRoutes.filter((route) => !catalogRoutes.includes(route));
const missingFromFilesystem = catalogRoutes.filter((route) => !pageRoutes.includes(route));
if (missingFromCatalog.length || missingFromFilesystem.length) {
  throw new Error([
    'Route catalog drift detected.',
    missingFromCatalog.length ? `Pages missing from ROUTES: ${missingFromCatalog.join(', ')}` : '',
    missingFromFilesystem.length ? `ROUTES without a page: ${missingFromFilesystem.join(', ')}` : '',
  ].filter(Boolean).join('\n'));
}

const invalidLinks = [];
for (const path of filesUnder(sourceRoot).filter((file) => /\.(?:ts|tsx)$/.test(file) && file !== routeCatalogPath)) {
  const source = readFileSync(path, 'utf8');
  if (/href\s*=\s*\{[^}]*\|\|\s*['"]#['"]/.test(source)) {
    invalidLinks.push(`${relative(root, path)}: placeholder href fallback`);
  }
  for (const match of source.matchAll(/href\s*=\s*['"]([^'"]+)['"]/g)) {
    const href = match[1];
    if (href.startsWith('#') || !href.startsWith('/') || href.startsWith('//')) continue;
    const pathname = href.split(/[?#]/, 1)[0];
    if (!catalogRoutes.includes(pathname)) invalidLinks.push(`${relative(root, path)}: ${href}`);
  }
}

if (invalidLinks.length) throw new Error(`Internal link targets are not in ROUTES:\n${invalidLinks.join('\n')}`);

console.log(`Route integrity OK: ${catalogRoutes.length} page routes match the filesystem and static internal links.`);
