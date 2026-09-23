import { createFileRoute, Link } from "@tanstack/react-router";
import { LegalPage } from "@/components/LegalPage";
import { getPlans } from "@/lib/membership/membership.functions";
import { bandPrice, perLabel, planOf } from "@/lib/membership/copy";

const PAGE_TITLE = "Terms · OVOA";
const PAGE_DESCRIPTION =
  "The terms for using OVOA, paying for Base or Pro, and buying the OVOA Band during the beta.";

export const Route = createFileRoute("/terms")({
  component: Terms,
  staticData: { sitemap: true },
  loader: () => getPlans(),
  head: () => ({
    meta: [
      { title: PAGE_TITLE },
      { name: "description", content: PAGE_DESCRIPTION },
      { property: "og:title", content: PAGE_TITLE },
      { property: "og:description", content: PAGE_DESCRIPTION },
      { property: "og:url", content: "https://ovoa.ai/terms" },
    ],
    links: [{ rel: "canonical", href: "https://ovoa.ai/terms" }],
  }),
});

function Terms() {
  const data = Route.useLoaderData();
  const days = data.bandTrialDays;
  return (
    <LegalPage
      title="Terms"
      updated="September 23, 2026"
      intro={
        <p>
          These terms cover the OVOA app, the OVOA assistant, the OVOA Band and ovoa.ai. By using
          OVOA or buying from ovoa.ai you agree to them, and to the{" "}
          <Link
            to="/privacy"
            className="font-semibold text-landing-ink underline underline-offset-2"
          >
            privacy policy
          </Link>
          .
        </p>
      }
    >
      <section>
        <h2>OVOA is in beta</h2>
        <p>
          The iPhone app is pre-release software delivered through Apple&rsquo;s TestFlight, the
          assistant is still being built, and the Band is beta hardware. Features can change, break
          or be removed, and OVOA may be unavailable at times. Don&rsquo;t rely on OVOA for anything
          where a missed reminder, a wrong answer or a failed alert could cause harm.
        </p>
      </section>

      <section>
        <h2>Plans</h2>
        <ul>
          <li>
            <strong>Free</strong>: health tracking and notes. No payment.
          </li>
          <li>
            <strong>Base</strong>: the OVOA assistant, with every AI feature,{" "}
            {perLabel(planOf(data, "base", "monthly"))} or{" "}
            {perLabel(planOf(data, "base", "annual"))}.
          </li>
          <li>
            <strong>Pro</strong>: Base with three times the daily AI allowance,{" "}
            {perLabel(planOf(data, "pro", "monthly"))} or {perLabel(planOf(data, "pro", "annual"))}.
          </li>
        </ul>
        <p>
          Base and Pro are subscriptions to the OVOA service. You pay from the day you sign up, and
          your card is charged again every month or year until you cancel. What you pay for is the
          service, not access to TestFlight: the free app is free. Each plan has a daily AI
          allowance; when you reach it, OVOA tells you and says when it resets. The price you join
          at stays while you&rsquo;re a member; if we ever change it for new members, yours stays
          the same unless we tell you at least 30 days ahead.
        </p>
      </section>

      <section>
        <h2>Cancelling and refunds</h2>
        <p>
          Cancel anytime from Manage billing on your welcome page, or email{" "}
          <a href="mailto:support@ovoa.ai">support@ovoa.ai</a>. You keep your plan until the end of
          the period you&rsquo;ve paid for. If a charge goes through and OVOA isn&rsquo;t for you,
          email us within 14 days and we&rsquo;ll refund it.
        </p>
      </section>

      <section>
        <h2>The OVOA Band</h2>
        <p>
          The Band is {bandPrice(data)}, paid once. A Band bought with OVOA Base includes {days}{" "}
          days of Base, which start when you start them from your order page (we email you the
          link), not at checkout. Your card is saved for Base at checkout. After the {days} days,
          Base is {perLabel(planOf(data, "base", "monthly"))} until you cancel, and nothing more is
          charged if you cancel before they end. You can also buy the Band on its own, with no
          subscription and no card saved. It still comes with {days} days of Base, which you can
          start from your order page, or give to someone by moving them to their app email. Those
          days need no card: they end on their own, and nothing is charged.
        </p>
        <p>
          The Band is beta hardware made in small batches. We ship to US addresses and email you
          when yours is sent; we can&rsquo;t promise a delivery date. If you&rsquo;d rather not
          wait, email us before it ships and we&rsquo;ll refund it. If it arrives faulty, or
          isn&rsquo;t for you, email us within 30 days of delivery to return it for a refund. The
          Band is not a medical device.
        </p>
      </section>

      <section>
        <h2>Using OVOA</h2>
        <ul>
          <li>You must be at least 13, and old enough to agree to these terms where you live.</li>
          <li>Keep your password to yourself. You&rsquo;re responsible for your account.</li>
          <li>
            Don&rsquo;t use OVOA to break the law, to harm or harass anyone, or to record people
            without their consent.
          </li>
          <li>
            When OVOA acts for you (sending an email, adding an event), it acts on your instructions
            and on your behalf. Check what it drafts, especially before turning off the step where
            it asks first.
          </li>
          <li>Don&rsquo;t try to break, overload or reverse-engineer the service.</li>
        </ul>
        <p>
          You own what you put into OVOA. You let us store and process it only to run OVOA for you,
          as the privacy policy describes.
        </p>
      </section>

      <section>
        <h2>Partners</h2>
        <p>
          How partners earn and get paid is set out on the{" "}
          <Link to="/partners">partner program</Link> page.
        </p>
      </section>

      <section>
        <h2>Limits on our responsibility</h2>
        <p>
          OVOA is provided as it is, during a beta, without warranties beyond those the law
          requires. As far as the law allows, we aren&rsquo;t liable for indirect or consequential
          losses, and our total liability is limited to what you paid us in the 12 months before the
          claim. Nothing here limits rights you have under consumer law that can&rsquo;t be limited.
        </p>
      </section>

      <section>
        <h2>Ending things</h2>
        <p>
          You can stop using OVOA and delete your account at any time. We may suspend an account
          that breaks these terms, and we may end the beta; if we do, we&rsquo;ll refund the unused
          part of any plan you&rsquo;ve paid for.
        </p>
      </section>

      <section>
        <h2>Changes</h2>
        <p>
          We&rsquo;ll update these terms as OVOA grows. If a change matters, we&rsquo;ll tell you in
          the app or by email before it takes effect. Questions:{" "}
          <a href="mailto:support@ovoa.ai">support@ovoa.ai</a>.
        </p>
      </section>
    </LegalPage>
  );
}
