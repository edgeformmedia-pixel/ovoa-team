import { createFileRoute } from "@tanstack/react-router";
import { BlogArticle, blogPostHead } from "@/components/BlogArticle";
import { postBySlug } from "@/lib/blog";

const post = postBySlug("ovoa-band-how-it-works");

export const Route = createFileRoute("/blog/ovoa-band-how-it-works")({
  component: () => <BlogArticle post={post} />,
  staticData: { sitemap: true },
  head: () => blogPostHead(post),
});
