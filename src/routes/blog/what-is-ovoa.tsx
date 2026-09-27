import { createFileRoute } from "@tanstack/react-router";
import { BlogArticle, blogPostHead } from "@/components/BlogArticle";
import { postBySlug } from "@/lib/blog";

const post = postBySlug("what-is-ovoa");

export const Route = createFileRoute("/blog/what-is-ovoa")({
  component: () => <BlogArticle post={post} />,
  staticData: { sitemap: true },
  head: () => blogPostHead(post),
});
