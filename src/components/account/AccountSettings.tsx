import { Link, useRouter } from "@tanstack/react-router";
import { Loader2, MessageCircle } from "lucide-react";
import { useEffect, useRef, useState, type FormEvent, type ReactNode } from "react";
import { Qr, pretty, smsHref, smsQr, useDevice } from "@/components/texting";
import {
  agreeToAi,
  checkUsername,
  clearChat,
  connectGoogle,
  deleteAccount,
  deleteWebsite,
  disconnectGoogle,
  labelGoogle,
  forgetEverything,
  forgetMemory,
  saveSettings,
  setTextingFirst,
  setUsername,
  unlinkNumber,
  withdrawAi,
  type AccountSettings as Settings,
  type AssistantSettings,
  type Done,
  type TextingState,
  type UsernameState,
} from "@/lib/account/settings.functions";
import { getLinked, startTextLink, type LinkCode } from "@/lib/account/texting.functions";
import { credits } from "@/lib/membership/copy";

// The signed-in half of /account below the account itself: what the OVOA app
// keeps under Settings, for someone who only texts OVOA and has no app
// (src/lib/account/settings.functions.ts). What needs the iPhone itself (its
// contacts, calendar, Reminders and shortcuts, the band, the wake word) stays
// in the app and isn't shown here.

export const primaryButton =
  "inline-flex h-11 items-center justify-center gap-2 rounded-full bg-landing-action px-6 text-sm font-semibold text-landing-action-foreground transition-transform hover:-translate-y-0.5 active:translate-y-0 disabled:pointer-events-none disabled:opacity-60";
export const secondaryButton =
  "inline-flex h-11 items-center justify-center gap-2 rounded-full border border-landing-line px-6 text-sm font-semibold text-landing-ink transition-colors hover:border-landing-muted disabled:pointer-events-none disabled:opacity-50";
export const field =
  "h-11 w-full rounded-xl border border-landing-line bg-landing-canvas px-4 text-[15px] text-landing-ink outline-none transition-colors placeholder:text-landing-muted focus:border-landing-action focus:ring-2 focus:ring-landing-action/15";
export const linkButton = "font-semibold text-landing-action disabled:text-landing-muted";
const smallButton =
  "inline-flex h-9 items-center justify-center gap-2 rounded-full border border-landing-line px-4 text-[13px] font-semibold text-landing-ink transition-colors hover:border-landing-muted disabled:pointer-events-none disabled:opacity-50";
const quietLink = "text-[13px] font-semibold text-landing-muted underline underline-offset-2";

const dateFormat = new Intl.DateTimeFormat("en-US", {
  month: "long",
  day: "numeric",
  year: "numeric",
});

// ---------- Shared pieces ----------

function Section({ id, title, children }: { id: string; title: string; children: ReactNode }) {
  return (
    <section id={id} className="mt-10 scroll-mt-32">
      <h2 className="text-lg font-semibold">{title}</h2>
      <div className="mt-3 grid gap-5 rounded-2xl border border-landing-line px-5 py-5">
        {children}
      </div>
    </section>
  );
}

const Muted = ({ children }: { children: ReactNode }) => (
  <p className="text-sm leading-relaxed text-landing-muted">{children}</p>
);

const Problem = ({ children }: { children: ReactNode }) =>
  children ? (
    <p role="alert" className="text-sm font-medium text-red-600 dark:text-red-400">
      {children}
    </p>
  ) : null;

/** A switch with its name and, under it, what it does. */
function Toggle({
  label,
  about,
  on,
  disabled,
  onChange,
}: {
  label: string;
  about: ReactNode;
  on: boolean;
  disabled?: boolean;
  onChange: (next: boolean) => void;
}) {
  return (
    <div className="flex items-start justify-between gap-4">
      <div className="min-w-0">
        <p className="text-[15px] font-medium">{label}</p>
        <p className="mt-0.5 text-sm leading-relaxed text-landing-muted">{about}</p>
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={on}
        aria-label={label}
        disabled={disabled}
        onClick={() => onChange(!on)}
        className={`relative mt-0.5 h-7 w-12 shrink-0 rounded-full transition-colors disabled:opacity-50 ${
          on ? "bg-landing-action" : "bg-landing-line"
        }`}
      >
        <span
          className={`absolute left-0.5 top-0.5 size-6 rounded-full bg-white shadow-sm transition-transform ${
            on ? "translate-x-5" : ""
          }`}
        />
      </button>
    </div>
  );
}

/** Runs one change at a time, and keeps what went wrong for the section to show. */
function useChange() {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  async function run<T>(call: () => Promise<Done<T>>): Promise<({ ok: true } & T) | null> {
    setBusy(true);
    setError(null);
    try {
      const res = await call();
      if (res.ok) return res;
      setError(res.error);
    } catch (err) {
      setError(err instanceof Error && err.message ? err.message : "That didn't work. Try again.");
    } finally {
      setBusy(false);
    }
    return null;
  }
  return { busy, error, run };
}

