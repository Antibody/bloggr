"use client";
import {
  createContext,
  useContext,
  useEffect,
  useSyncExternalStore,
} from "react";
type Theme = "system" | "light" | "dark";
const ThemeContext = createContext<{
  theme: Theme;
  setTheme: (theme: Theme) => void;
}>({ theme: "system", setTheme: () => {} });
let memoryTheme: Theme = "system";
let memoryOnly = false;
function snapshot(): Theme {
  if (memoryOnly) return memoryTheme;
  try {
    const value = localStorage.getItem("bloggr-theme");
    return value === "light" || value === "dark" ? value : "system";
  } catch {
    return memoryTheme;
  }
}
function subscribe(notify: () => void) {
  window.addEventListener("storage", notify);
  window.addEventListener("bloggr-theme-change", notify);
  return () => {
    window.removeEventListener("storage", notify);
    window.removeEventListener("bloggr-theme-change", notify);
  };
}
function serverSnapshot(): Theme {
  return "system";
}
export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const theme = useSyncExternalStore(subscribe, snapshot, serverSnapshot);
  useEffect(() => {
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const apply = () => {
      const dark = theme === "dark" || (theme === "system" && media.matches);
      document.documentElement.classList.toggle("dark", dark);
      document.documentElement.style.colorScheme = dark ? "dark" : "light";
    };
    apply();
    media.addEventListener("change", apply);
    return () => media.removeEventListener("change", apply);
  }, [theme]);
  const setTheme = (next: Theme) => {
    memoryTheme = next;
    try {
      localStorage.setItem("bloggr-theme", next);
      memoryOnly = false;
    } catch {
      memoryOnly = true;
    }
    window.dispatchEvent(new Event("bloggr-theme-change"));
  };
  return (
    <ThemeContext.Provider value={{ theme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}
export const useTheme = () => useContext(ThemeContext);
export function ThemeSelect() {
  const { theme, setTheme } = useTheme();
  return (
    <label className="theme-control">
      <span className="sr-only">Color theme</span>
      <select
        aria-label="Color theme"
        value={theme}
        onChange={(e) => setTheme(e.target.value as Theme)}
      >
        <option value="system">System</option>
        <option value="light">Light</option>
        <option value="dark">Dark</option>
      </select>
    </label>
  );
}
