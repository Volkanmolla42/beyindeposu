"use client";

import Link from "next/link";
import RoutartLogo from "./RoutartLogo";
import { CheckCircle2, Headphones, MapPin, Mail, Phone, ShieldCheck, ShoppingBag } from "lucide-react";
import { useQuery } from "convex/react";
import { api } from "@convex/_generated/api";
import { SITE_CONTACT } from "@/config/site";

const assurances = [
  { title: "Garantili ürün", detail: "Orijinal parça garantisi", icon: ShieldCheck },
  { title: "Güvenli alışveriş", detail: "%100 müşteri memnuniyeti", icon: CheckCircle2 },
  { title: "Teknik destek", detail: "Uzman ekibimiz yanınızda", icon: Headphones },
  { title: "Toptan satış", detail: "Bayilere özel çözümler", icon: ShoppingBag },
];

export default function Footer() {
  const categories = useQuery(api.categories.list, { onlyActive: true });

  const phone = SITE_CONTACT.phone;
  const email = SITE_CONTACT.email;
  const address = SITE_CONTACT.address;

  return (
    <footer className="mt-auto w-full border-t border-slate-200 bg-white text-slate-700">
      <div className="border-b border-slate-200 bg-slate-50">
        <div className="container grid grid-cols-2 gap-x-5 gap-y-6 py-6 md:grid-cols-4">
          {assurances.map(({ title, detail, icon: Icon }) => (
            <div key={title} className="flex items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-blue-50 text-blue-700">
                <Icon className="h-5 w-5" aria-hidden="true" />
              </div>
              <div>
                <h2 className="text-sm font-medium text-slate-900">{title}</h2>
                <p className="mt-0.5 text-xs leading-5 text-slate-600">{detail}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="container py-10 lg:py-12">
        <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-4 lg:gap-10">
          <div className="space-y-3">
            <Link href="/" className="inline-flex rounded-md">
              <img src="/images/logo_transparent.webp" alt="Beyin Deposu" className="h-9 w-auto object-contain" />
            </Link>
            <p className="text-sm text-slate-600">Oto elektronik modüller.</p>
          </div>

          <div>
            <h2 className="mb-3 text-sm font-medium text-slate-900">Kurumsal</h2>
            <ul className="space-y-2 text-sm text-slate-600">
              <li><Link href="/kurumsal" className="hover:text-blue-700">Hakkımızda</Link></li>
              <li><Link href="/kurumsal#misyon" className="hover:text-blue-700">Vizyon ve misyon</Link></li>
              <li><Link href="/kurumsal#kalite" className="hover:text-blue-700">Kalite politikamız</Link></li>
            </ul>
          </div>

          <div>
            <h2 className="mb-3 text-sm font-medium text-slate-900">Ürünler</h2>
            <ul className="space-y-2 text-sm text-slate-600">
              <li><Link href="/urunler" className="hover:text-blue-700">Tüm ürünler</Link></li>
              {categories?.slice(0, 4).map((category) => (
                <li key={category._id}>
                  <Link href={`/urunler?kategori=${category.slug}`} className="hover:text-blue-700">
                    {category.name}
                  </Link>
                </li>
              ))}
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
        <div className="container flex flex-col items-center justify-between gap-3 py-4 text-xs text-slate-600 sm:flex-row">
          <p>© {new Date().getFullYear()} Beyin Deposu</p>
          <div className="flex items-center gap-4">
            <Link href="/kurumsal#kvkk" className="hover:text-blue-700">KVKK</Link>
            <Link href="/kurumsal" className="hover:text-blue-700">Gizlilik politikası</Link>
          </div>
          <div className="flex items-center gap-2">
            <span>Tasarım ve yazılım</span>
            <RoutartLogo variant="light" showTagline={false} size="sm" />
          </div>
        </div>
      </div>
    </footer>
  );
}
