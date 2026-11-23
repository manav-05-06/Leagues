const STORAGE_KEY = 'leagues-tactics-boards-v1';

export function getSavedBoards() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function saveBoardToStorage(name, code) {
  try {
    const list = getSavedBoards();
    const newBoard = {
      id: `board-${Date.now()}`,
      name: name || 'Custom Board',
      savedAt: new Date().toISOString(),
      code,
    };
    const updated = [newBoard, ...list.filter((b) => b.code !== code)].slice(0, 20);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    return true;
  } catch {
    return false;
  }
}

export function deleteSavedBoard(id) {
  try {
    const list = getSavedBoards();
    const updated = list.filter((b) => b.id !== id);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    return true;
  } catch {
    return false;
  }
}

export function renameSavedBoard(id, newName) {
  try {
    const list = getSavedBoards();
    const updated = list.map((b) => (b.id === id ? { ...b, name: newName } : b));
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    return true;
  } catch {
    return false;
  }
}
