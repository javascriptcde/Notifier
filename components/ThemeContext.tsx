import React, { createContext, ReactNode, useContext, useEffect, useState } from 'react';
import { useColorScheme } from 'react-native';

type Theme = 'light' | 'dark';

type ThemeContextType = {
  theme: Theme;
  toggleTheme: () => void;
};

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const ThemeProvider = ({ children }: { children: ReactNode }) => {
  const deviceColorScheme = useColorScheme();
  const [theme, setTheme] = useState<Theme>('light');
  const [useDeviceTheme, setUseDeviceTheme] = useState(true);

  // On mount or when device scheme changes, sync to device theme if enabled
  useEffect(() => {
    if (useDeviceTheme && deviceColorScheme) {
      setTheme(deviceColorScheme as Theme);
    }
  }, [deviceColorScheme, useDeviceTheme]);

  const toggleTheme = () => {
    setUseDeviceTheme(false); // disable device sync when user manually toggles
    setTheme(prev => (prev === 'light' ? 'dark' : 'light'));
  };

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) throw new Error('useTheme must be used within a ThemeProvider');
  return context;
};
