'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';

export type Theme = 'light' | 'dark' | 's1';

interface ThemeProviderProps {
    children: React.ReactNode;
    defaultTheme?: Theme;
    storageKey?: string;
}

interface ThemeProviderState {
    theme: Theme;
    isDark: boolean;
    setTheme: (theme: Theme) => void;
    setIsDark: (isDark: boolean) => void;
    toggleTheme: () => void;
    // Backward compatibility for any legacy callers
    color: string;
    setColor: (color: any) => void;
    iconTheme: string;
    setIconTheme: (iconTheme: any) => void;
}

const initialState: ThemeProviderState = {
    theme: 'dark',
    isDark: true,
    setTheme: () => null,
    setIsDark: () => null,
    toggleTheme: () => null,
    color: 'safety',
    setColor: () => null,
    iconTheme: 'safety',
    setIconTheme: () => null,
};

const ThemeProviderContext = createContext<ThemeProviderState>(initialState);

export function ThemeProvider({
    children,
    defaultTheme = 'dark',
    storageKey = 'safety1irst-theme',
}: ThemeProviderProps) {
    const [theme, setThemeState] = useState<Theme>('dark');
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        try {
            const saved = localStorage.getItem(storageKey) as Theme | null;
            if (saved === 'light' || saved === 'dark' || saved === 's1') {
                setThemeState(saved);
            } else {
                setThemeState(defaultTheme);
            }
        } catch {
            setThemeState(defaultTheme);
        }
        setMounted(true);
    }, [defaultTheme, storageKey]);

    useEffect(() => {
        if (!mounted) return;
        const root = document.documentElement;
        const body = document.body;

        root.classList.remove('dark', 'light', 'theme-s1');
        body.classList.remove('dark', 'light', 'theme-s1');

        if (theme === 'dark') {
            root.classList.add('dark');
            body.classList.add('dark');
        } else if (theme === 's1') {
            root.classList.add('light', 'theme-s1');
            body.classList.add('light', 'theme-s1');
        } else {
            root.classList.add('light');
            body.classList.add('light');
        }

        try {
            localStorage.setItem(storageKey, theme);
        } catch {}
    }, [theme, mounted, storageKey]);

    const isDark = theme === 'dark';

    const setTheme = (newTheme: Theme) => {
        setThemeState(newTheme);
    };

    const setIsDark = (dark: boolean) => {
        setThemeState(dark ? 'dark' : 'light');
    };

    const toggleTheme = () => {
        setThemeState((prev) => (prev === 'dark' ? 'light' : prev === 'light' ? 's1' : 'dark'));
    };

    const value: ThemeProviderState = {
        theme,
        isDark,
        setTheme,
        setIsDark,
        toggleTheme,
        color: 'safety',
        setColor: () => {},
        iconTheme: 'safety',
        setIconTheme: () => {},
    };

    return (
        <ThemeProviderContext.Provider value={value}>
            {children}
        </ThemeProviderContext.Provider>
    );
}

export const useTheme = () => {
    const context = useContext(ThemeProviderContext);
    if (context === undefined) {
        throw new Error('useTheme must be used within a ThemeProvider');
    }
    return context;
};
