import { createFileRoute, Link } from "@tanstack/react-router";
import { LegalPage } from "@/components/LegalPage";

// Written from what the app server actually stores (ovoa-app/jarvis/api
// migrations and the retention jobs in src/index.ts). If a table or a
// retention period changes there, change it here too.

const PAGE_TITLE = "Privacy policy · OVOA";
const PAGE_DESCRIPTION =
  "What OVOA collects, why, who helps us run it, how long it's kept and how to delete it. No background recording, spoken words deleted after 14 days.";

export const Route = createFileRoute("/privacy")({
  component: Privacy,
  staticData: { sitemap: true },
  head: () => ({
    meta: [
      { title: PAGE_TITLE },
      { name: "description", content: PAGE_DESCRIPTION },
      { property: "og:title", content: PAGE_TITLE },
      { property: "og:description", content: PAGE_DESCRIPTION },
      { property: "og:url", content: "https://ovoa.ai/privacy" },
    ],
    links: [{ rel: "canonical", href: "https://ovoa.ai/privacy" }],
  }),
});

function Privacy() {
  return (
    <LegalPage
      title="Privacy policy"
      updated="September 23, 2026"
      intro={
        <p>
          This covers the OVOA iPhone app, the OVOA Band and ovoa.ai. OVOA is in beta, so we keep
          this page current as the product changes. Questions: email{" "}
          <a href="mailto:support@ovoa.ai" className="font-semibold text-landing-ink">
            support@ovoa.ai
          </a>
          .
        </p>
      }
    >
      <section>
        <h2>The short version</h2>
        <ul>
          <li>We use your data to run OVOA for you. We don&rsquo;t sell it or use it for ads.</li>
          <li>
            OVOA never records your day in the background. The microphone is on when you ask it to
            be: a Band press, a note, the record button, or Pro&rsquo;s hands-free wake word, which
            is off until you turn it on.
          </li>
          <li>On the free plan, your spoken notes are written out on your iPhone, not by us.</li>
          <li>Transcripts of what you say are deleted after 14 days.</li>
          <li>You can delete your account from the app at any time.</li>
        </ul>
      </section>

      <section>
        <h2>What we collect, and why</h2>

        <h3>Your account</h3>
        <p>
          Your email, your name if you give it, and your password, which we store only as a salted
          hash. Signed-in devices are tracked by a hashed token so you stay signed in. We also keep
          a few facts you tell OVOA during setup, like when you usually wake and sleep, so reminders
          and the morning brief land at the right time.
        </p>

        <h3>Health and activity</h3>
        <p>
          Heart rate from Apple Health and from the Band, the workouts found in it, and daily step
          counts, if you allow them. Heart rate samples are kept for 30 days. This is for your own
          picture of how you&rsquo;re doing, not a medical record, and OVOA is not a medical device.
          If you use fall or SOS alerts, we keep those events and the emergency contacts you add,
          and message those contacts when an alert goes off.
        </p>

        <h3>Notes and what you say to OVOA</h3>
        <p>
          Notes you type or record, word for word, until you delete them. On the free plan, Band
          recordings are turned into text on your iPhone with Apple&rsquo;s speech recognition, and
          only the text reaches us.
        </p>
        <p>
          On Base and Pro, what you say to OVOA is sent to our speech-to-text provider to be written
          out, and OVOA keeps the words with a short title and summary so you can find them later.
          The words themselves are deleted after 14 days; the short summaries, and the people,
          promises and places OVOA noted from them, stay until you delete them. With Pro&rsquo;s
          hands-free wake word turned on, audio from the microphone is streamed to that provider
          while it listens for you; only what you say to OVOA is kept.
        </p>

        <h3>Chats and memory</h3>
        <p>
          Your conversations with OVOA and the facts it saves to remember you (&ldquo;Jake&rsquo;s
          birthday is in March&rdquo;), plus reminders, to-dos, alarms, routines and background jobs
          you set up. A log of what OVOA did for you (for example, &ldquo;sent an email&rdquo;) is
          kept for a year so you can check it.
        </p>

        <h3>Money</h3>
        <p>
          Only what you choose to tell OVOA: rough balances, paydays, bills and plans. OVOA does not
          connect to your bank.
        </p>

        <h3>Location</h3>
        <p>
          Off unless you turn on the timeline and allow &ldquo;Always&rdquo; location. Then your
          phone sends a point every few hundred metres; points and visits are kept for 14 days, and
          places you name (home, work) stay until you remove them.
        </p>

        <h3>Google, if you connect it</h3>
        <p>
          If you sign in or create your account with Google, we get only your name and email address
          from Google.
        </p>
        <p>
          If you connect a Google account, OVOA can read and act on your Gmail, Calendar, Contacts,
          Tasks, Docs and Sheets when you ask it to. The access tokens are stored encrypted. Risky
          actions, like sending an email, wait for your OK unless you turn that off. You can
          disconnect at any time, and we then revoke the tokens. OVOA&rsquo;s use of data from
          Google follows the Google API Services User Data Policy, including its Limited Use
          requirements.
        </p>

        <h3>Your phone and the app</h3>
        <p>
          The phone&rsquo;s time zone, which permissions are on, whether a Band is paired, and a
          push notification token. The app also uploads diagnostic logs so we can fix problems;
          they&rsquo;re kept for 7 days. We count how much each person uses (replies, seconds of
          audio, searches) to run fair daily limits and understand costs; those counts are kept for
          90 days.
        </p>

        <h3>Buying on ovoa.ai</h3>
        <p>
          Stripe handles payment. We never see your card number. We keep your email, name, plan and
          its status, and for a Band order the shipping address and phone number so we can send it.
          If you came through a partner&rsquo;s link, we note their code so they can be paid.
        </p>
      </section>

      <section>
        <h2>Who helps us run OVOA</h2>
        <p>
          We share data only with the services that run OVOA for us, only what each one needs, and
          never for their own advertising:
        </p>
        <ul>
          <li>
            <strong>Cloudflare</strong>: hosting (the app and ovoa.ai), our databases, member
            records, and some AI models.
          </li>
          <li>
            <strong>AI model providers</strong>: currently Google (Gemini), DeepSeek and Zhipu AI
            (GLM). Your message and the context needed to answer it are sent to write OVOA&rsquo;s
            reply.
          </li>
          <li>
            <strong>Deepgram</strong>: speech to text, and OVOA&rsquo;s voice.
          </li>
          <li>
            <strong>Apple</strong>: TestFlight, Apple Health, on-device speech recognition and push
            notifications.
          </li>
          <li>
            <strong>Google</strong>: your Google account, only if you connect it.{" "}
            <strong>Google and DuckDuckGo</strong>: web searches OVOA runs to answer a question.
          </li>
          <li>
            <strong>Stripe</strong>: payments.
          </li>
        </ul>
        <p>
          Some of these providers process data outside your country, including in the United States
          and China. We may also share data if the law requires it, or to protect someone from
          serious harm.
        </p>
      </section>

      <section>
        <h2>Deleting your data</h2>
        <p>
          Delete your account in the app, and your account and everything tied to it is removed
          right away. Diagnostic logs and usage counts expire on their own within 7 and 90 days. You
          can also delete single notes, transcripts and places, or email{" "}
          <a href="mailto:support@ovoa.ai">support@ovoa.ai</a> and we&rsquo;ll do it for you. To get
          a copy of your data, email us.
        </p>
        <p>
          Payment records stay with Stripe as the law requires. Cancelling a plan doesn&rsquo;t
          delete your account; deleting your account doesn&rsquo;t cancel a plan bought on ovoa.ai,
          so cancel that from Manage billing first.
        </p>
      </section>

      <section>
        <h2>Children</h2>
        <p>
          OVOA is not meant for children under 13, and we don&rsquo;t knowingly collect their data.
        </p>
      </section>

      <section>
        <h2>Changes</h2>
        <p>
          When this policy changes in a way that matters, we&rsquo;ll say so in the app or by email
          before it takes effect. See also the <Link to="/terms">terms</Link>.
        </p>
      </section>
    </LegalPage>
  );
}
