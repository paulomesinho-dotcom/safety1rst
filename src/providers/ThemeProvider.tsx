'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import { useStore } from '@/store/useStore';

type Theme = 'light' | 'dark' | 'system';
type ColorTheme = 'safety' | 'green' | 'pink' | 'blue' | 'brown' | 'colab' | 'deep/green' | 'deep/blue' | 'deep/pink' | 'deep/brown' | 'bim' | 'deep/bim' | 'xispoli' | 'deep/xispoli' | 'x1';
type IconTheme = 'safety' | 'round' | 'colour' | 'future' | 'bim';

interface ThemeProviderProps {
    children: React.ReactNode;
    defaultTheme?: Theme;
    defaultColor?: ColorTheme;
    defaultIconTheme?: IconTheme;
    storageKey?: string;
    colorStorageKey?: string;
    iconThemeStorageKey?: string;
}

interface ThemeProviderState {
    theme: Theme;
    setTheme: (theme: Theme) => void;
    color: ColorTheme;
    setColor: (color: ColorTheme) => void;
    iconTheme: IconTheme;
    setIconTheme: (theme: IconTheme) => void;
}

const initialState: ThemeProviderState = {
    theme: 'system',
    setTheme: () => null,
    color: 'safety',
    setColor: () => null,
    iconTheme: 'safety',
    setIconTheme: () => null,
};

const ThemeProviderContext = createContext<ThemeProviderState>(initialState);

export function ThemeProvider({
    children,
    defaultTheme = 'system',
    defaultColor = 'safety',
    defaultIconTheme = 'safety',
    storageKey = 'vite-ui-theme',
    colorStorageKey = 'vite-ui-color-theme',
    iconThemeStorageKey = 'vite-ui-icon-theme',
    ...props
}: ThemeProviderProps) {
    const { currentUser } = useStore();
    const userId = currentUser?.id || 'guest';
    const pathname = usePathname();

    const getEffectiveKey = (key: string) => `${key}-${userId}`;

    const [theme, setThemeState] = useState<Theme>(() => {
        if (typeof window !== 'undefined') {
            return (localStorage.getItem(getEffectiveKey(storageKey)) as Theme) || defaultTheme;
        }
        return defaultTheme;
    });

    const [color, setColorState] = useState<ColorTheme>(() => {
        if (typeof window !== 'undefined') {
            return (localStorage.getItem(getEffectiveKey(colorStorageKey)) as ColorTheme) || defaultColor;
        }
        return defaultColor;
    });

    const [iconTheme, setIconThemeState] = useState<IconTheme>(() => {
        if (typeof window !== 'undefined') {
            return (localStorage.getItem(getEffectiveKey(iconThemeStorageKey)) as IconTheme) || defaultIconTheme;
        }
        return defaultIconTheme;
    });


    // Update state when user changes (Login/Logout)
    useEffect(() => {
        if (typeof window !== 'undefined') {
            const storedTheme = (localStorage.getItem(getEffectiveKey(storageKey)) as Theme) || defaultTheme;
            const storedColor = (localStorage.getItem(getEffectiveKey(colorStorageKey)) as ColorTheme) || defaultColor;
            const storedIconTheme = (localStorage.getItem(getEffectiveKey(iconThemeStorageKey)) as IconTheme) || defaultIconTheme;
            setThemeState(storedTheme);
            setColorState(storedColor);
            setIconThemeState(storedIconTheme);
        }
    }, [userId, storageKey, colorStorageKey, iconThemeStorageKey, defaultTheme, defaultColor, defaultIconTheme]);

    useEffect(() => {
        const root = window.document.documentElement;
        const body = window.document.body;

        const isProjectRoute = pathname.includes('/project/');
        const isPlatformRoute = pathname.includes('/platform') || pathname.includes('/workspaces');

        // Use pathname logic to determine if it's the workspaces page (root / or /[locale])
        // It's the root if there are no subdirectories, or just the locale length
        const isRootRoute = pathname === '/' || /^\/[a-z]{2}(-[A-Z]{2})?$/.test(pathname);
        const isLoginRoute = pathname.includes('/login');

        const isThemeableRoute = (isProjectRoute || isPlatformRoute || isRootRoute) && !isLoginRoute;

        root.classList.remove('light', 'dark');
        body.classList.remove('light', 'dark');

        if (isLoginRoute) {
            // Force light mode and safety theme on Login ALWAYS
            root.classList.remove('dark');
            body.classList.remove('dark');
            root.classList.add('light');
            body.classList.add('light');

            // Remove any old color theme classes if they exist, force safety
            root.setAttribute('data-color', 'safety');
            body.setAttribute('data-color', 'safety');

            // Reset any inline styles that might have been applied by ThemeProvider historically
            root.style.removeProperty('--primary');
            body.style.removeProperty('--primary');
        } else {
            // Normal theme logic
            if (theme === 'system') {
                const systemTheme = window.matchMedia('(prefers-color-scheme: dark)').matches
                    ? 'dark'
                    : 'light';
                root.classList.add(systemTheme);
                body.classList.add(systemTheme);
            } else {
                root.classList.add(theme);
                body.classList.add(theme);
            }

            // Only apply custom colors/icons on project and workspace routes
            if (isThemeableRoute || isRootRoute) {
                root.setAttribute('data-color', color);
                body.setAttribute('data-color', color);
            } else {
                root.setAttribute('data-color', 'safety');
                body.setAttribute('data-color', 'safety');
            }
        }
    }, [theme, color, pathname]);

    const value = {
        theme,
        setTheme: (newTheme: Theme) => {
            localStorage.setItem(getEffectiveKey(storageKey), newTheme);
            setThemeState(newTheme);
        },
        color,
        setColor: (newColor: ColorTheme) => {
            localStorage.setItem(getEffectiveKey(colorStorageKey), newColor);
            setColorState(newColor);
        },
        iconTheme,
        setIconTheme: (newIconTheme: IconTheme) => {
            localStorage.setItem(getEffectiveKey(iconThemeStorageKey), newIconTheme);
            setIconThemeState(newIconTheme);
        }
    };

    return (
        <ThemeProviderContext.Provider {...props} value={value}>
            {children}
        </ThemeProviderContext.Provider>
    );
}

export const useTheme = () => {
    const context = useContext(ThemeProviderContext);

    if (context === undefined)
        throw new Error('useTheme must be used within a ThemeProvider');

    return context;
};