const Spinner = () => <Loader2 aria-hidden="true" className="size-4 animate-spin" />;

// ---------- Texting ----------

function Texting({ initial, agreed }: { initial: TextingState | null; agreed: boolean }) {
  const device = useDevice();
  const { busy, error, run } = useChange();
  const [linked, setLinked] = useState(initial?.linked ?? null);
  const [code, setCode] = useState<Extract<LinkCode, { ok: true }> | null>(null);
  const before = useRef<number | null>(null);
  const mobile = device === "iphone" || device === "android";

  // While the code is up, look every few seconds for their text to arrive.
  useEffect(() => {
    if (!code) return;
    let stop = false;
    const timer = window.setInterval(async () => {
      try {
        const { linked: now } = await getLinked();
        if (stop || !now || now.linkedAt === before.current) return;
        setLinked({ textingFirst: true, ...now });
        setCode(null);
      } catch {
        // Try again next tick.
      }
    }, 3000);
    return () => {
      stop = true;
      window.clearInterval(timer);
    };
  }, [code]);

  async function link() {
    before.current = linked?.linkedAt ?? null;
    const got = await run(async () => {
      const res = await startTextLink();
      return res.ok ? { ok: true as const, code: res } : res;
    });
    if (got) setCode(got.code);
  }

  async function unlink() {
    if (!linked) return;
    if (
      !window.confirm(
        `Unlink ${pretty(linked.phone)}? Texts from it won't be this account's any more. You can link it again here.`,
      )
    )
      return;
    if (await run(() => unlinkNumber())) setLinked(null);
  }

  async function first(on: boolean) {
    if (!linked) return;
    setLinked({ ...linked, textingFirst: on });
    if (!(await run(() => setTextingFirst({ data: { on } }))))
      setLinked({ ...linked, textingFirst: !on });
  }

  if (!initial)
    return (
      <Section id="texting" title="Texting OVOA">
        <Muted>This didn&rsquo;t load just now. Refresh to try again.</Muted>
      </Section>
    );

  if (!initial.available || !initial.number)
    return (
      <Section id="texting" title="Texting OVOA">
        <Muted>
          Texting OVOA isn&rsquo;t open right this minute. Try again shortly, or email
          support@ovoa.ai.
        </Muted>
      </Section>
    );

  const number = initial.number;

  return (
    <Section id="texting" title="Texting OVOA">
      {linked && !code ? (
        <>
          <div>
            <p className="text-[15px]">
              Linked to <strong>{pretty(linked.phone)}</strong>.
            </p>
            <p className="mt-1 text-sm leading-relaxed text-landing-muted">
              Text OVOA at {pretty(number)} from that number and it&rsquo;s this account: its plan,
              what it remembers, your reminders and your Google.
              {!agreed && " It answers once you've agreed to AI, below."}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <a href={`sms:${number}`} className={smallButton}>
              <MessageCircle aria-hidden="true" className="size-4" />
              Text OVOA
            </a>
            <button type="button" onClick={() => void link()} disabled={busy} className={quietLink}>
              Switch number
            </button>
            <button
              type="button"
              onClick={() => void unlink()}
              disabled={busy}
              className={quietLink}
            >
              Unlink
            </button>
          </div>
          <Toggle
            label="Let OVOA text me first"
            about="Reminders, heads-ups and things it's watching for you come as a text. Off, it only answers."
            on={linked.textingFirst}
            disabled={busy}
            onChange={(on) => void first(on)}
          />
        </>
      ) : code ? (
        <SendCode
          code={code}
          mobile={mobile}
          href={device ? smsHref(code.number, code.body, device) : "#"}
          onCancel={() => setCode(null)}
          onAgain={() => void link()}
        />
      ) : (
        <>
          <Muted>
            Link the number you text OVOA from, so your texts are this account&rsquo;s: its plan,
            what it remembers, your reminders and your Google. It takes one text.
          </Muted>
          <div>
            <button
              type="button"
              onClick={() => void link()}
              disabled={busy}
              className={primaryButton}
            >
              {busy ? <Spinner /> : null}
              Link my number
            </button>
          </div>
        </>
      )}
      <Problem>{error}</Problem>
    </Section>
  );
}

