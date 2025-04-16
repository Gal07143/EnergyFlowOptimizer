import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Moon, Sun } from 'lucide-react';

export default function ThemeToggle() {
  const [isDarkMode, setIsDarkMode] = useState(false);

  // Initialize theme state based on localStorage or system preference
  useEffect(() => {
    const savedTheme = localStorage.getItem('dark-mode');
    setIsDarkMode(
      savedTheme === 'true' || 
      (savedTheme === null && window.matchMedia('(prefers-color-scheme: dark)').matches)
    );
  }, []);

  const toggleTheme = () => {
    const newDarkMode = !isDarkMode;
    setIsDarkMode(newDarkMode);
    
    // Update the DOM
    if (newDarkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    
    // Save preference to localStorage
    localStorage.setItem('dark-mode', newDarkMode.toString());
  };

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={toggleTheme}
      aria-label={isDarkMode ? 'Switch to light mode' : 'Switch to dark mode'}
    >
      {isDarkMode ? (
        <Sun className="h-5 w-5 text-yellow-500" />
      ) : (
        <Moon className="h-5 w-5" />
      )}
    </Button>
  );
}
