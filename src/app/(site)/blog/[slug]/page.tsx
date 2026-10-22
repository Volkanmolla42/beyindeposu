import type { Metadata } from "next";
import { notFound } from "next/navigation";
import BlogJsonLd from "@/components/blog/BlogJsonLd";
import {
  getPublishedBlogBySlug,
  getRecentBlogCards,
  listBlogCards,
} from "@/lib/blog-data";
import {
  metadataDescription,
  SITE_NAME,
  SITE_URL,
  toAbsoluteUrl,
} from "@/lib/seo";
import BlogArticle from "./BlogArticle";

interface Props {
  params: Promise<{ slug: string }>;
}

export async function generateStaticParams() {
  const blogs = await listBlogCards();
  return blogs.map((blog) => ({ slug: blog.slug }));
}

function metadataTitle(title: string): string {
  const branded = `${title} | Beyin Deposu Blog`;
  return branded.length <= 65 ? branded : title;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const blog = await getPublishedBlogBySlug(slug);

  if (!blog) notFound();

  const title = metadataTitle(blog.title);
  const description = metadataDescription(blog.excerpt, 160);
  const url = `${SITE_URL}/blog/${blog.slug}`;
  const image = toAbsoluteUrl(blog.coverImage);

  return {
    title: { absolute: title },
    description,
    keywords: blog.tags,
    authors: [{ name: "Beyin Deposu Teknik Ekibi", url: SITE_URL }],
    alternates: { canonical: `/blog/${blog.slug}` },
    openGraph: {
      type: "article",
      locale: "tr_TR",
      siteName: SITE_NAME,
      url,
      title,
      description,
      images: [{ url: image, alt: blog.title }],
      publishedTime: new Date(blog.createdAt).toISOString(),
      modifiedTime: new Date(blog.updatedAt).toISOString(),
      section: blog.category,
      tags: blog.tags,
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [image],
    },
  };
}

export default async function BlogDetailPage({ params }: Props) {
  const { slug } = await params;
  const [blog, recentBlogs] = await Promise.all([
    getPublishedBlogBySlug(slug),
    getRecentBlogCards(4),
  ]);

  if (!blog) notFound();

  const relatedBlogs = recentBlogs
    .filter((post) => post.slug !== blog.slug)
    .slice(0, 3);

  return (
    <>
      <BlogJsonLd blog={blog} />
      <BlogArticle blog={blog} relatedBlogs={relatedBlogs} />
    </>
  );
}
