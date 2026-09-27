import type { ReactNode } from "react";
import type { Faq } from "@/lib/seo";

// The blog's posts. A post with `draft: true` can be read at its address (to
// check it before it goes out) but asks search engines not to index it, and
// is left out of /blog and the sitemap. Publishing = draft: false, and set
// `published` to that day. Facts about other products carry the day they were
// checked; recheck them before changing `updated`.

export type Post = {
  slug: string;
  title: string;
  description: string;
  published: string; // YYYY-MM-DD
  updated: string; // YYYY-MM-DD
  draft: boolean;
  lede: ReactNode;
  faqs?: Faq[];
  body: () => ReactNode;
};

const remindersByText: Post = {
  slug: "reminders-by-text",
  title: "How to get reminders by text message (no app needed)",
  description:
    "The easy ways to get reminders sent to you as texts in 2026, what each one is good for, and how to set one up in a minute from your iPhone.",
  published: "2026-09-27",
  updated: "2026-09-27",
  draft: true,
  lede: (
    <p>
      Notifications get swiped away. A text sits in your Messages until you deal with it, which is
      exactly why so many people want reminders sent as texts. Here are the ways that actually
      work, from built into your iPhone to an assistant you text back.
    </p>
  ),
  faqs: [
    {
      q: "Can Google Calendar text me reminders?",
      a: "Not anymore. Google Calendar stopped sending text message alerts years ago; it uses app notifications and email now.",
    },
    {
      q: "Can I get reminders by text for free?",
      a: "Yes, a few ways. You can schedule a text to yourself in Messages, or try an assistant like OVOA, whose first 5 texts are free with no account.",
    },
    {
      q: "Does texting reminders work on Android?",
      a: "Scheduling a text to yourself works on most Android phones. OVOA only answers iMessage for now, so it's iPhone only.",
    },
  ],
  body: () => (
    <>
      <section>
        <h2>Why a text works better than a notification</h2>
        <p>
          A notification shows up for a second and disappears into a pile. A text stays in a thread
          you already check all day, it's easy to find again, and you can reply to it. That last
          part matters: a reminder you can answer (&ldquo;push it to 4&rdquo;, &ldquo;done&rdquo;)
          is one you actually act on.
        </p>
      </section>

      <section>
        <h2>Option 1: Schedule a text to yourself</h2>
        <p>
          On iPhone, open a conversation with yourself in Messages, type the reminder, then tap the
          plus button, choose Send Later and pick a time. It
          arrives as a text when you asked.
        </p>
        <p>
          <strong>Good for:</strong> one-off reminders. <strong>Not great for:</strong> anything
          that repeats, or reminders you want to move around, since you have to set each one by
          hand.
        </p>
      </section>

      <section>
        <h2>Option 2: The Reminders app with Siri</h2>
        <p>
          &ldquo;Hey Siri, remind me to call the dentist at 3&rdquo; puts it in Apple&rsquo;s
          Reminders, and it goes off as a notification. It&rsquo;s free and already on your phone.
        </p>
        <p>
          <strong>Good for:</strong> quick reminders by voice. <strong>The catch:</strong> it&rsquo;s
          a notification, not a text, so it&rsquo;s just as easy to swipe away.
        </p>
      </section>

      <section>
        <h2>Option 3: An assistant you text</h2>
        <p>
          This is the newest option: you text an AI assistant in plain words and it texts you back
          when it&rsquo;s time. With <a href="/imessage">OVOA</a>, it looks like this:
        </p>
        <ul>
          <li>
            You text <strong>&ldquo;remind me to call mom at 6&rdquo;</strong>, and at 6 OVOA texts
            you.
          </li>
          <li>
            You text <strong>&ldquo;every Sunday night send me the week ahead&rdquo;</strong>, and
            it keeps doing it.
          </li>
          <li>
            When it checks in on a routine (&ldquo;did you do Gym?&rdquo;), you reply
            &ldquo;done&rdquo; and it&rsquo;s checked off.
          </li>
        </ul>
        <p>
          It texts you first with other things too, like a morning brief, at most 12 texts a day,
          and it backs off when you don&rsquo;t answer. Text &ldquo;stop texting me first&rdquo;
          and it stops.
        </p>
        <p>
          <strong>Good for:</strong> reminders you want to talk back to, and ones that repeat.{" "}
          <strong>The catch:</strong> it&rsquo;s iMessage only for now, and after the free texts
          it&rsquo;s part of a paid plan.
        </p>
      </section>

      <section>
        <h2>How to set it up in a minute</h2>
        <ol>
          <li>
            On your iPhone, open <a href="/text">ovoa.ai/text</a>. Messages opens with
            OVOA&rsquo;s number and a hello ready.
          </li>
          <li>Send it, then text your first reminder in plain words.</li>
          <li>That&rsquo;s it. Your first 5 texts are free, with no app and no sign-up.</li>
        </ol>
      </section>

      <section>
        <h2>Which one should you use?</h2>
        <ul>
          <li>
            <strong>Just one reminder, once:</strong> schedule a text to yourself.
          </li>
          <li>
            <strong>Quick, hands-free:</strong> Siri and Reminders.
          </li>
          <li>
            <strong>Reminders you want to reply to, or that repeat:</strong> an assistant you text.
          </li>
        </ul>
      </section>
    </>
  ),
};

