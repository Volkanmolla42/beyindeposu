"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import { Menu, Search, X } from "lucide-react";

const navLinks = [
  { href: "/", label: "Ana sayfa" },
  { href: "/kurumsal", label: "Hakkımızda" },
  { href: "/parcalar", label: "Parçalar" },
  { href: "/kategoriler", label: "Kategoriler" },
  { href: "/markalar", label: "Markalar" },
  { href: "/iletisim", label: "İletişim" },
];

export default function Header() {
  const pathname = usePathname();
  const router = useRouter();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchInput, setSearchInput] = useState("");

  const handleSearchSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (searchInput.trim()) {
      router.push(`/parcalar?q=${encodeURIComponent(searchInput.trim())}`);
    }
  };

  return (
    <header className="sticky top-0 z-50 w-full border-b border-slate-200 bg-white/95 backdrop-blur">
      <div className="container">
        <div className="flex h-16 items-center justify-between sm:h-[72px]">
          <Link href="/" aria-label="Beyin Deposu ana sayfa" className="flex shrink-0 items-center rounded-lg focus-visible:outline-none">
            <Image
              src="/images/logo_transparent.webp"
              alt="Beyin Deposu ana sayfa"
              width={160}
              height={40}
              priority
              style={{ width: "auto" }}
              className="h-9 w-auto object-contain sm:h-10"
            />
          </Link>

          <nav aria-label="Ana menü" className="hidden items-center gap-1 lg:flex">
            {navLinks.map((link) => {
              const isActive = link.href === "/" ? pathname === "/" : pathname.startsWith(link.href);
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  aria-current={isActive ? "page" : undefined}
                  className={`rounded-full px-4 py-2 text-sm font-medium transition-colors ${isActive
                    ? "bg-blue-50 text-blue-800"
                    : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                    }`}
                >
                  {link.label}
                </Link>
              );
            })}
          </nav>

          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => setSearchOpen((open) => !open)}
              aria-label={searchOpen ? "Aramayı kapat" : "Arama"}
              aria-expanded={searchOpen}
              className="flex h-10 w-10 items-center justify-center rounded-full text-slate-600 transition-colors hover:bg-slate-100 hover:text-blue-700"
            >
              {searchOpen ? <X className="h-5 w-5" /> : <Search className="h-5 w-5" />}
            </button>
            <button
              type="button"
              onClick={() => setMobileMenuOpen((open) => !open)}
              aria-label={mobileMenuOpen ? "Menüyü kapat" : "Menüyü aç"}
              aria-expanded={mobileMenuOpen}
              className="flex h-10 w-10 items-center justify-center rounded-full text-slate-700 transition-colors hover:bg-slate-100 lg:hidden"
            >
              {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>
        </div>

        {searchOpen && (
          <div className="border-t border-slate-100 py-3 sm:py-4">
            <form onSubmit={handleSearchSubmit} className="mx-auto flex max-w-2xl items-center gap-2 rounded-full border border-slate-300 bg-slate-50 p-1.5 focus-within:border-blue-500 focus-within:bg-white focus-within:ring-2 focus-within:ring-blue-100">
              <Search className="ml-3 h-5 w-5 shrink-0 text-slate-500" aria-hidden="true" />
              <input
                id="header-search-input"
                name="header-search"
                type="search"
                value={searchInput}
                onChange={(event) => setSearchInput(event.target.value)}
                placeholder="OEM no, parça no veya araç modeli"
                aria-label="Parça ara"
                className="min-w-0 flex-1 bg-transparent px-1 py-2 text-sm text-slate-900 outline-none placeholder:text-slate-500"
                autoFocus
              />
              <button type="submit" className="rounded-full bg-blue-600 px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-blue-700">
                Ara
              </button>
            </form>
          </div>
        )}

        {mobileMenuOpen && (
          <nav aria-label="Mobil menü" className="space-y-1 border-t border-slate-100 py-3 lg:hidden">
            {navLinks.map((link) => {
              const isActive = link.href === "/" ? pathname === "/" : pathname.startsWith(link.href);
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  aria-current={isActive ? "page" : undefined}
                  onClick={() => setMobileMenuOpen(false)}
                  className={`block rounded-full px-4 py-3 text-sm font-medium ${isActive ? "bg-blue-50 text-blue-800" : "text-slate-700 hover:bg-slate-100"
                    }`}
                >
                  {link.label}
                </Link>
              );
            })}
          </nav>
        )}
      </div>
    </header>
  );
}