function SendCode({
  code,
  mobile,
  href,
  onCancel,
  onAgain,
}: {
  code: Extract<LinkCode, { ok: true }>;
  mobile: boolean;
  href: string;
  onCancel: () => void;
  onAgain: () => void;
}) {
  const [left, setLeft] = useState(() => code.expiresAt - Date.now());
  useEffect(() => {
    setLeft(code.expiresAt - Date.now());
    const t = window.setInterval(() => setLeft(code.expiresAt - Date.now()), 1000);
    return () => window.clearInterval(t);
  }, [code]);
  const expired = code.expiresAt > 0 && left <= 0;

  if (expired)
    return (
      <>
        <Muted>That code ran out of time.</Muted>
        <div>
          <button type="button" onClick={onAgain} className={primaryButton}>
            Get a new code
          </button>
        </div>
      </>
    );

  return (
    <>
      <Muted>
        {mobile
          ? "Tap below: Messages opens with a text to OVOA ready. Send it from the number you want linked."
          : "Point your iPhone's camera at this: Messages opens with a text to OVOA ready. Send it from the number you want linked."}
      </Muted>
      {mobile ? (
        <a href={href} className={`${primaryButton} bg-[#0a84ff] text-white`}>
          <MessageCircle aria-hidden="true" className="size-5" />
          Open the text in Messages
        </a>
      ) : (
        <div className="flex flex-col items-center">
          <Qr text={smsQr(code.number, code.body)} />
          <p className="mt-4 text-center text-xs text-landing-muted">
            No camera handy? Text{" "}
            <strong className="font-semibold text-landing-ink">{code.body}</strong> to{" "}
            <strong className="font-semibold text-landing-ink">{pretty(code.number)}</strong>.
          </p>
        </div>
      )}
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-landing-muted">
        <span className="inline-flex items-center gap-2">
          <Spinner />
          Waiting for your text&hellip; good for {Math.max(1, Math.ceil(left / 60000))} more min.
        </span>
        <button type="button" onClick={onCancel} className={quietLink}>
          Cancel
        </button>
      </div>
    </>
  );
}

// ---------- You ----------

/** What they typed as a username, as the app's server reads it (usernames.ts usernameFrom). */
const asUsername = (typed: string) =>
  typed
    .trim()
    .replace(/^@+/, "")
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 30);

function Username({ initial }: { initial: UsernameState }) {
  const { busy, error, run } = useChange();
  const [state, setState] = useState(initial);
  const [typed, setTyped] = useState(initial.username ?? initial.suggestion ?? "");
  const [check, setCheck] = useState<{
    for: string;
    available: boolean;
    problem: string | null;
  } | null>(null);
  const want = asUsername(typed);
  const locked = !!state.changeableAt && state.changeableAt > Date.now();

  // Checked once typing pauses.
  useEffect(() => {
    if (!want || want === state.username) return setCheck(null);
    let stale = false;
    const timer = window.setTimeout(() => {
      checkUsername({ data: { username: want } })
        .then((r) => !stale && setCheck({ for: want, ...r }))
        .catch(() => undefined);
    }, 400);
    return () => {
      stale = true;
      window.clearTimeout(timer);
    };
  }, [want, state.username]);

  const checked = check?.for === want ? check : null;

  async function save(e: FormEvent) {
    e.preventDefault();
    if (
      state.username &&
      !window.confirm(
        `Change to @${want}? Your websites move to ${want}.ovoa.ai, and ${state.address} sends visitors there for 90 days. You can change it again in 30 days.`,
      )
    )
      return;
    const done = await run(() => setUsername({ data: { username: want } }));
    if (done) {
      setState(done.username);
      setTyped(done.username.username ?? want);
      setCheck(null);
    }
  }

  return (
    <form onSubmit={save} className="grid gap-1.5">
      <label htmlFor="account-username" className="text-sm font-medium">
        Username
      </label>
      <div className="flex gap-2">
        <div className="relative min-w-0 flex-1">
          <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-[15px] text-landing-muted">
            @
          </span>
          <input
            id="account-username"
            className={`${field} pl-8`}
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck={false}
            placeholder="yourname"
            maxLength={40}
            disabled={locked}
            value={typed}
            onChange={(e) => setTyped(e.target.value)}
          />
        </div>
        <button
          type="submit"
          disabled={
            busy || locked || !want || want === state.username || checked?.available === false
          }
          className={secondaryButton}
        >
          {busy ? <Spinner /> : null}
          {state.username ? "Change" : "Claim"}
        </button>
      </div>
      <p
        className={`text-sm leading-relaxed ${
          checked && !checked.available ? "text-red-600 dark:text-red-400" : "text-landing-muted"
        }`}
      >
        {locked
          ? `Your websites live at ${state.address}. You can change it on ${dateFormat.format(new Date(state.changeableAt!))}.`
          : checked
            ? checked.available
              ? `@${want} is free. Your websites would live at ${want}.ovoa.ai.`
              : checked.problem
            : state.username
              ? `Your websites live at ${state.address}, and other people's OVOAs find yours as @${state.username}.`
              : "Your websites will live at yourname.ovoa.ai, and other people's OVOAs find yours by it."}
      </p>
      <Problem>{error}</Problem>
    </form>
  );
}

