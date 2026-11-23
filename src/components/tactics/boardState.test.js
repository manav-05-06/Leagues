import test from 'node:test';
import assert from 'node:assert/strict';
import {
  boardReducer,
  createInitialState,
} from './boardState.js';

function makeMockSquad(count = 20) {
  const squad = [];
  squad.push({ id: 'p1', name: 'Goalkeeper One', shortName: 'One', jersey: '1', pos: 'G' });
  squad.push({ id: 'p2', name: 'Goalkeeper Two', shortName: 'Two', jersey: '12', pos: 'G' });

  for (let i = 3; i <= count; i++) {
    const pos = i <= 8 ? 'D' : i <= 14 ? 'M' : 'F';
    squad.push({
      id: `p${i}`,
      name: `Player ${i}`,
      shortName: `P${i}`,
      jersey: `${i}`,
      pos,
    });
  }
  return squad;
}

test('AUTO_PICK puts a G-position player in slot 1', () => {
  const squad = makeMockSquad(20);
  let state = createInitialState();
  state = boardReducer(state, {
    type: 'LOAD_TEAM',
    side: 'b',
    team: { name: 'Al Nassr', teamId: '817', formation: '4-4-1-1' },
    squad,
  });

  state = boardReducer(state, { type: 'AUTO_PICK', side: 'b' });

  assert.equal(state.teams.b.onPitch.length, 11);
  const gk = state.teams.b.onPitch.find((p) => p.slot === 1);
  assert.ok(gk, 'Slot 1 must be present');
  assert.equal(gk.pos, 'G', 'Slot 1 player must be a goalkeeper');
  assert.equal(gk.id, 'p1', 'Slot 1 player should be first goalkeeper in squad');
});

test('Placing a 12th player is refused', () => {
  const squad = makeMockSquad(25);
  let state = createInitialState();
  state = boardReducer(state, {
    type: 'LOAD_TEAM',
    side: 'a',
    team: { name: 'Al Ahli', teamId: '816', formation: '4-3-3' },
    squad,
  });

  // Auto-pick fills 11 players
  state = boardReducer(state, { type: 'AUTO_PICK', side: 'a' });
  assert.equal(state.teams.a.onPitch.length, 11);

  // Try placing a 12th player
  const p12 = squad[15]; // unplaced player
  state = boardReducer(state, {
    type: 'PLACE',
    side: 'a',
    playerId: p12.id,
    x: 50,
    y: 50,
  });

  assert.equal(state.teams.a.onPitch.length, 11, 'Should still have exactly 11 players');
  assert.match(state.notice, /Max 11 players/i, 'Should set a warning notice');
});

test('Changing formation keeps the same 11 player IDs and updates positions', () => {
  const squad = makeMockSquad(20);
  let state = createInitialState();
  state = boardReducer(state, {
    type: 'LOAD_TEAM',
    side: 'b',
    team: { name: 'Al Nassr', teamId: '817', formation: '4-3-3' },
    squad,
  });

  state = boardReducer(state, { type: 'AUTO_PICK', side: 'b' });
  const originalIds = state.teams.b.onPitch.map((p) => p.id).sort();

  // Change formation to 3-5-2
  state = boardReducer(state, {
    type: 'SET_FORMATION',
    side: 'b',
    formation: '3-5-2',
  });

  assert.equal(state.teams.b.formation, '3-5-2');
  assert.equal(state.teams.b.onPitch.length, 11);

  const updatedIds = state.teams.b.onPitch.map((p) => p.id).sort();
  assert.deepEqual(updatedIds, originalIds, 'All 11 player IDs must be preserved');
});

test('After FLIP, bottom goalkeeper is at y >= 90 and top goalkeeper is at y <= 15', () => {
  const squadA = makeMockSquad(20);
  const squadB = makeMockSquad(20);

  let state = createInitialState();
  state = boardReducer(state, { type: 'LOAD_TEAM', side: 'a', team: { name: 'Team A' }, squad: squadA });
  state = boardReducer(state, { type: 'LOAD_TEAM', side: 'b', team: { name: 'Team B' }, squad: squadB });

  state = boardReducer(state, { type: 'AUTO_PICK', side: 'a' });
  state = boardReducer(state, { type: 'AUTO_PICK', side: 'b' });

  // Initially bottom is 'b'
  assert.equal(state.bottom, 'b');
  const gkBInitial = state.teams.b.onPitch.find((p) => p.slot === 1);
  const gkAInitial = state.teams.a.onPitch.find((p) => p.slot === 1);
  assert.ok(gkBInitial.y >= 90, `Bottom GK y (${gkBInitial.y}) should be >= 90`);
  assert.ok(gkAInitial.y <= 15, `Top GK y (${gkAInitial.y}) should be <= 15`);

  // Flip sides
  state = boardReducer(state, { type: 'FLIP' });
  assert.equal(state.bottom, 'a');

  const gkANew = state.teams.a.onPitch.find((p) => p.slot === 1);
  const gkBNew = state.teams.b.onPitch.find((p) => p.slot === 1);

  assert.ok(gkANew.y >= 90, `After FLIP, Team A GK y (${gkANew.y}) should be >= 90 at bottom`);
  assert.ok(gkBNew.y <= 15, `After FLIP, Team B GK y (${gkBNew.y}) should be <= 15 at top`);
});

test('Swap, bench and undo work cleanly, including after 30+ moves', () => {
  const squad = makeMockSquad(20);
  let state = createInitialState();
  state = boardReducer(state, { type: 'LOAD_TEAM', side: 'b', team: { name: 'Team B' }, squad });
  state = boardReducer(state, { type: 'AUTO_PICK', side: 'b' });

  // Test bench
  const benchedPlayerId = state.teams.b.onPitch[2].id;
  state = boardReducer(state, { type: 'BENCH', side: 'b', playerId: benchedPlayerId });
  assert.equal(state.teams.b.onPitch.length, 10);
  assert.ok(!state.teams.b.onPitch.some((p) => p.id === benchedPlayerId));

  // Undo bench
  state = boardReducer(state, { type: 'UNDO' });
  assert.equal(state.teams.b.onPitch.length, 11);
  assert.ok(state.teams.b.onPitch.some((p) => p.id === benchedPlayerId));

  // Test swap between two pitch players
  const pA = state.teams.b.onPitch[0];
  const pB = state.teams.b.onPitch[1];
  const posA = { x: pA.x, y: pA.y, slot: pA.slot };
  const posB = { x: pB.x, y: pB.y, slot: pB.slot };

  state = boardReducer(state, { type: 'SWAP', side: 'b', idA: pA.id, idB: pB.id });
  const pANew = state.teams.b.onPitch.find((p) => p.id === pA.id);
  const pBNew = state.teams.b.onPitch.find((p) => p.id === pB.id);

  assert.equal(pANew.x, posB.x);
  assert.equal(pANew.y, posB.y);
  assert.equal(pANew.slot, posB.slot);

  assert.equal(pBNew.x, posA.x);
  assert.equal(pBNew.y, posA.y);
  assert.equal(pBNew.slot, posA.slot);

  // Perform 35 moves to test history buffer limit
  for (let i = 0; i < 35; i++) {
    state = boardReducer(state, {
      type: 'MOVE',
      side: 'b',
      playerId: pA.id,
      x: 10 + (i % 80),
      y: 50 + (i % 40),
    });
  }

  assert.ok(state.history.length <= 30, 'History should be capped at max 30');

  // Verify multiple undos work without errors
  for (let i = 0; i < 10; i++) {
    state = boardReducer(state, { type: 'UNDO' });
  }
  assert.equal(state.teams.b.onPitch.length, 11);
});
