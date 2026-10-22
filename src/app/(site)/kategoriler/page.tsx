import { createPageMetadata } from "@/lib/seo";
import { getPublicCategories } from "@/lib/seo-data";
import CatalogDirectoryPage from "@/components/CatalogDirectoryPage";


export const metadata = createPageMetadata({
  title: "Kategoriler",
  description: "Oto elektronik parçalarını kategorilerine göre inceleyin.",
  path: "/kategoriler",
});

export default async function CategoriesPage() {
  const categories = await getPublicCategories();

  return (
    <CatalogDirectoryPage
      title="Parça Kategorileri"
      badge="BEYİN DEPOSU KATALOG"
      description="ECU motor beyinleri, ABS pompaları, şanzıman modülleri ve tüm oto elektronik ünitelerini kategorilere göre inceleyin."
      heroImage="/images/categories-hero.jpg"
      actionLabel="Parçaları bul"
      detailLabel="Kategori sayfası"
      items={categories.map((category) => ({
        id: category._id,
        title: category.name,
        image: category.image &&
          /^(?:data:image\/webp;)|\.webp(?:[?#]|$)/i.test(category.image)
          ? category.image
          : null,
        filterHref: `/parcalar?kategori=${encodeURIComponent(category.slug)}`,
        detailHref: `/kategoriler/${encodeURIComponent(category.slug)}`,
      }))}
    />
  );
}