function You({
  name: initialName,
  email,
  username,
}: {
  name: string;
  email: string;
  username: UsernameState | null;
}) {
  const router = useRouter();
  const { busy, error, run } = useChange();
  const [saved, setSaved] = useState(initialName);
  const [name, setName] = useState(initialName);

  async function save(e: FormEvent) {
    e.preventDefault();
    const done = await run(() => saveSettings({ data: { name: name.trim() } }));
    if (done) {
      setSaved(done.name);
      setName(done.name);
      // The greeting at the top of the page.
      void router.invalidate();
    }
  }

  return (
    <Section id="you" title="You">
      <form onSubmit={save} className="grid gap-1.5">
        <label htmlFor="account-name" className="text-sm font-medium">
          Your name
        </label>
        <div className="flex gap-2">
          <input
            id="account-name"
            className={field}
            autoComplete="name"
            maxLength={80}
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
          <button
            type="submit"
            disabled={busy || !name.trim() || name.trim() === saved}
            className={secondaryButton}
          >
            {busy ? <Spinner /> : null}
            Save
          </button>
        </div>
        <p className="text-sm text-landing-muted">What OVOA calls you. Signed in as {email}.</p>
        <Problem>{error}</Problem>
      </form>
      {username && <Username initial={username} />}
    </Section>
  );
}

// ---------- The assistant ----------

const toClock = (m: number) =>
  `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`;
const toMinutes = (clock: string) => {
  const m = /^(\d{2}):(\d{2})$/.exec(clock);
  return m ? Number(m[1]) * 60 + Number(m[2]) : null;
};
const zone = () => {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone;
  } catch {
    return undefined;
  }
};

function Assistant({ initial, canAgent }: { initial: AssistantSettings; canAgent: boolean }) {
  const { busy, error, run } = useChange();
  const [saved, setSaved] = useState(initial);
  const [assistantName, setAssistantName] = useState(initial.assistantName);
  const [personality, setPersonality] = useState(initial.personality);
  const who = saved.assistantName || "OVOA";
  const dirty =
    assistantName.trim() !== saved.assistantName || personality.trim() !== saved.personality;

  // One field at a time; the answer is every setting as it now stands.
  async function patch(change: Partial<AssistantSettings>) {
    const before = saved;
    setSaved({ ...saved, ...change });
    const done = await run(() => saveSettings({ data: { ...change, timeZone: zone() } }));
    setSaved(done ? done.assistant : before);
    return done;
  }

  async function save(e: FormEvent) {
    e.preventDefault();
    const done = await patch({
      assistantName: assistantName.trim(),
      personality: personality.trim(),
    });
    if (done) {
      setAssistantName(done.assistant.assistantName);
      setPersonality(done.assistant.personality);
    }
  }

  function approve(on: boolean) {
    if (
      on &&
      !window.confirm(
        `Approve for me? ${who} will act without asking first: sending and deleting emails, deleting calendar events, changing contacts, and more. Mistakes can't always be undone.`,
      )
    )
      return;
    void patch({ autoApprove: on });
  }

  function agent(on: boolean) {
    if (
      on &&
      !window.confirm(
        `Let ${who} work on its own? It will check things while you're not here (your calendar, what you said you'd do, anything you ask it to watch) and tell you when something matters. It can't message anyone or delete anything without you, and you can turn this off at any time.`,
      )
    )
      return;
    void patch({ agentEnabled: on });
  }

  function quiet(which: "quietStart" | "quietEnd", clock: string) {
    const value = toMinutes(clock);
    if (value !== null && value !== saved[which]) void patch({ [which]: value });
  }

  return (
    <Section id="assistant" title="Your assistant">
      <form onSubmit={save} className="grid gap-4">
        <label className="grid gap-1.5 text-sm font-medium">
          Its name
          <input
            className={field}
            maxLength={40}
            required
            value={assistantName}
            onChange={(e) => setAssistantName(e.target.value)}
          />
        </label>
        <label className="grid gap-1.5 text-sm font-medium">
          Personality
          <textarea
            className={`${field} h-24 resize-y py-3 leading-relaxed`}
            maxLength={500}
            placeholder="e.g. Dry British wit, keeps answers brief"
            value={personality}
            onChange={(e) => setPersonality(e.target.value)}
          />
        </label>
        <div>
          <button
            type="submit"
            disabled={busy || !dirty || !assistantName.trim()}
            className={secondaryButton}
          >
            Save changes
          </button>
        </div>
      </form>

      <Toggle
        label="Approve for me"
        about={`${who} asks before it sends an email, deletes something or changes your calendar, and you reply YES. On, it does those right away.`}
        on={saved.autoApprove}
        disabled={busy}
        onChange={approve}
      />

      {canAgent ? (
        <>
          <Toggle
            label={`Let ${who} work on its own`}
            about="It checks things between conversations and tells you only when it's worth interrupting you."
            on={saved.agentEnabled}
            disabled={busy}
            onChange={agent}
          />
          {saved.agentEnabled && (
            <>
              <div className="grid gap-2">
                <p className="text-[15px] font-medium">How far it can go</p>
                <div className="grid grid-cols-2 gap-1 rounded-2xl bg-landing-control p-1">
                  {(["suggest", "act"] as const).map((level) => (
                    <button
                      key={level}
                      type="button"
                      disabled={busy}
                      aria-pressed={saved.agentAutonomy === level}
                      onClick={() => {
                        if (saved.agentAutonomy === level) return;
                        if (
                          level === "act" &&
                          !window.confirm(
                            "Let it act? It will create calendar events, tasks and drafts on its own when they follow from what you asked it to do. It still can't send anything to another person, or delete anything.",
                          )
                        )
                          return;
                        void patch({ agentAutonomy: level });
                      }}
                      className={`h-9 rounded-xl text-sm font-semibold transition-colors ${
                        saved.agentAutonomy === level
                          ? "bg-landing-canvas text-landing-ink shadow-sm"
                          : "text-landing-muted"
                      }`}
                    >
                      {level === "suggest" ? "Suggest" : "Act"}
                    </button>
                  ))}
                </div>
                <Muted>
                  {saved.agentAutonomy === "act"
                    ? "It can also add calendar events, tasks and drafts on its own when they follow from what you asked for."
                    : "It looks things up and tells you. Anything that would change something waits for your YES."}
                </Muted>
              </div>
              <div className="grid gap-2">
                <p className="text-[15px] font-medium">Don&rsquo;t disturb me between</p>
                <div className="flex items-center gap-3">
                  <input
                    type="time"
                    aria-label="Quiet hours start"
                    className={`${field} w-32`}
                    defaultValue={toClock(saved.quietStart)}
                    onBlur={(e) => quiet("quietStart", e.target.value)}
                  />
                  <span className="text-sm text-landing-muted">and</span>
                  <input
                    type="time"
                    aria-label="Quiet hours end"
                    className={`${field} w-32`}
                    defaultValue={toClock(saved.quietEnd)}
                    onBlur={(e) => quiet("quietEnd", e.target.value)}
                  />
                </div>
                <Muted>
                  It still works during these hours; it saves what it found until morning. Something
                  about to be missed tonight comes through anyway.
                </Muted>
              </div>
            </>
          )}
        </>
      ) : (
        <div>
          <p className="text-[15px] font-medium">Let {who} work on its own</p>
          <p className="mt-0.5 text-sm leading-relaxed text-landing-muted">
            Checking things between conversations comes with Plus and Pro.{" "}
            <Link to="/early-access" hash="plans" className={linkButton}>
              See plans
            </Link>
          </p>
        </div>
      )}
      <Problem>{error}</Problem>
    </Section>
  );
}

