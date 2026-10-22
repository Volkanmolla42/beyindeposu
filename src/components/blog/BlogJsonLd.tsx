import "server-only";
import type { BlogDetail } from "@/lib/blog-data";
import {
  buildFaqJsonLd,
  ORGANIZATION_JSON_LD,
  SITE_NAME,
  SITE_URL,
  serializeJsonLd,
  toAbsoluteUrl,
} from "@/lib/seo";

export default function BlogJsonLd({ blog }: { blog: BlogDetail }) {
  const url = `${SITE_URL}/blog/${blog.slug}`;
  const image = toAbsoluteUrl(blog.coverImage);

  const article = {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    headline: blog.title,
    description: blog.excerpt,
    image: [image],
    datePublished: new Date(blog.createdAt).toISOString(),
    dateModified: new Date(blog.updatedAt).toISOString(),
    inLanguage: "tr-TR",
    author: {
      "@type": "Organization",
      name: "Beyin Deposu Teknik Ekibi",
      url: SITE_URL,
    },
    publisher: {
      "@type": "Organization",
      name: SITE_NAME,
      url: SITE_URL,
      logo: {
        "@type": "ImageObject",
        url: ORGANIZATION_JSON_LD.logo,
      },
    },
    mainEntityOfPage: {
      "@type": "WebPage",
      "@id": url,
    },
    isPartOf: {
      "@type": "Blog",
      name: "Beyin Deposu Blog",
      url: `${SITE_URL}/blog`,
    },
    articleSection: blog.category,
    keywords: blog.tags?.join(", "),
    url,
  };

  const breadcrumbs = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      {
        "@type": "ListItem",
        position: 1,
        name: "Ana Sayfa",
        item: SITE_URL,
      },
      {
        "@type": "ListItem",
        position: 2,
        name: "Blog",
        item: `${SITE_URL}/blog`,
      },
      {
        "@type": "ListItem",
        position: 3,
        name: blog.category,
        item: `${SITE_URL}/blog?kategori=${encodeURIComponent(blog.category)}`,
      },
      {
        "@type": "ListItem",
        position: 4,
        name: blog.title,
        item: url,
      },
    ],
  };

  const faqSchema = buildFaqJsonLd(blog.faqs);

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: serializeJsonLd(article) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: serializeJsonLd(breadcrumbs) }}
      />
      {faqSchema ? (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: serializeJsonLd(faqSchema) }}
        />
      ) : null}
    </>
  );
}
