"use client";

import Link from "next/link";
import {
  Phone,
  Mail,
  MapPin,
  Clock,
  ChevronRight,
  Home,
  ExternalLink,
  Truck,
} from "lucide-react";
import WhatsAppIcon from "@/components/WhatsAppIcon";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { generateWhatsAppLink, formatPhoneNumber } from "@/lib/utils";

export default function IletisimPage() {
  const settings = useQuery(api.siteSettings.get);

  const whatsappNumber = settings?.whatsappNumber || "";
  const displayPhone = settings?.phone || "";
  const displayEmail = settings?.email || "";
  const displayAddress = settings?.address || "";
  const workingHours = settings?.workingHours || "";

  const mapQuery = encodeURIComponent(displayAddress);

  return (
    <div className="min-h-screen flex flex-col bg-slate-50">
      <Header />

      {/* Breadcrumbs */}
      <div className="bg-white border-b border-slate-200 py-3 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto flex items-center gap-2 text-xs font-medium text-slate-500">
          <Link href="/" className="hover:text-blue-600 flex items-center gap-1">
            <Home className="w-3.5 h-3.5" />
            <span>Ana Sayfa</span>
          </Link>
          <ChevronRight className="w-3 h-3 text-slate-400" />
          <span className="text-slate-900 font-bold">İletişim</span>
        </div>
      </div>

      {/* Hero Header */}
      <div className="bg-white border-b border-slate-200 py-10 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto text-center space-y-3">
          <span className="inline-flex items-center gap-1 px-3 py-1 rounded-md bg-blue-50 text-blue-700 text-xs font-bold uppercase">
            Müşteri Hizmetleri & Destek
          </span>
          <h1 className="text-3xl sm:text-4xl font-black text-slate-900 tracking-tight">
            BİZE ULAŞIN
          </h1>
          <p className="text-sm text-slate-500 max-w-xl mx-auto">
            Oto elektronik parçalar, stok bilgisi, fiyat teklifleri veya sipariş sorularınız için bize telefon veya WhatsApp üzerinden doğrudan ulaşabilirsiniz.
          </p>
        </div>
      </div>

      {/* Contact Content Area */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 w-full space-y-10">
        {/* Quick Contact Action Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* WhatsApp Card */}
          <a
            href={generateWhatsAppLink(whatsappNumber)}
            target="_blank"
            rel="noopener noreferrer"
            className="p-6 rounded-2xl bg-emerald-600 text-white shadow-lg shadow-emerald-600/20 flex flex-col justify-between hover:bg-emerald-700 hover:scale-[1.02] transition-all group"
          >
            <div className="space-y-3">
              <div className="w-12 h-12 rounded-xl bg-white/20 flex items-center justify-center">
                <WhatsAppIcon className="w-6 h-6 fill-white text-white" />
              </div>
              <h3 className="text-lg font-black tracking-tight">WhatsApp Hızlı Destek</h3>
              <p className="text-xs text-emerald-100 leading-relaxed">
                Parça kodu, fotoğraf veya şase numarası ile anında fiyat ve stok sorgulaması yapın.
              </p>
            </div>
            <div className="mt-6 pt-4 border-t border-white/20 flex items-center justify-between font-bold text-sm">
              <span>{formatPhoneNumber(whatsappNumber)}</span>
              <ExternalLink className="w-4 h-4 opacity-80 group-hover:translate-x-0.5 transition-transform" />
            </div>
          </a>

          {/* Phone Card */}
          <a
            href={`tel:${displayPhone.replace(/[^0-9+]/g, "")}`}
            className="p-6 rounded-2xl bg-blue-600 text-white shadow-lg shadow-blue-600/20 flex flex-col justify-between hover:bg-blue-700 hover:scale-[1.02] transition-all group"
          >
            <div className="space-y-3">
              <div className="w-12 h-12 rounded-xl bg-white/20 flex items-center justify-center">
                <Phone className="w-6 h-6 text-white" />
              </div>
              <h3 className="text-lg font-black tracking-tight">Müşteri Hizmetleri</h3>
              <p className="text-xs text-blue-100 leading-relaxed">
                Teknik danışmanlarımız ile doğrudan görüşmek ve sipariş vermek için bizi arayın.
              </p>
            </div>
            <div className="mt-6 pt-4 border-t border-white/20 flex items-center justify-between font-bold text-sm">
              <span>{displayPhone}</span>
              <ExternalLink className="w-4 h-4 opacity-80 group-hover:translate-x-0.5 transition-transform" />
            </div>
          </a>

          {/* Email Card */}
          <a
            href={`mailto:${displayEmail}`}
            className="p-6 rounded-2xl bg-slate-900 text-white shadow-lg shadow-slate-900/20 flex flex-col justify-between hover:bg-slate-800 hover:scale-[1.02] transition-all group"
          >
            <div className="space-y-3">
              <div className="w-12 h-12 rounded-xl bg-white/20 flex items-center justify-center">
                <Mail className="w-6 h-6 text-white" />
              </div>
              <h3 className="text-lg font-black tracking-tight">E-Posta / Kurumsal</h3>
              <p className="text-xs text-slate-300 leading-relaxed">
                Toptan alım, bayilik veya kurumsal teklif talepleriniz için bize e-posta iletin.
              </p>
            </div>
            <div className="mt-6 pt-4 border-t border-white/20 flex items-center justify-between font-bold text-sm">
              <span className="truncate">{displayEmail}</span>
              <ExternalLink className="w-4 h-4 opacity-80 group-hover:translate-x-0.5 transition-transform shrink-0" />
            </div>
          </a>
        </div>

        {/* Detailed Info & Map Section */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Info Details */}
          <div className="lg:col-span-5 space-y-4">
            <div className="p-6 rounded-3xl bg-white border border-slate-200 shadow-sm space-y-6">
              <h3 className="font-extrabold text-base text-slate-900 pb-3 border-b border-slate-100">
                Mağaza & Çalışma Bilgileri
              </h3>

              <div className="space-y-5 text-sm">
                <div className="flex items-start gap-4">
                  <div className="w-11 h-11 rounded-2xl bg-slate-100 text-slate-700 flex items-center justify-center shrink-0">
                    <MapPin className="w-5 h-5 text-blue-600" />
                  </div>
                  <div>
                    <span className="text-xs text-slate-500 font-bold uppercase tracking-wider block">Adres</span>
                    <p className="text-slate-900 font-semibold text-sm leading-relaxed mt-1">
                      {displayAddress}
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-4">
                  <div className="w-11 h-11 rounded-2xl bg-slate-100 text-slate-700 flex items-center justify-center shrink-0">
                    <Clock className="w-5 h-5 text-amber-600" />
                  </div>
                  <div>
                    <span className="text-xs text-slate-500 font-bold uppercase tracking-wider block">Çalışma Saatleri</span>
                    <p className="text-slate-900 font-semibold text-sm leading-relaxed mt-1">
                      {workingHours}
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-4">
                  <div className="w-11 h-11 rounded-2xl bg-slate-100 text-slate-700 flex items-center justify-center shrink-0">
                    <Truck className="w-5 h-5 text-emerald-600" />
                  </div>
                  <div>
                    <span className="text-xs text-slate-500 font-bold uppercase tracking-wider block">Kargo & Teslimat</span>
                    <p className="text-slate-900 font-semibold text-sm leading-relaxed mt-1">
                      Hafta içi saat 16:30&apos;a kadar verilen siparişler aynı gün kargoya teslim edilir.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Map Section */}
          <div className="lg:col-span-7">
            <div className="rounded-3xl bg-white border border-slate-200 shadow-sm overflow-hidden h-[340px] lg:h-full min-h-[340px]">
              <iframe
                title="Konum Haritası"
                src={`https://maps.google.com/maps?q=${mapQuery}&t=&z=15&ie=UTF8&iwloc=&output=embed`}
                className="w-full h-full border-0 min-h-[340px]"
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
              />
            </div>
          </div>
        </div>
      </div>

      <Footer />
    </div>
  );
}
