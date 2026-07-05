"use client";

import { useEffect, useState } from "react";
import { Moon, Sun } from "lucide-react";

type Theme = "dark" | "light";

function getInitialTheme(): Theme {
  if (typeof window === "undefined") return "dark";
  return document.documentElement.dataset.theme === "light" ? "light" : "dark";
}

export function ThemeToggle() {
  const [theme, setTheme] = useState<Theme>(getInitialTheme);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    document.documentElement.style.colorScheme = theme;
    window.localStorage.setItem("bpsr-theme", theme);
  }, [theme]);

  const nextTheme = theme === "dark" ? "light" : "dark";

  return (
    <button
      className="icon-button theme-toggle"
      type="button"
      aria-label={theme === "dark" ? "ライトモードに切り替え" : "ダークモードに切り替え"}
      title={theme === "dark" ? "ライトモード" : "ダークモード"}
      onClick={() => setTheme(nextTheme)}
    >
      {theme === "dark" ? <Sun size={18} aria-hidden="true" /> : <Moon size={18} aria-hidden="true" />}
    </button>
  );
}