// ---------- Connections ----------

const GoogleLogo = () => (
  <svg viewBox="0 0 48 48" aria-hidden="true" className="size-6 shrink-0">
    <path
      fill="#EA4335"
      d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"
    />
    <path
      fill="#4285F4"
      d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"
    />
    <path
      fill="#FBBC05"
      d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"
    />
    <path
      fill="#34A853"
      d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"
    />
  </svg>
);

const InstagramLogo = () => (
  <svg viewBox="0 0 48 48" aria-hidden="true" className="size-6 shrink-0">
    <defs>
      <radialGradient id="ig-gradient" cx="0.3" cy="1.07" r="1.2">
        <stop offset="0" stopColor="#FDDB74" />
        <stop offset="0.25" stopColor="#F9A33C" />
        <stop offset="0.5" stopColor="#E1306C" />
        <stop offset="0.75" stopColor="#C13584" />
        <stop offset="1" stopColor="#5B51D8" />
      </radialGradient>
    </defs>
    <rect width="48" height="48" rx="12" fill="url(#ig-gradient)" />
    <rect x="11" y="11" width="26" height="26" rx="8" fill="none" stroke="#fff" strokeWidth="3.4" />
    <circle cx="24" cy="24" r="6.2" fill="none" stroke="#fff" strokeWidth="3.4" />
    <circle cx="32.3" cy="15.7" r="2" fill="#fff" />
  </svg>
);

const TAG_IDEAS = ["Work", "Personal", "School", "Business"];

