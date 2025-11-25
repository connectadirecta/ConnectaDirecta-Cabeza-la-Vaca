
import React, { createContext, useContext, useState, useEffect } from 'react';

type FontSize = 'small' | 'medium' | 'large' | 'extra-large';

interface SettingsContextType {
  fontSize: FontSize;
  setFontSize: (size: FontSize) => void;
  isSettingsOpen: boolean;
  setIsSettingsOpen: (open: boolean) => void;
}

const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

export function useSettings() {
  const context = useContext(SettingsContext);
  if (context === undefined) {
    throw new Error('useSettings must be used within a SettingsProvider');
  }
  return context;
}

export function SettingsProvider({ children }: { children: React.ReactNode }) {
  const [fontSize, setFontSize] = useState<FontSize>('medium');
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  // Load settings from localStorage
  useEffect(() => {
    const savedFontSize = localStorage.getItem('fontSize') as FontSize;
    if (savedFontSize && ['small', 'medium', 'large', 'extra-large'].includes(savedFontSize)) {
      setFontSize(savedFontSize);
    }
  }, []);

  // Save settings to localStorage
  useEffect(() => {
    localStorage.setItem('fontSize', fontSize);
    // Apply font size to document root
    document.documentElement.setAttribute('data-font-size', fontSize);
  }, [fontSize]);

  return (
    <SettingsContext.Provider value={{
      fontSize,
      setFontSize,
      isSettingsOpen,
      setIsSettingsOpen
    }}>
      {children}
    </SettingsContext.Provider>
  );
}
