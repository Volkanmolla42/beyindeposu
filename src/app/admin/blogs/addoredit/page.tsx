import BlogEditor from "../BlogEditor";

export default async function BlogAddOrEditPage({
  searchParams,
}: {
  searchParams: Promise<{ slug?: string | string[] }>;
}) {
  const { slug } = await searchParams;

  return <BlogEditor slug={typeof slug === "string" ? slug : undefined} />;
}
