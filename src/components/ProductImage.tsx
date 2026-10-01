"use client";

import { useState } from "react";
import Image, { type ImageProps } from "next/image";
import {
  PRODUCT_IMAGE_PLACEHOLDER,
  PRODUCT_IMAGE_PLACEHOLDER_ALT,
} from "@/lib/product-images";

type ProductImageProps = Omit<ImageProps, "src" | "alt" | "onError"> & {
  src?: string | null;
  alt?: string;
  onError?: ImageProps["onError"];
};

export function ProductImage({
  src,
  alt = "",
  onError,
  ...imageProps
}: ProductImageProps) {
  const source = src?.trim() || PRODUCT_IMAGE_PLACEHOLDER;
  const [failedSource, setFailedSource] = useState<string | null>(null);
  const hasFailed = failedSource === source;
  const showPlaceholder = source === PRODUCT_IMAGE_PLACEHOLDER || hasFailed;

  return (
    <Image
      {...imageProps}
      src={hasFailed ? PRODUCT_IMAGE_PLACEHOLDER : source}
      alt={showPlaceholder ? PRODUCT_IMAGE_PLACEHOLDER_ALT : alt}
      onError={(event) => {
        if (source !== PRODUCT_IMAGE_PLACEHOLDER && !hasFailed) {
          setFailedSource(source);
        }
        onError?.(event);
      }}
    />
  );
}
