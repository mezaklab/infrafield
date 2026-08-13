import React from 'react';
import { Moon, Sun } from 'lucide-react';
import { useTheme } from '../../contexts/ThemeContext';

export const ThemeToggle: React.FC<{ className?: string }> = ({ className = '' }) => {
  const { theme, toggleTheme } = useTheme();
  const next = theme === 'dark' ? 'claro' : 'escuro';
  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-label={`Ativar tema ${next}`}
      title={`Ativar tema ${next}`}
      className={`theme-toggle touch-target rounded-xl border border-slate-800 text-slate-400 hover:text-cyan-400 focus-visible:ring-2 focus-visible:ring-cyan-500 ${className}`}
    >
      {theme === 'dark' ? <Sun className="w-4 h-4" aria-hidden="true" /> : <Moon className="w-4 h-4" aria-hidden="true" />}
    </button>
  );
};
