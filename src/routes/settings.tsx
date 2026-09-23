import { Link, createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { AutomationRow } from "@/components/band/AutomationRow";
import { useBand } from "@/components/band/BandStore";
import { BUZZES } from "@/lib/band-data";
import {
  claudeTokenStatus,
  clearClaudeToken,
  probeClaudeToken,
  saveClaudeToken,
  type ClaudeTestResult,
} from "@/lib/claude-spike.functions";

const TESTS = [
  {
    key: "memory",
    label: "Does it know you?",
    prompt: "What do you know about me? Summarize anything you remember from past conversations.",
  },
  {
    key: "connectors",
    label: "Can it see your connected apps?",
    prompt: "List every connector or external app integration you currently have access to.",
  },
  {
    key: "action",
    label: "Can it act on them?",
    prompt: "Create a calendar event tomorrow at 3pm called Band Test. If you cannot, say exactly why.",
  },
] as const;

function ClaudeSpike() {
  const [saved, setSaved] = useState<boolean | null>(null);
  const [hint, setHint] = useState("");
  const [token, setToken] = useState("");
  const [saving, setSaving] = useState(false);
  const [running, setRunning] = useState(false);
  const [saveError, setSaveError] = useState("");
  const [results, setResults] = useState<Record<string, ClaudeTestResult>>({});

  useEffect(() => {
    let alive = true;
    void claudeTokenStatus()
      .then((s) => {
        if (!alive) return;
        setSaved(s.saved);
        setHint(s.hint);
      })
      .catch(() => alive && setSaved(false));
    return () => {
      alive = false;
    };
  }, []);

  async function save() {
    const t = token.trim();
    if (t.length < 10 || saving) return;
    setSaving(true);
    try {
      const r = await saveClaudeToken({ data: { token: t } });
      setSaveError(r.error ?? "");
      if (!r.saved) return;
      const confirmed = await claudeTokenStatus();
      if (!confirmed.saved) {
        setSaved(false);
        setHint("");
        setSaveError("The secure sign-in could not be saved. Please try once more.");
        return;
      }
      setSaved(true);
      setHint(confirmed.hint || r.hint);
      setToken("");
      setResults({});
    } catch {
      setSaved(false);
      setHint("");
      setSaveError("The secure sign-in could not be saved. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  async function forget() {
    await clearClaudeToken();
    setSaved(false);
    setHint("");
    setSaveError("");
    setResults({});
  }

  async function run() {
    if (running || !saved) return;
    setRunning(true);
    setResults({});
    let first = true;
    for (const test of TESTS) {
      if (!first) await new Promise((r) => setTimeout(r, 1500));
      first = false;
      try {
        const r = await probeClaudeToken({ data: { prompt: test.prompt } });
        setResults((prev) => ({ ...prev, [test.key]: r }));
        if (r.authInvalid) {
          setSaved(false);
          setHint("");
          break;
        }
      } catch (error) {
        setResults((prev) => ({ ...prev, [test.key]: { ok: false, answer: "", detail: String(error) } }));
      }
    }
    setRunning(false);
  }

  return (
    <div className="band-card px-4 py-4">
      {saved === null ? (
        <p className="text-[13px] text-band-dim">Checking your Claude sign-in…</p>
      ) : saved ? (
        <div className="flex items-center gap-3">
          <span className="min-w-0 flex-1">
            <span className="block text-[14px] text-band-text">Claude is signed in</span>
            <span className="block font-mono text-[12px] text-band-dim">
              saved {hint} · you only do this once
            </span>
          </span>
          <button type="button" className="band-btn-ghost shrink-0" onClick={forget}>
            Forget
          </button>
        </div>
      ) : (
        <div>
          {(saveError || Object.values(results).some((result) => result.authInvalid)) && (
            <p role="alert" className="mb-3 text-[13px] leading-snug text-band-text">
              {saveError ||
                "Claude disconnected this sign-in. Paste a fresh setup token to reconnect."}
            </p>
          )}
          <form
            className="band-composer"
            onSubmit={(e) => {
              e.preventDefault();
              void save();
            }}
          >
            <input
              aria-label="Claude setup token"
              type="password"
              autoComplete="off"
              spellCheck={false}
              placeholder="Paste a fresh setup token"
              value={token}
              onChange={(e) => setToken(e.target.value)}
              className="min-w-0 flex-1 bg-transparent font-mono text-[12px] text-band-text outline-none placeholder:text-band-dim"
            />
            <button type="submit" className="band-btn shrink-0" disabled={saving || token.trim().length < 10}>
              {saving ? "Saving…" : "Reconnect"}
            </button>
          </form>
        </div>
      )}
      <div className="mt-3">
        <button type="button" className="band-btn" disabled={running || !saved} onClick={run}>
          {running ? "Asking your Claude…" : "Run the test"}
        </button>
      </div>

      <ul className="mt-4 space-y-2">
        {TESTS.map((t) => {
          const r = results[t.key];
          return (
            <li key={t.key} className="band-card px-4 py-3">
              <span className="block text-[13px] text-band-text">{t.label}</span>
              {!r ? (
                <span className="block text-[12px] text-band-dim">
                  {running ? "…" : "Not run yet"}
                </span>
              ) : r.ok ? (
                <span className="mt-1 block whitespace-pre-wrap text-[13px] leading-snug text-band-text">
                  {r.answer || "(empty answer)"}
                </span>
              ) : (
                <span className="mt-1 block text-[12px] text-band-dim">Failed: {r.detail}</span>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}


const KEY = "bnd_live_7f2c94a1e08d4b3a91c6";

export const Route = createFileRoute("/settings")({
  staticData: { sitemap: false },
  component: SettingsPage,
  head: () => ({
    meta: [
      { title: "Your band: settings" },
      {
        name: "description",
        content:
          "Customize the band in plain English: what it can touch, when it buzzes, what it does on its own, and who else can read it.",
      },
      { property: "og:title", content: "Your band: settings" },
      {
        property: "og:description",
        content: "Everything about your band in one place. Written in plain English, not toggles.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
});

function Section({ title, hint, children }: { title: string; hint?: string; children: React.ReactNode }) {
  return (
    <section className="mt-8 first:mt-0">
      <h2 className="font-mono text-[10px] uppercase tracking-[0.22em] text-band-dim">{title}</h2>
      {hint && <p className="mt-2 text-[13px] leading-snug text-band-dim">{hint}</p>}
      <div className="mt-3">{children}</div>
    </section>
  );
}

function SettingsPage() {
  const {
    hr,
    battery,
    tasks,
    connections,
    connect,
    disconnect,
    automations,
    toggle,
    autonomous,
    setAutonomous,
    customs,
    addCustom,
    removeCustom,
  } = useBand();
  const [revealed, setRevealed] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const [mcpUrl, setMcpUrl] = useState("/mcp");

  useEffect(() => {
    setMcpUrl(`${window.location.origin}/mcp`);
  }, []);

  function copy(label: string, text: string) {
    void navigator.clipboard?.writeText(text);
    setCopied(label);
    window.setTimeout(() => setCopied(null), 1400);
  }

  return (
    <div className="band-app min-h-dvh">
      <div className="mx-auto flex min-h-dvh w-full max-w-[520px] flex-col">
        <header className="sticky top-0 z-20 flex items-center gap-3 border-b border-band-line bg-band-ground/90 px-4 py-3 backdrop-blur">
          <Link to="/app" className="band-btn-ghost">
            Back
          </Link>
          <span className="text-[13px] text-band-text">Your band</span>
          <span className="ml-auto font-mono text-[12px] tabular-nums text-band-dim">
            {hr} bpm · {battery}%
          </span>
        </header>

        <main className="band-page band-stagger flex-1 px-4 pb-10 pt-5">
          <Section
            title="Customize it"
            hint="Say how the band should behave. Plain English, no settings to hunt for. It follows these."
          >
            <form
              className="band-composer"
              onSubmit={(e) => {
                e.preventDefault();
                const v = draft.trim();
                if (!v) return;
                addCustom(v);
                setDraft("");
              }}
            >
              <input
                aria-label="Tell the band how to behave"
                placeholder="Buzz twice before it buys anything."
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                className="min-w-0 flex-1 bg-transparent text-[14px] text-band-text outline-none placeholder:text-band-dim"
              />
              <button type="submit" className="band-btn shrink-0">
                Add
              </button>
            </form>
            <ul className="mt-2 space-y-2">
              {customs.map((c) => (
                <li key={c.id} className="band-card flex items-center gap-3 px-4 py-3">
                  <span className="min-w-0 flex-1 text-[14px] text-band-text">{c.text}</span>
                  <button
                    type="button"
                    className="band-btn-ghost shrink-0"
                    onClick={() => removeCustom(c.id)}
                  >
                    Remove
                  </button>
                </li>
              ))}
              {customs.length === 0 && (
                <li className="text-[13px] text-band-dim">Nothing yet. It uses its own judgment.</li>
              )}
            </ul>
          </Section>

          <Section title="Accounts it can act on" hint="Every account you add widens what it can do.">
            <ul className="space-y-2">
              {connections.map((c) => (
                <li key={c.id} className="band-card flex items-center gap-3 px-4 py-3">
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[14px] text-band-text">{c.name}</span>
                    <span className="block truncate text-[12px] text-band-dim">{c.detail}</span>
                  </span>
                  {c.state === "hardware" ? (
                    <span className="shrink-0 font-mono text-[11px] text-band-dim">soon</span>
                  ) : c.state === "connected" ? (
                    <button type="button" className="band-btn-ghost" onClick={() => disconnect(c.id)}>
                      Remove
                    </button>
                  ) : (
                    <button type="button" className="band-btn" onClick={() => connect(c.id)}>
                      Connect
                    </button>
                  )}
                </li>
              ))}
            </ul>
          </Section>

          <Section title="Always on" hint="Standing rules it keeps running without being asked.">
            <ul className="space-y-2">
              {automations.map((a) => (
                <AutomationRow key={a.id} automation={a} onToggle={toggle} />
              ))}
              {automations.length === 0 && (
                <li className="text-[13px] text-band-dim">
                  Nothing standing yet. Ask for one and it lands here.
                </li>
              )}
            </ul>
          </Section>

          <Section title="On its own">
            <div className="band-card flex items-center gap-3 px-4 py-3">
              <span className="min-w-0 flex-1">
                <span className="block text-[14px] text-band-text">Act without asking</span>
                <span className="block text-[12px] text-band-dim">
                  {autonomous ? "It sends and buys on its own" : "It asks before sending or buying"}
                </span>
              </span>
              <button
                type="button"
                role="switch"
                aria-checked={autonomous}
                aria-label="Act without asking"
                onClick={() => setAutonomous(!autonomous)}
                className={`band-switch ${autonomous ? "band-switch-on" : ""}`}
              >
                <span className="band-switch-knob" />
              </button>
            </div>
          </Section>

          <Section title="Buzzes">
            <dl className="band-card space-y-2 px-4 py-4 text-[13px]">
              {BUZZES.map((b) => (
                <div key={b.pattern} className="flex justify-between gap-3">
                  <dt className="font-mono text-band-dim">{b.pattern}</dt>
                  <dd className="text-band-text">{b.means}</dd>
                </div>
              ))}
            </dl>
          </Section>

          <Section
            title="Connect Claude (live test)"
            hint="Tests whether signing in with your Claude account lets the band use your Claude: your plan, your memory, your connected apps. Your sign-in is saved once, encrypted, and never shown again."
          >
            <ClaudeSpike />
          </Section>

          <Section
            title="Let Claude read the band"
            hint="The other direction: add this endpoint to Claude, ChatGPT or Cursor and it can read your tasks, notes and signals, and hand the band new tasks."
          >
            <div className="band-card px-4 py-4">
              <div className="band-composer">
                <span className="min-w-0 flex-1 truncate font-mono text-[12px] text-band-text">
                  {mcpUrl}
                </span>
              </div>
              <div className="mt-3">
                <button type="button" className="band-btn" onClick={() => copy("url", mcpUrl)}>
                  {copied === "url" ? "Copied" : "Copy endpoint"}
                </button>
              </div>
            </div>
          </Section>

          <Section
            title="API key"
            hint="Read access to everything the band sends: heart rate, motion, transcripts, steps, battery, raw frames."
          >
            <div className="band-card px-4 py-4">
              <div className="band-composer">
                <span className="min-w-0 flex-1 truncate font-mono text-[12px] text-band-text">
                  {revealed ? KEY : "bnd_live_••••••••••••••••••"}
                </span>
              </div>
              <div className="mt-3 flex gap-2">
                <button
                  type="button"
                  className="band-btn-ghost"
                  onClick={() => setRevealed((r) => !r)}
                >
                  {revealed ? "Hide" : "Reveal"}
                </button>
                <button type="button" className="band-btn" onClick={() => copy("key", KEY)}>
                  {copied === "key" ? "Copied" : "Copy"}
                </button>
              </div>
            </div>
          </Section>

          <Section title="Band">
            <dl className="band-card space-y-2 px-4 py-4 text-[13px]">
              <div className="flex justify-between">
                <dt className="text-band-dim">Heart rate</dt>
                <dd className="font-mono tabular-nums text-band-text">{hr} bpm</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-band-dim">Battery</dt>
                <dd className="font-mono tabular-nums text-band-text">{battery}%</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-band-dim">Firmware</dt>
                <dd className="font-mono text-band-text">1.4.2</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-band-dim">Tasks</dt>
                <dd className="font-mono tabular-nums text-band-text">{tasks.length}</dd>
              </div>
            </dl>
            <div className="mt-3 flex gap-2">
              <button type="button" className="band-btn-ghost">
                Reconnect
              </button>
              <button type="button" className="band-btn-ghost">
                Unpair
              </button>
            </div>
          </Section>
        </main>
      </div>
    </div>
  );
}
