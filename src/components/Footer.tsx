"use client";

import { useRef } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import RoutartLogo from "./RoutartLogo";
import { MapPin, Mail, Phone } from "lucide-react";
import { SITE_CONTACT } from "@/config/site";
import { openAnalyticsPreferences } from "@/lib/analytics";

export default function Footer() {
  const phone = SITE_CONTACT.phoneNumber;
  const email = SITE_CONTACT.email;
  const address = SITE_CONTACT.address;
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

    // 1.5 saniye yeni tıklama gelmezse sayacı sıfırla
    clickTimeoutRef.current = setTimeout(() => {
      clickCountRef.current = 0;
    }, 1500);
  };

  return (
    <footer className="mt-auto py-8 w-full border-t border-slate-200 bg-white text-slate-700">
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
                className="h-9 w-auto object-contain pointer-events-none"
              />
            </Link>
          </div>

          <div>
            <h2 className="mb-3 text-sm font-medium text-slate-900">Kurumsal</h2>
            <ul className="space-y-2 text-sm text-slate-600">
              <li><Link href="/kurumsal" className="hover:text-blue-700">Hakkımızda</Link></li>
              <li><Link href="/kurumsal#kalite" className="hover:text-blue-700">Parça kontrolü</Link></li>
            </ul>
          </div>

          <div>
            <h2 className="mb-3 text-sm font-medium text-slate-900">Parçalar</h2>
            <ul className="space-y-2 text-sm text-slate-600">
              <li><Link href="/parcalar" className="hover:text-blue-700">Tüm parçalar</Link></li>
              <li><Link href="/kategoriler" className="hover:text-blue-700">Kategoriler</Link></li>
            </ul>
          </div>

          <div>
            <h2 className="mb-3 text-sm font-medium text-slate-900">İletişim</h2>
            <ul className="space-y-2.5 text-sm text-slate-600">
              {phone && <li className="flex items-center gap-2"><Phone className="h-4 w-4 shrink-0 text-blue-700" /><span>{phone}</span></li>}
              {email && <li className="flex items-center gap-2"><Mail className="h-4 w-4 shrink-0 text-blue-700" /><span className="break-all">{email}</span></li>}
              {address && <li className="flex items-start gap-2"><MapPin className="mt-0.5 h-4 w-4 shrink-0 text-blue-700" /><span>{address}</span></li>}
            </ul>
          </div>
        </div>
      </div>

      <div className="border-t border-slate-200 bg-slate-50">
        <div className="container flex flex-col items-center justify-between gap-3 py-4 text-xs text-slate-600 sm:flex-row sm:pr-44">
          <p>© {new Date().getFullYear()} Beyin Deposu</p>
          <div className="flex items-center gap-4">
            <Link href="/gizlilik" className="hover:text-blue-700">KVKK ve gizlilik</Link>
            <button type="button" onClick={openAnalyticsPreferences} className="hover:text-blue-700">Çerez tercihleri</button>
          </div>
          <div className="flex items-center gap-1.5">
            <span>Tasarım ve yazılım</span>
            <a
              href="https://www.volkanmolla.com/"
              target="_blank"
              rel="noopener noreferrer"
              className="font-medium text-slate-900 hover:text-blue-700 transition-colors"
            >
              Volkan Molla
            </a>
            <span>&</span>
            <RoutartLogo variant="light" showTagline={false} size="sm" />
          </div>
        </div>
      </div>
    </footer>
  );
}
