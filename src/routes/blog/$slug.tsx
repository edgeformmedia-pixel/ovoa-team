import { createFileRoute, notFound } from "@tanstack/react-router";
import { ContentPage } from "@/components/ContentPage";
import { findPost, longDate } from "@/lib/blog/posts";
import { articleJsonLd, breadcrumbs, faqJsonLd, jsonLd, pageHead } from "@/lib/seo";

// One blog post (src/lib/blog/posts.tsx). A draft can be read here but isn't
// indexed.

export const Route = createFileRoute("/blog/$slug")({
  component: PostPage,
  loader: ({ params }) => {
    if (!findPost(params.slug)) throw notFound();
    return { slug: params.slug };
  },
  head: ({ loaderData }) => {
    const post = loaderData && findPost(loaderData.slug);
    if (!post) return {};
    const path = `/blog/${post.slug}`;
    const head = pageHead({ title: post.title, description: post.description, path, type: "article" });
    return {
      ...head,
      meta: [...head.meta, ...(post.draft ? [{ name: "robots", content: "noindex, nofollow" }] : [])],
      scripts: [
        jsonLd(
          articleJsonLd({
            title: post.title,
            description: post.description,
            path,
            published: post.published,
            modified: post.updated,
          }),
        ),
        ...(post.faqs?.length ? [jsonLd(faqJsonLd(post.faqs))] : []),
        jsonLd(breadcrumbs(post.title, path, { name: "Blog", path: "/blog" })),
      ],
    };
  },
});

function PostPage() {
  const { slug } = Route.useLoaderData();
  const post = findPost(slug)!;
  const Body = post.body;
  return (
    <ContentPage
      crumbs={[
        { name: "Blog", path: "/blog" },
        { name: post.title, path: `/blog/${post.slug}` },
      ]}
      eyebrow={post.draft ? "Blog · Draft, not public yet" : "Blog"}
      title={post.title}
      updated={longDate(post.updated)}
      lede={post.lede}
      faqs={post.faqs ?? []}
      related={[
        { to: "/imessage", label: "Texting OVOA", blurb: "Everything OVOA does in Messages." },
        { to: "/blog", label: "More from the blog", blurb: "Guides to getting more done by text." },
      ]}
    >
      <Body />
    </ContentPage>
  );
}
