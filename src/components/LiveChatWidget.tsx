"use client";

import { useCallback, useState, useEffect, useRef, useSyncExternalStore } from "react";
import { usePathname } from "next/navigation";
import Image from "next/image";
import {
  X,
  Send,
  Headphones,
  Check,
  CheckCheck,
  ShoppingBag,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useQuery, useMutation } from "convex/react";
import { api } from "@convex/_generated/api";

let audioContextInstance: AudioContext | null = null;
const VISITOR_STORAGE_CHANGE_EVENT = "beyindeposu:visitor-storage-change";

function subscribeToVisitorStorage(onChange: () => void) {
  window.addEventListener("storage", onChange);
  window.addEventListener(VISITOR_STORAGE_CHANGE_EVENT, onChange);

  return () => {
    window.removeEventListener("storage", onChange);
    window.removeEventListener(VISITOR_STORAGE_CHANGE_EVENT, onChange);
  };
}

function getVisitorStorageValue(key: string) {
  try {
    return window.localStorage.getItem(key) ?? "";
  } catch {
    return "";
  }
}

function writeVisitorStorageValue(key: string, value: string) {
  window.localStorage.setItem(key, value);
  window.dispatchEvent(new Event(VISITOR_STORAGE_CHANGE_EVENT));
}

function useVisitorStorageValue(key: string) {
  const value = useSyncExternalStore(
    subscribeToVisitorStorage,
    () => getVisitorStorageValue(key),
    () => ""
  );
  const setValue = useCallback(
    (nextValue: string) => writeVisitorStorageValue(key, nextValue),
    [key]
  );

  return [value, setValue] as const;
}

