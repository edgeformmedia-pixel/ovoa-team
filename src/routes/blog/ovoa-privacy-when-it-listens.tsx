import { createFileRoute } from "@tanstack/react-router";
import { BlogArticle, blogPostHead } from "@/components/BlogArticle";
import { postBySlug } from "@/lib/blog";

const post = postBySlug("ovoa-privacy-when-it-listens");

export const Route = createFileRoute("/blog/ovoa-privacy-when-it-listens")({
  component: () => <BlogArticle post={post} />,
  staticData: { sitemap: true },
  head: () => blogPostHead(post),
});
