"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  Plus,
  Search,
  Edit2,
  Trash2,
  ExternalLink,
  ImageIcon,
  Video,
} from "lucide-react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@convex/_generated/api";
import type { Doc, Id } from "@convex/_generated/dataModel";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import AdminPageHeader from "@/components/admin/AdminPageHeader";
import { triggerRevalidate } from "@/lib/revalidate";
import { ServiceFormModal } from "./ServiceFormModal";

type Service = Doc<"services"> & { image: string };

export default function AdminServicesPage() {
  const [search, setSearch] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<Service | null>(null);

  const services = useQuery(api.services.listAdmin, {});
  const deleteService = useMutation(api.services.deleteService);
  const toggleActive = useMutation(api.services.toggleActive);

  const handleOpenAdd = () => {
    setEditingItem(null);
    setModalOpen(true);
  };

  const handleOpenEdit = (item: Service) => {
    setEditingItem(item);
    setModalOpen(true);
  };

  const handleToggleActive = async (id: Id<"services">) => {
    const item = services?.find((s) => s._id === id);
    try {
      await toggleActive({ id });
      void triggerRevalidate([
        "/",
        "/tamirveservis",
        ...(item ? [`/tamirveservis/${item.slug}`] : []),
      ]);
    } catch (err: unknown) {
      alert(
        err instanceof Error
          ? err.message
          : "Aktiflik durumu değiştirilemedi.",
      );
    }
  };

  const handleDelete = async (id: Id<"services">, serviceTitle: string) => {
    if (
      !confirm(
        `"${serviceTitle}" servisini silmek istediğinize emin misiniz?`,
      )
    ) {
      return;
    }
    const item = services?.find((s) => s._id === id);
    try {
      await deleteService({ id });
      void triggerRevalidate([
        "/",
        "/tamirveservis",
        ...(item ? [`/tamirveservis/${item.slug}`] : []),
      ]);
    } catch (err: unknown) {
      alert(
        err instanceof Error ? err.message : "Silme işlemi başarısız oldu.",
      );
    }
  };

  const filteredServices = (services ?? []).filter((s) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      s.title.toLowerCase().includes(q) ||
      s.slug.toLowerCase().includes(q) ||
      s.shortDesc.toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="Tamir ve Servis Yönetimi"
        description="Verilen tamir ve servis hizmetlerini, içeriklerini, görsellerini ve sıralamalarını yönetin."
        actions={
          <Button
            onClick={handleOpenAdd}
            className="gap-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-semibold rounded-xl"
          >
            <Plus className="h-4 w-4" />
            <span>Yeni Servis Ekle</span>
          </Button>
        }
      />

      {/* Arama */}
      <div className="relative max-w-sm">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Servis veya açıklama ara..."
          className="pl-10 rounded-xl bg-white"
        />
      </div>

      {/* Servis Listesi */}
      <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden shadow-xs">
        {services === undefined ? (
          <div className="p-12 text-center text-sm text-slate-500">
            Yükleniyor...
          </div>
        ) : filteredServices.length === 0 ? (
          <div className="p-12 text-center text-sm text-slate-500">
            {search.trim()
              ? "Aramaya uygun servis bulunamadı."
              : "Henüz servis kaydı bulunmuyor."}
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {filteredServices.map((service) => (
              <div
                key={service._id}
                className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-5 hover:bg-slate-50/80 transition-colors"
              >
                <div className="flex items-start sm:items-center gap-4 min-w-0">
                  <div className="relative h-16 w-24 shrink-0 overflow-hidden rounded-xl border border-slate-200 bg-dark-bg">
                    {service.image ? (
                      <Image
                        src={service.image}
                        alt={service.title}
                        fill
                        sizes="96px"
                        className="object-cover"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center text-slate-400">
                        <ImageIcon className="h-5 w-5" />
                      </div>
                    )}
                  </div>

                  <div className="min-w-0 space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-bold text-slate-900 text-base">
                        {service.title}
                      </h3>
                      <Link
                        href={`/tamirveservis/${service.slug}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-xs text-amber-600 hover:text-amber-700"
                      >
                        <span>/{service.slug}</span>
                        <ExternalLink className="h-3 w-3" />
                      </Link>
                    </div>

                    <p className="text-xs text-slate-500 line-clamp-1">
                      {service.shortDesc}
                    </p>

                    <div className="flex items-center gap-2 pt-0.5 text-xs text-slate-600">
                      <span className="font-medium text-slate-700">
                        Sıra: {service.order}
                      </span>
                      <span>•</span>
                      <span>{service.features?.length || 0} Madde</span>
                      {service.videoUrl && (
                        <>
                          <span>•</span>
                          <span className="inline-flex items-center gap-1 font-semibold text-amber-700">
                            <Video className="h-3 w-3" />
                            Video
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
                  <button
                    type="button"
                    onClick={() => handleToggleActive(service._id)}
                    className={`px-3 py-1 text-xs font-semibold rounded-full border cursor-pointer transition-colors ${
                      service.isActive
                        ? "bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100"
                        : "bg-slate-100 text-slate-600 border-slate-200 hover:bg-slate-200"
                    }`}
                  >
                    {service.isActive ? "Yayında" : "Pasif"}
                  </button>

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleOpenEdit(service)}
                    className="h-8 gap-1.5 rounded-lg text-slate-700 hover:text-slate-900"
                  >
                    <Edit2 className="h-3.5 w-3.5" />
                    <span>Düzenle</span>
                  </Button>

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleDelete(service._id, service.title)}
                    className="h-8 rounded-lg text-red-600 hover:text-red-700 hover:bg-red-50 border-slate-200"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Service Form Modal */}
      <ServiceFormModal
        open={modalOpen}
        onOpenChange={setModalOpen}
        service={editingItem}
        nextOrder={(services?.length || 0) + 1}
      />
    </div>
  );
}
