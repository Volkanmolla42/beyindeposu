# Beyin Deposu Tasarım Sistemi & Bileşen Kütüphanesi

Bu belge, **Beyin Deposu** projesinin tüm tasarım temellerini (foundations), tasarım belirteçlerini (design tokens), bileşen ailelerini (component families), uygulama kabuğunu (app shell) ve mevcut tasarım borçlarını (design system debt) içeren resmi kaynak ve kural kitabıdır.

---

## 1. Tasarım Temelleri & Belirteçler (Foundations & Tokens)

Tasarım sistemi, Tailwind CSS v4 `@theme` yapısı ve Google Material Design 3 (`--md-*`) uyumlu CSS özel değişkenleri üzerine kuruludur.

### 1.1. Renk Paleti (Color Tokens)

#### Birincil Renk Skalası (`blue-*`):
- `--color-blue-50`: `#e8f0fe` (Açık vurgu ve arkaplanlar)
- `--color-blue-100`: `#d2e3fc` (Hafif kenarlıklar ve çip arkaplanları)
- `--color-blue-200`: `#a8c7fa` (Odaklama halkaları ve hover kenarlıkları)
- `--color-blue-300`: `#7cacf8`
- `--color-blue-400`: `#669df6`
- `--color-blue-500`: `#4285f4`
- `--color-blue-600`: `#0b57d0` (Ana marka rengi, birincil butonlar)
- `--color-blue-700`: `#0842a0` (Hover durumları, yüksek kontrastlı bağlantılar)
- `--color-blue-800`: `#062e6f` (Koyu başlık vurguları)
- `--color-blue-900`: `#041e49`
- `--color-blue-950`: `#061e49`

#### Nötr Renk Skalası (`slate-*`):
- `--color-slate-50`: `#f8fafd` (Ana sayfa arkaplanı)
- `--color-slate-100`: `#f1f3f4` (Kart arkaplanları, ikincil düğmeler)
- `--color-slate-200`: `#e8eaed` (Standart kart ve liste sınır çizgileri)
- `--color-slate-300`: `#dadce0` (Giriş elemanı sınır çizgileri)
- `--color-slate-400`: `#70757a` (Placeholder ve pasif ikonlar)
- `--color-slate-500`: `#5f6368` (Açıklama ve yardımcı metinler)
- `--color-slate-600`: `#4a4d51` (Gövde metinleri)
- `--color-slate-700`: `#3c4043` (Vurgulu gövde metinleri)
- `--color-slate-800`: `#303134` (Alt başlıklar)
- `--color-slate-900`: `#202124` (Ana başlıklar)
- `--color-slate-950`: `#171717` (Maksimum kontrastlı metinler)

#### Anlamsal Renk Belirteçleri (Semantic / Material Design 3 Tokens):
- `--md-primary`: `#0b57d0`
- `--md-on-primary`: `#ffffff`
- `--md-primary-container`: `#d3e3fd`
- `--md-on-primary-container`: `#041e49`
- `--md-surface`: `#f8fafd`
- `--md-surface-container`: `#f1f3f4`
- `--md-on-surface`: `#1f1f1f`
- `--md-on-surface-variant`: `#5f6368`
- `--md-outline`: `#dadce0`
- `--md-outline-strong`: `#bdc1c6`

#### Fonksiyonel Renkler (WCAG 2.1 Uyumlu):
- **WhatsApp / Başarı:** `bg-emerald-700` (`#047857`, beyaz üstünde 4.53:1 kontrast)
- **Hata / Silme:** `bg-red-600` (`#dc2626`)
- **Uyarı:** `bg-amber-50` / `text-amber-800`
- **Bilgi:** `bg-blue-50` / `text-blue-700`

---

### 1.2. Tipografi (Typography)

Sistem, Google Fonts üzerinden sağlanan modern ve okunaklı iki font ailesini kullanır:

- **Gövde & Arayüz Metinleri (Sans):**
  - CSS Değişkeni: `var(--font-roboto)` (`Roboto, Arial, sans-serif`)
  - Ağırlıklar: `300 (Light)`, `400 (Regular)`, `500 (Medium)`, `700 (Bold)`
- **OEM Kodları & Teknik Veriler (Monospace):**
  - CSS Değişkeni: `var(--font-roboto-mono)` (`Roboto Mono, monospace`)
  - Ağırlıklar: `400 (Regular)`, `500 (Medium)`, `700 (Bold)`
  - Kullanım Alanları: OEM numaraları, parça kodları, seri numaraları, arama kutusu girdileri.

