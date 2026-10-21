const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export function assertValidSlug(slug: string): void {
  if (!SLUG_PATTERN.test(slug)) {
    throw new Error(
      "Geçersiz URL bağlantısı. Yalnızca küçük harf, rakam ve tire kullanın.",
    );
  }
}
