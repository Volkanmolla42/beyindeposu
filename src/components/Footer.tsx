"use client";

import Link from "next/link";
import RoutartLogo from "./RoutartLogo";
import {
  ShieldCheck,
  CheckCircle2,
  Headphones,
  ShoppingBag,
  Phone,
  Mail,
  MapPin,
} from "lucide-react";
import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";

export default function Footer() {
  const settings = useQuery(api.siteSettings.get);
  const categories = useQuery(api.categories.list, { onlyActive: true });

  const phone = settings?.phone || "";
  const email = settings?.email || "";
  const address = settings?.address || "";

  return (
    <footer className="w-full bg-[#050b14] text-slate-300 border-t border-slate-900 mt-auto">
      {/* 1. Feature Guarantee Ribbon */}
      <div className="w-full bg-[#081220] border-b border-slate-800/80 py-6 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-6 text-center md:text-left">
          <div className="flex items-center justify-center md:justify-start gap-3">
            <div className="w-9 h-9 rounded-lg bg-blue-950/80 border border-blue-800/50 flex items-center justify-center text-blue-400 shrink-0">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h5 className="font-extrabold text-xs text-white uppercase tracking-wider">GARANTİLİ ÜRÜN</h5>
              <p className="text-[11px] text-slate-400">Orijinal parça garantisi</p>
            </div>
          </div>

          <div className="flex items-center justify-center md:justify-start gap-3">
            <div className="w-9 h-9 rounded-lg bg-blue-950/80 border border-blue-800/50 flex items-center justify-center text-blue-400 shrink-0">
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <div>
              <h5 className="font-extrabold text-xs text-white uppercase tracking-wider">GÜVENLİ ALIŞVERİŞ</h5>
              <p className="text-[11px] text-slate-400">%100 müşteri memnuniyeti</p>
            </div>
          </div>

          <div className="flex items-center justify-center md:justify-start gap-3">
            <div className="w-9 h-9 rounded-lg bg-blue-950/80 border border-blue-800/50 flex items-center justify-center text-blue-400 shrink-0">
              <Headphones className="w-5 h-5" />
            </div>
            <div>
              <h5 className="font-extrabold text-xs text-white uppercase tracking-wider">TEKNİK DESTEK</h5>
              <p className="text-[11px] text-slate-400">Uzman ekibimiz yanınızda</p>
            </div>
          </div>

          <div className="flex items-center justify-center md:justify-start gap-3">
            <div className="w-9 h-9 rounded-lg bg-blue-950/80 border border-blue-800/50 flex items-center justify-center text-blue-400 shrink-0">
              <ShoppingBag className="w-5 h-5" />
            </div>
            <div>
              <h5 className="font-extrabold text-xs text-white uppercase tracking-wider">TOPTAN SATIŞ</h5>
              <p className="text-[11px] text-slate-400">Bayilere özel çözümler</p>
            </div>
          </div>
        </div>
      </div>

      {/* 2. Main 4-Column Footer */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {/* Column 1: Logo & Slogan */}
          <div className="space-y-4">
            <Link href="/" className="inline-block">
              <img
                src="/images/logo_white.png"
                alt="Beyin Deposu"
                className="h-10 sm:h-11 w-auto object-contain"
              />
            </Link>
            <p className="text-xs text-slate-400 leading-relaxed">
              Oto elektronik parçalar konusunda güvenilir çözüm ortağınız.
            </p>
          </div>

          {/* Column 2: KURUMSAL */}
          <div className="space-y-3">
            <h4 className="font-extrabold text-xs uppercase tracking-wider text-white">
              KURUMSAL
            </h4>
            <ul className="space-y-2 text-xs text-slate-400">
              <li><Link href="/kurumsal" className="hover:text-white transition-colors">Hakkımızda</Link></li>
              <li><Link href="/kurumsal#misyon" className="hover:text-white transition-colors">Vizyon &amp; Misyon</Link></li>
              <li><Link href="/kurumsal#kalite" className="hover:text-white transition-colors">Kalite Politikamız</Link></li>
              <li><Link href="/kurumsal" className="hover:text-white transition-colors">İnsan Kaynakları</Link></li>
            </ul>
          </div>

          {/* Column 3: ÜRÜNLER (Dynamic from Convex) */}
          <div className="space-y-3">
            <h4 className="font-extrabold text-xs uppercase tracking-wider text-white">
              ÜRÜNLER
            </h4>
            <ul className="space-y-2 text-xs text-slate-400">
              <li><Link href="/urunler" className="hover:text-white transition-colors">Tüm Ürünler</Link></li>
              {categories && categories.length > 0 ? (
                categories.slice(0, 4).map((c) => (
                  <li key={c._id}>
                    <Link href={`/urunler?kategori=${c.slug}`} className="hover:text-white transition-colors">
                      {c.name}
                    </Link>
                  </li>
                ))
              ) : null}
            </ul>
          </div>

          {/* Column 4: BİZE ULAŞIN */}
          <div className="space-y-3">
            <h4 className="font-extrabold text-xs uppercase tracking-wider text-white">
              BİZE ULAŞIN
            </h4>
            <ul className="space-y-2.5 text-xs text-slate-400">
              <li className="flex items-center gap-2">
                <Phone className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                <span>{phone}</span>
              </li>
              <li className="flex items-center gap-2">
                <Mail className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                <span>{email}</span>
              </li>
              <li className="flex items-start gap-2">
                <MapPin className="w-3.5 h-3.5 text-blue-400 shrink-0 mt-0.5" />
                <span className="leading-tight">{address}</span>
              </li>
            </ul>
          </div>
        </div>
      </div>

      {/* 3. Copyright Bottom Bar */}
      <div className="w-full bg-[#02060d] border-t border-slate-900 py-4 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 text-[11px] text-slate-500">
          <p>© {new Date().getFullYear()} Beyin Deposu. Tüm hakları saklıdır.</p>
          <div className="flex items-center gap-4">
            <Link href="/kurumsal#kvkk" className="hover:text-slate-300 transition-colors">KVKK</Link>
            <Link href="/kurumsal" className="hover:text-slate-300 transition-colors">Gizlilik Politikası</Link>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[11px] text-slate-500">Tasarım & Yazılım:</span>
            <RoutartLogo variant="dark" showTagline={false} size="sm" />
          </div>
        </div>
      </div>
    </footer>
  );
}