const canYouTextChatGpt: Post = {
  slug: "can-you-text-chatgpt",
  title: "Can you text ChatGPT? What actually works in 2026",
  description:
    "You can't text ChatGPT from your iPhone like a contact, and its WhatsApp number shut down in January 2026. Here's what does work if you want an AI in your texts.",
  published: "2026-09-27",
  updated: "2026-09-27",
  draft: true,
  lede: (
    <p>
      Short answer: not really, not from an iPhone. ChatGPT lives in its own app. But if what you
      want is an AI you can text like a friend, there are good options. Here&rsquo;s what&rsquo;s
      true as of September 2026.
    </p>
  ),
  faqs: [
    {
      q: "Does 1-800-ChatGPT still work on WhatsApp?",
      a: "No. OpenAI's WhatsApp number stopped working on January 15, 2026, after a change to WhatsApp's rules for AI chatbots.",
    },
    {
      q: "Can ChatGPT send iMessages for me?",
      a: "On a Mac, a ChatGPT plugin can search, draft and send iMessages with your approval, on certain paid plans. You still talk to ChatGPT in its own app, not by texting it.",
    },
    {
      q: "What's the easiest AI to text from an iPhone?",
      a: "An assistant that has its own number in iMessage, like OVOA, Poke or Sidekicks. You add it like a contact and text it.",
    },
  ],
  body: () => (
    <>
      <section>
        <h2>Can you text ChatGPT from your phone?</h2>
        <p>
          Not the way you text a friend. There&rsquo;s no ChatGPT contact you can iMessage from an
          iPhone. You use it in the ChatGPT app, on the web, or on the desktop.
        </p>
        <p>
          For a while there was a way: OpenAI&rsquo;s 1-800-ChatGPT number worked on WhatsApp. That
          ended on January 15, 2026, after WhatsApp changed its rules for AI chatbots.
        </p>
      </section>

      <section>
        <h2>What about ChatGPT and iMessage on a Mac?</h2>
        <p>
          In August 2026 OpenAI added a Messages plugin for Mac. It lets ChatGPT search your
          messages and draft or send iMessages for you, asking before each send. It needs certain
          paid plans. Useful, but it&rsquo;s ChatGPT sending texts for you, not you texting
          ChatGPT.
        </p>
      </section>

      <section>
        <h2>The options that do work: assistants with their own number</h2>
        <p>
          If what you want is an AI in your Messages, a few assistants give you a number you text
          directly:
        </p>
        <ul>
          <li>
            <a href="/imessage">OVOA</a> (iMessage): texts you first with reminders, a morning
            brief and check-ins, and can build a website from a text. First 5 texts free.
          </li>
          <li>
            Poke (iMessage, WhatsApp, Telegram): connects to lots of apps and runs your own
            automations.
          </li>
          <li>Sidekicks (iMessage and SMS): works on Android and in group chats.</li>
        </ul>
        <p>
          We make OVOA, so take that list with a grain of salt. We compared them all properly in{" "}
          <a href="/compare/best-ai-assistants-you-can-text">
            the best AI assistants you can text
          </a>
          .
        </p>
      </section>

      <section>
        <h2>Texting an AI vs using the ChatGPT app</h2>
        <p>
          They&rsquo;re good at different things. ChatGPT is where you go to think: long answers,
          writing, code, going back and forth. An assistant you text is for running your day: a
          quick &ldquo;remind me at 6&rdquo;, a text back when it&rsquo;s done, a check-in when you
          forget. Plenty of people use both. More on that in{" "}
          <a href="/compare/chatgpt">OVOA vs ChatGPT</a>.
        </p>
      </section>
    </>
  ),
};

