import test from 'node:test';
import assert from 'node:assert/strict';
import { Buffer } from 'node:buffer';
import { encode, decode } from './boardCodec.js';

test('encode and decode roundtrip matches original board players and positions', () => {
  const mockBoard = {
    name: 'Al Ahli vs Al Nassr',
    bottom: 'b',
    teams: {
      a: {
        league: 'ksa.1',
        teamId: '816',
        formation: '4-2-3-1',
        onPitch: [
          { id: '101', name: 'Player A1', x: 50.2, y: 6.4, slot: 1 },
          { id: '102', name: 'Player A2', x: 16.1, y: 15.2, slot: 2 },
          { id: '103', name: 'Player A3', x: 84.0, y: 15.0, slot: 3 },
        ],
      },
      b: {
        league: 'ksa.1',
        teamId: '817',
        formation: '4-4-1-1',
        onPitch: [
          { id: '201', name: 'Bento', x: 50.0, y: 94.0, slot: 1 },
          { id: '202', name: 'Player B2', x: 84.1, y: 85.3, slot: 2 },
        ],
      },
    },
  };

  const code = encode(mockBoard);
  assert.ok(code, 'Code must be non-empty');
  assert.ok(typeof code === 'string');

  const decoded = decode(code);
  assert.ok(decoded, 'Decoded result must not be null');
  assert.equal(decoded.v, 1);
  assert.equal(decoded.n, 'Al Ahli vs Al Nassr');
  assert.equal(decoded.bt, 'b');

  assert.equal(decoded.a.t, '816');
  assert.equal(decoded.a.f, '4-2-3-1');
  assert.equal(decoded.a.p.length, 3);
  assert.deepEqual(decoded.a.p[0], ['101', 50, 6, 1]);

  assert.equal(decoded.b.t, '817');
  assert.equal(decoded.b.f, '4-4-1-1');
  assert.equal(decoded.b.p.length, 2);
  assert.deepEqual(decoded.b.p[0], ['201', 50, 94, 1]);
});

test('decode returns null on invalid or malicious inputs and never throws', () => {
  assert.equal(decode(null), null);
  assert.equal(decode(undefined), null);
  assert.equal(decode(''), null);
  assert.equal(decode('invalid-base64-random-string!@#$'), null);

  // String too long (> 4000)
  assert.equal(decode('a'.repeat(4001)), null);

  // Valid JSON but wrong version
  const badVersion = Buffer.from(JSON.stringify({ v: 2 })).toString('base64url');
  assert.equal(decode(badVersion), null);

  // More than 11 players
  const tooManyPlayers = {
    v: 1,
    n: 'Test',
    bt: 'b',
    a: {
      l: 'eng.1',
      t: '1',
      f: '4-3-3',
      p: Array.from({ length: 12 }, (_, i) => [`p${i}`, 50, 50, 1]),
    },
    b: { l: 'eng.1', t: '2', f: '4-3-3', p: [] },
  };
  const tooManyCode = Buffer.from(JSON.stringify(tooManyPlayers)).toString('base64url');
  assert.equal(decode(tooManyCode), null);

  // Out of bounds coordinates (x > 100)
  const oobCoords = {
    v: 1,
    n: 'Test',
    bt: 'b',
    a: {
      l: 'eng.1',
      t: '1',
      f: '4-3-3',
      p: [['p1', 150, 50, 1]],
    },
    b: { l: 'eng.1', t: '2', f: '4-3-3', p: [] },
  };
  const oobCode = Buffer.from(JSON.stringify(oobCoords)).toString('base64url');
  assert.equal(decode(oobCode), null);
});
