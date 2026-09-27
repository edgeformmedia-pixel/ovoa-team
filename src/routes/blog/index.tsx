import { createFileRoute } from "@tanstack/react-router";
import { ContentPage } from "@/components/ContentPage";
import { livePosts, longDate } from "@/lib/blog/posts";
import { breadcrumbs, jsonLd, pageHead } from "@/lib/seo";

// The blog's front page: published posts, newest first. Drafts never show here.

const PATH = "/blog";
const TITLE = "OVOA blog: getting more done by text";
const DESCRIPTION =
  "Guides to reminders, planning and running a small business by text, from the team behind OVOA, the AI assistant you text in iMessage.";

export const Route = createFileRoute("/blog/")({
  component: BlogIndex,
  // In the sitemap only once something is published.
  staticData: { sitemap: livePosts().length > 0 },
  head: () => {
    const head = pageHead({ title: TITLE, description: DESCRIPTION, path: PATH });
    return {
      ...head,
      meta: [...head.meta, ...(livePosts().length ? [] : [{ name: "robots", content: "noindex" }])],
      scripts: [jsonLd(breadcrumbs("Blog", PATH))],
    };
  },
});

function BlogIndex() {
  const posts = [...livePosts()].sort((a, b) => b.published.localeCompare(a.published));
  return (
    <ContentPage
      crumbs={[{ name: "Blog", path: PATH }]}
      eyebrow="Blog"
      title="Getting more done by text."
      lede={<p>How-tos for reminders, plans and small business, the easy way.</p>}
    >
      {posts.length === 0 ? (
        <p>The first posts are on their way.</p>
      ) : (
        <ul className="!list-none !pl-0 grid gap-3">
          {posts.map((post) => (
            <li key={post.slug} className="!mt-0">
              <a
                href={`/blog/${post.slug}`}
                className="block rounded-2xl border border-landing-line p-5 !no-underline transition-colors hover:border-landing-muted"
              >
                <span className="block text-lg font-semibold text-landing-ink">{post.title}</span>
                <span className="mt-1 block font-normal text-landing-muted">{post.description}</span>
                <span className="mt-2 block text-xs font-normal text-landing-muted">
                  {longDate(post.published)}
                </span>
              </a>
            </li>
          ))}
        </ul>
      )}
    </ContentPage>
  );
}
