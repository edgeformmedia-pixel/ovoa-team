import { createFileRoute, Link } from "@tanstack/react-router";
import { MembershipHeader } from "@/components/membership/MembershipHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { BLOG_POSTS, postPath } from "@/lib/blog";
import { breadcrumbs, jsonLd, ogImageMeta, SITE_URL } from "@/lib/seo";

const PAGE_TITLE = "OVOA Blog: the AI assistant and the OVOA Band, explained";
const PAGE_DESCRIPTION =
  "Plain explainers from the OVOA team: what OVOA is, how the OVOA Band works, joining the beta, and privacy.";

export const Route = createFileRoute("/blog/")({
  component: BlogIndex,
  staticData: { sitemap: true },
  head: () => ({
    meta: [
      { title: PAGE_TITLE },
      { name: "description", content: PAGE_DESCRIPTION },
      { property: "og:title", content: PAGE_TITLE },
      { property: "og:description", content: PAGE_DESCRIPTION },
      { property: "og:type", content: "website" },
      { property: "og:url", content: `${SITE_URL}/blog` },
      ...ogImageMeta,
    ],
    links: [{ rel: "canonical", href: `${SITE_URL}/blog` }],
    scripts: [
      jsonLd(breadcrumbs("OVOA Blog", "/blog")),
      jsonLd({
        "@context": "https://schema.org",
        "@type": "Blog",
        name: "OVOA Blog",
        url: `${SITE_URL}/blog`,
        publisher: { "@id": `${SITE_URL}/#organization` },
        blogPost: BLOG_POSTS.map((p) => ({
          "@type": "BlogPosting",
          headline: p.title,
          url: `${SITE_URL}${postPath(p.slug)}`,
          datePublished: p.published,
        })),
      }),
    ],
  }),
});

function BlogIndex() {
  return (
    <main className="min-h-dvh bg-landing-canvas text-landing-ink">
      <MembershipHeader>
        <Link to="/faq" className="text-xs text-landing-muted transition-colors hover:text-landing-ink">
          FAQ
        </Link>
      </MembershipHeader>
      <div className="mx-auto max-w-[680px] px-5 pb-16 pt-12 sm:pt-16">
        <h1 className="text-[clamp(2.1rem,7vw,3rem)] font-semibold leading-[1.04]">OVOA Blog</h1>
        <p className="mt-4 text-lg leading-relaxed text-landing-muted">
          What OVOA is, how the OVOA Band works, and what's new in the beta.
        </p>
        <ul className="mt-10 space-y-8">
          {BLOG_POSTS.map((post) => (
            <li key={post.slug}>
              <a href={postPath(post.slug)} className="group block">
                <h2 className="text-2xl font-semibold group-hover:underline">{post.title}</h2>
                <p className="mt-2 text-base leading-relaxed text-landing-muted">
                  {post.description}
                </p>
              </a>
            </li>
          ))}
        </ul>
        <SiteFooter />
      </div>
    </main>
  );
}