function Connections({ initial }: { initial: Settings["google"] }) {
  const { busy, error, run } = useChange();
  const [accounts, setAccounts] = useState(initial ?? []);
  // The account whose tag is being written, and what's typed so far.
  const [tagging, setTagging] = useState<{ id: string; text: string } | null>(null);

  async function connect() {
    const got = await run(() => connectGoogle());
    if (got) window.location.assign(got.url);
  }

  async function disconnect(id: string, email: string) {
    if (!window.confirm(`Disconnect ${email}? OVOA stops reading and changing anything in it.`))
      return;
    if (await run(() => disconnectGoogle({ data: { id } })))
      setAccounts((list) => list.filter((a) => a.id !== id));
  }

  async function saveTag(id: string, label: string) {
    const got = await run(() => labelGoogle({ data: { id, label } }));
    if (got) {
      setAccounts(got.accounts);
      setTagging(null);
    }
  }

  return (
    <Section id="connections" title="Connections">
      <Muted>
        Connect your accounts here, no app needed. OVOA reads and does things in them when you ask,
        and anything it would send, post or delete waits for your YES.
      </Muted>

      {/* Google: as many accounts as they like, each with its own tag. */}
      <div id="google" className="grid scroll-mt-32 gap-3">
        <div className="flex items-center gap-3">
          <GoogleLogo />
          <div className="min-w-0">
            <p className="text-[15px] font-semibold">Google</p>
            <p className="text-sm text-landing-muted">Gmail, Calendar, Contacts, Drive and Tasks</p>
          </div>
        </div>
        {initial === null ? (
          <Muted>Your Google accounts didn&rsquo;t load just now. Refresh to try again.</Muted>
        ) : (
          accounts.length > 0 && (
            <ul className="grid gap-2">
              {accounts.map((a) => (
                <li key={a.id} className="rounded-xl border border-landing-line px-4 py-3">
                  <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-2">
                    <span className="flex min-w-0 flex-wrap items-center gap-2 text-[15px]">
                      <span className="break-all">{a.email}</span>
                      {a.label && (
                        <span className="rounded-full bg-landing-control px-2.5 py-0.5 text-xs font-semibold">
                          {a.label}
                        </span>
                      )}
                      {accounts.length > 1 && a.isDefault && (
                        <span className="text-sm text-landing-muted">main</span>
                      )}
                    </span>
                    <span className="flex gap-4">
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() =>
                          setTagging(
                            tagging?.id === a.id ? null : { id: a.id, text: a.label ?? "" },
                          )
                        }
                        className={quietLink}
                      >
                        {a.label ? "Change tag" : "Add a tag"}
                      </button>
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => void disconnect(a.id, a.email)}
                        className={quietLink}
                      >
                        Disconnect
                      </button>
                    </span>
                  </div>
                  {tagging?.id === a.id && (
                    <form
                      className="mt-3 grid gap-2"
                      onSubmit={(e) => {
                        e.preventDefault();
                        void saveTag(a.id, tagging.text);
                      }}
                    >
                      <div className="flex flex-wrap gap-2">
                        {TAG_IDEAS.map((idea) => (
                          <button
                            key={idea}
                            type="button"
                            disabled={busy}
                            onClick={() => void saveTag(a.id, idea)}
                            className={smallButton}
                          >
                            {idea}
                          </button>
                        ))}
                      </div>
                      <div className="flex gap-2">
                        <input
                          value={tagging.text}
                          onChange={(e) => setTagging({ id: a.id, text: e.target.value })}
                          maxLength={24}
                          placeholder="Or your own, like Side hustle"
                          aria-label={`Tag for ${a.email}`}
                          className={field}
                        />
                        <button type="submit" disabled={busy} className={secondaryButton}>
                          {busy ? <Spinner /> : null}
                          Save
                        </button>
                      </div>
                      {a.label && (
                        <button
                          type="button"
                          disabled={busy}
                          onClick={() => void saveTag(a.id, "")}
                          className={`${quietLink} justify-self-start`}
                        >
                          Remove the tag
                        </button>
                      )}
                    </form>
                  )}
                </li>
              ))}
            </ul>
          )
        )}
        {accounts.length > 1 && (
          <Muted>
            Tags let you say which one: &ldquo;what&rsquo;s on my work calendar?&rdquo; or
            &ldquo;email Sam from personal&rdquo;.
          </Muted>
        )}
        <div>
          <button
            type="button"
            onClick={() => void connect()}
            disabled={busy}
            className={secondaryButton}
          >
            {busy ? <Spinner /> : null}
            {accounts.length ? "Connect another Google account" : "Connect Google"}
          </button>
        </div>
      </div>

      {/* Instagram: built (jarvis api instagram.ts), still being tested, so locked here. */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-landing-line pt-5">
        <div className="flex items-center gap-3">
          <InstagramLogo />
          <div className="min-w-0">
            <p className="flex flex-wrap items-center gap-2 text-[15px] font-semibold">
              Instagram
              <span className="rounded-full bg-landing-control px-2.5 py-0.5 text-xs font-semibold text-landing-muted">
                Currently testing
              </span>
            </p>
            <p className="text-sm text-landing-muted">DMs, comments and posts</p>
          </div>
        </div>
        <button type="button" disabled className={secondaryButton}>
          Connect
        </button>
      </div>
      <Problem>{error}</Problem>
    </Section>
  );
}

// ---------- Websites ----------

