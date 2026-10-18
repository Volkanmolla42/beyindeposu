"use client";

import { useEffect, useState } from "react";
import {
  Phone,
  Mail,
  MapPin,
  Clock,
  Save,
  CheckCircle2,
  AlertCircle,
  Loader2,
  RotateCcw,
  ExternalLink,
} from "lucide-react";
import WhatsAppIcon from "@/components/WhatsAppIcon";
import { useMutation, useQuery } from "convex/react";
import { api } from "@convex/_generated/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import AdminPageHeader from "@/components/admin/AdminPageHeader";
import { SITE_CONTACT } from "@/config/site";
import { formatPhoneNumber, getWhatsAppUrl } from "@/lib/whatsapp";

export default function AdminSettingsPage() {
  const contactData = useQuery(api.settings.getContactSettings);
  const updateSettings = useMutation(api.settings.updateContactSettings);

  const [phoneNumber, setPhoneNumber] = useState("");
  const [email, setEmail] = useState("");
  const [workingHours, setWorkingHours] = useState("");
  const [address, setAddress] = useState("");

  const [isSaving, setIsSaving] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);

  // Initialize form when data loads
  useEffect(() => {
    if (contactData && !isInitialized) {
      setPhoneNumber(contactData.phoneNumber);
      setEmail(contactData.email);
      setWorkingHours(contactData.workingHours);
      setAddress(contactData.address);
      setIsInitialized(true);
    }
  }, [contactData, isInitialized]);

  const handleResetToDefaults = () => {
    setPhoneNumber(SITE_CONTACT.phoneNumber);
    setEmail(SITE_CONTACT.email);
    setWorkingHours(SITE_CONTACT.workingHours);
    setAddress(SITE_CONTACT.address);
    setErrorMessage(null);
    setSuccessMessage("Varsayılan değerler forma yüklendi. Kaydetmek için 'Değişiklikleri Kaydet'e basın.");
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    const cleanPhone = phoneNumber.trim();
    const cleanEmail = email.trim();
    const cleanHours = workingHours.trim();
    const cleanAddress = address.trim();

    if (!cleanPhone) {
      setErrorMessage("Telefon numarası zorunludur.");
      return;
    }
    if (!cleanEmail) {
      setErrorMessage("E-posta adresi zorunludur.");
      return;
    }
    if (!cleanAddress) {
      setErrorMessage("Adres zorunludur.");
      return;
    }

    try {
      setIsSaving(true);
      await updateSettings({
        phoneNumber: cleanPhone,
        email: cleanEmail,
        workingHours: cleanHours,
        address: cleanAddress,
      });

      setSuccessMessage("İletişim ayarları başarıyla kaydedildi. Değişiklikler anında tüm sitede yayında.");
      setTimeout(() => {
        setSuccessMessage(null);
      }, 5000);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Ayarlar kaydedilirken bir hata oluştu.";
      setErrorMessage(msg);
    } finally {
      setIsSaving(false);
    }
  };

  const isLoading = contactData === undefined;

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="İletişim & Site Ayarları"
        description="Sitede gösterilen telefon, WhatsApp, e-posta, çalışma saatleri ve fiziksel adres bilgilerini yönetin."
        actions={
          <Button
            variant="outline"
            size="sm"
            type="button"
            onClick={handleResetToDefaults}
            disabled={isLoading || isSaving}
            className="flex items-center gap-1.5"
          >
            <RotateCcw className="h-4 w-4" />
            <span>Varsayılanları Yükle</span>
          </Button>
        }
      />

      {/* Notifications */}
      {successMessage && (
        <div className="flex items-center gap-3 rounded-2xl border border-emerald-200 bg-emerald-50/90 p-4 text-sm text-emerald-800 shadow-xs animate-in fade-in-50">
          <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-600" />
          <p className="font-medium">{successMessage}</p>
        </div>
      )}

      {errorMessage && (
        <div className="flex items-center gap-3 rounded-2xl border border-red-200 bg-red-50/90 p-4 text-sm text-red-800 shadow-xs animate-in fade-in-50">
          <AlertCircle className="h-5 w-5 shrink-0 text-red-600" />
          <p className="font-medium">{errorMessage}</p>
        </div>
      )}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        {/* Settings Form */}
        <div className="lg:col-span-7">
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs sm:p-7">
            <h2 className="text-base font-semibold text-slate-900 border-b border-slate-100 pb-3">
              Genel İletişim Bilgileri
            </h2>

            {isLoading ? (
              <div className="flex h-64 items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
              </div>
            ) : (
              <form onSubmit={handleSave} className="mt-5 space-y-5">
                {/* Telefon ve WhatsApp Numarası */}
                <div className="space-y-1.5">
                  <label htmlFor="phoneNumber" className="flex items-center gap-2 text-xs font-medium text-slate-700">
                    <Phone className="h-4 w-4 text-blue-600" />
                    <span>Telefon & WhatsApp Numarası</span>
                  </label>
                  <Input
                    id="phoneNumber"
                    type="text"
                    value={phoneNumber}
                    onChange={(e) => setPhoneNumber(e.target.value)}
                    placeholder="Örn: 0530 906 70 34"
                    required
                  />
                  <p className="text-xs text-slate-500">
                    Arama butonlarında, WhatsApp iletişim hatlarında, başlık ve alt bilgide kullanılan tek ortak numara.
                  </p>
                </div>

                {/* E-posta Adresi */}
                <div className="space-y-1.5">
                  <label htmlFor="email" className="flex items-center gap-2 text-xs font-medium text-slate-700">
                    <Mail className="h-4 w-4 text-blue-600" />
                    <span>E-posta Adresi</span>
                  </label>
                  <Input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Örn: beyindeposu34@gmail.com"
                    required
                  />
                  <p className="text-xs text-slate-500">
                    Footer, kurumsal iletişim sayfası ve yasal sözleşmelerde gösterilen resmi e-posta.
                  </p>
                </div>

                {/* Çalışma Saatleri */}
                <div className="space-y-1.5">
                  <label htmlFor="workingHours" className="flex items-center gap-2 text-xs font-medium text-slate-700">
                    <Clock className="h-4 w-4 text-blue-600" />
                    <span>Çalışma Saatleri</span>
                  </label>
                  <Input
                    id="workingHours"
                    type="text"
                    value={workingHours}
                    onChange={(e) => setWorkingHours(e.target.value)}
                    placeholder="Örn: Her gün: 08:30 - 18:00"
                  />
                  <p className="text-xs text-slate-500">
                    İletişim sayfası ve müşteri bilgi kartlarında yer alan mesai saatleri.
                  </p>
                </div>

                {/* Adres */}
                <div className="space-y-1.5">
                  <label htmlFor="address" className="flex items-center gap-2 text-xs font-medium text-slate-700">
                    <MapPin className="h-4 w-4 text-blue-600" />
                    <span>Fiziksel Mağaza / Depo Adresi</span>
                  </label>
                  <Textarea
                    id="address"
                    rows={3}
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    placeholder="Örn: Maltepe, Yedikule Çırpıcı Yolu Topkapı Ticaret Merkezi..."
                    required
                  />
                  <p className="text-xs text-slate-500">
                    Footer, iletişim haritası ve Google Arama yapısal verisinde (Schema.org) kullanılır.
                  </p>
                </div>

                {contactData?.updatedAt && (
                  <p className="text-xs text-slate-400">
                    Son güncelleme: {new Date(contactData.updatedAt).toLocaleString("tr-TR")}
                  </p>
                )}

                {/* Submit Button */}
                <div className="border-t border-slate-100 pt-4 flex justify-end">
                  <Button
                    type="submit"
                    variant="default"
                    disabled={isSaving}
                    className="flex items-center gap-2"
                  >
                    {isSaving ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        <span>Kaydediliyor…</span>
                      </>
                    ) : (
                      <>
                        <Save className="h-4 w-4" />
                        <span>Değişiklikleri Kaydet</span>
                      </>
                    )}
                  </Button>
                </div>
              </form>
            )}
          </div>
        </div>

        {/* Live Preview Column */}
        <div className="lg:col-span-5 space-y-6">
          {/* Card: Kurumsal İletişim Kartı Önizleme */}
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs">
            <h3 className="text-sm font-semibold text-slate-900 border-b border-slate-100 pb-3 flex items-center justify-between">
              <span>Canlı Sitede Görünüm</span>
              <span className="text-xs font-normal text-slate-500">Anlık Önizleme</span>
            </h3>

            <div className="mt-4 space-y-3">
              {/* WhatsApp Card Preview */}
              <div className="flex items-center gap-3 rounded-2xl border border-emerald-100 bg-emerald-50/50 p-3.5">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-emerald-100">
                  <WhatsAppIcon className="h-5 w-5 fill-emerald-700 text-emerald-700" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-xs font-medium text-emerald-900">WhatsApp Danışma</div>
                  <div className="text-sm font-semibold text-emerald-700">
                    {formatPhoneNumber(phoneNumber || "—")}
                  </div>
                </div>
                <a
                  href={getWhatsAppUrl(undefined, phoneNumber)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="rounded-lg p-2 text-emerald-700 hover:bg-emerald-100 transition-colors"
                  title="WhatsApp'ta test et"
                >
                  <ExternalLink className="h-4 w-4" />
                </a>
              </div>

              {/* Phone Card Preview */}
              <div className="flex items-center gap-3 rounded-2xl border border-blue-100 bg-blue-50/50 p-3.5">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-blue-100">
                  <Phone className="h-5 w-5 text-blue-700" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-xs font-medium text-blue-900">Müşteri Hattı</div>
                  <div className="text-sm font-semibold text-blue-700">
                    {formatPhoneNumber(phoneNumber || "—")}
                  </div>
                </div>
              </div>

              {/* Email Card Preview */}
              <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50/70 p-3.5">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-slate-200">
                  <Mail className="h-5 w-5 text-slate-700" />
                </div>
                <div className="min-w-0 flex-1 truncate">
                  <div className="text-xs font-medium text-slate-800">E-posta</div>
                  <div className="text-sm font-medium text-slate-600 truncate">
                    {email || "—"}
                  </div>
                </div>
              </div>

              {/* Working Hours Preview */}
              <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50/70 p-3.5">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-slate-200">
                  <Clock className="h-5 w-5 text-slate-700" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-xs font-medium text-slate-800">Mesai Saatleri</div>
                  <div className="text-sm font-medium text-slate-600">
                    {workingHours || "—"}
                  </div>
                </div>
              </div>

              {/* Address Preview */}
              <div className="flex items-start gap-3 rounded-2xl border border-slate-200 bg-slate-50/70 p-3.5">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-slate-200 mt-0.5">
                  <MapPin className="h-5 w-5 text-slate-700" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-xs font-medium text-slate-800">Mağaza Adresi</div>
                  <div className="text-xs text-slate-600 leading-relaxed mt-0.5">
                    {address || "—"}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Info Card */}
          <div className="rounded-2xl border border-blue-100 bg-blue-50/60 p-5 text-xs text-blue-900 leading-relaxed">
            <h4 className="font-semibold mb-1 flex items-center gap-1.5">
              <span>Otomatik Senkronizasyon</span>
            </h4>
            <p className="text-blue-800">
              Burada yapacağınız değişiklikler Convex veritabanında saklanır ve sitedeki tüm ziyaretçilerin ekranlarında (alt bilgi, ürün detayları, WhatsApp butonları ve iletişim sayfası) anında canlı olarak güncellenir.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
