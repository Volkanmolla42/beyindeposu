export const PRODUCT_IMAGE_PLACEHOLDER = "/images/product-image-preparing.webp";
export const PRODUCT_IMAGE_PLACEHOLDER_ALT = "Ürün görseli hazırlanıyor";

export function hasProductImage(images?: readonly string[]) {
  return Boolean(images?.some((image) => image.trim().length > 0));
}

export function getProductImageSource(images?: readonly string[]) {
  return (
    images?.find((image) => image.trim().length > 0) ||
    PRODUCT_IMAGE_PLACEHOLDER
  );
}

export function getProductImageAlt(title: string, images?: readonly string[]) {
  return hasProductImage(images) ? title : PRODUCT_IMAGE_PLACEHOLDER_ALT;
}
