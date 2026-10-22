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

  categories: defineTable({
    name: v.string(),
    slug: v.string(),
    description: v.optional(v.string()),
    imageUrl: v.optional(v.string()),
    order: v.optional(v.number()),
    isActive: v.optional(v.boolean()),
    metaTitle: v.optional(v.string()),
    metaDescription: v.optional(v.string()),
    metaKeywords: v.optional(v.string()),
    createdAt: v.optional(v.number()),
    updatedAt: v.optional(v.number()),
  })
    .index("by_slug", ["slug"])
    .index("by_order", ["order"])
    .index("by_isActive", ["isActive"]),

  brands: defineTable({
    name: v.string(),
    slug: v.string(),
    logoUrl: v.optional(v.string()),
    popular: v.boolean(),
    order: v.number(),
    isActive: v.optional(v.boolean()),
  })
    .index("by_slug", ["slug"])
    .index("by_popular", ["popular"])
    .index("by_order", ["order"]),

  products: defineTable({
    title: v.string(),
    slug: v.string(),
    oemNumber: v.string(),
    shelfCode: v.optional(v.string()),
    categoryId: v.optional(v.id("categories")),
    brand: v.string(),
    model: v.optional(v.string()),
    condition: v.string(),
    inStock: v.boolean(),
    description: v.string(),
    images: v.array(v.string()),
    metaTitle: v.optional(v.string()),
    metaDescription: v.optional(v.string()),
    metaKeywords: v.optional(v.string()),
    tags: v.optional(v.array(v.string())),
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
    .index("by_brand_and_model_and_createdAt", ["brand", "model", "createdAt"])
    .searchIndex("search_title", {
      searchField: "title",
      filterFields: ["brand", "model", "categoryId", "condition", "inStock"],
    })
    .searchIndex("search_oemNumber", {
      searchField: "oemNumber",
      filterFields: ["brand", "model", "categoryId", "condition", "inStock"],
    })
    .searchIndex("search_shelfCode", {
      searchField: "shelfCode",
      filterFields: ["brand", "model", "categoryId", "condition", "inStock"],
    }),

  conversations: defineTable({
    visitorId: v.string(),
    visitorName: v.optional(v.string()),
    visitorPhone: v.optional(v.string()),
    status: v.string(),
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

  messages: defineTable({
    conversationId: v.id("conversations"),
    sender: v.string(),
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

  stats: defineTable({
    key: v.string(),
    total: v.number(),
    published: v.number(),
    drafts: v.number(),
    outOfStock: v.optional(v.number()),
  }).index("by_key", ["key"]),

  siteSettings: defineTable({
    key: v.string(),
    phoneNumber: v.string(),
    email: v.string(),
    address: v.string(),
    city: v.optional(v.string()),
    district: v.optional(v.string()),
    postalCode: v.optional(v.string()),
    workingHours: v.string(),
    updatedAt: v.optional(v.number()),
  }).index("by_key", ["key"]),

  faultCodes: defineTable({
    code: v.string(),
    title: v.string(),
    description: v.optional(v.string()),
    isPopular: v.optional(v.boolean()),
  })
    .index("by_code", ["code"])
    .searchIndex("search_code", {
      searchField: "code",
    })
    .searchIndex("search_title", {
      searchField: "title",
    }),

  blogs: defineTable({
    title: v.string(),
    slug: v.string(),
    excerpt: v.string(),
    content: v.string(),
    coverImageStorageId: v.id("_storage"),
    category: v.string(),
    isPublished: v.boolean(),
    tags: v.optional(v.array(v.string())),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_slug", ["slug"])
    .index("by_isPublished", ["isPublished"])
    .index("by_published_category", ["isPublished", "category"]),

  blogCategories: defineTable({
    title: v.string(),
    createdAt: v.optional(v.number()),
  }).index("by_title", ["title"]),

  services: defineTable({
    title: v.string(),
    slug: v.string(),
    shortDesc: v.string(),
    fullDesc: v.string(),
    imageStorageId: v.id("_storage"),
    videoUrl: v.optional(v.string()),
    features: v.array(v.string()),
    order: v.number(),
    isActive: v.boolean(),
    updatedAt: v.number(),
  })
    .index("by_slug", ["slug"])
    .index("by_isActive_and_order", ["isActive", "order"]),
});
