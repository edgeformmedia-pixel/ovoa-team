import { createFileRoute } from "@tanstack/react-router";
import { BlogArticle, blogPostHead } from "@/components/BlogArticle";
import { postBySlug } from "@/lib/blog";

const post = postBySlug("join-the-ovoa-beta");

export const Route = createFileRoute("/blog/join-the-ovoa-beta")({
  component: () => <BlogArticle post={post} />,
  staticData: { sitemap: true },
  head: () => blogPostHead(post),
});