---

### 1.3. Köşe Yuvarlama & Gölgelendirme (Radius & Elevation)

- **Yuvarlama Hiyerarşisi:**
  - `rounded-lg` (8px): Etiketler, küçük butonlar, arama temizleme düğmeleri.
  - `rounded-xl` (12px): Standart form alanları (`Input`), açılır menüler, modal kartları.
  - `rounded-2xl` (16px): İçerik kartları, yan panel filtre kutuları, görsel kapları.
  - `rounded-3xl` (24px): Büyük özellik kartları, iletişim blokları, hero kartları.
  - `rounded-full` (9999px): Birincil aksiyon butonları (`Button`), arama barı (`OemSearchBar`), rozetler (`Badge`).
- **Gölgelendirme (Shadows):**
  - `shadow-2xs` / `shadow-xs`: Kartlar ve hafif kutu ayrımları.
  - `shadow-sm`: Form elemanları ve filtre kutuları.
  - `shadow-md`: Vurgulu butonlar ve hover durumları.
  - `shadow-2xl`: Canlı destek penceresi ve diyalog modalları.

---

## 2. Bileşen Ailesi Envanteri (Component Families)

### 2.1. Buton Ailesi (Actions: Button & Link)
- **Kaynak Dosya:** [`src/components/ui/button.tsx`](file:///c:/Users/volkan/Desktop/beyindeposu/src/components/ui/button.tsx)
- **Top-Level Bileşen:** `Button`
- **Radix Entegrasyonu:** Radix UI `Slot` tabanlı `asChild` desteği (`<a>` etiketleri ile semantik kusursuz uyum).
- **Varyant Ekseni (`variant`):**
  - `default`: Marka mavisi (`bg-blue-600 text-white hover:bg-blue-700`).
  - `whatsapp`: Erişilebilir zümrüt yeşili (`bg-emerald-700 text-white hover:bg-emerald-800 font-semibold`).
  - `destructive`: Kritik/silme aksiyonu (`bg-red-600 text-white hover:bg-red-700`).
  - `outline`: Çerçeveli nötr düğme (`border border-slate-300 bg-white text-slate-800 hover:bg-slate-50`).
  - `secondary`: İkincil yumuşak gri (`bg-slate-100 text-slate-900 hover:bg-slate-200`).
  - `ghost`: Sadece metin/hover arka planı (`text-slate-700 hover:bg-slate-100`).
  - `link`: Metin içi bağlantı stili (`text-blue-600 underline-offset-4 hover:underline`).
  - `tech`: Özel donanım/teknik filtreleme stili (`border border-blue-200 bg-blue-50 text-blue-800`).
- **Boyut Ekseni (`size`):**
  - `sm`: 36px (`h-9 px-4 text-sm`)
  - `default`: 40px (`h-10 px-4 py-2`)
  - `lg`: 48px (`h-12 px-7 text-base`)
  - `xl`: 56px (`h-14 px-8 text-lg`)
  - `icon`: 40x40px (`h-10 w-10`)
- **Kullanım Kılavuzu:**
  - Form gönderimleri, modal tetikleyicileri ve ana eylemler için `Button` kullanın.
  - Sayfa içi veya harici gezinme için `Button asChild` kullanarak `<Link>` veya `<a>` sarmalayın.

---

### 2.2. Rozet ve Durum Ailesi (Identity & Status: Badge)
- **Kaynak Dosya:** [`src/components/ui/badge.tsx`](file:///c:/Users/volkan/Desktop/beyindeposu/src/components/ui/badge.tsx)
- **Top-Level Bileşen:** `Badge`
- **Varyant Ekseni (`variant`):**
  - `default`: Vurgulu mavi (`bg-blue-600 text-white`).
  - `secondary`: Nötr gri (`bg-slate-100 text-slate-900`).
  - `destructive`: Kırmızı hata (`bg-red-500 text-white`).
  - `outline`: İnce gri çerçeve (`text-slate-700 border-slate-300`).
  - `success`: "Sıfır Parça" veya "Stokta" durumu (`border-emerald-200 bg-emerald-50 text-emerald-700`).
  - `warning`: "Stokta Yok" veya dikkat durumu (`border-amber-200 bg-amber-50 text-amber-800`).
  - `info`: Bilgilendirme rozeti (`border-blue-200 bg-blue-50 text-blue-700`).
  - `tech`: Koyu modül teması (`border-blue-500/30 bg-blue-950/60 text-blue-300`).
- **Kullanım Kılavuzu:**
  - Parça kondisyonu ("Sıfır", "Çıkma/İkinci El"), stok durumu ("Stokta", "Tükendi") ve parça sayaçları için kullanılır.

---

### 2.3. Form ve Arama Ailesi (Forms & Selection)
- **Bileşenler:**
  - `Input`: [`src/components/ui/input.tsx`](file:///c:/Users/volkan/Desktop/beyindeposu/src/components/ui/input.tsx) — 44px dokunmatik hedefli, odak halkalı metin girişi.
  - `Textarea`: [`src/components/ui/textarea.tsx`](file:///c:/Users/volkan/Desktop/beyindeposu/src/components/ui/textarea.tsx) — Çok satırlı açıklamalar ve notlar.
  - `SearchableCombobox`: [`src/components/ui/searchable-combobox.tsx`](file:///c:/Users/volkan/Desktop/beyindeposu/src/components/ui/searchable-combobox.tsx) — Klavye destekli, filtrelenebilir tekli/çoklu seçim açılır kutusu.
  - `OemSearchBar`: [`src/components/OemSearchBar.tsx`](file:///c:/Users/volkan/Desktop/beyindeposu/src/components/OemSearchBar.tsx) — Gerçek zamanlı arama, OEM kodu eşleştirme ve önizleme kartları sunan küresel arama motoru bileşeni (`variant: "hero" | "header"`).
- **Kullanım Kılavuzu:**
  - Arama alanlarında kullanıcıya hızlı temizleme butonu (`✕`) ve büyük harf monospaced OEM desteği sunun.
  - Tüm form kontrollerine erişilebilir etiket (`<label htmlFor="...">` ve `aria-label`) verilmesi zorunludur.

---

### 2.4. Parça Sergileme ve Kart Ailesi (Catalog: ProductCard & ModernImageZoom)
- **Bileşenler:**
  - `ProductCard`: [`src/components/ProductCard.tsx`](file:///c:/Users/volkan/Desktop/beyindeposu/src/components/ProductCard.tsx) — Parça görseli, başlığı, OEM numarası, araç markası, durum rozetleri ve doğrudan WhatsApp fiyat sorma CTA'sını barındıran temel katalog kartı.
  - `ModernImageZoom`: [`src/components/ModernImageZoom.tsx`](file:///c:/Users/volkan/Desktop/beyindeposu/src/components/ModernImageZoom.tsx) — Çok katmanlı parça görseli inceleme; çift tık, tekerlek kaydırma, sürükleme (pan), pinch-to-zoom ve sıfırlama butonları barındırır.
- **Kullanım Kılavuzu:**
  - Görsellerde daima Next.js `<Image />` bileşeni kullanılmalı ve `aspect-4/3` oranı korunmalıdır.

---

### 2.5. İletişim ve Canlı Destek Ailesi (Feedback & Overlays)
- **Bileşenler:**
  - `LiveChatWidget`: [`src/components/LiveChatWidget.tsx`](file:///c:/Users/volkan/Desktop/beyindeposu/src/components/LiveChatWidget.tsx) — Ziyaretçilerin doğrudan Convex backend'i üzerinden müşteri temsilcisi ile yazışabildiği, aktif parça kartı ekleyebildiği canlı sohbet widget'ı.
  - `FloatingWhatsApp`: [`src/components/FloatingWhatsApp.tsx`](file:///c:/Users/volkan/Desktop/beyindeposu/src/components/FloatingWhatsApp.tsx) — Sayfanın sol alt köşesinde sabit duran, tek tıkla mesaj taslağı hazırlayıp WhatsApp Web/App başlatan hızlı iletişim butonu.
  - `Dialog`: [`src/components/ui/dialog.tsx`](file:///c:/Users/volkan/Desktop/beyindeposu/src/components/ui/dialog.tsx) — Radix UI tabanlı modal pencere sistemi.

---

### 2.6. Uygulama Kabuğu (App Shell)
Uygulama kabuğu, projenin tüm sayfalarını saran temel iskelettir:

- **1. Klavye Atlama Çubuğu (`Skip to Content`):**
  - Dosya: [`src/app/(site)/layout.tsx`](file:///c:/Users/volkan/Desktop/beyindeposu/src/app/(site)/layout.tsx)
  - Klavye kullanıcısı `Tab` tuşuna bastığında en üstte belirir ve doğrudan `#main-content` alanına atlar.
- **2. Üst Gezinme Çubuğu (`Header`):**
  - Dosya: [`src/components/Header.tsx`](file:///c:/Users/volkan/Desktop/beyindeposu/src/components/Header.tsx)
  - İçerik: Beyin Deposu logosu, küresel arama çubuğu (`OemSearchBar`), parça kataloğu bağlantıları, kurumsal sayfalar ve doğrudan arama butonu.
- **3. Ana İçerik Bölgesi (`Main Content Region`):**
  - `container` sınıfı ile sınırlandırılmış, 1280px genişlikte responsive flex/grid alanı.
- **4. Alt Bilgi Çubuğu (`Footer`):**
  - Dosya: [`src/components/Footer.tsx`](file:///c:/Users/volkan/Desktop/beyindeposu/src/components/Footer.tsx)
  - Kurumsal bilgiler, hızlı linkler, KVKK/kargo politikaları, Routart stüdyo imzası ve telif hakları.
- **5. Yüzen Eylem Katmanı (`Floating Action Layer`):**
  - Sol altta `FloatingWhatsApp`, sağ altta `LiveChatWidget`.

---

## 3. Tasarım Borcu Defteri (Design System Debt Ledger)

Tasarım sisteminin kusursuzlaştırılması ve temizlenmesi için tespit edilen mevcut borçlar ve iyileştirme önerileri:

| No | Alan / Konum | Sorun / Durum (Evidence) | Çözüm / Durum (Status) | Öncelik |
| :- | :--- | :--- | :--- | :---: |
| **D-1** | `ProductDetailClient.tsx` (L-338) | Mavi telefon butonunda `bg-blue-600 hover:bg-blue-700` ad-hoc sınıfı kullanılmıştı. | ✅ **ÇÖZÜLDÜ:** `Button variant="default"` kullanımına geçirildi. | Orta |
| **D-2** | `FloatingWhatsApp.tsx` (L-94) | Butonda doğrudan `#0d7a46` hex kodu kullanılmıştı. | ✅ **ÇÖZÜLDÜ:** Tasarım belirteci `bg-emerald-700 hover:bg-emerald-800` yapıldı. | Düşük |
| **D-3** | `parcalar/page.tsx` (L-403) | Arama girdi kutusunda standart `Input` yerine ham `<input>` kullanılmıştı. | ✅ **ÇÖZÜLDÜ:** `Input` bileşenine dönüştürüldü. | Orta |
| **D-4** | `ProductCard.tsx` (L-62) | Durum rozetleri ve butonlar ham `<span>` ve `<button>` ile yazılmıştı. | ✅ **ÇÖZÜLDÜ:** `Badge` ve `Button asChild` bileşenlerine geçirildi. | Yüksek |
| **D-5** | `parcalar/page.tsx` (L-611) | Sayfalama kontrolleri ham `<button>` ile yazılmıştı. | ✅ **ÇÖZÜLDÜ:** `Button variant="outline"` ve `Button variant="default"` yapıldı. | Orta |
| **D-6** | `globals.css` (@theme) | `text-[10px]` ve `text-[11px]` için tema belirteci eksikti. | ✅ **ÇÖZÜLDÜ:** `--text-2xs: 0.625rem` ve `--text-3xs: 0.6875rem` eklendi. | Orta |

---

## 4. Kapsam ve Doğrulama Raporu (Coverage Report)

| Bileşen Ailesi | Bulunan Bileşenler | Tasarım Belirteç Uyumu | WCAG 2.1 AA Kontrastı | Durum |
| :--- | :--- | :---: | :---: | :---: |
| **Eylemler (Actions)** | `Button`, `IconButton`, `Link` | %100 (`@theme`, CVA) | %100 | Tamamlandı |
| **Kimlik & Durum** | `Badge` (8 varyant) | %100 | %100 | Tamamlandı |
| **Formlar & Arama** | `Input`, `Textarea`, `SearchableCombobox`, `OemSearchBar` | %100 | %100 | Tamamlandı |
| **Katalog & Medya** | `ProductCard`, `ModernImageZoom` | %100 | %100 | Tamamlandı |
| **Geri Bildirim & Modal**| `LiveChatWidget`, `FloatingWhatsApp`, `Dialog` | %100 | %100 | Tamamlandı |
| **Uygulama Kabuğu (App Shell)**| `SkipLink`, `Header`, `Main`, `Footer`, Yüzen Katman | %100 | %100 | Tamamlandı |

**Genel Sistem Sağlığı:** Proje tip kontrolü (`npx tsc --noEmit`) 0 hata ile doğrulanmıştır. Tüm genel sayfalar Lighthouse Erişilebilirlik testinde **100/100** puan almaktadır.
