"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import {
  MessageSquare,
  Search,
  Send,
  User,
  ShoppingBag,
  CheckCheck,
  Phone,
  PowerOff,
  Headphones,
  Trash2,
  ExternalLink,
} from "lucide-react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { Id } from "../../../../convex/_generated/dataModel";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { playAdminNotificationSound } from "../admin-utils";

export default function AdminChatsPage() {
  const [selectedChatId, setSelectedChatId] = useState<Id<"conversations"> | null>(null);
  const [chatSearch, setChatSearch] = useState("");
  const [chatStatusFilter, setChatStatusFilter] = useState<string>("active");
  const [adminMessageInput, setAdminMessageInput] = useState("");
  const chatMessagesEndRef = useRef<HTMLDivElement>(null);
  const prevAdminMsgCountRef = useRef<number>(0);

  // Queries
  const conversations = useQuery(api.chats.listConversations, {
    status: chatStatusFilter === "all" ? undefined : chatStatusFilter,
    searchTerm: chatSearch || undefined,
  });

  const activeChatMessages = useQuery(
    api.chats.getMessages,
    selectedChatId ? { conversationId: selectedChatId } : "skip"
  );

  const selectedConversation = conversations?.find((c) => c._id === selectedChatId);

  // Mutations
  const sendChatMessage = useMutation(api.chats.sendMessage);
  const markChatAsRead = useMutation(api.chats.markAsRead);
  const closeChatMutation = useMutation(api.chats.closeConversation);
  const deleteChatMutation = useMutation(api.chats.deleteConversation);

  // Auto select first chat if none selected
  useEffect(() => {
    if (conversations && conversations.length > 0 && !selectedChatId) {
      setSelectedChatId(conversations[0]._id);
    }
  }, [conversations, selectedChatId]);

  // Mark chat as read by admin when opened
  useEffect(() => {
    if (selectedChatId) {
      markChatAsRead({ conversationId: selectedChatId, reader: "admin" });
    }
  }, [selectedChatId, activeChatMessages?.length, markChatAsRead]);

  // Auto-scroll chat to bottom
  useEffect(() => {
    if (activeChatMessages) {
      chatMessagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [activeChatMessages]);

  // Audio chime on new incoming message from visitor
  useEffect(() => {
    if (activeChatMessages && activeChatMessages.length > 0) {
      const lastMsg = activeChatMessages[activeChatMessages.length - 1];
      if (
        activeChatMessages.length > prevAdminMsgCountRef.current &&
        lastMsg.sender === "visitor"
      ) {
        playAdminNotificationSound();
      }
      prevAdminMsgCountRef.current = activeChatMessages.length;
    }
  }, [activeChatMessages]);

  const handleSendAdminMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!adminMessageInput.trim() || !selectedChatId) return;

    const textToSend = adminMessageInput.trim();
    setAdminMessageInput("");

    try {
      await sendChatMessage({
        conversationId: selectedChatId,
        sender: "admin",
        text: textToSend,
      });
    } catch (err) {
      console.error("Admin mesajı gönderilemedi:", err);
      setAdminMessageInput(textToSend);
    }
  };

  const handleCloseChat = async (id: Id<"conversations">) => {
    if (confirm("Bu canlı destek sohbetini sonlandırmak istediğinizden emin misiniz?")) {
      await closeChatMutation({ conversationId: id });
    }
  };

  const handleDeleteChat = async (id: Id<"conversations">) => {
    if (confirm("Bu sohbet kaydını kalıcı olarak silmek istediğinizden emin misiniz?")) {
      await deleteChatMutation({ conversationId: id });
      if (selectedChatId === id) {
        setSelectedChatId(null);
      }
    }
  };



  return (
    <div className="space-y-4">
      {/* Main Split Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 h-[calc(100vh-14rem)] min-h-[560px]">
        {/* Left List of Conversations */}
        <div className="lg:col-span-4 bg-white rounded-xl border border-slate-200 flex flex-col overflow-hidden shadow-xs">
          {/* Tabs & Search */}
          <div className="p-3 border-b border-slate-200 space-y-2 bg-slate-50/50">
            <div className="flex items-center gap-1 p-0.5 bg-slate-200/70 rounded-lg text-xs">
              <button
                onClick={() => setChatStatusFilter("active")}
                className={`flex-1 py-1 font-semibold rounded-md transition-colors cursor-pointer ${chatStatusFilter === "active"
                  ? "bg-white text-slate-900 shadow-xs"
                  : "text-slate-600 hover:text-slate-900"
                  }`}
              >
                Aktif
              </button>
              <button
                onClick={() => setChatStatusFilter("closed")}
                className={`flex-1 py-1 font-semibold rounded-md transition-colors cursor-pointer ${chatStatusFilter === "closed"
                  ? "bg-white text-slate-900 shadow-xs"
                  : "text-slate-600 hover:text-slate-900"
                  }`}
              >
                Kapananlar
              </button>
              <button
                onClick={() => setChatStatusFilter("all")}
                className={`flex-1 py-1 font-semibold rounded-md transition-colors cursor-pointer ${chatStatusFilter === "all"
                  ? "bg-white text-slate-900 shadow-xs"
                  : "text-slate-600 hover:text-slate-900"
                  }`}
              >
                Tümü
              </button>
            </div>

            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400" />
              <Input
                placeholder="Ziyaretçi adı veya telefon ara..."
                value={chatSearch}
                onChange={(e) => setChatSearch(e.target.value)}
                className="pl-8 bg-white border-slate-200 text-slate-900 text-xs h-8 rounded-md"
              />
            </div>
          </div>

          {/* List Scroll */}
          <div className="flex-1 overflow-y-auto divide-y divide-slate-100">
            {conversations && conversations.length > 0 ? (
              conversations.map((conv) => {
                const isSelected = conv._id === selectedChatId;
                const timeStr = new Date(conv.lastMessageAt || conv._creationTime).toLocaleTimeString("tr-TR", {
                  hour: "2-digit",
                  minute: "2-digit",
                });

                return (
                  <div
                    key={conv._id}
                    onClick={() => setSelectedChatId(conv._id)}
                    className={`p-3 cursor-pointer transition-colors flex items-start gap-3 hover:bg-slate-50 ${isSelected ? "bg-blue-50/70 border-l-4 border-blue-600" : ""
                      }`}
                  >
                    <div className="relative shrink-0 mt-0.5">
                      <div className="w-8 h-8 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-700 font-bold text-xs">
                        {conv.visitorName ? conv.visitorName.slice(0, 2).toUpperCase() : <User className="w-3.5 h-3.5" />}
                      </div>
                      {conv.status === "active" && (
                        <span className="absolute bottom-0 right-0 w-2 h-2 rounded-full bg-emerald-500 ring-2 ring-white" />
                      )}
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-1 mb-0.5">
                        <h4 className="font-semibold text-xs text-slate-900 truncate">
                          {conv.visitorName || "Ziyaretçi"}
                        </h4>
                        <span className="text-[10px] text-slate-400 font-mono shrink-0">
                          {timeStr}
                        </span>
                      </div>

                      <p className="text-[11px] text-slate-500 truncate">
                        {conv.lastMessage || (conv.productCard ? `[Parça Sorusu: ${conv.productCard.oemNumber}]` : "Sohbet başladı")}
                      </p>

                      {conv.visitorPhone && (
                        <div className="flex items-center gap-1 text-[10px] text-slate-400 font-mono mt-0.5">
                          <Phone className="w-2.5 h-2.5 text-slate-400" />
                          <span>{conv.visitorPhone}</span>
                        </div>
                      )}
                    </div>

                    {conv.unreadCountAdmin > 0 && (
                      <span className="px-1.5 py-0.5 rounded-full bg-blue-600 text-white font-bold text-[10px] shrink-0">
                        {conv.unreadCountAdmin}
                      </span>
                    )}
                  </div>
                );
              })
            ) : (
              <div className="p-8 text-center space-y-1.5 text-slate-400 text-xs">
                <MessageSquare className="w-6 h-6 text-slate-300 mx-auto" />
                <p>Mesaj bulunamadı.</p>
              </div>
            )}
          </div>
        </div>

        {/* Right Active Chat Box */}
        <div className="lg:col-span-8 bg-white rounded-xl border border-slate-200 flex flex-col overflow-hidden shadow-xs">
          {selectedConversation ? (
            <>
              {/* Header */}
              <div className="p-3.5 border-b border-slate-200 bg-slate-50/60 flex items-center justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-9 h-9 rounded-full bg-slate-200 flex items-center justify-center text-slate-700 font-bold text-xs shrink-0">
                    {selectedConversation.visitorName
                      ? selectedConversation.visitorName.slice(0, 2).toUpperCase()
                      : <User className="w-4 h-4" />}
                  </div>

                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-bold text-xs sm:text-sm text-slate-900 truncate">
                        {selectedConversation.visitorName || "İsimsiz Ziyaretçi"}
                      </h3>
                      <span
                        className={`text-[10px] font-semibold px-2 py-0.5 rounded ${selectedConversation.status === "active"
                          ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                          : "bg-slate-100 text-slate-600"
                          }`}
                      >
                        {selectedConversation.status === "active" ? "Aktif" : "Kapatıldı"}
                      </span>
                    </div>

                    {selectedConversation.visitorPhone && (
                      <a
                        href={`tel:${selectedConversation.visitorPhone}`}
                        className="text-xs text-blue-600 hover:underline flex items-center gap-1 font-mono mt-0.5"
                      >
                        <Phone className="w-3 h-3" />
                        <span>{selectedConversation.visitorPhone}</span>
                      </a>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-1.5">
                  {selectedConversation.status === "active" && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleCloseChat(selectedConversation._id)}
                      className="border-slate-200 hover:bg-slate-100 text-slate-700 text-xs font-medium h-7 gap-1"
                    >
                      <PowerOff className="w-3 h-3 text-slate-500" />
                      <span>Kapat</span>
                    </Button>
                  )}

                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleDeleteChat(selectedConversation._id)}
                    className="border-slate-200 hover:bg-red-50 text-red-600 text-xs font-medium h-7 p-1.5"
                    title="Sil"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </div>

              {/* Product Inquiry Context */}
              {selectedConversation.productCard && (
                <div className="p-3 bg-slate-50 border-b border-slate-200 flex items-center gap-3">
                  <div className="w-10 h-10 rounded-md bg-white border border-slate-200 overflow-hidden flex items-center justify-center p-1 shrink-0">
                    {selectedConversation.productCard.image ? (
                      <img
                        src={selectedConversation.productCard.image}
                        alt="Product Inquiry"
                        className="w-full h-full object-contain"
                      />
                    ) : (
                      <ShoppingBag className="w-4 h-4 text-slate-400" />
                    )}
                  </div>
                  <div className="min-w-0 flex-1 text-xs">
                    <span className="text-[10px] text-slate-500 font-semibold uppercase block">
                      Danışılan Parça:
                    </span>
                    <div className="font-semibold text-slate-900 truncate">
                      {selectedConversation.productCard.title}
                    </div>
                    <span className="font-mono text-[11px] text-slate-600 font-medium">
                      OEM: {selectedConversation.productCard.oemNumber}
                    </span>
                  </div>
                  <Link
                    href={`/urunler/${selectedConversation.productCard.slug}`}
                    target="_blank"
                    className="p-1.5 bg-white hover:bg-slate-100 text-slate-700 rounded-md text-xs font-medium shrink-0 flex items-center gap-1 border border-slate-200"
                  >
                    <span>Ürünü Gör</span>
                    <ExternalLink className="w-3 h-3 text-slate-400" />
                  </Link>
                </div>
              )}

              {/* Messages Body */}
              <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-slate-50/40">
                {activeChatMessages && activeChatMessages.length > 0 ? (
                  activeChatMessages.map((msg) => {
                    const isAdmin = msg.sender === "admin";
                    const timeStr = new Date(msg.createdAt).toLocaleTimeString("tr-TR", {
                      hour: "2-digit",
                      minute: "2-digit",
                    });

                    return (
                      <div
                        key={msg._id}
                        className={`flex flex-col ${isAdmin ? "items-end" : "items-start"}`}
                      >
                        <div
                          className={`max-w-md px-3.5 py-2 rounded-xl text-xs leading-relaxed ${isAdmin
                            ? "bg-blue-600 text-white rounded-br-xs shadow-xs"
                            : "bg-white text-slate-900 rounded-bl-xs border border-slate-200 shadow-xs"
                            }`}
                        >
                          <p className="whitespace-pre-wrap">{msg.text}</p>
                        </div>
                        <div className="flex items-center gap-1 text-[10px] text-slate-400 font-mono mt-1 px-1">
                          <span>{timeStr}</span>
                          {isAdmin && (
                            <CheckCheck className="w-3 h-3 text-blue-500" />
                          )}
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div className="text-center py-12 text-slate-400 text-xs">
                    Henüz mesaj bulunmuyor.
                  </div>
                )}
                <div ref={chatMessagesEndRef} />
              </div>

              {/* Message Input Box */}
              <form
                onSubmit={handleSendAdminMessage}
                className="p-3 border-t border-slate-200 bg-white flex items-center gap-2"
              >
                <Input
                  placeholder="Müşteriye yanıt yazın..."
                  value={adminMessageInput}
                  onChange={(e) => setAdminMessageInput(e.target.value)}
                  className="bg-white border-slate-200 text-slate-900 text-xs h-9 rounded-lg"
                  autoFocus
                />
                <Button
                  type="submit"
                  disabled={!adminMessageInput.trim()}
                  className="bg-blue-600 hover:bg-blue-700 text-white h-9 px-4 rounded-lg cursor-pointer shrink-0"
                >
                  <Send className="w-4 h-4" />
                </Button>
              </form>
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center p-8 text-center space-y-2 text-slate-400">
              <Headphones className="w-10 h-10 text-slate-300" />
              <h4 className="font-semibold text-slate-700 text-sm">Görüşme Seçilmedi</h4>
              <p className="text-xs max-w-sm">
                Sol panelden bir sohbet seçerek müşterinin mesajlarını görüntüleyin.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
