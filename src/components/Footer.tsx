"use client";

import { useRef } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import RoutartLogo from "./RoutartLogo";
import { MapPin, Mail, Phone } from "lucide-react";
import { useContactSettings } from "@/hooks/useContactSettings";
import { openAnalyticsPreferences } from "@/lib/analytics";
import AutomotiveStripe from "@/components/ui/AutomotiveStripe";

export default function Footer() {
  const { phoneNumber: phone, email, address } = useContactSettings();
  const router = useRouter();
  const clickCountRef = useRef(0);
  const clickTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const handleLogoClick = (e: React.MouseEvent) => {
    clickCountRef.current += 1;

    if (clickTimeoutRef.current) {
      clearTimeout(clickTimeoutRef.current);
    }

    if (clickCountRef.current >= 5) {
      e.preventDefault();
      clickCountRef.current = 0;
      router.push("/admin");
      return;
    }

    clickTimeoutRef.current = setTimeout(() => {
      clickCountRef.current = 0;
    }, 1500);
  };

  return (
    <footer className="mt-auto w-full bg-dark-bg text-slate-400">
      <AutomotiveStripe size="lg" />
      <div className="container py-10 lg:py-12">
        <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-4 lg:gap-10">
          <div className="space-y-3">
            <Link
              href="/"
              aria-label="Beyin Deposu ana sayfa"
              className="inline-flex rounded-md select-none"
              onClick={handleLogoClick}
            >
              <Image
                src="/images/logo_transparent.webp"
                alt="Beyin Deposu"
                width={144}
                height={36}
                style={{ width: "auto" }}
                className="h-9 w-auto object-contain pointer-events-none brightness-0 invert"
              />
            </Link>
            <p className="text-xs font-medium text-slate-400">
              Oto elektronik ve kontrol üniteleri
            </p>
          </div>

          <div>
            <h2 className="mb-3 text-sm font-semibold tracking-wide text-white">Kurumsal</h2>
            <ul className="space-y-2 text-sm text-slate-400">
              <li><Link href="/hakkimizda" className="transition-colors hover:text-amber-400">Hakkımızda</Link></li>
              <li><Link href="/hakkimizda#kalite" className="transition-colors hover:text-amber-400">Parça kontrolü ve garanti</Link></li>
            </ul>
          </div>

          <div>
            <h2 className="mb-3 text-sm font-semibold tracking-wide text-white">Parçalar & Rehberler</h2>
            <ul className="space-y-2 text-sm text-slate-400">
              <li><Link href="/parcalar" className="transition-colors hover:text-amber-400">Tüm parçalar</Link></li>
              <li><Link href="/kategoriler" className="transition-colors hover:text-amber-400">Kategoriler</Link></li>
              <li><Link href="/markalar" className="transition-colors hover:text-amber-400">Araç markaları</Link></li>
              <li><Link href="/ariza-kodlari" className="transition-colors hover:text-amber-400">OBD Arıza Kodları</Link></li>
              <li><Link href="/blog" className="transition-colors hover:text-amber-400">Blog</Link></li>
            </ul>
          </div>

          <div>
            <h2 className="mb-3 text-sm font-semibold tracking-wide text-white">İletişim</h2>
            <ul className="space-y-2.5 text-sm text-slate-400">
              {phone && <li className="flex items-center gap-2"><Phone className="h-4 w-4 shrink-0 text-amber-400" /><span>{phone}</span></li>}
              {email && <li className="flex items-center gap-2"><Mail className="h-4 w-4 shrink-0 text-amber-400" /><span className="break-all">{email}</span></li>}
              {address && <li className="flex items-start gap-2"><MapPin className="mt-0.5 h-4 w-4 shrink-0 text-amber-400" /><span>{address}</span></li>}
            </ul>
          </div>
        </div>
      </div>

      <div className="border-t border-white/10 bg-dark-bg">
        <div className="container flex flex-col items-center justify-between gap-3 py-4 text-xs text-slate-400 sm:flex-row sm:pr-44">
          <p suppressHydrationWarning>© {new Date().getFullYear()} Beyin Deposu</p>
          <div className="flex items-center gap-4">
            <Link href="/gizlilik" className="transition-colors hover:text-amber-400">KVKK ve gizlilik</Link>
            <button type="button" onClick={openAnalyticsPreferences} className="transition-colors hover:text-amber-400">Çerez tercihleri</button>
          </div>
          <div className="flex items-center gap-1.5 text-slate-500">
            <span>Tasarım ve yazılım</span>
            <a
              href="https://www.volkanmolla.com/"
              target="_blank"
              rel="noopener noreferrer"
              className="font-medium text-slate-300 transition-colors hover:text-amber-400"
            >
              Volkan Molla
            </a>
            <span>&</span>
            <RoutartLogo variant="dark" showTagline={false} size="sm" />
          </div>
        </div>
      </div>
    </footer>
  );
}
