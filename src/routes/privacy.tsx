import { createFileRoute, Link } from "@tanstack/react-router";
import { LegalPage } from "@/components/LegalPage";

// Written from what the app server actually stores (ovoa-app/jarvis/api
// migrations and its nightly purge) and from the v1 decisions of 2026-09-23:
// the 14-day rule and what it keeps, the consent screen, speech on the iPhone,
// Deepgram for the voice only, and drive.file for Google Drive. If a table, a
// provider or a retention period changes there, change it here too.
//
// What each provider does with the data is from its own terms, checked on
// 2026-09-23: Z.ai's privacy policy and API terms (docs.z.ai/legal-agreement),
// the Gemini API terms for paid services (ai.google.dev/gemini-api/terms) and
// Deepgram's terms (deepgram.com/terms). Re-check them before changing a line.

const PAGE_TITLE = "Privacy policy · OVOA";
const PAGE_DESCRIPTION =
  "What OVOA collects, who gets what, how long it's kept and how to delete it. Your voice is recognised on your iPhone, you agree before anything goes to an AI company, and most data is deleted after 14 days.";

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
          This covers the OVOA iPhone app, the OVOA Band and ovoa.ai. OVOA is in beta, so this page
          changes as the product does, and we keep it current. Questions: email{" "}
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
          <li>
            We use your data to run OVOA for you. We don&rsquo;t sell it, use it for ads or train AI
            models on it, and the companies that write OVOA&rsquo;s replies don&rsquo;t train on it
            either.
          </li>
          <li>
            OVOA never records your day in the background. Your voice is recognised on your iPhone,
            or by Apple&rsquo;s speech service on iPhones that can&rsquo;t do it themselves.
            It&rsquo;s never sent to OVOA or the AI companies.
          </li>
          <li>
            Before anything goes to an AI company, the app asks you to agree. You can say Not now.
          </li>
          <li>
            After 14 days, everything is deleted except a short summary of each day and what you
            entered or set up yourself.
          </li>
          <li>You can delete your account from the app at any time.</li>
        </ul>
      </section>

      <section>
        <h2>What we collect, and why</h2>

        <h3>Your account</h3>
        <p>
          Your email, your name if you give it, and your password, which we store only as a salted
          hash. You confirm your email with a 6-digit code; we keep the code only as a hash, and it
          stops working after 10 minutes. If you sign in or create your account on ovoa.ai with
          Google, we keep only your name and email address from Google. Signed-in devices are
          tracked by a hashed token so you stay signed in. We also keep your settings and a few
          facts you tell OVOA during setup, like when you usually wake and sleep, so reminders and
          the morning brief land at the right time.
        </p>

        <h3>What you say and type to OVOA</h3>
        <p>
          The microphone is on when you ask it to be: a tap in the app, a Band press, the record
          button, or the wake word and Always listen, which are off until you turn them on. With
          those two, your iPhone listens for OVOA&rsquo;s name on the phone itself, and nothing it
          hears leaves the phone until it hears &ldquo;OVOA&rdquo;. What you say to OVOA is
          recognised on your iPhone (or by Apple&rsquo;s speech service on iPhones that can&rsquo;t
          do it themselves), and only the text is sent to OVOA. A Band recording goes from the Band
          to your iPhone over Bluetooth and is written out the same way. The audio never reaches
          OVOA or the AI companies.
        </p>
        <p>
          OVOA keeps your conversations and the words of what you said to it so it can follow up and
          write the day summary. They&rsquo;re deleted after 14 days. Notes you type, and recordings
          you make on purpose (with the Band or the record button), are kept word for word until you
          delete them.
        </p>

        <h3>Health and activity</h3>
        <p>
          If you allow it, OVOA reads your steps, heart rate, sleep and workouts from Apple Health,
          and heart rate from the Band. The heart rate, daily steps and workouts it reads are synced
          to OVOA to show your trends and answer your questions, and deleted after 14 days (the day
          summaries stay). Only the numbers a reply needs go to the AI. We never use health data for
          ads or marketing, and OVOA doesn&rsquo;t write to Apple Health. This is for your own
          picture of how you&rsquo;re doing, not a medical record, and OVOA is not a medical device.
        </p>
        <p>
          If you use fall or SOS alerts, we keep the emergency contacts you add. When an alert goes
          off, your phone opens Messages with the alert and your location ready for them, and you
          tap Send. The alert itself (when, which kind, and where) is kept for 14 days.
        </p>

        <h3>Food</h3>
        <p>
          If you tell OVOA what you eat, it notes it as part of your day. What you ate is deleted
          after 14 days; the day summary keeps the day&rsquo;s total. Your food target and how
          closely you want to track stay until you change them.
        </p>

        <h3>Memory, reminders and routines</h3>
        <p>
          Things you ask OVOA to remember (&ldquo;Jake&rsquo;s birthday is in March&rdquo;,
          &ldquo;my passport is in the desk&rdquo;), plus the reminders, to-dos, alarms, routines,
          meds and background jobs you set up, are kept until you delete them. OVOA also picks up
          things on its own from what you say, like the people you mention, promises you make and
          facts about you. Those are deleted after 14 days, and a promise 14 days after it&rsquo;s
          done or past due. A log of what OVOA did for you (for example, &ldquo;sent an
          email&rdquo;) is kept for 14 days so you can check it.
        </p>

        <h3>Apps you make</h3>
        <p>
          Apps you make with Create, and their screens, are kept until you delete them. When you
          describe an app for OVOA to build or change, your description goes to the AI.
        </p>

        <h3>Money</h3>
        <p>
          Only what you choose to tell OVOA: rough balances, paydays, bills and plans. OVOA does not
          connect to your bank.
        </p>

        <h3>Location</h3>
        <p>
          Off unless you turn on the timeline and allow &ldquo;Always&rdquo; location. Then your
          phone sends a point every few hundred metres; points and visits are kept for 14 days.
          Places with a name (ones you name, and Home and Work, which OVOA names for you) stay until
          you remove them. Other places are deleted once you haven&rsquo;t been there for 14 days,
          and where you parked is kept for 14 days. When a reply needs to know where you are, like
          the weather, your phone sends your current location with that request.
        </p>

        <h3>Your iPhone&rsquo;s contacts, calendar and reminders</h3>
        <p>
          If you allow them, OVOA can look up and add to your iPhone&rsquo;s Contacts, Calendar and
          Reminders when you ask. The lookups happen on your phone, and only what a reply needs is
          sent with your request. Texts you ask OVOA to send go from your own Messages app.
        </p>

        <h3>Google, if you connect it</h3>
        <p>
          If you connect a Google account, OVOA can read and act on your Gmail, Calendar, Tasks and
          Contacts, the files OVOA itself made in your Google Drive, and a Google Doc or Sheet you
          point it to. It can&rsquo;t search the rest of your Drive. It uses these when you ask, and
          on Base and Pro it also checks them in the background for a few things: getting you ready
          for a meeting, emails you sent that got no reply, and a weekly look through the last month
          of mail for bills that are due. With more than one account connected, OVOA learns what
          each is used for (who you write to, what your events are about) so it picks the right one.
        </p>
        <p>
          The access tokens are stored encrypted. Risky actions, like sending an email, wait for
          your OK unless you turn that off. You can disconnect in Settings at any time, and we then
          revoke the tokens. OVOA&rsquo;s use of data from Google follows the Google API Services
          User Data Policy, including its Limited Use requirements.
        </p>

        <h3>Your phone and the app</h3>
        <p>
          The phone&rsquo;s time zone, which permissions are on, whether a Band is paired, and a
          push notification token. The app also uploads diagnostic logs so we can fix problems;
          they&rsquo;re kept for 7 days. We count how much each person uses (replies, searches,
          seconds of OVOA&rsquo;s voice) to run fair daily and monthly limits and understand costs;
          those counts are kept for 35 days.
        </p>

        <h3>Buying on ovoa.ai</h3>
        <p>
          Stripe handles payment, and we never see your card number. We keep your email, name, plan
          and its status, the app email you move a plan to, and for a Band order the shipping
          address and phone number so we can send it. If you came through a partner&rsquo;s link, a
          cookie remembers their code for 90 days so they can be paid. Signing in on ovoa.ai sets a
          cookie that keeps you signed in, and Stripe&rsquo;s checkout sets its own cookies to
          prevent fraud. We don&rsquo;t use ad or tracking cookies.
        </p>

        <h3>Partners</h3>
        <p>
          If you apply to the <Link to="/partners">partner program</Link>, we keep your name, email,
          code, what you told us about your audience, and the PayPal email we pay you at.
        </p>
      </section>

      <section>
        <h2>Asking before AI</h2>
        <p>
          Before anything goes to an AI company, the app shows a screen that says where your data
          goes and asks you to agree. Until you do, nothing is sent to one, and OVOA speaks with
          your iPhone&rsquo;s own voice instead of Deepgram&rsquo;s. If you tap Not now, everything
          that doesn&rsquo;t need AI keeps working (health, notes, and the apps that don&rsquo;t use
          AI), and the AI features wait behind &ldquo;Agree to use AI&rdquo; until you do.
        </p>
        <p>
          Once you agree, what you ask OVOA and the context needed to answer it (for example, the
          health numbers, calendar events or emails the question is about, and what OVOA remembers
          about you) go to the AI provider to write the reply. Background jobs you set up, the
          morning brief, the weekly report and each night&rsquo;s day summary go the same way. To
          take your agreement back, email <a href="mailto:support@ovoa.ai">support@ovoa.ai</a>, or
          delete your account.
        </p>
      </section>

      <section>
        <h2>Who gets what</h2>
        <p>
          We share data only with the services that run OVOA for us, only what each one needs, and
          never for their own advertising:
        </p>
        <ul>
          <li>
            <strong>Cloudflare</strong>: runs OVOA&rsquo;s server and ovoa.ai, and the databases
            that hold everything the app sends us and the plan, order and partner records from
            ovoa.ai.
          </li>
          <li>
            <strong>Z.ai</strong> (the GLM models, from Zhipu AI): writes OVOA&rsquo;s replies.
            It&rsquo;s our current provider and may change; this page will say when it does.
            Z.ai&rsquo;s API terms say it processes what we send in real time without storing it and
            doesn&rsquo;t use it to develop or improve its services, and that it generally runs its
            service from Singapore.
          </li>
          <li>
            <strong>Google Gemini</strong>: writes replies when Z.ai can&rsquo;t, and runs
            OVOA&rsquo;s web searches. We use Google&rsquo;s paid API, so Google doesn&rsquo;t use
            what we send to improve its products. It keeps it for a limited time only to catch
            abuse, and keeps web searches for 30 days to produce the search results.
          </li>
          <li>
            <strong>DuckDuckGo</strong>: when Gemini&rsquo;s search isn&rsquo;t available, the words
            of the search go to DuckDuckGo from our server, not from your phone.
          </li>
          <li>
            <strong>Deepgram</strong>: gets the text of OVOA&rsquo;s replies to speak them in
            OVOA&rsquo;s voice. It never gets your voice or your recordings, and nothing goes to it
            until you&rsquo;ve agreed. Deepgram&rsquo;s terms let it use the text it receives to
            improve its voice models.
          </li>
          <li>
            <strong>Apple</strong>: speech recognition, on your iPhone or, on iPhones that
            can&rsquo;t do it themselves, by Apple&rsquo;s speech service. Also TestFlight (which
            shares crash reports, and any feedback you choose to send, with us), Apple Health, push
            notifications, and Siri if you set up &ldquo;Ask OVOA&rdquo; (Siri hears you and sends
            OVOA the words).
          </li>
          <li>
            <strong>Expo</strong>: its push service carries the text of OVOA&rsquo;s notifications
            from our server to Apple.
          </li>
          <li>
            <strong>Resend</strong>: sends our email from no-reply@ovoa.ai, like sign-in codes and
            order emails. It gets your email address and the message.
          </li>
          <li>
            <strong>Stripe</strong>: payments. We never see your card number.
          </li>
          <li>
            <strong>Google</strong>, only if you connect it: Gmail, Calendar, files OVOA made in
            your Drive, a Doc or Sheet you point it to, Tasks and Contacts. And Google sign-in on
            ovoa.ai, if you use it.
          </li>
          <li>
            <strong>PayPal</strong>: partner payouts only.
          </li>
        </ul>
        <p>
          Some of these providers process data outside your country, mainly in the United States and
          Singapore. We may also share data if the law requires it, or to protect someone from
          serious harm.
        </p>
      </section>

      <section>
        <h2>How long we keep it</h2>
        <p>After 14 days, everything is deleted except two things:</p>
        <ul>
          <li>
            <strong>The day summary.</strong> One short summary per day: a title and two or three
            sentences, with the day&rsquo;s calories if you noted food. The AI writes it each night
            for Base and Pro members who used OVOA that day. Free accounts don&rsquo;t get one,
            because it needs AI.
          </li>
          <li>
            <strong>What you entered or set up yourself.</strong> Your account, settings and
            profile; routines and meds; alarms; to-dos you entered; notes you typed; recordings you
            made on purpose and their words; apps you made; places with a name; things you asked
            OVOA to remember; emergency contacts; the money picture you gave OVOA; background jobs
            you set up; workouts you logged yourself; your food target and how closely you track;
            your Google connection; and anything you pinned. These stay until you delete them or
            your account.
          </li>
        </ul>
        <p>
          Everything else is deleted after 14 days: conversations, the words of what you said to
          OVOA, background notes, what OVOA picked up on its own, location points and visits,
          heart-rate samples, steps and the workouts OVOA found, food you noted, alerts, and logs.
          Two small things last a little longer, 35 days: usage counts, so monthly limits work, and
          the markers that stop OVOA repeating a reminder or warning within a month or pay cycle.
        </p>
        <p>
          On ovoa.ai, your plan, orders and partner records stay while you&rsquo;re a member, and
          payment records as long as tax and accounting law requires.
        </p>
      </section>

      <section>
        <h2>Deleting your data</h2>
        <p>
          Delete your account in the app (Settings, then Delete account), and your account and
          everything tied to it on OVOA&rsquo;s server is removed right away: conversations, notes,
          recordings&rsquo; words, day summaries, health numbers, places, memories, apps, and your
          Google connection. Diagnostic logs and usage counts expire on their own within 7 and 35
          days. To also remove OVOA from your Google account&rsquo;s connected apps, disconnect
          Google in Settings first. You can also delete single notes, transcripts and places, or
          email <a href="mailto:support@ovoa.ai">support@ovoa.ai</a> and we&rsquo;ll do it for you.
          To get a copy of your data, email us.
        </p>
        <p>
          Deleting your account doesn&rsquo;t cancel a plan bought on ovoa.ai, so cancel that from
          Manage billing first. Cancelling a plan doesn&rsquo;t delete your account. Payment records
          stay with Stripe as the law requires; email us to delete your member and order records on
          ovoa.ai.
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
