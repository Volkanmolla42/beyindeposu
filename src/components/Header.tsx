"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { Search, Menu, X } from "lucide-react";
import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";

export default function Header() {
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchInput, setSearchInput] = useState("");

  const settings = useQuery(api.siteSettings.get);

  const navLinks = [
    { href: "/", label: "ANA SAYFA" },
    { href: "/kurumsal", label: "KURUMSAL" },
    { href: "/urunler", label: "ÜRÜNLER" },
    { href: "/markalar", label: "MARKALAR" },
    { href: "/iletisim", label: "İLETİŞİM" },
  ];

  return (
    <header className="sticky top-0 z-50 w-full bg-white border-b border-slate-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 sm:h-18">
          {/* Official Beyin Deposu Logo */}
          <Link href="/" className="flex items-center group py-1">
            <img
              src="/images/logo_transparent.webp"
              alt="Beyin Deposu Logo"
              className="h-10 sm:h-12 w-auto object-contain"
            />
          </Link>

          {/* Desktop Navigation Links matching Screenshot */}
          <nav className="hidden md:flex items-center gap-8 text-[13px] font-extrabold tracking-wider">
            {navLinks.map((link) => {
              const isActive =
                link.href === "/"
                  ? pathname === "/"
                  : pathname.startsWith(link.href);
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`relative py-1 transition-colors ${
                    isActive
                      ? "text-blue-600 font-black after:absolute after:bottom-0 after:left-0 after:right-0 after:h-0.5 after:bg-blue-600"
                      : "text-slate-700 hover:text-blue-600"
                  }`}
                >
                  {link.label}
                </Link>
              );
            })}
          </nav>

          {/* Right Action Icons: Search Icon & Admin Link */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => setSearchOpen(!searchOpen)}
              className="p-2 text-slate-600 hover:text-blue-600 hover:bg-slate-100 rounded-full transition-colors cursor-pointer"
              aria-label="Arama"
            >
              <Search className="w-5 h-5" />
            </button>

            {/* Mobile Menu Button */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden p-2 text-slate-700 hover:bg-slate-100 rounded-lg cursor-pointer"
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>

        {/* Search Bar Dropdown when search icon clicked */}
        {searchOpen && (
          <div className="py-3 pb-4 border-t border-slate-100 animate-in fade-in-0 duration-150">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (searchInput.trim()) {
                  window.location.href = `/urunler?q=${encodeURIComponent(searchInput.trim())}`;
                }
              }}
              className="flex items-center gap-2 max-w-xl mx-auto"
            >
              <input
                type="text"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                placeholder="OEM No, Bosch No veya Araç Modeli Yazın..."
                className="w-full px-4 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:border-blue-600 uppercase font-mono"
                autoFocus
              />
              <button
                type="submit"
                className="px-5 py-2 bg-blue-600 text-white rounded-lg text-sm font-bold hover:bg-blue-700 cursor-pointer shrink-0"
              >
                Ara
              </button>
            </form>
          </div>
        )}
      </div>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="md:hidden bg-white border-t border-slate-200 px-4 py-4 space-y-2">
          {navLinks.map((link) => {
            const isActive =
              link.href === "/"
                ? pathname === "/"
                : pathname.startsWith(link.href);
            return (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setMobileMenuOpen(false)}
                className={`block px-3 py-2 rounded-lg text-sm font-bold ${
                  isActive
                    ? "text-blue-600 bg-blue-50"
                    : "text-slate-700 hover:bg-slate-50"
                }`}
              >
                {link.label}
              </Link>
            );
          })}
        </div>
      )}
    </header>
  );
}
