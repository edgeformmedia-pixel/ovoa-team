import { useCallback, useEffect, useState } from "react";

export function ThemeToggle() {
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem("theme");
    const next = stored === "dark";
    setIsDark(next);
    document.documentElement.classList.toggle("dark", next);
  }, []);

  const toggle = useCallback(() => {
    setIsDark((prev) => {
      const next = !prev;
      localStorage.setItem("theme", next ? "dark" : "light");
      document.documentElement.classList.toggle("dark", next);
      return next;
    });
  }, []);

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
      className="neo-btn flex h-8 w-8 items-center justify-center rounded-full p-0 text-[11px]"
    >
      <span className="neu-embossed">{isDark ? "☀" : "☾"}</span>
    </button>
  );
}
