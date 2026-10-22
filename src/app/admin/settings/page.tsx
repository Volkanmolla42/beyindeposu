"use client";

import { useState, useTransition } from "react";
import {
  Phone,
  Mail,
  MapPin,
  Clock,
  Save,
  CheckCircle2,
  AlertCircle,
  Loader2,
} from "lucide-react";
import { useMutation, useQuery } from "convex/react";
import { api } from "@convex/_generated/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import AdminPageHeader from "@/components/admin/AdminPageHeader";

export default function AdminSettingsPage() {
  const contactData = useQuery(api.settings.getContactSettings);
  const updateSettings = useMutation(api.settings.updateContactSettings);

  const [isPending, startTransition] = useTransition();
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSubmit = (e: React.SubmitEvent<HTMLFormElement>) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    const formData = new FormData(e.currentTarget);
    const phoneNumber = (formData.get("phoneNumber") as string)?.trim() || "";
    const email = (formData.get("email") as string)?.trim() || "";
    const workingHours = (formData.get("workingHours") as string)?.trim() || "";
    const address = (formData.get("address") as string)?.trim() || "";
    const city = (formData.get("city") as string)?.trim() || "";
    const district = (formData.get("district") as string)?.trim() || "";
    const postalCode = (formData.get("postalCode") as string)?.trim() || "";

    if (!phoneNumber) {
      setErrorMessage("Telefon numarası zorunludur.");
      return;
    }
    if (!email) {
      setErrorMessage("E-posta adresi zorunludur.");
      return;
    }
    if (!address) {
      setErrorMessage("Adres zorunludur.");
      return;
    }

    startTransition(async () => {
      try {
        await updateSettings({
          phoneNumber,
          email,
          workingHours,
          address,
          city,
          district,
          postalCode,
        });

        setSuccessMessage("İletişim ayarları başarıyla kaydedildi.");
        setTimeout(() => setSuccessMessage(null), 5000);
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : "Ayarlar kaydedilirken bir hata oluştu.";
        setErrorMessage(msg);
      }
    });
  };

  const isLoading = contactData === undefined;

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="İletişim & Site Ayarları"
        description="Sitede gösterilen telefon, WhatsApp, e-posta, çalışma saatleri ve fiziksel adres bilgilerini yönetin."
      />

      {/* Notifications */}
      {successMessage && (
        <div className="flex items-center gap-3 rounded-2xl border border-emerald-200 bg-emerald-50/90 p-4 text-sm text-emerald-800 shadow-xs animate-in fade-in-50 max-w-3xl">
          <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-600" />
          <p className="font-medium">{successMessage}</p>
        </div>
      )}

      {errorMessage && (
        <div className="flex items-center gap-3 rounded-2xl border border-red-200 bg-red-50/90 p-4 text-sm text-red-800 shadow-xs animate-in fade-in-50 max-w-3xl">
          <AlertCircle className="h-5 w-5 shrink-0 text-red-600" />
          <p className="font-medium">{errorMessage}</p>
        </div>
      )}

      <div className="max-w-3xl">
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs sm:p-7">
          <h2 className="text-base font-semibold text-slate-900 border-b border-slate-100 pb-3">
            Genel İletişim Bilgileri
          </h2>

          {isLoading ? (
            <div className="flex h-64 items-center justify-center">
              <Loader2 className="h-8 w-8 animate-spin text-amber-500" />
            </div>
          ) : (
            <form key={contactData?.updatedAt ?? "contact-form"} onSubmit={handleSubmit} className="mt-5 space-y-5">
              {/* Telefon ve WhatsApp Numarası */}
              <div className="space-y-1.5">
                <label htmlFor="phoneNumber" className="flex items-center gap-2 text-xs font-medium text-slate-700">
                  <Phone className="h-4 w-4 text-amber-500" />
                  <span>Telefon & WhatsApp Numarası</span>
                </label>
                <Input
                  id="phoneNumber"
                  name="phoneNumber"
                  type="text"
                  defaultValue={contactData?.phoneNumber ?? ""}
                  placeholder="Telefon numarası girin"
                  required
                />
              </div>

              {/* E-posta Adresi */}
              <div className="space-y-1.5">
                <label htmlFor="email" className="flex items-center gap-2 text-xs font-medium text-slate-700">
                  <Mail className="h-4 w-4 text-amber-500" />
                  <span>E-posta Adresi</span>
                </label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  defaultValue={contactData?.email ?? ""}
                  placeholder="E-posta adresi girin"
                  required
                />
              </div>

              {/* Çalışma Saatleri */}
              <div className="space-y-1.5">
                <label htmlFor="workingHours" className="flex items-center gap-2 text-xs font-medium text-slate-700">
                  <Clock className="h-4 w-4 text-amber-500" />
                  <span>Çalışma Saatleri</span>
                </label>
                <Input
                  id="workingHours"
                  name="workingHours"
                  type="text"
                  defaultValue={contactData?.workingHours ?? ""}
                  placeholder="Çalışma saatleri girin"
                />
              </div>

              {/* Adres */}
              <div className="space-y-1.5">
                <label htmlFor="address" className="flex items-center gap-2 text-xs font-medium text-slate-700">
                  <MapPin className="h-4 w-4 text-amber-500" />
                  <span>Fiziksel Mağaza / Depo Adresi (Cadde / Sokak / Kapı No)</span>
                </label>
                <Textarea
                  id="address"
                  name="address"
                  rows={3}
                  defaultValue={contactData?.address ?? ""}
                  placeholder="Açık adresinizi girin"
                  required
                />
              </div>

              {/* İlçe, İl (Şehir), Posta Kodu */}
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                <div className="space-y-1.5">
                  <label htmlFor="district" className="text-xs font-medium text-slate-700">
                    İlçe
                  </label>
                  <Input
                    id="district"
                    name="district"
                    type="text"
                    defaultValue={contactData?.district ?? ""}
                    placeholder="Örn: Zeytinburnu"
                  />
                </div>
                <div className="space-y-1.5">
                  <label htmlFor="city" className="text-xs font-medium text-slate-700">
                    İl / Şehir
                  </label>
                  <Input
                    id="city"
                    name="city"
                    type="text"
                    defaultValue={contactData?.city ?? ""}
                    placeholder="Örn: İstanbul"
                  />
                </div>
                <div className="space-y-1.5">
                  <label htmlFor="postalCode" className="text-xs font-medium text-slate-700">
                    Posta Kodu
                  </label>
                  <Input
                    id="postalCode"
                    name="postalCode"
                    type="text"
                    defaultValue={contactData?.postalCode ?? ""}
                    placeholder="Örn: 34010"
                  />
                </div>
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
                  disabled={isPending}
                  className="flex items-center gap-2"
                >
                  {isPending ? (
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
    </div>
  );
}
