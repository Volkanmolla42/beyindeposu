import { notFound } from "next/navigation";
import { getPublicProductBySlug } from "@/lib/seo-data";
import ProductDetailClient from "./ProductDetailClient";

type ProductRouteProps = {
  params: Promise<{ slug: string }>;
};

export default async function ProductPage({ params }: ProductRouteProps) {
  const { slug } = await params;
  const product = await getPublicProductBySlug(slug);

  if (!product) notFound();

  return <ProductDetailClient slug={slug} initialProduct={product} />;
}
