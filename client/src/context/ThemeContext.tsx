import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

type Theme = 'cyber' | 'zen';

interface ThemeContextType {
    theme: Theme;
    toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: ReactNode }) {
    // Default to cyber, or check localStorage
    const [theme, setTheme] = useState<Theme>(() => {
        const saved = localStorage.getItem('site-theme');
        return (saved as Theme) || 'cyber';
    });

    useEffect(() => {
        document.documentElement.setAttribute('data-theme', theme);
        localStorage.setItem('site-theme', theme);
    }, [theme]);

    const toggleTheme = () => {
        setTheme(prev => prev === 'cyber' ? 'zen' : 'cyber');
    };

    return (
        <ThemeContext.Provider value={{ theme, toggleTheme }}>
            {children}
        </ThemeContext.Provider>
    );
}

export function useTheme() {
    const context = useContext(ThemeContext);
    if (context === undefined) {
        throw new Error('useTheme must be used within a ThemeProvider');
    }
    return context;
}
