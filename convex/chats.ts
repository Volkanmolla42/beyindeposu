import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { Id } from "./_generated/dataModel";

// 1. Ziyaretçi Sohbetini Getir veya Başlat
export const getOrCreateConversation = mutation({
  args: {
    visitorId: v.string(),
    visitorName: v.optional(v.string()),
    visitorPhone: v.optional(v.string()),
    productCard: v.optional(
      v.object({
        title: v.string(),
        oemNumber: v.string(),
        image: v.optional(v.string()),
        slug: v.string(),
        brand: v.string(),
      })
    ),
    initialMessage: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("conversations")
      .withIndex("by_visitorId", (q) => q.eq("visitorId", args.visitorId))
      .first();

    const now = Date.now();

    if (existing) {
      // If conversation exists but visitor provides a name, phone, or product card update
      const updates: any = { updatedAt: now };
      if (args.visitorName) {
        updates.visitorName = args.visitorName;
      }
      if (args.visitorPhone) {
        updates.visitorPhone = args.visitorPhone;
      }
      if (args.productCard) {
        updates.productCard = args.productCard;
      }
      if (existing.status === "closed") {
        updates.status = "active";
      }

      await ctx.db.patch(existing._id, updates);

      // If initial message provided
      if (args.initialMessage) {
        await ctx.db.insert("messages", {
          conversationId: existing._id,
          sender: "visitor",
          text: args.initialMessage,
          productCard: args.productCard,
          isRead: false,
          createdAt: now,
        });

        await ctx.db.patch(existing._id, {
          lastMessage: args.initialMessage,
          lastMessageAt: now,
          unreadCountAdmin: (existing.unreadCountAdmin || 0) + 1,
        });
      }

      return existing._id;
    }

    // Create fresh conversation
    const newConvId = await ctx.db.insert("conversations", {
      visitorId: args.visitorId,
      visitorName: args.visitorName || "Misafir Ziyaretçi",
      visitorPhone: args.visitorPhone,
      status: "active",
      unreadCountAdmin: args.initialMessage ? 1 : 0,
      unreadCountVisitor: 0,
      lastMessage: args.initialMessage || "Sohbet başlatıldı.",
      lastMessageAt: now,
      productCard: args.productCard,
      createdAt: now,
      updatedAt: now,
    });

    // Post welcome system message
    await ctx.db.insert("messages", {
      conversationId: newConvId,
      sender: "system",
      text: "Beyindeposu Canlı Destek hattına hoş geldiniz! Uzman teknik ekibimiz en kısa sürede size yanıt verecektir.",
      isRead: true,
      createdAt: now,
    });

    // If product card is attached, post it as a message
    if (args.productCard) {
      await ctx.db.insert("messages", {
        conversationId: newConvId,
        sender: "visitor",
        text: `İncelenen Parça: ${args.productCard.title} (OEM: ${args.productCard.oemNumber})`,
        productCard: args.productCard,
        isRead: false,
        createdAt: now + 1,
      });
    }

    // If initial user message is provided
    if (args.initialMessage) {
      await ctx.db.insert("messages", {
        conversationId: newConvId,
        sender: "visitor",
        text: args.initialMessage,
        isRead: false,
        createdAt: now + 2,
      });
    }

    return newConvId;
  },
});

// 2. Ziyaretçi ID'sine göre aktif sohbeti bul
export const getActiveConversationByVisitor = query({
  args: { visitorId: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("conversations")
      .withIndex("by_visitorId", (q) => q.eq("visitorId", args.visitorId))
      .first();
  },
});

// 3. Tekil Sohbet Detayı
export const getConversation = query({
  args: { conversationId: v.id("conversations") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.conversationId);
  },
});

// 4. Admin İçin Tüm Sohbetler Listesi
export const listConversations = query({
  args: {
    status: v.optional(v.string()), // "active", "closed", "all"
    searchTerm: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    let convs = await ctx.db
      .query("conversations")
      .collect();

    // Sort by lastMessageAt descending
    convs.sort((a, b) => b.lastMessageAt - a.lastMessageAt);

    if (args.status && args.status !== "all") {
      convs = convs.filter((c) => c.status === args.status);
    }

    if (args.searchTerm && args.searchTerm.trim()) {
      const term = args.searchTerm.toLowerCase();
      convs = convs.filter(
        (c) =>
          (c.visitorName && c.visitorName.toLowerCase().includes(term)) ||
          (c.visitorPhone && c.visitorPhone.includes(term)) ||
          (c.lastMessage && c.lastMessage.toLowerCase().includes(term)) ||
          (c.productCard && c.productCard.oemNumber.toLowerCase().includes(term)) ||
          (c.productCard && c.productCard.title.toLowerCase().includes(term))
      );
    }

    return convs;
  },
});

