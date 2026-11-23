import { useState, useRef, useEffect } from 'react';
import { Info, X } from 'lucide-react';

export default function InfoButton({ text }) {
  const [isOpen, setIsOpen] = useState(false);
  const wrapRef = useRef(null);

  useEffect(() => {
    if (!isOpen) return;
    const handleClickOutside = (e) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') setIsOpen(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  if (!text) return null;

  return (
    <div className="info-btn-wrap" ref={wrapRef}>
      <button
        type="button"
        className={`info-btn ${isOpen ? 'active' : ''}`}
        onClick={() => setIsOpen((prev) => !prev)}
        aria-label="Show explanation"
        aria-expanded={isOpen}
      >
        <Info size={16} />
      </button>

      {isOpen && (
        <div className="info-popover" role="tooltip">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px' }}>
            <span>{text}</span>
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              aria-label="Close"
              style={{
                background: 'transparent',
                border: 'none',
                color: 'var(--text-muted, #94a3b8)',
                cursor: 'pointer',
                padding: '2px',
                display: 'inline-flex',
              }}
            >
              <X size={14} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
