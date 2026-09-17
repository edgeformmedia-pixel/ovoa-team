import { useCallback, useEffect, useState } from "react";

export function TextStyleToggle({ className = "" }: { className?: string }) {
  const [isClear, setIsClear] = useState(true);

  useEffect(() => {
    const stored = localStorage.getItem("text-style");
    const next = stored !== "neu";
    setIsClear(next);
    document.documentElement.classList.toggle("clear-text", next);
  }, []);

  const toggle = useCallback(() => {
    setIsClear((prev) => {
      const next = !prev;
      localStorage.setItem("text-style", next ? "clear" : "neu");
      document.documentElement.classList.toggle("clear-text", next);
      return next;
    });
  }, []);

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={isClear ? "Switch to neumorphic text" : "Switch to clear text"}
      className={`neo-btn flex h-8 w-8 items-center justify-center rounded-full p-0 text-[11px] ${className}`}
    >
      <span className={isClear ? "" : "neu-embossed"}>Aa</span>
    </button>
  );
}
