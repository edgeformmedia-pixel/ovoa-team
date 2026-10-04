import { createFileRoute, redirect } from "@tanstack/react-router";

// ovoa.ai/cancel: the easy-to-remember way to cancel. The Cancel plan button
// lives on /account (sign in there first if needed).
export const Route = createFileRoute("/cancel")({
  staticData: { sitemap: false },
  beforeLoad: () => {
    throw redirect({ to: "/account" });
  },
});
