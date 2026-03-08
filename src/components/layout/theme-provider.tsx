"use client";

import { useEffect, useState, createContext, useContext } from "react";

interface ThemeContextValue {
  theme: "light" | "dark";
  accentColor: string;
  setTheme: (theme: "light" | "dark") => void;
  setAccentColor: (color: string) => void;
}

const ThemeContext = createContext<ThemeContextValue>({
  theme: "light",
  accentColor: "#3b82f6",
  setTheme: () => {},
  setAccentColor: () => {},
});

export function useTheme() {
  return useContext(ThemeContext);
}

interface ThemeProviderProps {
  children: React.ReactNode;
  initialTheme?: "light" | "dark";
  initialAccentColor?: string;
}

export function ThemeProvider({
  children,
  initialTheme = "light",
  initialAccentColor = "#3b82f6",
}: ThemeProviderProps) {
  const [theme, setThemeState] = useState<"light" | "dark">(initialTheme);
  const [accentColor, setAccentColorState] = useState(initialAccentColor);

  const setTheme = (newTheme: "light" | "dark") => {
    setThemeState(newTheme);
    localStorage.setItem("theme", newTheme);
  };

  const setAccentColor = (color: string) => {
    setAccentColorState(color);
    localStorage.setItem("accentColor", color);
  };

  // On mount, read from localStorage if available
  useEffect(() => {
    const storedTheme = localStorage.getItem("theme") as "light" | "dark" | null;
    const storedAccent = localStorage.getItem("accentColor");

    if (storedTheme) {
      setThemeState(storedTheme);
    }
    if (storedAccent) {
      setAccentColorState(storedAccent);
    }
  }, []);

  // Apply dark class to html element
  useEffect(() => {
    document.documentElement.classList.toggle("dark", theme === "dark");
  }, [theme]);

  // Apply accent color CSS variable
  useEffect(() => {
    document.documentElement.style.setProperty("--color-primary", accentColor);
  }, [accentColor]);

  return (
    <ThemeContext.Provider value={{ theme, accentColor, setTheme, setAccentColor }}>
      {children}
    </ThemeContext.Provider>
  );
}
