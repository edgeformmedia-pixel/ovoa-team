// Temporary testing bypass: lets visitors look around /app without an
// account. Skipped sessions can view the interface but cannot save or run
// requests — those still require a real sign-in.
const KEY = "ovoa:skip-auth";

export function isAuthSkipped(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return window.localStorage.getItem(KEY) === "1";
  } catch {
    return false;
  }
}

export function setAuthSkipped(skipped: boolean): void {
  try {
    if (skipped) window.localStorage.setItem(KEY, "1");
    else window.localStorage.removeItem(KEY);
  } catch {
    // Private browsing etc. — skipping simply won't stick.
  }
}
