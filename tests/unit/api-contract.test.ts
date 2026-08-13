import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

test('the public treasury route is read-only until organization authorization exists', () => {
  const route = readFileSync('src/app/api/bitcoin/wallet/[orgId]/route.ts', 'utf8');
  assert.doesNotMatch(route, /export\s+async\s+function\s+(PUT|POST|PATCH|DELETE)\b/);
});

test('recorded net totals aggregate the full ledger independently from recent rows', () => {
  for (const file of [
    'src/app/api/bitcoin/wallet/[orgId]/route.ts',
    'src/app/(dashboard)/dashboard/treasury/page.tsx',
  ]) {
    const source = readFileSync(file, 'utf8');
    assert.match(source, /bitcoin_transactions\.aggregate/);
    assert.match(source, /_sum:\s*\{\s*amount_sats:\s*true\s*\}/);
  }
});

test('vote sessions no longer maintain a stale denormalized integer count', () => {
  const schema = readFileSync('prisma/schema.prisma', 'utf8');
  const democracy = readFileSync('src/lib/solon/democracy.ts', 'utf8');
  assert.doesNotMatch(schema, /total_votes_cast/);
  assert.doesNotMatch(democracy, /voting_sessions\.update/);
  assert.match(democracy, /prisma\.\$transaction/);
});

test('integration copy does not advertise unsupported APIs or scores', () => {
  const integration = readFileSync('src/app/integration/page.tsx', 'utf8');
  assert.doesNotMatch(integration, /method:\s*'PUT'/);
  assert.doesNotMatch(integration, /Read transparency metrics/);
  assert.match(integration, /does not invent a score/);
});

test('the process-local limiter is bounded and does not trust forwarding headers as keys', () => {
  const limiter = readFileSync('src/lib/server/rate-limit.ts', 'utf8');
  const voteRoute = readFileSync('src/app/api/voting/[sessionId]/cryptographic-vote/route.ts', 'utf8');
  assert.match(limiter, /MAX_BUCKETS/);
  assert.match(limiter, /buckets\.delete/);
  assert.doesNotMatch(voteRoute, /x-forwarded-for|x-real-ip/);
  assert.match(voteRoute, /vote:session:/);
});

test('the vote route stops reading after the body byte limit before JSON parsing', () => {
  const voteRoute = readFileSync('src/app/api/voting/[sessionId]/cryptographic-vote/route.ts', 'utf8');
  assert.match(voteRoute, /req\.body\.getReader\(\)/);
  assert.match(voteRoute, /totalBytes > maxBytes/);
  assert.match(voteRoute, /reader\.cancel\(\)/);
  assert.match(voteRoute, /readBoundedBody\(req, 4096\)/);
  assert.doesNotMatch(voteRoute, /await req\.json\(\)/);
});
