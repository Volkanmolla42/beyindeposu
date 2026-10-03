"use client";

import { Fragment, Suspense, useState, useRef, useEffect } from "react";
import Link from "next/link";
import { ProductImage } from "@/components/ProductImage";
import { useSearchParams } from "next/navigation";
import {
  MessageSquare,
  Search,
  Send,
  User,
  CheckCheck,
  Phone,
  PowerOff,
  Headphones,
  Trash2,
  ExternalLink,
  ArrowLeft,
  MoreVertical,
  Loader2,
  ArrowDown,
} from "lucide-react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@convex/_generated/api";
import { Id } from "@convex/_generated/dataModel";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { playAdminNotificationSound } from "@/app/admin/admin-utils";
import { getProductImageSource } from "@/lib/product-images";

function formatCalendarDate(timestamp: number) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Istanbul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(timestamp);
}

function formatMessageDay(timestamp: number, currentTime: number | null) {
  if (currentTime !== null) {
    const dateKey = formatCalendarDate(timestamp);
    const todayKey = formatCalendarDate(currentTime);
    const yesterdayKey = formatCalendarDate(currentTime - 24 * 60 * 60 * 1000);
    if (dateKey === todayKey) return "Bugün";
    if (dateKey === yesterdayKey) return "Dün";
  }

  const date = new Date(timestamp);
  return date.toLocaleDateString("tr-TR", {
    timeZone: "Europe/Istanbul",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

function AdminChatsContent() {
  const searchParams = useSearchParams();
  const requestedConversationId = searchParams.get("conversationId");
  const [currentTime, setCurrentTime] = useState<number | null>(null);
  const [selectedChatIdState, setSelectedChatId] =
    useState<Id<"conversations"> | null>(
      () => requestedConversationId as Id<"conversations"> | null,
    );
  const [chatSearch, setChatSearch] = useState("");
  const [chatStatusFilter, setChatStatusFilter] = useState<string>(() =>
    requestedConversationId ? "all" : "active",
  );
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [isSending, setIsSending] = useState(false);
  const [sendError, setSendError] = useState("");
  const [menuOpen, setMenuOpen] = useState(false);
  const [showScrollDown, setShowScrollDown] = useState(false);
  const chatMessagesRef = useRef<HTMLDivElement>(null);
  const composerRef = useRef<HTMLTextAreaElement>(null);
  const nearBottomRef = useRef(true);
  const previousChatIdRef = useRef<Id<"conversations"> | null>(null);
  const prevAdminMsgCountRef = useRef<number>(0);

  useEffect(() => {
    const frameId = window.requestAnimationFrame(() => {
      setCurrentTime(Date.now());
    });

    return () => window.cancelAnimationFrame(frameId);
  }, []);

  // Queries
  const conversations = useQuery(api.chats.listConversations, {
    status: chatStatusFilter === "all" ? undefined : chatStatusFilter,
    searchTerm: chatSearch || undefined,
  });

  const selectedChatId = selectedChatIdState;
  const adminMessageInput = selectedChatId ? drafts[selectedChatId] || "" : "";
  const selectedConversation = conversations?.find(
    (c) => c._id === selectedChatId,
  );
  const chatOpen =
    !!selectedChatId && (conversations === undefined || !!selectedConversation);

  const activeChatMessages = useQuery(
    api.chats.getMessages,
    selectedConversation
      ? { conversationId: selectedConversation._id }
      : "skip",
  );

  // Mutations
  const sendChatMessage = useMutation(api.chats.sendMessage);
  const markChatAsRead = useMutation(api.chats.markAsRead);
  const closeChatMutation = useMutation(api.chats.closeConversation);
  const deleteChatMutation = useMutation(api.chats.deleteConversation);

  // Mark chat as read by admin when opened
  useEffect(() => {
    if (selectedConversation && selectedConversation.unreadCountAdmin > 0) {
      void markChatAsRead({
        conversationId: selectedConversation._id,
        reader: "admin",
      });
    }
  }, [selectedChatId, selectedConversation, markChatAsRead]);

  // Auto-scroll chat to bottom
  useEffect(() => {
    const scroller = chatMessagesRef.current;
    if (activeChatMessages && scroller) {
      if (
        previousChatIdRef.current !== selectedChatId ||
        nearBottomRef.current
      ) {
        scroller.scrollTop = scroller.scrollHeight;
      }
      previousChatIdRef.current = selectedChatId;
    }
  }, [selectedChatId, activeChatMessages]);

  useEffect(() => {
    const scroller = chatMessagesRef.current;
    if (!scroller) return;
    const observer = new ResizeObserver(() => {
      if (nearBottomRef.current) scroller.scrollTop = scroller.scrollHeight;
    });
    observer.observe(scroller);
    return () => observer.disconnect();
  }, [selectedConversation?._id]);

  useEffect(() => {
    const composer = composerRef.current;
    if (!composer) return;
    composer.style.height = "auto";
    composer.style.height = `${Math.min(composer.scrollHeight + 2, 144)}px`;
  }, [adminMessageInput, selectedConversation?._id]);

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
    if (!adminMessageInput.trim() || !selectedChatId || isSending) return;

    const textToSend = adminMessageInput.trim();
    const draft = adminMessageInput;
    const chatId = selectedChatId;
    setIsSending(true);
    setSendError("");
    nearBottomRef.current = true;

    try {
      await sendChatMessage({
        conversationId: selectedChatId,
        sender: "admin",
        text: textToSend,
      });
      setDrafts((current) =>
        current[chatId] === draft ? { ...current, [chatId]: "" } : current,
      );
    } catch (err) {
      console.error("Admin mesajı gönderilemedi:", err);
      setSendError("Mesaj gönderilemedi. Tekrar deneyin.");
    } finally {
      setIsSending(false);
    }
  };

  const handleCloseChat = async (id: Id<"conversations">) => {
    setMenuOpen(false);
    if (confirm("Canlı destek sohbeti kapatılsın mı?")) {
      await closeChatMutation({ conversationId: id });
      if (chatStatusFilter === "active") setSelectedChatId(null);
    }
  };

  const handleDeleteChat = async (id: Id<"conversations">) => {
    setMenuOpen(false);
    if (confirm("Sohbet kaydı kalıcı olarak silinsin mi?")) {
      await deleteChatMutation({ conversationId: id });
      if (selectedChatId === id) {
        setSelectedChatId(null);
      }
    }
  };

  return (
    <div data-chat-open={chatOpen} className="flex-1 flex flex-col min-h-0">
      {/* Main Split Layout */}
      <div className="flex flex-1 min-h-0 overflow-hidden bg-white lg:rounded-2xl lg:border lg:border-slate-200 lg:shadow-xs">
        {/* Left List of Conversations */}
        <section
          aria-label="Sohbet listesi"
          className={`${chatOpen ? "hidden lg:flex" : "flex"} w-full lg:w-80 xl:w-96 shrink-0 bg-white lg:border-r lg:border-slate-200 flex-col overflow-hidden min-h-0`}
        >
          {/* Tabs & Search */}
          <div className="p-4 shrink-0 border-b border-slate-100 space-y-3">
            <div className="hidden md:flex items-center justify-between">
              <h1 className="text-xl font-bold tracking-tight text-slate-900 sm:text-2xl">
                Sohbetler
              </h1>
              {conversations !== undefined && (
                <span className="rounded-full border border-slate-200 bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-600">
                  {conversations.length} sohbet
                </span>
              )}
            </div>
            <div className="relative">
              <Search
                aria-hidden="true"
                className="w-5 h-5 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500"
              />
              <Input
                type="search"
                aria-label="Ziyaretçi adı veya telefon ara"
                placeholder="Ad veya telefon ara"
                value={chatSearch}
                onChange={(e) => setChatSearch(e.target.value)}
                className="pl-11 bg-slate-100 border-transparent text-slate-900 text-base lg:text-sm h-12 rounded-full shadow-none"
              />
            </div>
            <div className="flex items-center gap-2 text-sm">
              <button
                onClick={() => setChatStatusFilter("active")}
                aria-pressed={chatStatusFilter === "active"}
                className={`min-h-11 px-4 font-medium rounded-full transition-colors cursor-pointer focus-visible:outline-2 focus-visible:outline-emerald-700 ${
                  chatStatusFilter === "active"
                    ? "bg-emerald-50 text-emerald-800"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                }`}
              >
                Aktif
              </button>
              <button
                onClick={() => setChatStatusFilter("closed")}
                aria-pressed={chatStatusFilter === "closed"}
                className={`min-h-11 px-4 font-medium rounded-full transition-colors cursor-pointer focus-visible:outline-2 focus-visible:outline-emerald-700 ${
                  chatStatusFilter === "closed"
                    ? "bg-emerald-50 text-emerald-800"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                }`}
              >
                Kapananlar
              </button>
              <button
                onClick={() => setChatStatusFilter("all")}
                aria-pressed={chatStatusFilter === "all"}
                className={`min-h-11 px-4 font-medium rounded-full transition-colors cursor-pointer focus-visible:outline-2 focus-visible:outline-emerald-700 ${
                  chatStatusFilter === "all"
                    ? "bg-emerald-50 text-emerald-800"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                }`}
              >
                Tümü
              </button>
            </div>
          </div>

          {/* List Scroll */}
          <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain pb-[env(safe-area-inset-bottom)]">
            {conversations === undefined ? (
              <div
                role="status"
                className="flex justify-center p-8 text-slate-500"
              >
                <Loader2 className="w-5 h-5 animate-spin" />
                <span className="sr-only">Sohbetler yükleniyor</span>
              </div>
            ) : conversations.length > 0 ? (
              conversations.map((conv) => {
                const isSelected = conv._id === selectedChatId;
                const timeStr = new Date(
                  conv.lastMessageAt || conv._creationTime,
                ).toLocaleTimeString("tr-TR", {
                  timeZone: "Europe/Istanbul",
                  hour: "2-digit",
                  minute: "2-digit",
                });

                return (
                  <button
                    key={conv._id}
                    type="button"
                    aria-pressed={isSelected}
                    onClick={() => {
                      setSelectedChatId(conv._id);
                      nearBottomRef.current = true;
                      setShowScrollDown(false);
                      setSendError("");
                    }}
                    className={`w-full px-4 py-4 text-left cursor-pointer transition-colors flex items-center gap-3 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-emerald-700 ${
                      isSelected ? "bg-emerald-50" : "hover:bg-slate-50"
                    }`}
                  >
                    <div className="relative shrink-0 mt-0.5">
                      <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center text-slate-600 font-semibold text-base">
                        {conv.visitorName ? (
                          conv.visitorName
                            .slice(0, 2)
                            .toLocaleUpperCase("tr-TR")
                        ) : (
                          <User className="w-6 h-6" />
                        )}
                      </div>
                      {conv.status === "active" && (
                        <span className="absolute bottom-0 right-0 w-3 h-3 rounded-full bg-emerald-700 ring-2 ring-white" />
                      )}
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-1 mb-0.5">
                        <h4 className="font-semibold text-base lg:text-sm text-slate-900 truncate">
                          {conv.visitorName || "Ziyaretçi"}
                        </h4>
                        <span
                          className={`text-xs shrink-0 ${conv.unreadCountAdmin > 0 ? "text-emerald-700 font-medium" : "text-slate-500"}`}
                        >
                          {timeStr}
                        </span>
                      </div>

                      <p className="text-sm text-slate-500 truncate">
                        {conv.lastMessage ||
                          (conv.productCard
                            ? `[Parça Sorusu: ${conv.productCard.oemNumber}]`
                            : "Sohbet başladı")}
                      </p>
                    </div>

                    {conv.unreadCountAdmin > 0 && (
                      <span className="min-w-5 px-1.5 py-0.5 text-center rounded-full bg-emerald-700 text-white font-semibold text-xs shrink-0">
                        {conv.unreadCountAdmin}
                      </span>
                    )}
                  </button>
                );
              })
            ) : (
              <div className="p-8 text-center space-y-1.5 text-slate-400 text-xs">
                <MessageSquare className="w-6 h-6 text-slate-300 mx-auto" />
                <p>Mesaj bulunamadı.</p>
              </div>
            )}
          </div>
        </section>

        {/* Right Active Chat Box */}
        <section
          aria-label="Seçili sohbet"
          className={`${chatOpen ? "flex" : "hidden lg:flex"} flex-1 min-w-0 bg-slate-100 flex-col overflow-hidden min-h-0`}
        >
          {selectedConversation ? (
            <>
              {/* Header */}
              <div className="px-2 py-2.5 lg:px-5 shrink-0 border-b border-slate-200 bg-white flex items-center justify-between gap-1">
                <div className="flex items-center gap-2 min-w-0 flex-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    aria-label="Sohbet listesine dön"
                    onClick={() => {
                      setSelectedChatId(null);
                      setMenuOpen(false);
                    }}
                    className="h-12 w-12 rounded-full shrink-0 lg:hidden"
                  >
                    <ArrowLeft className="w-5 h-5" />
                  </Button>
                  <div className="w-10 h-10 rounded-full bg-emerald-50 flex items-center justify-center text-emerald-800 font-semibold text-sm shrink-0">
                    {selectedConversation.visitorName ? (
                      selectedConversation.visitorName
                        .slice(0, 2)
                        .toLocaleUpperCase("tr-TR")
                    ) : (
                      <User className="w-4 h-4" />
                    )}
                  </div>

                  <div className="min-w-0">
                    <div className="min-w-0">
                      <h3 className="font-semibold text-base text-slate-900 truncate">
                        {selectedConversation.visitorName ||
                          "İsimsiz Ziyaretçi"}
                      </h3>
                    </div>

                    <p className="text-xs text-slate-500 truncate mt-0.5">
                      {selectedConversation.visitorPhone ||
                        (selectedConversation.status === "active"
                          ? "Aktif sohbet"
                          : "Sohbet kapatıldı")}
                    </p>
                  </div>
                </div>

                <div className="flex items-center shrink-0">
                  {selectedConversation.visitorPhone && (
                    <Button
                      asChild
                      variant="ghost"
                      size="icon"
                      className="h-12 w-12 rounded-full text-emerald-700"
                    >
                      <a
                        href={`tel:${selectedConversation.visitorPhone}`}
                        aria-label="Ziyaretçiyi ara"
                      >
                        <Phone className="w-5 h-5" />
                      </a>
                    </Button>
                  )}
                  <Popover open={menuOpen} onOpenChange={setMenuOpen}>
                    <PopoverTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        aria-label="Sohbet işlemleri"
                        className="h-12 w-12 rounded-full"
                      >
                        <MoreVertical className="w-5 h-5" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent align="end" className="w-52 p-1">
                      {selectedConversation.status === "active" && (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() =>
                            handleCloseChat(selectedConversation._id)
                          }
                          className="w-full justify-start text-slate-700 font-medium h-12 rounded-lg gap-3"
                        >
                          <PowerOff className="w-4 h-4" />
                          <span>Sohbeti kapat</span>
                        </Button>
                      )}

                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() =>
                          handleDeleteChat(selectedConversation._id)
                        }
                        className="w-full justify-start hover:bg-red-50 hover:text-red-700 text-red-600 font-medium h-12 rounded-lg gap-3"
                        title="Sil"
                        aria-label="Sohbeti sil"
                      >
                        <Trash2 className="w-4 h-4" />
                        <span>Sohbeti sil</span>
                      </Button>
                    </PopoverContent>
                  </Popover>
                </div>
              </div>

              {/* Product Inquiry Context */}
              {selectedConversation.productCard && (
                <div className="px-4 py-2.5 shrink-0 bg-white border-b border-slate-200 flex items-center gap-3">
                  <div className="w-10 h-10 rounded-md bg-white border border-slate-200 overflow-hidden flex items-center justify-center p-1 shrink-0">
                    <ProductImage
                      src={selectedConversation.productCard.image || getProductImageSource()}
                      alt={selectedConversation.productCard.image ? selectedConversation.productCard.title : "Ürün görseli hazırlanıyor"}
                      width={40}
                      height={40}
                      unoptimized
                      className="w-full h-full object-contain"
                    />
                  </div>
                  <div className="min-w-0 flex-1 text-xs">
                    <div className="text-sm font-medium text-slate-900 truncate">
                      {selectedConversation.productCard.title}
                    </div>
                    <span className="block truncate font-mono text-xs text-slate-600 font-medium">
                      OEM: {selectedConversation.productCard.oemNumber}
                    </span>
                  </div>
                  <Link
                    href={`/parcalar/${selectedConversation.productCard.slug}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label="Parçayı gör"
                    className="h-11 w-11 hover:bg-slate-100 text-slate-700 rounded-full shrink-0 flex items-center justify-center"
                  >
                    <ExternalLink className="w-4 h-4 text-slate-500" />
                  </Link>
                </div>
              )}

              {/* Messages Body */}
              <div className="relative flex flex-col flex-1 min-h-0">
                <div
                  ref={chatMessagesRef}
                  role="log"
                  aria-label="Mesajlar"
                  aria-live="polite"
                  onScroll={() => {
                    const scroller = chatMessagesRef.current;
                    if (scroller) {
                      nearBottomRef.current =
                        scroller.scrollHeight -
                          scroller.scrollTop -
                          scroller.clientHeight <
                        80;
                      setShowScrollDown(!nearBottomRef.current);
                    }
                  }}
                  className="flex-1 min-h-0 overflow-y-auto overscroll-contain px-3 py-4 lg:px-6 space-y-2 bg-slate-100"
                >
                  {activeChatMessages === undefined ? (
                    <div
                      role="status"
                      className="flex justify-center p-8 text-slate-500"
                    >
                      <Loader2 className="w-5 h-5 animate-spin" />
                      <span className="sr-only">Mesajlar yükleniyor</span>
                    </div>
                  ) : activeChatMessages.length > 0 ? (
                    activeChatMessages.map((msg, index) => {
                      const isAdmin = msg.sender === "admin";
                      const previous = activeChatMessages[index - 1];
                      const startsDay =
                        !previous ||
                        formatCalendarDate(previous.createdAt) !==
                          formatCalendarDate(msg.createdAt);
                      const timeStr = new Date(
                        msg.createdAt,
                      ).toLocaleTimeString("tr-TR", {
                        timeZone: "Europe/Istanbul",
                        hour: "2-digit",
                        minute: "2-digit",
                      });

                      return (
                        <Fragment key={msg._id}>
                          {startsDay && (
                            <div className="flex justify-center py-3">
                              <span className="rounded-lg bg-white px-3 py-1.5 text-xs font-medium text-slate-500 shadow-xs">
                              {formatMessageDay(msg.createdAt, currentTime)}
                              </span>
                            </div>
                          )}
                          <div
                            className={`flex flex-col ${isAdmin ? "items-end" : "items-start"}`}
                          >
                            <div
                              className={`min-w-0 max-w-[85%] lg:max-w-[75%] px-3 py-2 rounded-2xl text-[15px] leading-relaxed shadow-xs ${
                                isAdmin
                                  ? "bg-emerald-50 text-slate-900 rounded-tr-xs"
                                  : "bg-white text-slate-900 rounded-tl-xs"
                              }`}
                            >
                              <p className="whitespace-pre-wrap wrap-anywhere">
                                {msg.text}
                              </p>
                              <div className="flex items-center justify-end gap-1 text-[10px] text-slate-500 mt-0.5">
                                <span>{timeStr}</span>
                                {isAdmin && (
                                  <CheckCheck
                                    aria-label="Gönderildi"
                                    className="w-3.5 h-3.5 text-emerald-700"
                                  />
                                )}
                              </div>
                            </div>
                          </div>
                        </Fragment>
                      );
                    })
                  ) : (
                    <div className="text-center py-12 text-slate-400 text-xs">
                      Henüz mesaj bulunmuyor.
                    </div>
                  )}
                </div>
                {showScrollDown && (
                  <Button
                    variant="outline"
                    size="icon"
                    aria-label="Son mesajlara git"
                    className="absolute bottom-3 right-4 h-11 w-11 rounded-full bg-white shadow-sm"
                    onClick={() => {
                      nearBottomRef.current = true;
                      const scroller = chatMessagesRef.current;
                      if (scroller) scroller.scrollTop = scroller.scrollHeight;
                      setShowScrollDown(false);
                    }}
                  >
                    <ArrowDown className="w-5 h-5" />
                  </Button>
                )}
              </div>

              {/* Message Input Box */}
              <form
                onSubmit={handleSendAdminMessage}
                className="px-3 pt-2 pb-[max(0.75rem,env(safe-area-inset-bottom))] lg:px-4 shrink-0 bg-slate-100"
              >
                {sendError && (
                  <p role="alert" className="pb-2 px-2 text-sm text-red-600">
                    {sendError}
                  </p>
                )}
                <div className="flex items-end gap-2">
                  <Textarea
                    ref={composerRef}
                    name="message"
                    rows={1}
                    aria-label="Müşteriye yanıt yazın"
                    placeholder="Mesaj yazın"
                    value={adminMessageInput}
                    onChange={(e) => {
                      setDrafts((current) => ({
                        ...current,
                        [selectedConversation._id]: e.target.value,
                      }));
                      setSendError("");
                    }}
                    onKeyDown={(event) => {
                      if (
                        event.key === "Enter" &&
                        !event.shiftKey &&
                        !event.nativeEvent.isComposing &&
                        window.matchMedia("(min-width: 1024px)").matches
                      ) {
                        event.preventDefault();
                        event.currentTarget.form?.requestSubmit();
                      }
                    }}
                    className="bg-white border-transparent text-slate-900 text-base lg:text-sm min-h-12 max-h-36 resize-none rounded-3xl px-4 py-3 leading-6 shadow-xs focus-visible:ring-emerald-700"
                  />
                  <Button
                    type="submit"
                    variant="whatsapp"
                    disabled={!adminMessageInput.trim() || isSending}
                    aria-label="Mesajı gönder"
                    className="h-12 w-12 p-0 rounded-full cursor-pointer shrink-0"
                  >
                    {isSending ? (
                      <Loader2 className="w-5 h-5 animate-spin" />
                    ) : (
                      <Send className="w-5 h-5" />
                    )}
                  </Button>
                </div>
              </form>
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center p-8 text-center space-y-2 text-slate-400">
              {conversations === undefined && selectedChatId ? (
                <Loader2
                  aria-label="Sohbet yükleniyor"
                  className="w-6 h-6 animate-spin text-emerald-700"
                />
              ) : (
                <>
                  <Headphones className="w-10 h-10 text-slate-300" />
                  <p className="text-sm text-slate-500">Bir sohbet seçin.</p>
                </>
              )}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

export default function AdminChatsPage() {
  return (
    <Suspense fallback={null}>
      <AdminChatsContent />
    </Suspense>
  );
}
