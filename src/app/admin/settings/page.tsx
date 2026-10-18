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
    </div>
  );
}
