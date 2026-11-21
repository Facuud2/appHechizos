"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";

export type ThemePreference = "light" | "dark" | "system";
export type ResolvedTheme = "light" | "dark";

const STORAGE_KEY = "altar-theme-v1";
const THEME_COLORS: Record<ResolvedTheme, string> = {
  light: "#F6F7FB",
  dark: "#0C0F16",
};

interface ThemeContextValue {
  preference: ThemePreference;
  resolved: ResolvedTheme;
  setPreference: (next: ThemePreference) => void;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

function applyThemeToDom(resolved: ResolvedTheme) {
  const root = document.documentElement;
  if (resolved === "dark") {
    root.classList.add("dark");
  } else {
    root.classList.remove("dark");
  }
  root.style.colorScheme = resolved;

  // Keep mobile status bar / browser chrome synced with active appearance
  const color = THEME_COLORS[resolved];
  const metas = document.querySelectorAll<HTMLMetaElement>(
    'meta[name="theme-color"]'
  );
  if (metas.length > 0) {
    metas.forEach((meta) => {
      meta.setAttribute("content", color);
    });
  } else {
    const meta = document.createElement("meta");
    meta.name = "theme-color";
    meta.content = color;
    document.head.appendChild(meta);
  }
}

function getSystemTheme(): ResolvedTheme {
  if (typeof window === "undefined") return "light";
  return window.matchMedia("(prefers-color-scheme: dark)").matches
    ? "dark"
    : "light";
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [preference, setPreferenceState] = useState<ThemePreference>("light");
  const [resolved, setResolved] = useState<ResolvedTheme>("light");

  // Hydrate initial preference from localStorage (defaults to vivid Light Mode)
  useEffect(() => {
    let initial: ThemePreference = "light";
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved === "light" || saved === "dark" || saved === "system") {
        initial = saved;
      }
    } catch {
      // ignore private browsing errors
    }
    setPreferenceState(initial);
    const nextResolved = initial === "system" ? getSystemTheme() : initial;
    setResolved(nextResolved);
    applyThemeToDom(nextResolved);
  }, []);

  // Listen to OS color-scheme changes when in "system" mode
  useEffect(() => {
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const handleChange = () => {
      if (preference === "system") {
        const next = media.matches ? "dark" : "light";
        setResolved(next);
        applyThemeToDom(next);
      }
    };
    media.addEventListener("change", handleChange);
    return () => media.removeEventListener("change", handleChange);
  }, [preference]);

  const setPreference = useCallback((next: ThemePreference) => {
    setPreferenceState(next);
    try {
      localStorage.setItem(STORAGE_KEY, next);
    } catch {
      // ignore
    }
    const nextResolved = next === "system" ? getSystemTheme() : next;
    setResolved(nextResolved);
    applyThemeToDom(nextResolved);
  }, []);

  const toggleTheme = useCallback(() => {
    setPreference(resolved === "dark" ? "light" : "dark");
  }, [resolved, setPreference]);

  return (
    <ThemeContext.Provider
      value={{ preference, resolved, setPreference, toggleTheme }}
    >
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) {
    throw new Error("useTheme must be used within ThemeProvider");
  }
  return ctx;
}
