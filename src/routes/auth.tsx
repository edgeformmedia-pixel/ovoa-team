import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { lovable } from "@/integrations/lovable/index";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { setAuthSkipped } from "@/lib/skip-auth";

export const Route = createFileRoute("/auth")({
  staticData: { sitemap: false },
  component: AuthPage,
  head: () => ({
    meta: [
      { title: "Sign in to Ovoa" },
      {
        name: "description",
        content: "Sign in to Ovoa to send requests to your agent and see what came of them.",
      },
      { property: "og:title", content: "Sign in to Ovoa" },
      { property: "og:description", content: "Your requests, your results, your account." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
});

function AuthPage() {
  const { session, loading } = useAuth();
  const navigate = useNavigate();
  const [mode, setMode] = useState<"in" | "up">("in");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    if (session) void navigate({ to: "/app" });
  }, [session, navigate]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setMessage(null);
    try {
      if (mode === "up") {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: { emailRedirectTo: `${window.location.origin}/app` },
        });
        if (error) throw error;
        if (!data.session) setMessage("Check your email for the confirmation link, then come back.");
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      }
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "That didn't work.");
    } finally {
      setBusy(false);
    }
  }

  async function google() {
    setMessage(null);
    const result = await lovable.auth.signInWithOAuth("google", {
      redirect_uri: window.location.origin,
    });
    if (result.error) {
      setMessage("Google sign-in didn't work. Try email instead.");
      return;
    }
  }

  return (
    <div className="band-app min-h-dvh">
      <div className="mx-auto flex min-h-dvh w-full max-w-[420px] flex-col justify-center px-4 py-10">
        <h1 className="font-mono text-[11px] uppercase tracking-[0.24em] text-band-dim">Ovoa</h1>
        <p className="mt-3 text-[15px] text-band-text">
          {mode === "in" ? "Sign in to your agent." : "Create your account."}
        </p>

        <form onSubmit={submit} className="mt-6 space-y-3">
          <input
            className="neu-field h-11 w-full px-3 text-[14px] outline-none"
            type="email"
            required
            autoComplete="email"
            placeholder="you@email.com"
            aria-label="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <input
            className="neu-field h-11 w-full px-3 text-[14px] outline-none"
            type="password"
            required
            minLength={8}
            autoComplete={mode === "in" ? "current-password" : "new-password"}
            placeholder="Password"
            aria-label="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          <button type="submit" className="band-btn w-full" disabled={busy || loading}>
            {busy ? "One moment…" : mode === "in" ? "Sign in" : "Create account"}
          </button>
        </form>

        <button type="button" className="band-btn mt-3 w-full" onClick={() => void google()}>
          Continue with Google
        </button>

        {message && (
          <p role="status" className="mt-4 text-[13px] text-band-dim">
            {message}
          </p>
        )}

        <button
          type="button"
          className="band-btn-ghost mt-6 self-start"
          onClick={() => {
            setAuthSkipped(true);
            void navigate({ to: "/app" });
          }}
        >
          Skip for now (testing)
        </button>

        <button
          type="button"
          className="band-btn-ghost mt-2 self-start"
          onClick={() => {
            setMode(mode === "in" ? "up" : "in");
            setMessage(null);
          }}
        >
          {mode === "in" ? "No account yet? Create one" : "Already have an account? Sign in"}
        </button>
      </div>
    </div>
  );
}
