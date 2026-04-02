"use client";

import { useEffect, useState } from "react";

const THEMES = [
  { id: "madrugada", color: "#00b4d8", label: "Madrugada" },
  { id: "jade",      color: "#00d4aa", label: "Jade"      },
  { id: "abismo",    color: "#0057ff", label: "Abismo"    },
  { id: "poniente",  color: "#e8571a", label: "Poniente"  },
  { id: "bruma",     color: "#6366f1", label: "Bruma"     },
] as const;

type ThemeId = (typeof THEMES)[number]["id"];

function applyTheme(id: ThemeId) {
  if (id === "madrugada") {
    delete document.documentElement.dataset.theme;
  } else {
    document.documentElement.dataset.theme = id;
  }
}

export function ThemeSwitcher() {
  const [theme, setTheme] = useState<ThemeId>("madrugada");

  useEffect(() => {
    const stored = localStorage.getItem("theme") as ThemeId | null;
    if (stored && THEMES.some((t) => t.id === stored)) {
      setTheme(stored);
      applyTheme(stored);
    }
  }, []);

  const handleSelect = (id: ThemeId) => {
    setTheme(id);
    localStorage.setItem("theme", id);
    applyTheme(id);
  };

  return (
    <div aria-label="Color theme" className="theme-switcher" role="group">
      {THEMES.map(({ id, color, label }) => (
        <button
          aria-label={label}
          aria-pressed={theme === id}
          className={theme === id ? "is-active" : undefined}
          data-label={label}
          key={id}
          onClick={() => handleSelect(id)}
          type="button"
        >
          <span className="theme-switcher__dot" style={{ background: color }} />
        </button>
      ))}
    </div>
  );
}
