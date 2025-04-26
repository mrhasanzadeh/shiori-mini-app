import { useThemeStore } from "../store/themeStore";

export const useTheme = () => {
  const { isDarkMode, toggleTheme } = useThemeStore();

  const applyTheme = () => {
    if (isDarkMode) {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  };

  return {
    isDarkMode,
    toggleTheme,
    applyTheme,
  };
};

export const getSystemTheme = () => {
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
};

export const watchSystemTheme = (callback: (theme: "dark" | "light") => void) => {
  const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");

  const handleChange = (e: MediaQueryListEvent) => {
    callback(e.matches ? "dark" : "light");
  };

  mediaQuery.addEventListener("change", handleChange);

  return () => {
    mediaQuery.removeEventListener("change", handleChange);
  };
};
