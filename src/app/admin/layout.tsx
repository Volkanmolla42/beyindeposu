"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Package,
  MessageSquare,
  Layers,
  Car,
  Settings,
  ExternalLink,
  Menu,
  X,
  ChevronRight,
  LogOut,
  User,
  Loader2,
} from "lucide-react";
import { useQuery, useConvexAuth } from "convex/react";
import { useAuthActions } from "@convex-dev/auth/react";
import { api } from "../../../convex/_generated/api";
import RoutartLogo from "@/components/RoutartLogo";

interface NavItem {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  exact?: boolean;
  badgeKey?: string;
}

interface NavGroup {
  title: string;
  items: NavItem[];
}

const NAV_GROUPS: NavGroup[] = [
  {
    title: "KATALOG & STOK",
    items: [
      {
        href: "/admin/products",
        label: "Ürünler",
        icon: Package,
      },
      {
        href: "/admin/categories",
        label: "Kategoriler",
        icon: Layers,
      },
      {
        href: "/admin/brands",
        label: "Araç Markaları",
        icon: Car,
      },
    ],
  },
  {
    title: "MÜŞTERİ & SİSTEM",
    items: [
      {
        href: "/admin/chats",
        label: "Canlı Destek",
        icon: MessageSquare,
        badgeKey: "unreadChats",
      },
      {
        href: "/admin/settings",
        label: "Site Ayarları",
        icon: Settings,
      },
    ],
  },
];

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);

  const { isLoading: authLoading, isAuthenticated } = useConvexAuth();
  const { signOut } = useAuthActions();
  const viewer = useQuery(api.users.viewer);

  // Client-side authentication guard
  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push("/login");
    }
  }, [authLoading, isAuthenticated, router]);

  const handleLogout = async () => {
    try {
      setLoggingOut(true);
      await signOut();
      router.push("/login");
      router.refresh();
    } catch (err) {
      console.error("Çıkış hatası:", err);
      setLoggingOut(false);
    }
  };

  const conversations = useQuery(api.chats.listConversations, {
    status: "active",
  });
  const unreadChatsCount =
    conversations?.reduce((acc, c) => acc + (c.unreadCountAdmin || 0), 0) || 0;

  const allItems: NavItem[] = NAV_GROUPS.flatMap((g) => g.items);
  const currentItem =
    allItems.find((item) =>
      item.exact ? pathname === item.href : pathname.startsWith(item.href)
    ) || allItems[0];

  // Auth Loading Screen
  if (authLoading || (!isAuthenticated && typeof window !== "undefined")) {
    return (
      <div className="h-screen w-full bg-slate-50 flex flex-col items-center justify-center text-slate-500 gap-2 text-xs">
        <Loader2 className="w-5 h-5 animate-spin text-slate-600" />
        <span>Yükleniyor...</span>
      </div>
    );
  }

  return (
    <div className="h-screen w-full bg-slate-50/70 text-slate-900 flex flex-col md:flex-row antialiased font-sans overflow-hidden">
      {/* Mobile Header Bar */}
      <header className="md:hidden bg-[#0f172a] text-white px-4 py-3 border-b border-slate-800 flex items-center justify-between shrink-0 z-40 shadow-xs">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="p-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-slate-800"
            aria-label="Menü"
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
          <Link href="/admin/products" className="flex items-center gap-2">
            <img
              src="/images/logo_white.png"
              alt="Beyindeposu"
              className="h-6 w-auto object-contain"
            />
            <span className="text-[10px] font-bold text-slate-300 bg-slate-800 px-1.5 py-0.5 rounded border border-slate-700">
              Panel
            </span>
          </Link>
        </div>

        <div className="flex items-center gap-2">
          {unreadChatsCount > 0 && (
            <Link
              href="/admin/chats"
              className="px-2 py-0.5 rounded-full bg-blue-600 text-white text-[11px] font-bold"
            >
              {unreadChatsCount}
            </Link>
          )}
          <Link
            href="/"
            target="_blank"
            className="text-slate-400 hover:text-white p-1"
            title="Mağazayı Görüntüle"
          >
            <ExternalLink className="w-4 h-4" />
          </Link>
          <button
            onClick={handleLogout}
            disabled={loggingOut}
            className="text-rose-400 hover:text-rose-300 p-1 ml-1"
            title="Çıkış Yap"
          >
            {loggingOut ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <LogOut className="w-4 h-4" />
            )}
          </button>
        </div>
      </header>

      {/* Mobile Overlay */}
      {mobileMenuOpen && (
        <div
          className="fixed inset-0 bg-slate-900/50 z-40 md:hidden backdrop-blur-xs"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      {/* Onyx Modern Sidebar (Fixed on Desktop) */}
      <aside
        className={`fixed md:static inset-y-0 left-0 z-50 md:z-30 w-64 h-full shrink-0 bg-[#0f172a] text-white border-r border-slate-800 flex flex-col justify-between transition-transform duration-200 ease-in-out md:translate-x-0 ${mobileMenuOpen ? "translate-x-0" : "-translate-x-full"
          }`}
      >
        <div className="flex-1 flex flex-col min-h-0">
          {/* Logo Header */}
          <div className="h-16 px-5 border-b border-slate-800 flex items-center justify-between shrink-0">
            <Link
              href="/admin/products"
              className="flex items-center gap-2.5 group"
              onClick={() => setMobileMenuOpen(false)}
            >
              <img
                src="/images/logo_white.png"
                alt="Beyindeposu"
                className="h-7 w-auto object-contain"
              />
              <span className="text-[10px] font-bold tracking-wider text-slate-300 uppercase bg-slate-800 px-1.5 py-0.5 rounded border border-slate-700">
                ADMIN
              </span>
            </Link>
          </div>

          {/* Nav Groups Scrollable Area */}
          <nav className="p-3 space-y-5 flex-1 overflow-y-auto">
            {NAV_GROUPS.map((group, gIdx) => (
              <div key={gIdx} className="space-y-1">
                <div className="px-3 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  {group.title}
                </div>

                <div className="space-y-1">
                  {group.items.map((item) => {
                    const isActive = item.exact
                      ? pathname === item.href
                      : pathname.startsWith(item.href);
                    const Icon = item.icon;
                    const hasBadge = item.badgeKey === "unreadChats" && unreadChatsCount > 0;

                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        onClick={() => setMobileMenuOpen(false)}
                        className={`flex items-center justify-between px-3 py-2 rounded-lg text-xs transition-all ${isActive
                            ? "bg-blue-600 text-white font-bold shadow-md shadow-blue-600/25"
                            : "text-slate-300 hover:text-white hover:bg-slate-800/70 font-medium"
                          }`}
                      >
                        <div className="flex items-center gap-2.5">
                          <Icon
                            className={`w-4 h-4 transition-colors ${isActive ? "text-white" : "text-slate-400 group-hover:text-slate-200"
                              }`}
                          />
                          <span>{item.label}</span>
                        </div>

                        {hasBadge && (
                          <span
                            className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${isActive
                                ? "bg-white text-blue-600"
                                : "bg-amber-400 text-slate-950 shadow-2xs"
                              }`}
                          >
                            {unreadChatsCount}
                          </span>
                        )}
                      </Link>
                    );
                  })}
                </div>
              </div>
            ))}
          </nav>
        </div>

        {/* Sidebar Footer with User Info & Logout */}
        <div className="border-t border-slate-800 bg-slate-950/50 shrink-0">
          {/* User & Logout section */}
          <div className="p-3 border-b border-slate-800/60 flex items-center justify-between gap-2">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-7 h-7 rounded-lg bg-blue-600/20 border border-blue-500/30 flex items-center justify-center text-blue-400 shrink-0">
                <User className="w-3.5 h-3.5" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-[11px] font-semibold text-white truncate">
                  {viewer?.email || "admintms@routart.com"}
                </div>
                <div className="text-[10px] text-slate-400 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                  <span>Yönetici</span>
                </div>
              </div>
            </div>

            <button
              onClick={handleLogout}
              disabled={loggingOut}
              className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition-colors shrink-0 cursor-pointer"
              title="Güvenli Çıkış Yap"
              aria-label="Çıkış Yap"
            >
              {loggingOut ? (
                <Loader2 className="w-4 h-4 animate-spin text-slate-400" />
              ) : (
                <LogOut className="w-4 h-4" />
              )}
            </button>
          </div>

          {/* Developer credit */}
          <div className="px-4 py-2.5 flex items-center justify-between">
            <span className="text-[10px] text-slate-500 font-medium">Geliştirici:</span>
            <RoutartLogo variant="dark" size="sm" showTagline={false} />
          </div>
        </div>
      </aside>

      {/* Main Content Area (Independent Scroll) */}
      <div className="flex-1 flex flex-col min-w-0 h-full overflow-y-auto">
        {/* Desktop Breadcrumb Header */}
        <header className="hidden md:flex items-center justify-between px-8 h-16 bg-white border-b border-slate-200 sticky top-0 z-20 shadow-2xs shrink-0">
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <Link href="/admin/products" className="hover:text-slate-800 transition-colors">
              Yönetim Paneli
            </Link>
            <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
            <span className="text-slate-900 font-bold">{currentItem.label}</span>
          </div>

          <div className="flex items-center gap-3">
            {unreadChatsCount > 0 && (
              <Link
                href="/admin/chats"
                className="px-3 py-1.5 bg-blue-50 border border-blue-200 text-blue-700 rounded-lg text-xs font-semibold flex items-center gap-2 hover:bg-blue-100 transition-colors"
              >
                <span className="w-2 h-2 rounded-full bg-blue-600" />
                <span>{unreadChatsCount} Okunmamış Canlı Mesaj</span>
              </Link>
            )}

            <Link
              href="/"
              target="_blank"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold transition-colors shadow-2xs"
            >
              <ExternalLink className="w-3.5 h-3.5 text-slate-500" />
              <span>Mağaza</span>
            </Link>

            <button
              onClick={handleLogout}
              disabled={loggingOut}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-rose-50 hover:border-rose-200 hover:text-rose-600 text-slate-600 text-xs font-semibold transition-colors shadow-2xs cursor-pointer"
              title="Oturumu Kapat"
            >
              {loggingOut ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <LogOut className="w-3.5 h-3.5" />
              )}
              <span>Çıkış Yap</span>
            </button>
          </div>
        </header>

        {/* Canvas Body */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto pb-20">
          {children}
        </main>
      </div>
    </div>
  );
}

