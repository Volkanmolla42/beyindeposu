"use client";

import Image from "next/image";
import Link from "next/link";
import RoutartLogo from "./RoutartLogo";
import { MapPin, Mail, Phone } from "lucide-react";
import { useQuery } from "convex/react";
import { api } from "@convex/_generated/api";
import { SITE_CONTACT } from "@/config/site";

export default function Footer() {
  const categories = useQuery(api.categories.list, { onlyActive: true });

  const phone = SITE_CONTACT.phone;
  const email = SITE_CONTACT.email;
  const address = SITE_CONTACT.address;

  return (
    <footer className="mt-auto w-full border-t border-slate-200 bg-white text-slate-700">
      <div className="container py-10 lg:py-12">
        <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-4 lg:gap-10">
          <div className="space-y-3">
            <Link href="/" aria-label="Beyin Deposu ana sayfa" className="inline-flex rounded-md">
              <Image
                src="/images/logo_transparent.webp"
                alt="Beyin Deposu"
                width={144}
                height={36}
                style={{ width: "auto" }}
                className="h-9 w-auto object-contain"
              />
            </Link>
          </div>

          <div>
            <h2 className="mb-3 text-sm font-medium text-slate-900">Kurumsal</h2>
            <ul className="space-y-2 text-sm text-slate-600">
              <li><Link href="/kurumsal" className="hover:text-blue-700">Hakkımızda</Link></li>
              <li><Link href="/kurumsal#kalite" className="hover:text-blue-700">Ürün kontrolü</Link></li>
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
        <div className="container flex flex-col items-center justify-between gap-3 py-4 text-xs text-slate-600 sm:flex-row sm:pr-44">
          <p>© {new Date().getFullYear()} Beyin Deposu</p>
          <div className="flex items-center gap-4">
            <Link href="/kurumsal#kvkk" className="hover:text-blue-700">KVKK</Link>
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
