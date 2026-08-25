import { useEffect } from 'react';

export const useEscapeKey = (onEscape: () => void, isActive: boolean = true) => {
  useEffect(() => {
    if (!isActive) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onEscape();
      }
    };

    const handleBackdropClick = (event: MouseEvent | TouchEvent) => {
      const target = event.target as HTMLElement;
      if (target && typeof target.className === 'string' && target.className.includes('responsive-modal-backdrop')) {
        onEscape();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('mousedown', handleBackdropClick);
    document.addEventListener('touchstart', handleBackdropClick);

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('mousedown', handleBackdropClick);
      document.removeEventListener('touchstart', handleBackdropClick);
    };
  }, [onEscape, isActive]);
};
