'use client';

import { Sun, Moon } from 'lucide-react';
import { useTheme } from '../atoms/ThemeProvider';
import { Button } from '../atoms/Button';

export const ThemeToggle = () => {
  const { theme, toggleTheme } = useTheme();

  return (
    <Button variant="ghost" size="sm" onClick={toggleTheme} title="Toggle theme">
      {theme === 'light' ? <Moon size={18} /> : <Sun size={18} />}
    </Button>
  );
};
