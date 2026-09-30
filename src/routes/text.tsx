import { createFileRoute } from "@tanstack/react-router";
import { TextButtonPage } from "@/components/TextButton";
import { getPublicTextNumber } from "@/lib/account/texting.functions";
import { getVariant } from "@/lib/ab.functions";
import { breadcrumbs, jsonLd, pageHead } from "@/lib/seo";

// Text OVOA: the front door. No sign-in, no number to type: a phone opens
// Messages with a ready-made hello to OVOA, a computer shows a QR code for it.
// The first texts are free with no account; OVOA itself asks for an email and
// then a plan as the thread goes on. Linking a number to an existing account
// lives on /text/link. What texting OVOA can do, at length, is /imessage.
// The page is the homepage's, in the same A/B version (lib/ab.ts).

export const Route = createFileRoute("/text")({
  component: TextPageView,
  staticData: { sitemap: true },
  loader: async () => ({ ...(await getPublicTextNumber()), ...(await getVariant({ data: {} })) }),
  head: () => ({
    ...pageHead({
      title: "Text OVOA: your AI assistant in iMessage, no app needed",
      description:
        "Just text OVOA. No app, no sign-up: your first texts are free. Open Messages from your iPhone, or scan the QR code on a computer.",
      path: "/text",
    }),
    scripts: [jsonLd(breadcrumbs("Text OVOA", "/text"))],
  }),
});

function TextPageView() {
  const { number, variant } = Route.useLoaderData();
  return <TextButtonPage number={number} variant={variant} autoOpen />;
}
