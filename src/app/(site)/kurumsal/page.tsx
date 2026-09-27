import Image from "next/image";
import Link from "next/link";
import {
  ChevronRight,
  Home,
} from "lucide-react";

export default function KurumsalPage() {
  const experienceYears = "20+";
  const productsCount = "15.000+";

  return (
    <>
      {/* Breadcrumbs */}
      <div className="bg-white border-b border-slate-200 py-3">
        <div className="container flex items-center gap-2 text-xs font-medium text-slate-500">
          <Link href="/" className="hover:text-blue-600 flex items-center gap-1">
            <Home className="w-3.5 h-3.5" />
            <span>Ana sayfa</span>
          </Link>
          <ChevronRight className="w-3 h-3 text-slate-400" />
          <span className="text-slate-900 font-bold">Hakkımızda</span>
        </div>
      </div>

      {/* Hero Banner */}
      <section className="relative overflow-hidden border-b border-slate-200 bg-white py-14 text-slate-900 sm:py-16">
        <div className="container max-w-4xl text-center space-y-4 relative z-10">
          <h1 className="text-3xl font-medium tracking-tight text-slate-900 sm:text-5xl">
            Oto elektronik parça tedariki
          </h1>
          <p className="mx-auto max-w-2xl text-sm leading-relaxed text-slate-600 sm:text-base">
            Motor, fren, airbag, gövde kontrol ve şanzıman modülleri.
          </p>
        </div>
      </section>

      {/* Main Content */}
      <div className="container max-w-5xl py-14 space-y-16">
        {/* About Section */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-10 items-center">
          <div className="space-y-4">
            <h2 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
              Hakkımızda
            </h2>
            <p className="text-sm text-slate-600 leading-relaxed">
              {experienceYears} yıldır oto elektronik parça tedarik ediyoruz.
            </p>
            <p className="text-sm text-slate-600 leading-relaxed">
              Kataloğumuzda {productsCount} ürün bulunuyor.
            </p>
          </div>

          <div className="relative h-72 rounded-3xl border border-slate-200 bg-slate-50 p-3 shadow-sm overflow-hidden">
            <Image
              src="/images/catalog-ecu-banner.webp"
              alt="ECU modülleri kataloğu"
              fill
              sizes="(max-width: 768px) 100vw, 50vw"
              className="rounded-2xl object-contain p-2"
            />
          </div>
        </div>

        {/* Kalite Politikamız */}
        <div id="kalite" className="space-y-6 rounded-3xl border border-slate-200 bg-white p-8 sm:p-10">
          <h2 className="text-2xl font-medium text-slate-900">Kontrol ve gönderim</h2>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
            <div className="space-y-1.5 rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <h3 className="text-sm font-medium text-slate-900">Ürün kontrolü</h3>
              <p className="text-slate-600">
                OEM kodunu ve ürün etiketini kontrol ederiz.
              </p>
            </div>
            <div className="space-y-1.5 rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <h3 className="text-sm font-medium text-slate-900">Uyumluluk kontrolü</h3>
              <p className="text-slate-600">
                Şasi numarası ile parça kodunu karşılaştırırız.
              </p>
            </div>
            <div className="space-y-1.5 rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <h3 className="text-sm font-medium text-slate-900">Paketleme</h3>
              <p className="text-slate-600">
                Modülleri antistatik ambalajla göndeririz.
              </p>
            </div>
          </div>
        </div>

        {/* KVKK / Privacy placeholder anchor */}
        <div id="kvkk" className="p-6 rounded-2xl bg-white border border-slate-200 text-xs text-slate-600 space-y-2">
          <h2 className="font-bold text-slate-900">KVKK</h2>
          <p>
            Web sitesi üzerinden paylaşılan kişisel veriler 6698 sayılı KVKK kapsamında işlenir.
          </p>
        </div>
      </div>
    </>
  );
}