const websiteFromPhone: Post = {
  slug: "small-business-website-from-your-phone",
  title: "How to make a website for your small business from your phone",
  description:
    "What your small business website actually needs, the ways to make one from your phone, and how to do it by sending a single text.",
  published: "2026-09-27",
  updated: "2026-09-27",
  draft: true,
  lede: (
    <p>
      Most small businesses don&rsquo;t need a big website. They need one page that loads fast,
      says what you do, and makes it easy to call you. Here&rsquo;s what to put on it and how to
      make one without touching a laptop.
    </p>
  ),
  faqs: [
    {
      q: "Do I really need a website if I have Instagram?",
      a: "It helps. A website is what shows up when people search your business name on Google, and it's yours: no algorithm decides who sees it.",
    },
    {
      q: "Can I use my own domain with OVOA?",
      a: "Not yet. OVOA sites live at an ovoa.ai address, like yourname.ovoa.ai/your-business.",
    },
    {
      q: "What's free?",
      a: "A Google Business Profile is free and worth setting up either way. Building a site with OVOA is part of its Base plan.",
    },
  ],
  body: () => (
    <>
      <section>
        <h2>What your website actually needs</h2>
        <ul>
          <li>
            <strong>What you do and where</strong>, in the first line: &ldquo;Wood-fired pizza in
            Hialeah.&rdquo;
          </li>
          <li>
            <strong>A big call button and your address</strong>. Most visitors are on a phone and
            want to call or get directions.
          </li>
          <li>
            <strong>Your hours</strong>, kept up to date.
          </li>
          <li>
            <strong>A few real photos</strong> of your work or your place.
          </li>
          <li>
            <strong>A contact form</strong> for people who&rsquo;d rather write than call.
          </li>
          <li>
            <strong>A page title with your city</strong>, like &ldquo;Tony&rsquo;s Pizza |
            Wood-fired pizza in Hialeah&rdquo;. That&rsquo;s what Google shows.
          </li>
        </ul>
        <p>That&rsquo;s it. You can add more later, but this is what gets you customers.</p>
      </section>

      <section>
        <h2>Step one either way: a Google Business Profile</h2>
        <p>
          Before any website, set up your free Google Business Profile. It&rsquo;s what shows your
          hours, photos and reviews on Google Maps and in search. Then link your website to it.
        </p>
      </section>

      <section>
        <h2>Option 1: A website builder app</h2>
        <p>
          The big website builders have phone apps where you pick a template and fill it in. You
          get a lot of control, but expect to spend an evening dragging boxes around, and editing
          on a small screen gets fiddly.
        </p>
      </section>

      <section>
        <h2>Option 2: Text it into existence</h2>
        <p>
          With <a href="/websites">OVOA</a>, you describe your business in a text and get a
          finished site back:
        </p>
        <ol>
          <li>
            Text something like:{" "}
            <strong>
              &ldquo;Build a website for my business, Tony&rsquo;s Pizza. Wood-fired, open till 11,
              12 Main St, call 305-555-0100.&rdquo;
            </strong>
          </li>
          <li>
            A few minutes later OVOA texts you the link to a live site at your ovoa.ai address,
            built for phones, with a call button and a contact form.
          </li>
          <li>
            Change it by texting: &ldquo;open till 1am on Fridays&rdquo;, &ldquo;make the call
            button bigger&rdquo;.
          </li>
          <li>
            When someone fills in the contact form, OVOA texts you their message and emails it too.
          </li>
        </ol>
        <p>
          It only uses the facts you give it, so it never makes up an address or phone number. The
          catch: you can&rsquo;t use your own domain yet, and it&rsquo;s part of OVOA&rsquo;s Base
          plan after the free texts.
        </p>
      </section>

      <section>
        <h2>Making it show up on Google</h2>
        <ul>
          <li>Put your city and what you do in the page title and first line.</li>
          <li>Link the site from your Google Business Profile and your Instagram bio.</li>
          <li>Keep your hours and phone number the same everywhere.</li>
          <li>Ask happy customers for Google reviews. They help more than anything on the site.</li>
        </ul>
      </section>
    </>
  ),
};

export const POSTS: Post[] = [remindersByText, canYouTextChatGpt, websiteFromPhone];

export const livePosts = () => POSTS.filter((p) => !p.draft);
export const findPost = (slug: string) => POSTS.find((p) => p.slug === slug);

// "2026-09-27" as "September 27, 2026".
export const longDate = (iso: string) =>
  new Date(`${iso}T12:00:00Z`).toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  });
