import { useEffect } from "react";
import { REF_COOKIE, REF_COOKIE_DAYS, cleanRef } from "./plans";
import { recordReferralClick } from "./membership.functions";

// ovoa.ai/anything?ref=code remembers the partner for REF_COOKIE_DAYS. The
// checkout reads the cookie, so the sale is credited even if they buy weeks
// later. The last partner link someone clicked wins.
export function useReferralCapture() {
  useEffect(() => {
    const ref = cleanRef(new URLSearchParams(window.location.search).get("ref"));
    if (!ref) return;
    const secure = window.location.protocol === "https:" ? "; Secure" : "";
    document.cookie = `${REF_COOKIE}=${ref}; Max-Age=${REF_COOKIE_DAYS * 86400}; Path=/; SameSite=Lax${secure}`;

    // One click per browser per partner.
    const seen = `ovoa_ref_seen_${ref}`;
    try {
      if (localStorage.getItem(seen)) return;
      localStorage.setItem(seen, "1");
    } catch {
      /* private mode: count it anyway */
    }
    recordReferralClick({ data: { code: ref } }).catch(() => undefined);
  }, []);
}
