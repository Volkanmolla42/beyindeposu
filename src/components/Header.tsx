"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Suspense } from "react";
import { useState } from "react";
import { Menu, Search, X } from "lucide-react";

const navLinks = [
  { href: "/", label: "Ana sayfa" },
  { href: "/parcalar", label: "Parçalar" },
  { href: "/kategoriler", label: "Kategoriler" },
  { href: "/markalar", label: "Markalar" },
  { href: "/tamirveservis", label: "Tamir & Servis" },
  { href: "/ariza-kodlari", label: "OBD Kodları" },
  { href: "/blog", label: "Arızalar & Çözümler" },
  { href: "/iletisim", label: "İletişim" },
];

export default function Header() {
  const router = useRouter();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchInput, setSearchInput] = useState("");

  const handleSearchSubmit = (event: React.SubmitEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (searchInput.trim()) {
      router.push(`/parcalar?q=${encodeURIComponent(searchInput.trim())}`);
    }
  };

  return (
    <header className="sticky top-0 z-50 w-full border-b border-white/10 bg-dark-bg/95 text-white backdrop-blur">
      <div className="container">
        <div className="flex h-16 items-center justify-between sm:h-[72px]">
          <Link href="/" aria-label="Beyin Deposu ana sayfa" className="flex shrink-0 items-center rounded-lg focus-visible:outline-none">
            <Image
              src="/images/logo_transparent.webp"
              alt="Beyin Deposu ana sayfa"
              width={160}
              height={40}
              preload
              loading="eager"
              style={{ width: "auto" }}
              className="h-9 w-auto object-contain sm:h-10 brightness-0 invert"
            />
          </Link>

          <Suspense fallback={<NavigationLinksFallback />}>
            <DesktopNavigation />
          </Suspense>

          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => setSearchOpen((open) => !open)}
              aria-label={searchOpen ? "Aramayı kapat" : "Arama"}
              aria-expanded={searchOpen}
              className="flex h-10 w-10 items-center justify-center rounded-full text-slate-300 transition-colors hover:bg-white/10 hover:text-amber-400"
            >
              {searchOpen ? <X className="h-5 w-5" /> : <Search className="h-5 w-5" />}
            </button>
            <button
              type="button"
              onClick={() => setMobileMenuOpen((open) => !open)}
              aria-label={mobileMenuOpen ? "Menüyü kapat" : "Menüyü aç"}
              aria-expanded={mobileMenuOpen}
              className="flex h-10 w-10 items-center justify-center rounded-full text-slate-300 transition-colors hover:bg-white/10 hover:text-white lg:hidden"
            >
              {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>
        </div>

        {searchOpen && (
          <div className="border-t border-white/10 bg-dark-surface py-3 sm:py-4">
            <form onSubmit={handleSearchSubmit} className="mx-auto flex max-w-2xl items-center gap-2 rounded-full border border-white/20 bg-white/5 p-1.5 focus-within:border-amber-400 focus-within:bg-black/60 focus-within:ring-2 focus-within:ring-amber-400/20">
              <Search className="ml-3 h-5 w-5 shrink-0 text-slate-400" aria-hidden="true" />
              <input
                id="header-search-input"
                name="header-search"
                type="search"
                value={searchInput}
                onChange={(event) => setSearchInput(event.target.value)}
                placeholder="OEM no, parça no veya araç modeli"
                aria-label="Parça ara"
                className="min-w-0 flex-1 border-0 bg-transparent px-2 py-2 text-sm text-white placeholder:text-slate-400 focus:outline-none focus:ring-0 focus-visible:outline-none focus-visible:ring-0"
                autoFocus
              />
              <button type="submit" className="rounded-full bg-amber-500 px-5 py-2.5 text-sm font-semibold text-slate-950 transition-colors hover:bg-amber-400 active:bg-amber-600">
                Ara
              </button>
            </form>
          </div>
        )}

        {mobileMenuOpen && (
          <Suspense fallback={<MobileNavigationFallback />}>
            <MobileNavigation onNavigate={() => setMobileMenuOpen(false)} />
          </Suspense>
        )}
      </div>
    </header>
  );
}

function DesktopNavigation() {
  const pathname = usePathname();

  return (
    <nav aria-label="Ana menü" className="hidden items-center gap-1.5 lg:flex">
      {navLinks.map((link) => {
        const isActive = link.href === "/" ? pathname === "/" : pathname.startsWith(link.href);

        return (
          <Link
            key={link.href}
            href={link.href}
            aria-current={isActive ? "page" : undefined}
            className={`relative px-3.5 py-2 text-sm font-medium transition-colors ${isActive
              ? "text-amber-400 font-semibold after:absolute after:bottom-0 after:left-3 after:right-3 after:h-0.5 after:bg-amber-400"
              : "text-slate-300 hover:text-white hover:bg-white/5 rounded-lg"
              }`}
          >
            {link.label}
          </Link>
        );
      })}
    </nav>
  );
}

function NavigationLinksFallback() {
  return (
    <nav aria-label="Ana menü" className="hidden items-center gap-1.5 lg:flex">
      {navLinks.map((link) => (
        <Link
          key={link.href}
          href={link.href}
          className="rounded-lg px-3.5 py-2 text-sm font-medium text-slate-300 hover:bg-white/5 hover:text-white"
        >
          {link.label}
        </Link>
      ))}
    </nav>
  );
}

function MobileNavigation({ onNavigate }: { onNavigate: () => void }) {
  const pathname = usePathname();

  return (
    <nav aria-label="Mobil menü" className="space-y-1 border-t border-white/10 bg-dark-bg py-3 lg:hidden">
      {navLinks.map((link) => {
        const isActive = link.href === "/" ? pathname === "/" : pathname.startsWith(link.href);

        return (
          <Link
            key={link.href}
            href={link.href}
            aria-current={isActive ? "page" : undefined}
            onClick={onNavigate}
            className={`block rounded-xl px-4 py-3 text-sm font-medium transition-colors ${isActive
              ? "bg-amber-500/15 text-amber-400 font-semibold border-l-2 border-amber-400"
              : "text-slate-300 hover:bg-white/5 hover:text-white"
              }`}
          >
            {link.label}
          </Link>
        );
      })}
    </nav>
  );
}

function MobileNavigationFallback() {
  return (
    <nav aria-label="Mobil menü" className="space-y-1 border-t border-white/10 bg-dark-bg py-3 lg:hidden">
      {navLinks.map((link) => (
        <Link
          key={link.href}
          href={link.href}
          className="block rounded-xl px-4 py-3 text-sm font-medium text-slate-300 hover:bg-white/5"
        >
          {link.label}
        </Link>
      ))}
    </nav>
  );
}