function Websites({ initial }: { initial: NonNullable<Settings["websites"]> }) {
  const { busy, error, run } = useChange();
  const [sites, setSites] = useState(initial);

  async function remove(id: string, name: string) {
    if (
      !window.confirm(
        `Delete ${name}? It goes offline now. Ask OVOA within 30 days and it can put it back.`,
      )
    )
      return;
    if (await run(() => deleteWebsite({ data: { id } })))
      setSites((list) => list.filter((s) => s.id !== id));
  }

  if (sites.length === 0) return null;
  return (
    <Section id="websites" title="Your websites">
      <ul className="grid gap-3">
        {sites.map((s) => (
          <li key={s.id} className="flex items-center justify-between gap-3">
            <span className="min-w-0">
              <span className="block break-words text-[15px] font-medium">{s.name}</span>
              <a
                href={s.link}
                target="_blank"
                rel="noreferrer"
                className="break-all text-sm text-landing-action"
              >
                {s.address}
              </a>
            </span>
            <button
              type="button"
              disabled={busy}
              onClick={() => void remove(s.id, s.name)}
              className={quietLink}
            >
              Delete
            </button>
          </li>
        ))}
      </ul>
      <Muted>To change one, text OVOA what you want different.</Muted>
      <Problem>{error}</Problem>
    </Section>
  );
}

// ---------- Privacy and data ----------

// The same three parts as the app's screen (ovoa-app app/consent.tsx), in its
// words: agreeing here is agreeing to that wording. The two about voice only
// happen in the app, and say so.
const AI_PARTS = [
  {
    title: "Replies",
    body: "What you say, and the data needed to answer it (health numbers, your calendar, emails you ask about), goes to Cloudflare (Workers AI) and Z.ai, which both run GLM, the model that writes OVOA's replies, and to Google Gemini when one of them is down or for web searches.",
  },
  {
    title: "OVOA's voice",
    body: "In the app, replies are turned into speech by Deepgram, which gets the text only.",
  },
  {
    title: "Your voice",
    body: "In the app, your voice is recognised on your iPhone, or by Apple's speech service on iPhones that can't do it themselves. It's never sent to OVOA or the AI companies.",
  },
];

function AiConsent({
  consent,
  onChange,
}: {
  consent: Settings["consent"];
  onChange: (next: Settings["consent"]) => void;
}) {
  const { busy, error, run } = useChange();
  const [open, setOpen] = useState(!consent.given);

  async function agree() {
    const done = await run(() => agreeToAi());
    if (done) {
      onChange({ given: true, at: done.at });
      setOpen(false);
    }
  }

  async function stop() {
    if (
      !window.confirm(
        "Stop using AI? OVOA stops answering your texts, and everything else that uses AI stops, until you agree again.",
      )
    )
      return;
    if (await run(() => withdrawAi())) {
      onChange({ given: false, at: null });
      setOpen(true);
    }
  }

  return (
    <div id="ai" className="grid scroll-mt-32 gap-3">
      <div>
        <p className="text-[15px] font-medium">AI and your data</p>
        <p className="mt-0.5 text-sm leading-relaxed text-landing-muted">
          {consent.given
            ? `You agreed${consent.at ? ` on ${dateFormat.format(new Date(consent.at))}` : ""}. `
            : "OVOA uses AI companies to answer you. Nothing goes to them until you agree, so OVOA can't answer this account's texts yet. "}
          {consent.given && (
            <button type="button" onClick={() => setOpen((o) => !o)} className={linkButton}>
              {open ? "Hide what goes where" : "What goes where"}
            </button>
          )}
        </p>
      </div>
      {open && (
        <dl className="grid gap-3 rounded-xl bg-landing-control/70 px-4 py-4">
          {AI_PARTS.map((p) => (
            <div key={p.title}>
              <dt className="text-sm font-semibold">{p.title}</dt>
              <dd className="mt-0.5 text-sm leading-relaxed text-landing-muted">{p.body}</dd>
            </div>
          ))}
        </dl>
      )}
      <div>
        {consent.given ? (
          open && (
            <button type="button" onClick={() => void stop()} disabled={busy} className={quietLink}>
              Stop using AI
            </button>
          )
        ) : (
          <button
            type="button"
            onClick={() => void agree()}
            disabled={busy}
            className={primaryButton}
          >
            {busy ? <Spinner /> : null}
            Agree
          </button>
        )}
      </div>
      <Problem>{error}</Problem>
    </div>
  );
}

