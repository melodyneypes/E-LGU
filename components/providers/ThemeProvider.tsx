"use client";

import { createContext, useContext, ReactNode } from "react";

type ThemeContextType = {
    themeColor: string;
};

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({
    children,
    themeColor
}: {
    children: ReactNode;
    themeColor: string;
}) {
    return (
        <ThemeContext.Provider value={{ themeColor }}>
            {children}
        </ThemeContext.Provider>
    );
}

export function useSystemTheme() {
    const context = useContext(ThemeContext);
    if (context === undefined) {
        throw new Error("useSystemTheme must be used within a ThemeProvider");
    }
    return context;
}
