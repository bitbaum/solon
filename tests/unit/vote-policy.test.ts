import assert from 'node:assert/strict';
import test from 'node:test';
import {
  isCompactMessageSignature,
  isMainnetP2pkhAddress,
  isVoteSessionId,
  voteSessionIneligibility,
  weightedTally,
} from '../../src/lib/solon/vote-policy';

test('vote input formats reject unbounded or malformed values', () => {
  assert.equal(isVoteSessionId('550e8400-e29b-41d4-a716-446655440000'), true);
  assert.equal(isVoteSessionId('not-a-session'), false);
  assert.equal(isMainnetP2pkhAddress('1BoatSLRHtKNngkdXEeobR76b53LETtpyT'), true);
  assert.equal(isMainnetP2pkhAddress('bc1q-not-supported-by-this-verifier'), false);
  assert.equal(isCompactMessageSignature(Buffer.alloc(65).toString('base64')), true);
  assert.equal(isCompactMessageSignature('A'.repeat(10_000)), false);
});

test('vote windows are enforced at both boundaries', () => {
  const now = new Date('2026-08-12T12:00:00.000Z');
  assert.equal(voteSessionIneligibility({ status: 'active', start_date: new Date('2026-08-12T11:00:00.000Z'), end_date: null }, now), null);
  assert.equal(voteSessionIneligibility({ status: 'active', start_date: new Date('2026-08-12T13:00:00.000Z'), end_date: null }, now), 'voting session has not started');
  assert.equal(voteSessionIneligibility({ status: 'active', start_date: new Date('2026-08-12T11:00:00.000Z'), end_date: now }, now), 'voting session has ended');
  assert.equal(voteSessionIneligibility({ status: 'closed', start_date: new Date('2026-08-12T11:00:00.000Z'), end_date: null }, now), 'voting session is closed');
});

test('weighted tally preserves exact fractional weights and ignores unknown choices', () => {
  const tally = weightedTally([
    { vote_choice: 'yes', weight: '0.1' },
    { vote_choice: 'yes', weight: '0.2' },
    { vote_choice: 'no', weight: '2' },
    { vote_choice: 'invalid', weight: '100' },
  ] as never);
  assert.deepEqual(tally, { yes: '0.3', no: '2', abstain: '0' });
});