function Privacy({
  consent,
  onConsent,
  memoryOn: initialMemoryOn,
  memories: initialMemories,
}: {
  consent: Settings["consent"];
  onConsent: (next: Settings["consent"]) => void;
  memoryOn: boolean;
  memories: Settings["memories"];
}) {
  const { busy, error, run } = useChange();
  const [memoryOn, setMemoryOn] = useState(initialMemoryOn);
  const [memories, setMemories] = useState(initialMemories ?? []);
  const [open, setOpen] = useState(false);
  const [cleared, setCleared] = useState(false);

  async function remember(on: boolean) {
    setMemoryOn(on);
    if (!(await run(() => saveSettings({ data: { memoryEnabled: on } })))) setMemoryOn(!on);
  }

  async function forget(id: string) {
    if (await run(() => forgetMemory({ data: { id } })))
      setMemories((list) => list.filter((m) => m.id !== id));
  }

  async function forgetAll() {
    if (!window.confirm("Forget everything? All remembered facts will be erased.")) return;
    if (await run(() => forgetEverything())) setMemories([]);
  }

  async function clear() {
    if (!window.confirm("Clear chat history? OVOA's record of your conversation will be deleted."))
      return;
    if (await run(() => clearChat())) setCleared(true);
  }

  return (
    <Section id="privacy" title="Privacy and data">
      <AiConsent consent={consent} onChange={onConsent} />

      <Toggle
        label="Remember things about me"
        about={
          'OVOA learns facts from your chats and forgets them after 14 days, unless you asked it to remember them ("remember that I\'m vegan").'
        }
        on={memoryOn}
        disabled={busy}
        onChange={(on) => void remember(on)}
      />
      {initialMemories === null ? (
        <Muted>What it remembers didn&rsquo;t load just now. Refresh to try again.</Muted>
      ) : memories.length === 0 ? (
        <Muted>Nothing remembered yet.</Muted>
      ) : (
        <div className="grid gap-3">
          <button
            type="button"
            aria-expanded={open}
            onClick={() => setOpen((o) => !o)}
            className="flex items-center justify-between text-left text-[15px] font-medium"
          >
            {memories.length} {memories.length === 1 ? "thing" : "things"} remembered
            <span aria-hidden="true" className="text-sm text-landing-muted">
              {open ? "Hide" : "Show"}
            </span>
          </button>
          {open && (
            <>
              <ul className="grid gap-3">
                {memories.map((m) => (
                  <li key={m.id} className="flex items-start justify-between gap-3">
                    <span className="min-w-0 break-words text-sm leading-relaxed">{m.content}</span>
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => void forget(m.id)}
                      className={quietLink}
                    >
                      Forget
                    </button>
                  </li>
                ))}
              </ul>
              <div>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => void forgetAll()}
                  className={smallButton}
                >
                  Forget everything
                </button>
              </div>
            </>
          )}
        </div>
      )}

      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="text-[15px] font-medium">Chat history</p>
          <p className="mt-0.5 text-sm leading-relaxed text-landing-muted">
            {cleared
              ? "Cleared. The texts on your phone are yours to delete in Messages."
              : "What OVOA keeps of your conversation, to follow what you mean."}
          </p>
        </div>
        <button
          type="button"
          disabled={busy || cleared}
          onClick={() => void clear()}
          className={smallButton}
        >
          Clear
        </button>
      </div>
      <Problem>{error}</Problem>
    </Section>
  );
}

// ---------- Deleting the account ----------

export function DeleteAccount({ paid }: { paid: boolean }) {
  const { busy, error, run } = useChange();

  async function remove() {
    if (
      !window.confirm(
        `Delete your account? This permanently deletes your account, chats, memories and websites.${
          paid ? " It doesn't cancel a plan you pay for: do that in Manage billing first." : ""
        }`,
      )
    )
      return;
    if (await run(() => deleteAccount())) window.location.assign("/account");
  }

  return (
    <>
      <button type="button" onClick={() => void remove()} disabled={busy} className={quietLink}>
        {busy ? "Deleting…" : "Delete account"}
      </button>
      <Problem>{error}</Problem>
    </>
  );
}

// ---------- All of it ----------

export function AccountSettings({ settings, email }: { settings: Settings; email: string }) {
  const [consent, setConsent] = useState(settings.consent);
  return (
    <>
      {!consent.given && (
        <p
          role="status"
          className="mt-6 rounded-2xl bg-landing-control px-5 py-4 text-sm font-medium"
        >
          One thing before OVOA can answer this account&rsquo;s texts:{" "}
          <a href="#ai" className={linkButton}>
            agree to how it uses AI
          </a>
          .
        </p>
      )}
      <Texting initial={settings.texting} agreed={consent.given} />
      <You name={settings.name} email={email} username={settings.username} />
      <Assistant initial={settings.assistant} canAgent={Boolean(settings.usage?.agent)} />
      <Connections initial={settings.google} />
      {settings.websites && <Websites initial={settings.websites} />}
      <Privacy
        consent={consent}
        onConsent={setConsent}
        memoryOn={settings.assistant.memoryEnabled}
        memories={settings.memories}
      />
    </>
  );
}

/** "8,200 of 10,000 credits left today", for the plan's row; null when the plan has no daily credits. */
export function creditsToday(usage: Settings["usage"]): string | null {
  if (!usage || usage.creditsPerDay == null || usage.creditsLeftToday == null) return null;
  if (usage.creditsPerDay <= 0) return null;
  return `${credits(Math.max(0, usage.creditsLeftToday))} of ${credits(usage.creditsPerDay)} credits left today.`;
}