// 5. Sohbetin Mesajlarını Gerçek Zamanlı Listele
export const getMessages = query({
  args: { conversationId: v.id("conversations") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("messages")
      .withIndex("by_conversationId", (q) => q.eq("conversationId", args.conversationId))
      .collect();
  },
});

// 6. Mesaj Gönder (Admin veya Ziyaretçi)
export const sendMessage = mutation({
  args: {
    conversationId: v.id("conversations"),
    sender: v.string(), // "visitor" | "admin"
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
  },
  handler: async (ctx, args) => {
    const conv = await ctx.db.get(args.conversationId);
    if (!conv) {
      throw new Error("Sohbet bulunamadı.");
    }

    const now = Date.now();

    // Insert new message
    const msgId = await ctx.db.insert("messages", {
      conversationId: args.conversationId,
      sender: args.sender,
      text: args.text,
      productCard: args.productCard,
      isRead: false,
      createdAt: now,
    });

    // Update conversation record
    const updates: any = {
      lastMessage: args.text,
      lastMessageAt: now,
      updatedAt: now,
    };

    // If conversation was closed, re-open on new message
    if (conv.status === "closed") {
      updates.status = "active";
    }

    if (args.sender === "visitor") {
      updates.unreadCountAdmin = (conv.unreadCountAdmin || 0) + 1;
    } else if (args.sender === "admin") {
      updates.unreadCountVisitor = (conv.unreadCountVisitor || 0) + 1;
    }

    await ctx.db.patch(args.conversationId, updates);

    return msgId;
  },
});

// 7. Mesajları Okundu Olarak İşaretle
export const markAsRead = mutation({
  args: {
    conversationId: v.id("conversations"),
    reader: v.string(), // "admin" | "visitor"
  },
  handler: async (ctx, args) => {
    const conv = await ctx.db.get(args.conversationId);
    if (!conv) return;

    if (args.reader === "admin") {
      await ctx.db.patch(args.conversationId, { unreadCountAdmin: 0 });
    } else if (args.reader === "visitor") {
      await ctx.db.patch(args.conversationId, { unreadCountVisitor: 0 });
    }

    // Mark unread messages
    const targetSender = args.reader === "admin" ? "visitor" : "admin";
    const unreadMsgs = await ctx.db
      .query("messages")
      .withIndex("by_conversationId", (q) => q.eq("conversationId", args.conversationId))
      .filter((q) => q.and(q.eq(q.field("sender"), targetSender), q.eq(q.field("isRead"), false)))
      .collect();

    for (const msg of unreadMsgs) {
      await ctx.db.patch(msg._id, { isRead: true });
    }
  },
});

// 8. Sohbeti Kapat
export const closeConversation = mutation({
  args: { conversationId: v.id("conversations") },
  handler: async (ctx, args) => {
    const now = Date.now();
    await ctx.db.patch(args.conversationId, {
      status: "closed",
      updatedAt: now,
    });

    await ctx.db.insert("messages", {
      conversationId: args.conversationId,
      sender: "system",
      text: "Bu canlı destek oturumu yetkili tarafından sonlandırılmıştır. Yeni bir konu için tekrar mesaj gönderebilirsiniz.",
      isRead: true,
      createdAt: now,
    });
  },
});

// 9. Sohbeti ve Mesajlarını Sil
export const deleteConversation = mutation({
  args: { conversationId: v.id("conversations") },
  handler: async (ctx, args) => {
    const msgs = await ctx.db
      .query("messages")
      .withIndex("by_conversationId", (q) => q.eq("conversationId", args.conversationId))
      .collect();

    for (const msg of msgs) {
      await ctx.db.delete(msg._id);
    }

    await ctx.db.delete(args.conversationId);
  },
});
