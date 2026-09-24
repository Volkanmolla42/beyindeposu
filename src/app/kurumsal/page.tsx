"use client";

import Link from "next/link";
import {
  ShieldCheck,
  Award,
  Users,
  Target,
  CheckCircle2,
  ChevronRight,
  Home,
  Cpu,
  Zap,
  Building,
} from "lucide-react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";

import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";

export default function KurumsalPage() {
  const experienceYears = "20+";
  const productsCount = "15.000+";

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
          <span className="text-slate-900 font-bold">Kurumsal</span>
        </div>
      </div>

      {/* Hero Banner */}
      <section className="bg-[#070e1a] text-white py-16 px-4 sm:px-6 lg:px-8 tech-grid-dark relative overflow-hidden">
        <div className="max-w-4xl mx-auto text-center space-y-4 relative z-10">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-950 border border-blue-500/30 text-blue-300 text-xs font-bold uppercase">
            <Building className="w-3.5 h-3.5" />
            <span>BEYİN DEPOSU HAKKINDA</span>
          </div>
          <h1 className="text-3xl sm:text-5xl font-black tracking-tight text-white">
            {experienceYears} Yıllık Tecrübe ile{" "}
            <span className="text-blue-400">Oto Elektronik Güvencesi</span>
          </h1>
          <p className="text-sm sm:text-base text-slate-300 max-w-2xl mx-auto leading-relaxed">
            Türkiye&apos;nin dört bir yanındaki oto servislerine, ustalara ve araç sahiplerine orijinal oto elektronik modülleri ve motor beyinleri tedarik ediyoruz.
          </p>
        </div>
      </section>

      {/* Main Content */}
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-14 space-y-16">
        {/* About Section */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-10 items-center">
          <div className="space-y-4">
            <h2 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
              Hakkımızda
            </h2>
            <p className="text-sm text-slate-600 leading-relaxed">
              <strong>Beyin Deposu</strong>, otomotiv elektronik sektöründe {experienceYears} yılı aşkın tecrübesiyle motor kontrol üniteleri (ECU), ABS/ESP fren modülleri, Airbag güvenlik beyinleri, BCM/BSI gövde modülleri ve şanzıman mekatronik beyinleri tedariğinde Türkiye&apos;nin öncü kuruluşlarındandır.
            </p>
            <p className="text-sm text-slate-600 leading-relaxed">
              Geniş merkez depomuzda yer alan {productsCount}&apos;in üzerinde hazır stok ile arızalı veya hasarlı araçların en kısa sürede orijinal parçalarına kavuşmasını sağlıyoruz.
            </p>
            <div className="pt-2 flex flex-wrap gap-2 text-xs">
              <span className="px-3 py-1.5 rounded-lg bg-blue-50 text-blue-800 font-bold border border-blue-100 flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-blue-600" />
                {productsCount} Stoklu Ürün
              </span>
              <span className="px-3 py-1.5 rounded-lg bg-emerald-50 text-emerald-800 font-bold border border-emerald-100 flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-emerald-600" />
                Orijinal ve Garantili
              </span>
            </div>
          </div>

          <div className="rounded-3xl bg-slate-900 p-3 shadow-xl border border-slate-800">
            <img
              src="https://images.unsplash.com/photo-1581092160607-ee22621dd758?auto=format&fit=crop&q=80&w=800"
              alt="Oto Elektronik Merkezi"
              className="w-full h-72 object-cover rounded-2xl"
            />
          </div>
        </div>

        {/* Mission & Vision */}
        <div id="misyon" className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="p-8 rounded-3xl bg-white border border-slate-200 shadow-sm space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600">
              <Target className="w-6 h-6" />
            </div>
            <h3 className="text-xl font-bold text-slate-900">Misyonumuz</h3>
            <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
              Otomotiv sektöründe artan elektronik karmaşıklığa karşın, müşterilerimize en doğru OEM kodlu parçayı en hızlı ve ekonomik şekilde ulaştırmak; araçların güvenle yola devam etmesini sağlamaktır.
            </p>
          </div>

          <div className="p-8 rounded-3xl bg-white border border-slate-200 shadow-sm space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600">
              <Award className="w-6 h-6" />
            </div>
            <h3 className="text-xl font-bold text-slate-900">Vizyonumuz</h3>
            <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
              Genişleyen ürün portföyü ve uzman kadromuz ile Türkiye ve çevre ülkelerde oto elektronik ve mekatronik parçalar alanında 1 numaralı referans merkezi olmak.
            </p>
          </div>
        </div>

        {/* Kalite Politikamız */}
        <div id="kalite" className="p-8 sm:p-10 rounded-3xl bg-slate-900 text-white space-y-6">
          <div className="space-y-2">
            <span className="text-xs font-mono uppercase tracking-widest text-blue-400">
              GÜVEN & KALİTE
            </span>
            <h3 className="text-2xl font-black">Hizmet ve Kalite Standartlarımız</h3>
            <p className="text-xs sm:text-sm text-slate-300 max-w-2xl leading-relaxed">
              Müşterilerimize sunduğumuz her üründe en yüksek standartları ve memnuniyeti hedefliyoruz:
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
            <div className="p-4 rounded-xl bg-slate-800/80 border border-slate-700 space-y-1.5">
              <h5 className="font-bold text-white text-sm">1. Orijinal Ürün Kontrolü</h5>
              <p className="text-slate-400">
                Tüm parçaların OEM kodları, etiket ve fiziksel bütünlükleri detaylıca kontrol edilir.
              </p>
            </div>
            <div className="p-4 rounded-xl bg-slate-800/80 border border-slate-700 space-y-1.5">
              <h5 className="font-bold text-white text-sm">2. Doğru Parça Eşleştirme</h5>
              <p className="text-slate-400">
                Şase numarası ve parça kodu uyumluluğu uzman ekibimiz tarafından teyit edilir.
              </p>
            </div>
            <div className="p-4 rounded-xl bg-slate-800/80 border border-slate-700 space-y-1.5">
              <h5 className="font-bold text-white text-sm">3. Güvenli Paketleme</h5>
              <p className="text-slate-400">
                Antistatik koruyucu ambalajlar ve darbe emici özel kutularla aynı gün kargolanır.
              </p>
            </div>
          </div>
        </div>

        {/* KVKK / Privacy placeholder anchor */}
        <div id="kvkk" className="p-6 rounded-2xl bg-white border border-slate-200 text-xs text-slate-600 space-y-2">
          <h4 className="font-bold text-slate-900">KVKK ve Kişisel Verilerin Korunması</h4>
          <p>
            Beyin Deposu olarak kişisel verilerinizin güvenliğine büyük önem vermekteyiz. Web sitemiz üzerinden yapılan tüm bilgi ve sipariş talepleri 6698 sayılı Kişisel Verilerin Korunması Kanunu&apos;na uygun olarak işlenmektedir.
          </p>
        </div>
      </div>

      <Footer />
    </div>
  );
}
