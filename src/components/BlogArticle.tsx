import { Link } from "@tanstack/react-router";
import { MembershipHeader } from "@/components/membership/MembershipHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { BLOG_POSTS, postPath, type BlogPost } from "@/lib/blog";
import { articleJsonLd, breadcrumbs3, jsonLd, ogImageMeta, SITE_URL } from "@/lib/seo";

// The head() every blog post route uses.
export function blogPostHead(post: BlogPost) {
  const path = postPath(post.slug);
  return {
    meta: [
      { title: post.title },
      { name: "description", content: post.description },
      { property: "og:title", content: post.title },
      { property: "og:description", content: post.description },
      { property: "og:type", content: "article" },
      { property: "og:url", content: `${SITE_URL}${path}` },
      { property: "article:published_time", content: post.published },
      ...ogImageMeta,
    ],
    links: [{ rel: "canonical", href: `${SITE_URL}${path}` }],
    scripts: [
      jsonLd(
        articleJsonLd({
          title: post.title,
          description: post.description,
          path,
          published: post.published,
          updated: post.updated,
        }),
      ),
      jsonLd(breadcrumbs3("OVOA Blog", "/blog", post.title, path)),
    ],
  };
}

const formatDate = (iso: string) =>
  new Date(`${iso}T12:00:00Z`).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
    timeZone: "UTC",
  });

export function BlogArticle({ post }: { post: BlogPost }) {
  const more = BLOG_POSTS.filter((p) => p.slug !== post.slug);
  return (
    <main className="min-h-dvh bg-landing-canvas text-landing-ink">
      <MembershipHeader>
        <Link
          to="/blog"
          className="text-xs text-landing-muted transition-colors hover:text-landing-ink"
        >
          Blog
        </Link>
      </MembershipHeader>
      <article className="mx-auto max-w-[680px] px-5 pb-16 pt-12 sm:pt-16">
        <p className="text-sm text-landing-muted">
          <Link to="/blog" className="hover:text-landing-ink">
            OVOA Blog
          </Link>{" "}
          · <time dateTime={post.published}>{formatDate(post.published)}</time>
        </p>
        <h1 className="mt-3 text-[clamp(2rem,6vw,3rem)] font-semibold leading-[1.06]">
          {post.title}
        </h1>
        <p className="mt-6 text-lg leading-relaxed text-landing-muted sm:text-xl">{post.intro}</p>
        {post.sections.map((section) => (
          <section key={section.heading} className="mt-10">
            <h2 className="text-2xl font-semibold">{section.heading}</h2>
            {section.paragraphs.map((text, i) => (
              <p key={i} className="mt-3 text-base leading-relaxed text-landing-muted sm:text-lg">
                {text}
              </p>
            ))}
          </section>
        ))}
        <nav aria-label="Related pages" className="mt-12 flex flex-wrap gap-2">
          {post.related.map((link) => (
            <a
              key={link.to}
              href={link.to}
              className="inline-flex h-10 items-center rounded-full bg-landing-control px-5 text-sm font-medium text-landing-ink transition-transform hover:-translate-y-0.5"
            >
              {link.label}
            </a>
          ))}
        </nav>
        <section className="mt-16 border-t border-landing-line pt-8">
          <h2 className="text-sm font-medium text-landing-muted">More from the OVOA Blog</h2>
          <ul className="mt-4 space-y-3">
            {more.map((p) => (
              <li key={p.slug}>
                <a href={postPath(p.slug)} className="text-base font-medium hover:underline">
                  {p.title}
                </a>
              </li>
            ))}
          </ul>
        </section>
        <SiteFooter />
      </article>
    </main>
  );
}
