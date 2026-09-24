"use client";

import { useState, useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import {
  MessageSquare,
  X,
  Send,
  Minimize2,
  Headphones,
  Check,
  CheckCheck,
  Sparkles,
  ExternalLink,
  ChevronDown,
  User,
  ShoppingBag,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Id } from "../../convex/_generated/dataModel";

// Play subtle web audio notification chime
function playNotificationSound() {
  try {
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "sine";
    osc.frequency.setValueAtTime(587.33, ctx.currentTime); // D5
    osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.12); // A5
    gain.gain.setValueAtTime(0.15, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.25);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.25);
  } catch (e) {
    // Audio context may be restricted before user gesture
  }
}

export default function LiveChatWidget() {
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);
  const [visitorId, setVisitorId] = useState<string>("");
  const [visitorName, setVisitorName] = useState<string>("");
  const [visitorPhone, setVisitorPhone] = useState<string>("");
  const [includeProduct, setIncludeProduct] = useState<boolean>(true);
  const [inputMessage, setInputMessage] = useState("");
  const [isStarting, setIsStarting] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const prevMsgCountRef = useRef<number>(0);

  // Initialize persistent visitor ID
  useEffect(() => {
    let vid = localStorage.getItem("beyindeposu_visitor_id");
    if (!vid) {
      vid = "vis_" + Math.random().toString(36).substring(2, 11) + Date.now().toString(36);
      localStorage.setItem("beyindeposu_visitor_id", vid);
    }
    setVisitorId(vid);

    const savedName = localStorage.getItem("beyindeposu_visitor_name");
    if (savedName) setVisitorName(savedName);

    const savedPhone = localStorage.getItem("beyindeposu_visitor_phone");
    if (savedPhone) setVisitorPhone(savedPhone);
  }, []);

  // Product page detection
  const isProductPage = pathname?.startsWith("/urunler/") && pathname !== "/urunler";
  const productSlug = isProductPage ? pathname.replace("/urunler/", "") : null;
  const currentProduct = useQuery(
    api.products.getBySlug,
    productSlug ? { slug: productSlug } : "skip"
  );

  // Live queries & mutations
  const activeConversation = useQuery(
    api.chats.getActiveConversationByVisitor,
    visitorId ? { visitorId } : "skip"
  );

  const conversationId = activeConversation?._id;

  const messages = useQuery(
    api.chats.getMessages,
    conversationId ? { conversationId } : "skip"
  );

  const getOrCreateConversation = useMutation(api.chats.getOrCreateConversation);
  const sendMessageMutation = useMutation(api.chats.sendMessage);
  const markAsReadMutation = useMutation(api.chats.markAsRead);

  // Auto scroll to bottom & sound alert on new admin message
  useEffect(() => {
    if (messages && messages.length > 0) {
      if (messages.length > prevMsgCountRef.current) {
        const lastMsg = messages[messages.length - 1];
        if (lastMsg.sender === "admin") {
          playNotificationSound();
        }
      }
      prevMsgCountRef.current = messages.length;
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages]);

  // Mark messages as read when widget is opened
  useEffect(() => {
    if (isOpen && conversationId && activeConversation?.unreadCountVisitor) {
      markAsReadMutation({ conversationId, reader: "visitor" });
    }
  }, [isOpen, conversationId, activeConversation?.unreadCountVisitor, markAsReadMutation]);

  // Handle start chat
  const handleStartChat = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!visitorId) return;

    setIsStarting(true);
    if (visitorName.trim()) {
      localStorage.setItem("beyindeposu_visitor_name", visitorName.trim());
    }
    if (visitorPhone.trim()) {
      localStorage.setItem("beyindeposu_visitor_phone", visitorPhone.trim());
    }

    let productCardPayload = undefined;
    if (isProductPage && currentProduct && includeProduct) {
      productCardPayload = {
        title: currentProduct.title,
        oemNumber: currentProduct.oemNumber,
        image: currentProduct.images?.[0] || undefined,
        slug: currentProduct.slug,
        brand: currentProduct.brand,
      };
    }

    try {
      await getOrCreateConversation({
        visitorId,
        visitorName: visitorName.trim() || undefined,
        visitorPhone: visitorPhone.trim() || undefined,
        productCard: productCardPayload,
        initialMessage: inputMessage.trim() || undefined,
      });

      setInputMessage("");
    } catch (err) {
      console.error("Start chat error:", err);
    } finally {
      setIsStarting(false);
    }
  };

  // Handle send message
  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputMessage.trim() || !conversationId) return;

    const text = inputMessage.trim();
    setInputMessage("");

    try {
      await sendMessageMutation({
        conversationId,
        sender: "visitor",
        text,
      });
    } catch (err) {
      console.error("Send message error:", err);
    }
  };

  const unreadCount = activeConversation?.unreadCountVisitor || 0;

  // Hide on admin panel and login pages
  if (pathname?.startsWith("/admin") || pathname === "/login") {
    return null;
  }

  return (
    <div className="fixed bottom-5 right-5 z-50 flex flex-col items-end">
      {/* Floating Chat Trigger Button (when closed) */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="group relative flex items-center gap-3 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-bold px-4 py-3.5 rounded-full shadow-2xl hover:shadow-blue-500/30 transition-all duration-300 transform hover:-translate-y-0.5 cursor-pointer"
          aria-label="Canlı Destek"
        >
          {/* Pulsing online badge */}
          <span className="relative flex h-3.5 w-3.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-emerald-500 border-2 border-white"></span>
          </span>

          <div className="flex items-center gap-2">
            <Headphones className="w-5 h-5" />
            <span className="text-sm tracking-tight font-extrabold hidden sm:inline">Canlı Destek</span>
          </div>

          {unreadCount > 0 && (
            <span className="absolute -top-1.5 -right-1.5 bg-red-600 text-white text-[11px] font-black w-6 h-6 rounded-full flex items-center justify-center border-2 border-white animate-bounce shadow-md">
              {unreadCount}
            </span>
          )}
        </button>
      )}

      {/* Expanded Live Chat Window */}
      {isOpen && (
        <div className="w-[360px] sm:w-[390px] h-[520px] max-h-[85vh] bg-white rounded-3xl shadow-2xl border border-slate-200/80 flex flex-col overflow-hidden animate-in fade-in slide-in-from-bottom-5 duration-200">
          {/* Header */}
          <div className="bg-slate-900 text-white px-4 py-3.5 flex items-center justify-between shadow-md select-none">
            <div className="flex items-center gap-3">
              <div className="relative">
                <div className="w-10 h-10 rounded-full bg-blue-600 flex items-center justify-center text-white font-bold shadow-inner">
                  <Headphones className="w-5 h-5" />
                </div>
                <span className="absolute bottom-0 right-0 w-3 h-3 rounded-full bg-emerald-500 border-2 border-slate-900"></span>
              </div>
              <div>
                <h4 className="font-black text-sm text-white flex items-center gap-1.5">
                  <span>Beyin Deposu Canlı Destek</span>
                  <Badge variant="secondary" className="bg-blue-500/20 text-blue-300 border-none text-[9px] py-0 px-1.5 font-bold">
                    Çevrimiçi
                  </Badge>
                </h4>
                <p className="text-[11px] text-slate-400">Teknik uzmanlarımız çevrimiçi</p>
              </div>
            </div>

            <button
              onClick={() => setIsOpen(false)}
              className="w-8 h-8 rounded-full hover:bg-slate-800 flex items-center justify-center text-slate-400 hover:text-white transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Body: State 1 - Start Conversation Form */}
          {!conversationId ? (
            <div className="flex-1 p-5 flex flex-col justify-between overflow-y-auto bg-slate-50/50">
              <div className="space-y-4">
                <div className="p-3.5 bg-blue-50/80 border border-blue-100 rounded-2xl text-xs text-slate-700 leading-relaxed">
                  👋 <strong>Merhaba!</strong> Aradığınız parça, OEM uyumluluğu veya teknik detaylar hakkında uzman ekibimizle anında konuşabilirsiniz.
                </div>

                {/* Product Detection Banner */}
                {isProductPage && currentProduct && (
                  <div className="p-3 bg-white border border-slate-200 rounded-2xl shadow-xs space-y-2">
                    <div className="flex items-center gap-2 text-xs font-bold text-slate-800">
                      <ShoppingBag className="w-4 h-4 text-blue-600" />
                      <span>İncelediğiniz Parça</span>
                    </div>

                    <div className="flex items-center gap-2.5 bg-slate-50 p-2 rounded-xl border border-slate-100">
                      <div className="w-10 h-10 rounded-lg bg-white border border-slate-200 overflow-hidden flex items-center justify-center shrink-0">
                        {currentProduct.images?.[0] ? (
                          <img src={currentProduct.images[0]} alt={currentProduct.title} className="w-full h-full object-contain" />
                        ) : (
                          <ShoppingBag className="w-4 h-4 text-slate-400" />
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-[11px] font-bold text-slate-900 truncate">{currentProduct.title}</p>
                        <p className="text-[10px] font-mono text-blue-600 font-semibold">{currentProduct.oemNumber}</p>
                      </div>
                    </div>

                    <label className="flex items-center gap-2 text-[11px] font-semibold text-slate-700 cursor-pointer pt-0.5">
                      <input
                        type="checkbox"
                        checked={includeProduct}
                        onChange={(e) => setIncludeProduct(e.target.checked)}
                        className="rounded text-blue-600 w-3.5 h-3.5"
                      />
                      <span>Bu parçayı sohbete kart olarak ekle</span>
                    </label>
                  </div>
                )}

                <form id="start-chat-form" onSubmit={handleStartChat} className="space-y-3">
                  <div>
                    <label className="text-[11px] font-bold text-slate-700 block mb-1">
                      Adınız Soyadınız <span className="text-slate-400 font-normal">(İsteğe bağlı)</span>
                    </label>
                    <Input
                      placeholder="Örn: Ahmet Yılmaz"
                      value={visitorName}
                      onChange={(e) => setVisitorName(e.target.value)}
                      className="bg-white text-xs h-9"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] font-bold text-slate-700 block mb-1">
                      Telefon Numaranız <span className="text-emerald-600 font-normal">(WhatsApp ile devam edebilmek için)</span>
                    </label>
                    <Input
                      type="tel"
                      placeholder="Örn: 0534 000 00 00"
                      value={visitorPhone}
                      onChange={(e) => setVisitorPhone(e.target.value)}
                      className="bg-white text-xs h-9"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] font-bold text-slate-700 block mb-1">
                      İlk Mesajınız <span className="text-slate-400 font-normal">(İsteğe bağlı)</span>
                    </label>
                    <Input
                      placeholder="Merhaba, parça hakkında bilgi almak istiyorum..."
                      value={inputMessage}
                      onChange={(e) => setInputMessage(e.target.value)}
                      className="bg-white text-xs h-9"
                    />
                  </div>
                </form>
              </div>

              <div className="pt-4">
                <Button
                  form="start-chat-form"
                  type="submit"
                  disabled={isStarting}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-xs h-10 rounded-xl shadow-md shadow-blue-600/20 cursor-pointer"
                >
                  {isStarting ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      <span>Sohbet Başlatılıyor...</span>
                    </>
                  ) : (
                    <span>Sohbeti Başlat</span>
                  )}
                </Button>
              </div>
            </div>
          ) : (
            /* Body: State 2 - Active Live Messages Feed */
            <div className="flex-1 flex flex-col justify-between overflow-hidden bg-slate-100/60">
              {/* Messages Scroll Area */}
              <div className="flex-1 p-3.5 overflow-y-auto space-y-2.5 text-xs">
                {messages?.map((m) => {
                  const isVisitor = m.sender === "visitor";
                  const isSystem = m.sender === "system";

                  if (isSystem) {
                    return (
                      <div key={m._id} className="flex justify-center my-1.5">
                        <span className="text-[10px] font-semibold text-slate-500 bg-slate-200/80 px-3 py-1 rounded-full text-center max-w-xs">
                          {m.text}
                        </span>
                      </div>
                    );
                  }

                  return (
                    <div
                      key={m._id}
                      className={`flex flex-col ${isVisitor ? "items-end" : "items-start"}`}
                    >
                      <div
                        className={`max-w-[82%] rounded-2xl px-3.5 py-2.5 shadow-xs ${
                          isVisitor
                            ? "bg-blue-600 text-white rounded-tr-xs"
                            : "bg-white text-slate-900 border border-slate-200/80 rounded-tl-xs"
                        }`}
                      >
                        {/* If product card attached in message */}
                        {m.productCard && (
                          <div className="mb-2 p-2 rounded-xl bg-black/10 border border-black/10 text-left">
                            <div className="flex items-center gap-2">
                              {m.productCard.image && (
                                <img
                                  src={m.productCard.image}
                                  alt={m.productCard.title}
                                  className="w-8 h-8 object-contain rounded bg-white"
                                />
                              )}
                              <div className="min-w-0">
                                <p className="font-extrabold text-[11px] truncate">{m.productCard.title}</p>
                                <p className="text-[10px] opacity-80 font-mono">OEM: {m.productCard.oemNumber}</p>
                              </div>
                            </div>
                          </div>
                        )}

                        <p className="leading-relaxed whitespace-pre-wrap">{m.text}</p>

                        <div
                          className={`flex items-center justify-end gap-1 mt-1 text-[9px] ${
                            isVisitor ? "text-blue-100" : "text-slate-400"
                          }`}
                        >
                          <span>{new Date(m.createdAt).toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit" })}</span>
                          {isVisitor && (
                            m.isRead ? (
                              <CheckCheck className="w-3 h-3 text-emerald-300" />
                            ) : (
                              <Check className="w-3 h-3 opacity-80" />
                            )
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
                <div ref={messagesEndRef} />
              </div>

              {/* Input Bar */}
              <form onSubmit={handleSendMessage} className="p-2.5 bg-white border-t border-slate-200 flex items-center gap-2">
                <Input
                  placeholder="Mesajınızı yazın..."
                  value={inputMessage}
                  onChange={(e) => setInputMessage(e.target.value)}
                  className="text-xs h-9 bg-slate-50 rounded-xl"
                  autoFocus
                />
                <Button
                  type="submit"
                  size="sm"
                  disabled={!inputMessage.trim()}
                  className="bg-blue-600 hover:bg-blue-700 text-white rounded-xl h-9 w-9 p-0 shrink-0 cursor-pointer shadow-xs"
                >
                  <Send className="w-4 h-4" />
                </Button>
              </form>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
