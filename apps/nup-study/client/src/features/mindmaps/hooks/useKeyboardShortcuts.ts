import { useEffect } from 'react';

interface KeyboardShortcutsConfig {
  onTab?: () => void;
  onEnter?: () => void;
  onDelete?: () => void;
  onUndo?: () => void;
  onRedo?: () => void;
  onSearch?: () => void;
  onEscape?: () => void;
  disabled?: boolean;
}

export function useKeyboardShortcuts(config: KeyboardShortcutsConfig) {
  useEffect(() => {
    if (config.disabled) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      // Ignore if user is typing in an input
      const target = event.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.contentEditable === 'true') {
        // Allow Ctrl+F even in inputs
        if (event.key === 'f' && (event.ctrlKey || event.metaKey)) {
          event.preventDefault();
          config.onSearch?.();
        }
        return;
      }

      switch (event.key) {
        case 'Tab':
          event.preventDefault();
          config.onTab?.();
          break;
        case 'Enter':
          event.preventDefault();
          config.onEnter?.();
          break;
        case 'Delete':
        case 'Backspace':
          event.preventDefault();
          config.onDelete?.();
          break;
        case 'z':
          if (event.ctrlKey || event.metaKey) {
            event.preventDefault();
            if (event.shiftKey) {
              config.onRedo?.();
            } else {
              config.onUndo?.();
            }
          }
          break;
        case 'y':
          if (event.ctrlKey || event.metaKey) {
            event.preventDefault();
            config.onRedo?.();
          }
          break;
        case 'f':
          if (event.ctrlKey || event.metaKey) {
            event.preventDefault();
            config.onSearch?.();
          }
          break;
        case 'Escape':
          event.preventDefault();
          config.onEscape?.();
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [config]);
}