function getSharedAudioContext(): AudioContext | null {
  if (typeof window === "undefined") return null;
  const AudioCtx =
    window.AudioContext ||
    (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
  if (!AudioCtx) return null;
  if (!audioContextInstance || audioContextInstance.state === "closed") {
    audioContextInstance = new AudioCtx();
  }
  return audioContextInstance;
}

// Play subtle web audio notification chime reusing shared AudioContext
function playNotificationSound() {
  try {
    const ctx = getSharedAudioContext();
    if (!ctx) return;
    if (ctx.state === "suspended") {
      ctx.resume().catch(() => {});
    }
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
  } catch {
    // Audio context may be restricted before user gesture
  }
}

export default function LiveChatWidget() {
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);
  const [visitorId, setVisitorId] = useVisitorStorageValue("beyindeposu_visitor_id");
  const [savedVisitorName, setSavedVisitorName] = useVisitorStorageValue("beyindeposu_visitor_name");
  const [savedVisitorPhone, setSavedVisitorPhone] = useVisitorStorageValue("beyindeposu_visitor_phone");
  const [visitorNameDraft, setVisitorNameDraft] = useState<string | null>(null);
  const [visitorPhoneDraft, setVisitorPhoneDraft] = useState<string | null>(null);
  const visitorName = visitorNameDraft ?? savedVisitorName;
  const visitorPhone = visitorPhoneDraft ?? savedVisitorPhone;
  const [includeProduct, setIncludeProduct] = useState<boolean>(true);
  const [inputMessage, setInputMessage] = useState("");
  const [isStarting, setIsStarting] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const prevMsgCountRef = useRef<number>(0);

  // Initialize persistent visitor ID
  useEffect(() => {
    if (visitorId) return;

    const storedVisitorId = getVisitorStorageValue("beyindeposu_visitor_id");
    const nextVisitorId = storedVisitorId ||
      "vis_" + Math.random().toString(36).substring(2, 11) + Date.now().toString(36);
    setVisitorId(nextVisitorId);
  }, [visitorId, setVisitorId]);

  // Product page detection
  const isProductPage = pathname?.startsWith("/parcalar/") && pathname !== "/parcalar";
  const productSlug = isProductPage ? pathname.replace("/parcalar/", "") : null;
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
    conversationId && visitorId ? { conversationId, visitorId } : "skip"
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
      markAsReadMutation({ conversationId, reader: "visitor", visitorId });
    }
  }, [isOpen, conversationId, visitorId, activeConversation?.unreadCountVisitor, markAsReadMutation]);

  // Handle start chat
  const handleStartChat = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!visitorId) return;

    setIsStarting(true);
    if (visitorName.trim()) setSavedVisitorName(visitorName.trim());
    if (visitorPhone.trim()) setSavedVisitorPhone(visitorPhone.trim());
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
        visitorId,
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
          aria-label="Canlı destek"
          aria-haspopup="dialog"
          aria-expanded={false}
        >
          <div className="flex items-center gap-2">
            <Headphones className="w-5 h-5" />
            <span className="text-sm tracking-tight font-extrabold hidden sm:inline">Canlı destek</span>
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
        <div
          role="dialog"
          aria-label="Canlı destek sohbet penceresi"
          aria-modal="false"
          className="w-[360px] sm:w-[390px] h-[520px] max-h-[85vh] bg-white rounded-3xl shadow-2xl border border-slate-200/80 flex flex-col overflow-hidden animate-in fade-in slide-in-from-bottom-5 duration-200"
        >
          {/* Header */}
          <div className="bg-slate-900 text-white px-4 py-3.5 flex items-center justify-between shadow-md select-none">
            <div className="flex items-center gap-3">
              <div className="relative">
                <div className="w-10 h-10 rounded-full bg-blue-600 flex items-center justify-center text-white font-bold shadow-inner">
                  <Headphones className="w-5 h-5" />
                </div>
              </div>
              <div>
                <h2 className="font-black text-sm text-white">Canlı destek</h2>
              </div>
            </div>

            <button
              onClick={() => setIsOpen(false)}
              className="w-8 h-8 rounded-full hover:bg-slate-800 flex items-center justify-center text-slate-400 hover:text-white transition-colors cursor-pointer"
              aria-label="Sohbet penceresini kapat"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Body: State 1 - Start Conversation Form */}
          {!conversationId ? (
            <div className="flex-1 p-5 flex flex-col justify-between overflow-y-auto bg-slate-50/50">
              <div className="space-y-4">
                {/* Product Detection Banner */}
                {isProductPage && currentProduct && (
                  <div className="p-3 bg-white border border-slate-200 rounded-2xl shadow-xs space-y-2">
                    <div className="flex items-center gap-2 text-xs font-bold text-slate-800">
                      <ShoppingBag className="w-4 h-4 text-blue-600" />
                      <span>Bu parça</span>
                    </div>

                    <div className="flex items-center gap-2.5 bg-slate-50 p-2 rounded-xl border border-slate-100">
                      <div className="relative w-10 h-10 rounded-lg bg-white border border-slate-200 overflow-hidden flex items-center justify-center shrink-0">
                        {currentProduct.images?.[0] ? (
                          <Image
                            src={currentProduct.images[0]}
                            alt={currentProduct.title}
                            fill
                            sizes="40px"
                            className="object-contain"
                          />
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
                      <span>Parçayı sohbete ekle</span>
                    </label>
                  </div>
                )}

                <form id="start-chat-form" onSubmit={handleStartChat} className="space-y-3">
                  <div>
                    <label htmlFor="chat-visitor-name" className="text-[11px] font-bold text-slate-700 block mb-1">
                      Ad soyad <span className="text-slate-400 font-normal">· isteğe bağlı</span>
                    </label>
                    <Input
                      id="chat-visitor-name"
                      name="visitor-name"
                      aria-label="Ad soyad"
                      value={visitorName}
                      onChange={(e) => setVisitorNameDraft(e.target.value)}
                      className="bg-white text-xs h-9"
                    />
                  </div>

                  <div>
                    <label htmlFor="chat-visitor-phone" className="text-[11px] font-bold text-slate-700 block mb-1">
                      Telefon <span className="text-emerald-600 font-normal">(WhatsApp için)</span>
                    </label>
                    <Input
                      id="chat-visitor-phone"
                      name="visitor-phone"
                      aria-label="Telefon numarası"
                      type="tel"
                      placeholder="0534 000 00 00"
                      value={visitorPhone}
                      onChange={(e) => setVisitorPhoneDraft(e.target.value)}
                      className="bg-white text-xs h-9"
                    />
                  </div>

                  <div>
                    <label htmlFor="chat-visitor-message" className="text-[11px] font-bold text-slate-700 block mb-1">
                      Mesaj <span className="text-slate-400 font-normal">· isteğe bağlı</span>
                    </label>
                    <Input
                      id="chat-visitor-message"
                      name="visitor-message"
                      aria-label="Mesajınız"
                      placeholder="Parça kodu veya sorunuzu yazın"
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
                      <span>Sohbet başlatılıyor...</span>
                    </>
                  ) : (
                    <span>Sohbeti başlat</span>
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
                                <div className="relative w-8 h-8 rounded bg-white overflow-hidden shrink-0">
                                  <Image
                                    src={m.productCard.image}
                                    alt={m.productCard.title}
                                    fill
                                    sizes="32px"
                                    className="object-contain"
                                  />
                                </div>
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
                  id="chat-active-message-input"
                  name="active-chat-message"
                  aria-label="Canlı sohbet mesajı"
                  placeholder="Mesaj yazın"
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
                  aria-label="Mesajı gönder"
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
