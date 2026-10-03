import ProductCard, { type ProductCardProps } from "@/components/ProductCard";

type TaxonomyProductResultsProps = {
  products: ProductCardProps["product"][];
  emptyMessage: string;
};

export default function TaxonomyProductResults({
  products,
  emptyMessage,
}: TaxonomyProductResultsProps) {
  if (products.length === 0) {
    return (
      <p className="rounded-xl border border-slate-200 bg-white p-6 text-sm text-slate-600">
        {emptyMessage}
      </p>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {products.map((product) => (
        <ProductCard key={product._id} product={product} />
      ))}
    </div>
  );
}
