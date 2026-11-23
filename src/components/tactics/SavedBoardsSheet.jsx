import { useState, useEffect } from 'react';
import { decode } from './boardCodec';
import {
  getSavedBoards,
  deleteSavedBoard,
  renameSavedBoard,
} from './savedBoardsStorage';

export default function SavedBoardsSheet({ isOpen, onClose, onLoadBoardCode }) {
  const [boards, setBoards] = useState([]);
  const [editingId, setEditingId] = useState(null);
  const [editName, setEditName] = useState('');

  const refreshList = () => {
    setBoards(getSavedBoards());
  };

  useEffect(() => {
    if (isOpen) {
      refreshList();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleStartRename = (board) => {
    setEditingId(board.id);
    setEditName(board.name);
  };

  const handleSaveRename = (id) => {
    if (editName.trim()) {
      renameSavedBoard(id, editName.trim());
      setEditingId(null);
      refreshList();
    }
  };

  const handleDelete = (id) => {
    deleteSavedBoard(id);
    refreshList();
  };

  return (
    <div
      className="tactics-modal-overlay"
      role="dialog"
      aria-modal="true"
      aria-labelledby="saved-boards-title"
      onClick={onClose}
    >
      <div
        className="tactics-modal-content"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="tactics-modal-header">
          <h3 id="saved-boards-title" className="tactics-modal-title">
            Saved Tactics Boards
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="info-btn"
            style={{ fontSize: '20px' }}
            aria-label="Close"
          >
            ×
          </button>
        </div>

        <div className="saved-boards-list">
          {boards.length > 0 ? (
            boards.map((b) => {
              const dateStr = b.savedAt
                ? new Date(b.savedAt).toLocaleDateString([], {
                    month: 'short',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                  })
                : '';

              return (
                <div key={b.id} className="saved-board-item">
                  <div className="saved-board-info">
                    {editingId === b.id ? (
                      <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
                        <input
                          type="text"
                          value={editName}
                          onChange={(e) => setEditName(e.target.value)}
                          className="tactics-search-input"
                          style={{ padding: '4px 8px', fontSize: '13px', width: '160px' }}
                          autoFocus
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') handleSaveRename(b.id);
                            if (e.key === 'Escape') setEditingId(null);
                          }}
                        />
                        <button
                          type="button"
                          className="tactics-btn"
                          style={{ minHeight: '32px', padding: '4px 8px', fontSize: '11px' }}
                          onClick={() => handleSaveRename(b.id)}
                        >
                          Save
                        </button>
                      </div>
                    ) : (
                      <span className="saved-board-name">{b.name}</span>
                    )}
                    <span className="saved-board-date">{dateStr}</span>
                  </div>

                  <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                    <button
                      type="button"
                      className="tactics-btn tactics-btn-primary"
                      style={{ minHeight: '34px', padding: '6px 10px', fontSize: '12px' }}
                      onClick={() => {
                        const decoded = decode(b.code);
                        if (decoded) {
                          onLoadBoardCode(b.code);
                          onClose();
                        }
                      }}
                    >
                      Open
                    </button>
                    <button
                      type="button"
                      className="tactics-btn"
                      style={{ minHeight: '34px', padding: '6px 8px', fontSize: '12px' }}
                      onClick={() => handleStartRename(b)}
                    >
                      Rename
                    </button>
                    <button
                      type="button"
                      className="tactics-btn"
                      style={{ minHeight: '34px', padding: '6px 8px', fontSize: '12px', color: '#f87171' }}
                      onClick={() => handleDelete(b.id)}
                    >
                      Delete
                    </button>
                  </div>
                </div>
              );
            })
          ) : (
            <div style={{ textAlign: 'center', padding: '32px 0', color: 'var(--text-muted)' }}>
              No saved boards yet. Use the &ldquo;Save&rdquo; button on the toolbar to save boards to this device.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
