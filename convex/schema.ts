import { defineSchema, defineTable } from "convex/server";
import { authTables } from "@convex-dev/auth/server";
import { v } from "convex/values";
import { analyticsEvent, breakdownKind, deviceValidator, metricsValidator } from "./analyticsModel";

export default defineSchema({
  ...authTables,

  analyticsTotals: defineTable({ bucket: v.string(), metrics: metricsValidator, expiresAt: v.number() })
    .index("by_bucket", ["bucket"])
    .index("by_expiresAt", ["expiresAt"]),
  analyticsBreakdowns: defineTable({ bucket: v.string(), kind: breakdownKind, key: v.string(), count: v.number(), expiresAt: v.number() })
    .index("by_bucket_and_kind_and_key", ["bucket", "kind", "key"])
    .index("by_bucket_and_kind_and_count", ["bucket", "kind", "count"])
    .index("by_expiresAt", ["expiresAt"]),
  analyticsVisitors: defineTable({ bucket: v.string(), visitorId: v.string(), expiresAt: v.number() })
    .index("by_bucket_and_visitorId", ["bucket", "visitorId"])
    .index("by_visitorId", ["visitorId"])
    .index("by_expiresAt", ["expiresAt"]),
  analyticsSessions: defineTable({ sessionId: v.string(), visitorId: v.string(), consentVersion: v.string(), consentAt: v.number(), startedAt: v.number(), lastAt: v.number(), entryPath: v.string(), lastPath: v.string(), device: deviceValidator, source: v.string(), pageViews: v.number(), events: v.number(), activeMs: v.number(), rateWindow: v.number(), rateCount: v.number(), expiresAt: v.number() })
    .index("by_sessionId", ["sessionId"])
    .index("by_visitorId", ["visitorId"])
    .index("by_startedAt", ["startedAt"])
    .index("by_expiresAt", ["expiresAt"]),
  analyticsEvents: defineTable({ sessionId: v.string(), visitorId: v.string(), at: v.number(), event: analyticsEvent, expiresAt: v.number() })
    .index("by_sessionId_and_at", ["sessionId", "at"])
    .index("by_visitorId_and_eventId", ["visitorId", "event.id"])
    .index("by_visitorId", ["visitorId"])
    .index("by_expiresAt", ["expiresAt"]),
  analyticsErasure: defineTable({ visitorId: v.string(), expiresAt: v.number() })
    .index("by_visitorId", ["visitorId"])
    .index("by_expiresAt", ["expiresAt"]),

  // 1. Kategoriler Tablosu
  categories: defineTable({
    name: v.string(), // Kategori Adı (Örn: Motor Beyinleri (ECU))
    slug: v.string(), // URL slug (Örn: motor-beyinleri-ecu)
    description: v.optional(v.string()), // Convex Storage Dosya ID'si
    imageUrl: v.optional(v.string()), // Yerel veya harici görsel URL'i (/images/cat-*.jpg)
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

  // 3. Parçalar Tablosu (Tam Kapsamlı ve Temiz Oto Elektronik Şeması)
  products: defineTable({
    title: v.string(), // Parça Başlığı (Örn: Renault Motor Beyni ECU S113717205D Orijinal Çıkma)
    slug: v.string(), // SEO Bağlantısı / URL slug (Örn: renault-motor-beyni-ecu-s113717205d)
    oemNumber: v.string(), // Parça No / OEM Kodu (Örn: S113717205D)
    shelfCode: v.optional(v.string()), // Depo Raf Kodu (Örn: RAF-B08)
    categoryId: v.optional(v.id("categories")), // Taslaklarda henüz kategori belirlenmemiş olabilir.
    brand: v.string(), // Araç Markası (Örn: Renault, Volkswagen, Mercedes-Benz)
    model: v.optional(v.string()), // Model / Yıl (Örn: Megane 2, Clio 3 veya Genel Uyumlu)
    condition: v.string(), // Durum ("Orijinal Çıkma", "Sıfır - Orijinal", "Revizyonlu")
    inStock: v.boolean(), // Stok Durumu: true / false
    description: v.string(), // Detaylı Parça Açıklaması & Kullanım Alanları
    images: v.array(v.string()), // Parça Görselleri (Çözümlenmiş URL'ler) // Eski kayıtlarla uyumluluk; görüntüleme/yüklemede kullanılmaz

    // SEO & Meta Alanları
    metaTitle: v.optional(v.string()), // Meta Başlığı
    metaDescription: v.optional(v.string()), // Meta Açıklaması
    metaKeywords: v.optional(v.string()), // Meta Kelimeleri (virgülle ayrılmış)
    tags: v.optional(v.array(v.string())), // Parça Etiketleri (Tags)

    isDraft: v.optional(v.boolean()),

    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_slug", ["slug"])
    .index("by_oemNumber", ["oemNumber"])
    .index("by_shelfCode", ["shelfCode"])
    .index("by_categoryId", ["categoryId"])
    .index("by_brand", ["brand"])
    .index("by_inStock", ["inStock"])
    .index("by_createdAt", ["createdAt"])
    .index("by_title", ["title"])
    .index("by_categoryId_and_createdAt", ["categoryId", "createdAt"])
    .index("by_categoryId_and_title", ["categoryId", "title"])
    .index("by_categoryId_and_oemNumber", ["categoryId", "oemNumber"])
    .index("by_brand_and_createdAt", ["brand", "createdAt"])
    .index("by_brand_and_title", ["brand", "title"])
    .index("by_brand_and_oemNumber", ["brand", "oemNumber"])
    .searchIndex("search_title", {
      searchField: "title",
      filterFields: ["brand", "categoryId", "condition", "inStock"],
    })
    .searchIndex("search_oemNumber", {
      searchField: "oemNumber",
      filterFields: ["brand", "categoryId", "condition", "inStock"],
    })
    .searchIndex("search_shelfCode", {
      searchField: "shelfCode",
      filterFields: ["brand", "categoryId", "condition", "inStock"],
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

  // 8. Sistem Sayaçları ve İstatistikleri (Hızlı O(1) okuma)
  stats: defineTable({
    key: v.string(), // "products"
    total: v.number(),
    published: v.number(),
    drafts: v.number(),
    outOfStock: v.optional(v.number()),
  }).index("by_key", ["key"]),
}, {
  schemaValidation: false, // Disables legacy document validation conflicts while maintaining 100% strict TypeScript types
});
