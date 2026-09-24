import { defineSchema, defineTable } from "convex/server";
import { authTables } from "@convex-dev/auth/server";
import { v } from "convex/values";

export default defineSchema({
  ...authTables,

  // 1. Kategoriler Tablosu
  categories: defineTable({
    name: v.string(), // Kategori Adı (Örn: Motor Beyinleri (ECU))
    slug: v.string(), // URL slug (Örn: motor-beyinleri-ecu)
    description: v.optional(v.string()),
    imageStorageId: v.optional(v.id("_storage")), // Convex Storage Dosya ID'si
    order: v.optional(v.number()),
    isActive: v.optional(v.boolean()),
    // SEO & Meta Alanları
    metaTitle: v.optional(v.string()),
    metaDescription: v.optional(v.string()),
    metaKeywords: v.optional(v.string()),
    createdAt: v.optional(v.number()),
    updatedAt: v.optional(v.number()),
  })
    .index("by_slug", ["slug"])
    .index("by_order", ["order"])
    .index("by_isActive", ["isActive"]),

  // 2. Araç Markaları Tablosu
  brands: defineTable({
    name: v.string(), // Marka Adı (Örn: Volkswagen, Mercedes-Benz)
    slug: v.string(), // URL slug (Örn: volkswagen)
    logoUrl: v.optional(v.string()),
    popular: v.boolean(),
    order: v.number(),
    isActive: v.optional(v.boolean()),
  })
    .index("by_slug", ["slug"])
    .index("by_popular", ["popular"])
    .index("by_order", ["order"]),

  // 3. Ürünler Tablosu (Tam Kapsamlı ve Temiz Oto Elektronik Şeması)
  products: defineTable({
    title: v.string(), // Ürün Başlığı (Örn: Renault Motor Beyni ECU Sagem S113717205D Orijinal Çıkma)
    slug: v.string(), // SEO Bağlantısı / URL slug (Örn: renault-sagem-s113717205d-motor-beyni-ecu)
    oemNumber: v.string(), // Parça No / OEM Kodu (Örn: S113717205D)
    shelfCode: v.optional(v.string()), // Depo Raf Kodu (Örn: RAF-B08)
    categoryId: v.id("categories"), // Kategori / Parça Türü (Foreign Key -> categories._id)
    brand: v.string(), // Araç Markası (Örn: Renault, Volkswagen, Mercedes-Benz)
    model: v.optional(v.string()), // Model / Yıl (Örn: Megane 2, Clio 3 veya Genel Uyumlu)
    condition: v.string(), // Durum ("Orijinal Çıkma", "Sıfır - Orijinal", "Revizyonlu")
    inStock: v.boolean(), // Stok Durumu: true / false
    description: v.string(), // Detaylı Ürün Açıklaması & Kullanım Alanları
    images: v.array(v.string()), // Ürün Görselleri (Çözümlenmiş URL'ler)
    imageStorageIds: v.optional(v.array(v.id("_storage"))), // Eski kayıtlarla uyumluluk; görüntüleme/yüklemede kullanılmaz

    // SEO & Meta Alanları
    metaTitle: v.optional(v.string()), // Meta Başlığı
    metaDescription: v.optional(v.string()), // Meta Açıklaması
    metaKeywords: v.optional(v.string()), // Meta Kelimeleri (virgülle ayrılmış)
    tags: v.optional(v.array(v.string())), // Ürün Etiketleri (Tags)

    // Kalite & İnceleme Kontrol Alanları
    needsReview: v.optional(v.boolean()), // Etiket silik/okunamadı veya şüpheli mi? (true/false)
    reviewReason: v.optional(v.string()), // İnceleme sebebi (Örn: "Etiket silik / parlamış", "OEM doğrulanamadı")
    // "web" kesin doğrulama değildir; aday kod admin incelemesine düşer.
    oemSource: v.optional(
      v.union(
        v.literal("image"),
        v.literal("web"),
        v.literal("manual"),
        v.literal("unresolved")
      )
    ),
    visibleOemNumber: v.optional(v.string()), // Görselde net veya kısmi görülen kod
    reviewCodes: v.optional(
      v.array(
        v.object({
          code: v.string(),
          kind: v.union(v.literal("oem_candidate"), v.literal("secondary_code")),
          source: v.optional(v.union(
            v.literal("image"),
            v.literal("web"),
            v.literal("manual"),
            v.literal("unresolved")
          )),
          confidence: v.optional(v.number()),
          evidence: v.optional(v.string()),
        })
      )
    ), // İncelemede kullanılacak muhtemel OEM ve üretici kodları

    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_slug", ["slug"])
    .index("by_oemNumber", ["oemNumber"])
    .index("by_shelfCode", ["shelfCode"])
    .index("by_categoryId", ["categoryId"])
    .index("by_brand", ["brand"])
    .index("by_inStock", ["inStock"])
    .index("by_needsReview", ["needsReview"]),

  // 4. Site Genel İletişim Ayarları
  siteSettings: defineTable({
    whatsappNumber: v.optional(v.string()),
    phone: v.optional(v.string()),
    email: v.optional(v.string()),
    workingHours: v.optional(v.string()),
    address: v.optional(v.string()),
  }),

  // 6. Canlı Destek Sohbet Oturumları (Live Support Conversations)
  conversations: defineTable({
    visitorId: v.string(), // Tarayıcı UUID
    visitorName: v.optional(v.string()), // Ziyaretçi Adı
    visitorPhone: v.optional(v.string()),
    status: v.string(), // "active", "closed"
    unreadCountAdmin: v.number(),
    unreadCountVisitor: v.number(),
    lastMessage: v.optional(v.string()),
    lastMessageAt: v.number(),
    productCard: v.optional(
      v.object({
        title: v.string(),
        oemNumber: v.string(),
        image: v.optional(v.string()),
        slug: v.string(),
        brand: v.string(),
      })
    ),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_visitorId", ["visitorId"])
    .index("by_status", ["status"])
    .index("by_lastMessageAt", ["lastMessageAt"]),

  // 7. Canlı Destek Mesajları (Live Support Messages)
  messages: defineTable({
    conversationId: v.id("conversations"),
    sender: v.string(), // "visitor" | "admin" | "system"
    text: v.string(),
    productCard: v.optional(
      v.object({
        title: v.string(),
        oemNumber: v.string(),
        image: v.optional(v.string()),
        slug: v.string(),
        brand: v.string(),
      })
    ),
    isRead: v.boolean(),
    createdAt: v.number(),
  })
    .index("by_conversationId", ["conversationId"])
    .index("by_createdAt", ["createdAt"]),
}, {
  schemaValidation: false, // Disables legacy document validation conflicts while maintaining 100% strict TypeScript types
});
