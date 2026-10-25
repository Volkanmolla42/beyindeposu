"use client";

import { useState } from "react";
import Link from "next/link";
import { Plus, Search, Edit2, Trash2, FileCode2, Star, ExternalLink } from "lucide-react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@convex/_generated/api";
import type { Doc, Id } from "@convex/_generated/dataModel";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import AdminPageHeader from "@/components/admin/AdminPageHeader";
import { triggerRevalidate } from "@/lib/revalidate";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { FaultCodeFormModal } from "./FaultCodeFormModal";

type FaultCode = Doc<"faultCodes">;

export default function AdminFaultCodesPage() {
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebouncedValue(search);

  const [modalOpen, setModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<FaultCode | null>(null);

  const faultCodes = useQuery(api.faultCodes.list, {
    search: debouncedSearch.trim() || undefined,
  });
  const deleteFaultCode = useMutation(api.faultCodes.deleteFaultCode);
  const togglePopular = useMutation(api.faultCodes.togglePopular);

  const handleOpenAdd = () => {
    setEditingItem(null);
    setModalOpen(true);
  };

  const handleOpenEdit = (item: FaultCode) => {
    setEditingItem(item);
    setModalOpen(true);
  };

  const handleTogglePopular = async (id: Id<"faultCodes">) => {
    const item = faultCodes?.find((fc) => fc._id === id);
    try {
      await togglePopular({ id });
      void triggerRevalidate([
        "/ariza-kodlari",
        ...(item ? [`/ariza-kodlari/${item.slug || item.code.toLowerCase()}`] : []),
      ]);
    } catch (err: unknown) {
      alert(
        err instanceof Error
          ? err.message
          : "Popülerlik durumu güncellenemedi.",
      );
    }
  };

  const handleDelete = async (id: Id<"faultCodes">, code: string) => {
    const item = faultCodes?.find((fc) => fc._id === id);
    if (!confirm(`"${code}" arıza kodunu silmek istediğinize emin misiniz?`)) {
      return;
    }
    try {
      await deleteFaultCode({ id });
      void triggerRevalidate([
        "/ariza-kodlari",
        `/ariza-kodlari/${item?.slug || code.toLowerCase()}`,
      ]);
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Silme işlemi başarısız oldu.");
    }
  };

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="Arıza Kodları (DTC) Yönetimi"
        description="OBD-II arıza kodlarını, açıklamalarını, çözüm önerilerini ve popüler kodları yönetin."
        actions={
          <Button
            onClick={handleOpenAdd}
            className="gap-2 bg-amber-500 font-semibold text-slate-950 hover:bg-amber-400"
          >
            <Plus className="h-4 w-4" />
            <span>Yeni Kod Ekle</span>
          </Button>
        }
      />

      {/* Arama & İstatistik */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative max-w-sm flex-1">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Arıza kodu veya başlık ara... (örn: P0100)"
            className="rounded-xl bg-white pl-10"
          />
        </div>

        {faultCodes && (
          <div className="text-xs font-medium text-slate-500">
            Toplam <span className="font-bold text-slate-800">{faultCodes.length}</span> kod
            {debouncedSearch && " (filtrelendi)"}
          </div>
        )}
      </div>

      {/* Kod Listesi */}
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xs">
        {faultCodes === undefined ? (
          <div className="p-12 text-center text-sm text-slate-500">
            Yükleniyor...
          </div>
        ) : faultCodes.length === 0 ? (
          <div className="p-12 text-center text-sm text-slate-500">
            {debouncedSearch
              ? `"${debouncedSearch}" ile eşleşen arıza kodu bulunamadı.`
              : "Henüz arıza kodu kaydı bulunmuyor."}
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {faultCodes.map((item) => (
              <div
                key={item._id}
                className="flex flex-col items-start justify-between gap-4 p-4 transition-colors hover:bg-slate-50/80 sm:flex-row sm:items-center"
              >
                <div className="flex min-w-0 items-start gap-3.5">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-amber-200 bg-amber-50/70 font-mono text-sm font-bold text-amber-700">
                    <FileCode2 className="h-5 w-5" />
                  </div>

                  <div className="min-w-0 space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-mono text-base font-bold text-slate-900">
                        {item.code}
                      </span>
                      {item.isPopular && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-semibold text-amber-700 ring-1 ring-inset ring-amber-200">
                          <Star className="h-3 w-3 fill-amber-500 text-amber-500" />
                          Popüler
                        </span>
                      )}
                    </div>
                    <p className="line-clamp-1 text-sm font-medium text-slate-700">
                      {item.title}
                    </p>
                    {item.description && (
                      <p className="line-clamp-1 text-xs text-slate-500">
                        {item.description}
                      </p>
                    )}
                  </div>
                </div>

                <div className="flex shrink-0 items-center gap-2 self-end sm:self-center">
                  <button
                    type="button"
                    onClick={() => handleTogglePopular(item._id)}
                    title={item.isPopular ? "Popülerden Çıkar" : "Popüler Yap"}
                    className={`flex h-8 w-8 cursor-pointer items-center justify-center rounded-lg border transition-colors ${
                      item.isPopular
                        ? "border-amber-200 bg-amber-50 text-amber-600 hover:bg-amber-100"
                        : "border-slate-200 bg-white text-slate-400 hover:text-amber-600"
                    }`}
                  >
                    <Star
                      className={`h-4 w-4 ${item.isPopular ? "fill-amber-500" : ""}`}
                    />
                  </button>

                  <Button
                    asChild
                    variant="outline"
                    size="sm"
                    className="h-8 gap-1.5 rounded-lg text-slate-700 hover:text-slate-900"
                  >
                    <Link
                      href={`/ariza-kodlari/${item.slug || item.code.toLowerCase()}`}
                      target="_blank"
                    >
                      <ExternalLink className="h-3.5 w-3.5" />
                      <span>Görüntüle</span>
                    </Link>
                  </Button>

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleOpenEdit(item)}
                    className="h-8 gap-1.5 rounded-lg text-slate-700 hover:text-slate-900"
                  >
                    <Edit2 className="h-3.5 w-3.5" />
                    <span>Düzenle</span>
                  </Button>

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleDelete(item._id, item.code)}
                    className="h-8 rounded-lg border-slate-200 text-rose-600 hover:bg-rose-50 hover:text-rose-700"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Arıza Kodu Form Modalı */}
      <FaultCodeFormModal
        open={modalOpen}
        onOpenChange={setModalOpen}
        item={editingItem}
      />
    </div>
  );
}
