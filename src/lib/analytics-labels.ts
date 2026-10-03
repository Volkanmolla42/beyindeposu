export const analyticsLabels: Record<string, string> = {
  page_view: "Sayfa görüntüleme", product_view: "Parça görüntüleme", search: "Arama", search_result_click: "Arama sonucuna tıklama", filter_change: "Filtre değişikliği", catalog_page: "Katalog sayfalama", whatsapp_click: "WhatsApp tıklaması", phone_click: "Telefon tıklaması", email_click: "E-posta tıklaması", chat_open: "Sohbet açma", chat_start: "Sohbet başlatma", chat_message: "Mesaj gönderme", image_view: "Görsel inceleme", oem_copy: "OEM kopyalama", product_share: "Bağlantı kopyalama", engagement: "Aktif süre", direct: "Doğrudan / site içi", google: "Google", bing: "Bing", yandex: "Yandex", facebook: "Facebook", instagram: "Instagram", other: "Diğer", mobile: "Mobil", tablet: "Tablet", desktop: "Masaüstü", "[gizlendi]": "Gizlenen arama", category: "Kategori", brand: "Marka", model: "Araç modeli", condition: "Durum", stock: "Stok", sort: "Sıralama", reset: "Sıfırlama",
};
export function analyticsLabel(key: string) {
  if (key === "image_zoom") return "Görsel yakınlaştırma";
  const [name, value] = key.split(":");
  if (value !== undefined) return `${analyticsLabels[name] ?? name}: ${value}`;
  return analyticsLabels[key] ?? key;
}
export const formatAnalyticsNumber = (value: number) => new Intl.NumberFormat("tr-TR").format(value);
export const formatAnalyticsMonth = (month: string) => new Date(`${month}-01T12:00:00+03:00`).toLocaleDateString("tr-TR", { month: "long", year: "numeric", timeZone: "Europe/Istanbul" });
export function formatAnalyticsDuration(ms: number) {
  const seconds = Math.round(ms / 1000);
  return seconds < 60 ? `${seconds} sn` : `${Math.floor(seconds / 60)} dk ${seconds % 60} sn`;
}
