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
  Menu,
  X,
  ChevronRight,
  LogOut,
  User,
  Loader2,
  ExternalLink,
  Sparkles,
} from "lucide-react";
import { useQuery, useConvexAuth } from "convex/react";
import { useAuthActions } from "@convex-dev/auth/react";
import { api } from "@convex/_generated/api";
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
    title: "Katalog ve stok",
    items: [
      {
        href: "/admin/products",
        label: "Ürünler",
        icon: Package,
      },
      {
        href: "/admin/batch-import",
        label: "Toplu aktarım",
        icon: Sparkles,
      },
      {
        href: "/admin/categories",
        label: "Kategoriler",
        icon: Layers,
      },
      {
        href: "/admin/brands",
        label: "Markalar",
        icon: Car,
      },
    ],
  },
  {
    title: "Müşteri desteği",
    items: [
      {
        href: "/admin/chats",
        label: "Sohbetler",
        icon: MessageSquare,
        badgeKey: "unreadChats",
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
      <header className="md:hidden flex shrink-0 items-center justify-between border-b border-slate-200 bg-white px-4 py-3 text-slate-900 z-40">
        <div className="flex items-center gap-2.5 min-w-0">
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="rounded-full p-2 text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-900"
            aria-label="Menü"
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
          <span className="min-w-0 truncate text-sm font-semibold text-white">
            {currentItem.label}
          </span>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {pathname.startsWith("/admin/chats") && (
            <Link
              href="/admin/chats"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-medium text-slate-700 transition-colors hover:bg-slate-100"
              title="Sohbetleri yeni sekmede aç"
            >
              <ExternalLink className="w-3.5 h-3.5 text-slate-300" />
              <span>Yeni sekmede aç</span>
            </Link>
          )}

          {unreadChatsCount > 0 && (
            <Link
              href="/admin/chats"
              target="_blank"
              rel="noopener noreferrer"
              aria-label={`${unreadChatsCount} okunmamış sohbet`}
              className="shrink-0 px-2 py-1 rounded-full bg-blue-600 text-white text-[11px] font-bold"
            >
              {unreadChatsCount}
            </Link>
          )}
        </div>
      </header>

      {/* Mobile Overlay */}
      {mobileMenuOpen && (
        <div
              className="fixed inset-0 z-40 bg-slate-900/30 backdrop-blur-xs md:hidden"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      {/* Admin navigation */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 flex h-full w-64 shrink-0 flex-col justify-between border-r border-slate-200 bg-white text-slate-900 transition-transform duration-200 ease-in-out md:static md:z-30 md:translate-x-0 ${mobileMenuOpen ? "translate-x-0" : "-translate-x-full"
          }`}
      >
        <div className="flex-1 flex flex-col min-h-0">
          {/* Logo Header */}
          <div className="flex h-16 shrink-0 items-center justify-between border-b border-slate-200 px-5">
            <Link
              href="/"
              className="flex items-center gap-2.5 group"
              onClick={() => setMobileMenuOpen(false)}
            >
              <img
                src="/images/logo_transparent.webp"
                alt="Beyin Deposu"
                className="h-8 w-auto object-contain"
              />
              <span className="rounded-full border border-blue-100 bg-blue-50 px-2 py-1 text-[10px] font-medium tracking-wide text-blue-800">
                Yönetim
              </span>
            </Link>
          </div>

          {/* Nav Groups Scrollable Area */}
          <nav className="p-3 space-y-5 flex-1 overflow-y-auto">
            {NAV_GROUPS.map((group, gIdx) => (
              <div key={gIdx} className="space-y-1">
                <div className="px-3 text-[11px] font-medium tracking-wide text-slate-500">
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
                        className={`flex items-center justify-between rounded-full px-3 py-2.5 text-sm transition-colors ${isActive
                            ? "bg-blue-50 text-blue-800 font-medium"
                            : "text-slate-700 hover:bg-slate-100 font-normal"
                          }`}
                      >
                        <div className="flex items-center gap-2.5">
                          <Icon
                            className={`h-4 w-4 transition-colors ${isActive ? "text-blue-800" : "text-slate-500"
                              }`}
                          />
                          <span>{item.label}</span>
                        </div>

                        {hasBadge && (
                          <span
                            className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${isActive
                                ? "bg-white text-blue-700"
                                : "bg-amber-100 text-amber-900"
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
        <div className="shrink-0 border-t border-slate-200 bg-slate-50">
          {/* User & Logout section */}
          <div className="flex items-center justify-between gap-2 border-b border-slate-200 p-3">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-blue-100 bg-blue-50 text-blue-700">
                <User className="w-3.5 h-3.5" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="truncate text-xs font-medium text-slate-900">
                  {viewer?.email || "admin@beyindeposu.com"}
                </div>
                <div className="flex items-center gap-1 text-[11px] text-slate-600">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                  <span>Yönetici</span>
                </div>
              </div>
            </div>

            <button
              onClick={handleLogout}
              disabled={loggingOut}
              className="shrink-0 rounded-full p-2 text-slate-500 transition-colors hover:bg-rose-50 hover:text-rose-700"
              title="Çıkış yap"
              aria-label="Çıkış yap"
            >
              {loggingOut ? (
                <Loader2 className="w-4 h-4 animate-spin text-slate-400" />
              ) : (
                <LogOut className="w-4 h-4" />
              )}
            </button>
          </div>

          {/* Developer credit */}
          <div className="flex items-center justify-between px-4 py-2.5">
            <span className="text-[10px] font-medium text-slate-500">Geliştirici:</span>
            <RoutartLogo variant="light" size="sm" showTagline={false} />
          </div>
        </div>
      </aside>

      {/* Main Content Area (Independent Scroll) */}
      <div className="flex-1 flex flex-col min-w-0 h-full overflow-y-auto">
        {/* Desktop Breadcrumb Header */}
        <header className="sticky top-0 z-20 hidden h-16 shrink-0 items-center justify-between border-b border-slate-200 bg-white px-8 md:flex">
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <Link href="/admin/products" className="hover:text-slate-800 transition-colors">
              Yönetim Paneli
            </Link>
            <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
            <span className="text-slate-900 font-bold">{currentItem.label}</span>

          </div>

          <div className="flex items-center gap-3">
            {pathname.startsWith("/admin/chats") && (
              <Link
                href="/admin/chats"
                target="_blank"
                rel="noopener noreferrer"
                className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-2xs"
                title="Sohbetleri yeni sekmede aç"
              >
                <ExternalLink className="w-3.5 h-3.5 text-slate-500" />
                <span>Yeni sekmede aç</span>
              </Link>
            )}
            {unreadChatsCount > 0 && (
              <Link
                href="/admin/chats"
                target="_blank"
                rel="noopener noreferrer"
                className="px-3 py-1.5 bg-blue-50 border border-blue-200 text-blue-700 rounded-lg text-xs font-semibold flex items-center gap-2 hover:bg-blue-100 transition-colors"
              >
                <span className="w-2 h-2 rounded-full bg-blue-600" />
                <span>{unreadChatsCount} okunmamış mesaj</span>
              </Link>
            )}

            <button
              onClick={handleLogout}
              disabled={loggingOut}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-rose-50 hover:border-rose-200 hover:text-rose-600 text-slate-600 text-xs font-semibold transition-colors shadow-2xs cursor-pointer"
              title="Çıkış yap"
            >
              {loggingOut ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <LogOut className="w-3.5 h-3.5" />
              )}
              <span>Çıkış yap</span>
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

