import test from 'node:test';
import assert from 'node:assert/strict';
import {
  getSavedBoards,
  saveBoardToStorage,
  deleteSavedBoard,
  renameSavedBoard,
} from './savedBoardsStorage.js';

// Mock localStorage for Node test environment
const store = new Map();
globalThis.localStorage = {
  getItem: (key) => store.get(key) || null,
  setItem: (key, val) => store.set(key, String(val)),
  removeItem: (key) => store.delete(key),
  clear: () => store.clear(),
};

test('savedBoardsStorage handles save, list, rename, delete and max 20 limit', () => {
  store.clear();

  // Initially empty
  assert.deepEqual(getSavedBoards(), []);

  // Save boards
  assert.ok(saveBoardToStorage('Board 1', 'code-1'));
  assert.ok(saveBoardToStorage('Board 2', 'code-2'));

  let boards = getSavedBoards();
  assert.equal(boards.length, 2);
  assert.equal(boards[0].name, 'Board 2');
  assert.equal(boards[1].name, 'Board 1');

  // Rename board 1
  const b1 = boards[1];
  assert.ok(renameSavedBoard(b1.id, 'Renamed Board 1'));
  boards = getSavedBoards();
  assert.equal(boards[1].name, 'Renamed Board 1');

  // Delete board 2
  const b2 = boards[0];
  assert.ok(deleteSavedBoard(b2.id));
  boards = getSavedBoards();
  assert.equal(boards.length, 1);
  assert.equal(boards[0].id, b1.id);

  // Fill up to 25 boards to test max 20 capping
  for (let i = 0; i < 25; i++) {
    saveBoardToStorage(`Bulk ${i}`, `bulk-code-${i}`);
  }
  boards = getSavedBoards();
  assert.equal(boards.length, 20, 'Saved boards list must be capped at 20');
});
