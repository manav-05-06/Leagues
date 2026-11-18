import { useEffect, useRef } from 'react';
import { X } from 'lucide-react';

export default function Modal({
  isOpen = true,
  onClose,
  title,
  ariaLabel,
  ariaLabelledBy,
  className = '',
  overlayClassName = '',
  style,
  overlayStyle,
  children
}) {
  const modalRef = useRef(null);
  const closeBtnRef = useRef(null);
  const prevFocusedElement = useRef(null);

  useEffect(() => {
    if (!isOpen) return;

    prevFocusedElement.current = document.activeElement;

    // Lock body scroll
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    // Focus close button or first focusable element
    const focusTimer = setTimeout(() => {
      if (closeBtnRef.current) {
        closeBtnRef.current.focus();
      } else if (modalRef.current) {
        modalRef.current.focus();
      }
    }, 50);

    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        e.stopPropagation();
        onClose?.();
        return;
      }

      if (e.key === 'Tab' && modalRef.current) {
        const focusableElements = modalRef.current.querySelectorAll(
          'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
        );
        if (focusableElements.length === 0) return;

        const firstElement = focusableElements[0];
        const lastElement = focusableElements[focusableElements.length - 1];

        if (e.shiftKey) {
          if (document.activeElement === firstElement) {
            e.preventDefault();
            lastElement.focus();
          }
        } else {
          if (document.activeElement === lastElement) {
            e.preventDefault();
            firstElement.focus();
          }
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);

    return () => {
      clearTimeout(focusTimer);
      document.body.style.overflow = originalOverflow;
      window.removeEventListener('keydown', handleKeyDown);
      if (prevFocusedElement.current && typeof prevFocusedElement.current.focus === 'function') {
        prevFocusedElement.current.focus();
      }
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      className={`modal-overlay ${overlayClassName}`.trim()}
      onClick={onClose}
      style={overlayStyle}
    >
      <div
        ref={modalRef}
        className={`modal-content ${className}`.trim()}
        role="dialog"
        aria-modal="true"
        aria-label={ariaLabel || (!ariaLabelledBy ? title || 'Dialog' : undefined)}
        aria-labelledby={ariaLabelledBy}
        onClick={(e) => e.stopPropagation()}
        tabIndex={-1}
        style={style}
      >
        <button
          ref={closeBtnRef}
          className="modal-close"
          onClick={onClose}
          aria-label="Close dialog"
          title="Close"
        >
          <X size={22} />
        </button>
        {children}
      </div>
    </div>
  );
}
