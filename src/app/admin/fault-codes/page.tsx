"use client";

import { useState, useRef } from "react";
import { Plus, Search, Edit2, Trash2, FileCode2, FileText, AlertTriangle, Star } from "lucide-react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@convex/_generated/api";
import type { Doc, Id } from "@convex/_generated/dataModel";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import AdminPageHeader from "@/components/admin/AdminPageHeader";

type FaultCode = Doc<"faultCodes">;

export default function AdminFaultCodesPage() {
  const [search, setSearch] = useState("");

  const [modalOpen, setModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<FaultCode | null>(null);
  const [code, setCode] = useState("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [isPopular, setIsPopular] = useState(false);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const saveInProgress = useRef(false);

  const faultCodes = useQuery(api.faultCodes.list, { search: search.trim() || undefined });
  const createFaultCode = useMutation(api.faultCodes.create);
  const updateFaultCode = useMutation(api.faultCodes.update);
  const deleteFaultCode = useMutation(api.faultCodes.deleteFaultCode);
  const togglePopular = useMutation(api.faultCodes.togglePopular);

  const resetForm = () => {
    setEditingItem(null);
    setCode("");
    setTitle("");
    setDescription("");
    setIsPopular(false);
    setError("");
  };

  const handleOpenAdd = () => {
    resetForm();
    setModalOpen(true);
  };

  const handleOpenEdit = (item: FaultCode) => {
    setEditingItem(item);
    setCode(item.code);
    setTitle(item.title);
    setDescription(item.description ?? "");
    setIsPopular(item.isPopular ?? false);
    setError("");
    setModalOpen(true);
  };

  const handleTogglePopular = async (id: Id<"faultCodes">) => {
    try {
      await togglePopular({ id });
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Popülerlik durumu güncellenemedi.");
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (saveInProgress.current) return;
    if (!code.trim()) {
      setError("Arıza kodu zorunludur (örn: P0100).");
      return;
    }
    if (!title.trim()) {
      setError("Arıza başlığı / anlamı zorunludur.");
      return;
    }

    saveInProgress.current = true;
    setSaving(true);
    setError("");

    try {
      const payload = {
        code: code.trim().toUpperCase(),
        title: title.trim(),
        description: description.trim() || undefined,
        isPopular,
      };

      if (editingItem) {
        await updateFaultCode({
          id: editingItem._id,
          ...payload,
        });
      } else {
        await createFaultCode(payload);
      }
      setModalOpen(false);
      resetForm();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Kayıt sırasında bir hata oluştu.");
    } finally {
      setSaving(false);
      saveInProgress.current = false;
    }
  };

  const handleDelete = async (id: Id<"faultCodes">, itemCode: string) => {
    if (!confirm(`"${itemCode}" arıza kodunu silmek istediğinize emin misiniz?`)) {
      return;
    }
    try {
      await deleteFaultCode({ id });
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Silme işlemi başarısız.");
    }
  };

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="OBD Arıza Kodları"
        badge={faultCodes ? `${faultCodes.length} Kod` : "Yükleniyor..."}
        description="Sitede yayınlanan OBD-II arıza kodlarını, popülerlik durumunu ve açıklamalarını yönetin."
        actions={
          <Button
            onClick={handleOpenAdd}
            className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-semibold gap-2 rounded-xl cursor-pointer"
          >
            <Plus className="h-4 w-4" />
            <span>Yeni Kod Ekle</span>
          </Button>
        }
      />

      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs">
        <div className="relative w-full max-w-md">
          <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Kod veya başlık ile ara (örn: P0100, sensör)..."
            className="pl-9 rounded-xl border-slate-200 focus-visible:ring-amber-400"
          />
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white shadow-xs overflow-hidden">
        {faultCodes === undefined ? (
          <div className="p-8 text-center text-sm text-slate-500">Yükleniyor...</div>
        ) : faultCodes.length === 0 ? (
          <div className="p-12 text-center">
            <FileCode2 className="mx-auto h-10 w-10 text-slate-400 mb-3" />
            <h3 className="text-base font-semibold text-slate-800">Arıza Kodu Bulunamadı</h3>
            <p className="mt-1 text-sm text-slate-500">
              Arama kriterlerinize uygun arıza kodu bulunamadı veya henüz eklenmedi.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-600">
              <thead className="border-b border-slate-200 bg-slate-50/75 text-xs font-semibold uppercase tracking-wider text-slate-500">
                <tr>
                  <th className="px-5 py-3.5 w-32">Kod</th>
                  <th className="px-5 py-3.5">Başlık & Anlamı</th>
                  <th className="px-5 py-3.5">Açıklama</th>
                  <th className="px-5 py-3.5 text-center w-32">Popülerlik</th>
                  <th className="px-5 py-3.5 text-right w-28">İşlemler</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-normal">
                {faultCodes.map((item) => (
                  <tr key={item._id} className="hover:bg-slate-50/60 transition-colors">
                    <td className="px-5 py-4 whitespace-nowrap">
                      <span className="inline-flex items-center rounded-lg bg-slate-900 px-2.5 py-1 text-xs font-mono font-bold text-amber-400">
                        {item.code}
                      </span>
                    </td>
                    <td className="px-5 py-4 font-semibold text-slate-900">
                      {item.title}
                    </td>
                    <td className="px-5 py-4 text-xs text-slate-500 max-w-md truncate">
                      {item.description || "-"}
                    </td>
                    <td className="px-5 py-4 whitespace-nowrap text-center">
                      <button
                        type="button"
                        onClick={() => handleTogglePopular(item._id)}
                        className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold transition-all cursor-pointer ${
                          item.isPopular
                            ? "bg-amber-100 text-amber-900 border border-amber-300 hover:bg-amber-200"
                            : "bg-slate-100 text-slate-400 border border-slate-200 hover:bg-slate-200 hover:text-slate-600"
                        }`}
                        title="Tıklayarak popülerliği aç/kapat"
                      >
                        <Star className={`h-3.5 w-3.5 ${item.isPopular ? "fill-amber-500 text-amber-500" : "text-slate-400"}`} />
                        <span>{item.isPopular ? "Popüler" : "Kapalı"}</span>
                      </button>
                    </td>
                    <td className="px-5 py-4 whitespace-nowrap text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          type="button"
                          onClick={() => handleOpenEdit(item)}
                          className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100 hover:text-slate-800 transition-colors cursor-pointer"
                          title="Düzenle"
                        >
                          <Edit2 className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(item._id, item.code)}
                          className="rounded-lg p-1.5 text-rose-500 hover:bg-rose-50 hover:text-rose-700 transition-colors cursor-pointer"
                          title="Sil"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="flex max-h-[calc(100dvh-2rem)] w-[calc(100%-2rem)] max-w-lg flex-col gap-0 overflow-hidden rounded-2xl p-0">
          <DialogHeader className="border-b border-slate-100 px-6 py-4 pr-12 text-left">
            <DialogTitle className="text-base font-bold leading-snug text-slate-900">
              {editingItem
                ? `Arıza Kodunu Düzenle: ${editingItem.code}`
                : "Yeni Arıza Kodu Ekle"}
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSave} className="flex min-h-0 flex-1 flex-col">
            <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-6 py-5">
              {error && (
                <div className="flex items-center gap-2 rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs font-medium text-rose-700">
                  <AlertTriangle className="h-4 w-4 shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-[8.5rem_minmax(0,1fr)]">
                <div>
                  <label
                    htmlFor="fault-code"
                    className="mb-1 block text-xs font-semibold text-slate-700"
                  >
                    Arıza Kodu <span className="text-rose-500">*</span>
                  </label>
                  <Input
                    id="fault-code"
                    value={code}
                    onChange={(e) => setCode(e.target.value.toUpperCase())}
                    placeholder="Örn: P0100"
                    aria-required="true"
                    className="rounded-xl border-slate-300 font-mono"
                  />
                </div>

                <div>
                  <label
                    htmlFor="fault-title"
                    className="mb-1 block text-xs font-semibold text-slate-700"
                  >
                    Başlık / Arıza Tanımı{" "}
                    <span className="text-rose-500">*</span>
                  </label>
                  <Input
                    id="fault-title"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="Örn: Hava akış sensörü (MAF) devresi arızası"
                    aria-required="true"
                    className="rounded-xl border-slate-300"
                  />
                </div>
              </div>

              <div>
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <label
                    htmlFor="fault-description"
                    className="text-xs font-semibold text-slate-700"
                  >
                    Açıklama, Belirtiler ve Çözüm
                  </label>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      const template = `Genel Açıklama:
...

Belirtiler:
•

Olası Nedenler:
•

Çözüm Önerisi:
•`;
                      setDescription((prev) =>
                        prev ? `${prev}\n\n${template}` : template,
                      );
                    }}
                    className="h-7 gap-1.5 px-2 text-[11px] font-semibold text-amber-700 hover:bg-amber-50 hover:text-amber-800"
                  >
                    <FileText className="h-3 w-3" />
                    Şablon ekle
                  </Button>
                </div>
                <textarea
                  id="fault-description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Arıza açıklaması, belirtileri, olası nedenleri ve çözüm önerilerini buraya yazabilirsiniz..."
                  rows={6}
                  className="mt-2 w-full rounded-xl border border-slate-300 p-3 font-sans text-sm leading-relaxed text-slate-900 placeholder:text-slate-400 focus:border-amber-400 focus:outline-none focus:ring-2 focus:ring-amber-200"
                />
              </div>

              <div className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 bg-slate-50 p-3.5">
                <div className="min-w-0">
                  <p className="text-xs font-semibold text-slate-800">
                    Popüler Arıza Kodu
                  </p>
                  <p className="mt-0.5 text-[11px] text-slate-500">
                    Ana sayfada ve popüler listesinde gösterilsin.
                  </p>
                </div>
                <button
                  type="button"
                  role="switch"
                  aria-checked={isPopular}
                  aria-label="Popüler arıza kodu"
                  onClick={() => setIsPopular((value) => !value)}
                  className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-300 focus-visible:ring-offset-2 ${
                    isPopular ? "bg-amber-500" : "bg-slate-300"
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 rounded-full bg-white shadow-sm transition-transform ${
                      isPopular ? "translate-x-6" : "translate-x-1"
                    }`}
                  />
                </button>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 border-t border-slate-100 bg-slate-50/60 px-6 py-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => setModalOpen(false)}
                className="cursor-pointer"
              >
                İptal
              </Button>
              <Button type="submit" disabled={saving} className="cursor-pointer">
                {saving
                  ? "Kaydediliyor..."
                  : editingItem
                    ? "Güncelle"
                    : "Kaydet"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
