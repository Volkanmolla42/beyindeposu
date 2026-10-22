"use client";

import { useState, useRef, useTransition } from "react";
import { AlertTriangle, FileText } from "lucide-react";
import { useMutation } from "convex/react";
import { api } from "@convex/_generated/api";
import type { Doc } from "@convex/_generated/dataModel";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { triggerRevalidate } from "@/lib/revalidate";

type FaultCode = Doc<"faultCodes">;

interface FaultCodeFormModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  item: FaultCode | null;
}

export function FaultCodeFormModal({
  open,
  onOpenChange,
  item,
}: FaultCodeFormModalProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto p-0 sm:max-w-2xl">
        {open && (
          <FaultCodeFormModalContent
            key={item?._id ?? "new"}
            item={item}
            onClose={() => onOpenChange(false)}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}

function FaultCodeFormModalContent({
  item,
  onClose,
}: {
  item: FaultCode | null;
  onClose: () => void;
}) {
  const [isPopular, setIsPopular] = useState(item?.isPopular ?? false);
  const [error, setError] = useState("");
  const [isPending, startTransition] = useTransition();
  const descRef = useRef<HTMLTextAreaElement>(null);

  const createFaultCode = useMutation(api.faultCodes.create);
  const updateFaultCode = useMutation(api.faultCodes.update);

  const handleSave = (e: React.SubmitEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const code =
      (formData.get("code") as string)?.trim().toUpperCase() || "";
    const title = (formData.get("title") as string)?.trim() || "";
    const description =
      (formData.get("description") as string)?.trim() || undefined;

    if (!code) {
      setError("Arıza kodu zorunludur (örn: P0100).");
      return;
    }
    if (!title) {
      setError("Arıza başlığı / anlamı zorunludur.");
      return;
    }

    setError("");

    startTransition(async () => {
      try {
        const payload = {
          code,
          title,
          description,
          isPopular,
        };

        if (item) {
          await updateFaultCode({
            id: item._id,
            ...payload,
          });
        } else {
          await createFaultCode(payload);
        }

        void triggerRevalidate([
          "/ariza-kodlari",
          `/ariza-kodlari/${code.toLowerCase()}`,
          ...(item && item.code !== code
            ? [`/ariza-kodlari/${item.code.toLowerCase()}`]
            : []),
        ]);

        onClose();
      } catch (err: unknown) {
        setError(
          err instanceof Error
            ? err.message
            : "Kayıt sırasında bir hata oluştu.",
        );
      }
    });
  };

  return (
    <>
      <div className="border-b border-slate-100 px-6 py-4">
        <DialogHeader>
          <DialogTitle className="text-lg font-bold text-slate-900">
            {item ? "Arıza Kodunu Düzenle" : "Yeni Arıza Kodu Ekle"}
          </DialogTitle>
        </DialogHeader>
      </div>

      <form onSubmit={handleSave} className="space-y-4">
        <div className="space-y-4 px-6 pt-2">
          {error && (
            <div
              role="alert"
              className="flex items-center gap-2 rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs font-semibold text-rose-700"
            >
              <AlertTriangle className="h-4 w-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label
                htmlFor="fault-code"
                className="mb-1 block text-xs font-semibold text-slate-700"
              >
                Arıza Kodu (OBD-II) <span className="text-rose-500">*</span>
              </label>
              <Input
                id="fault-code"
                name="code"
                defaultValue={item?.code ?? ""}
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
                name="title"
                defaultValue={item?.title ?? ""}
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
                  if (descRef.current) {
                    descRef.current.value = descRef.current.value
                      ? `${descRef.current.value}\n\n${template}`
                      : template;
                  }
                }}
                className="h-7 gap-1.5 px-2 text-[11px] font-semibold text-amber-700 hover:bg-amber-50 hover:text-amber-800"
              >
                <FileText className="h-3 w-3" />
                Şablon ekle
              </Button>
            </div>
            <textarea
              id="fault-description"
              name="description"
              ref={descRef}
              defaultValue={item?.description ?? ""}
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
            onClick={onClose}
            className="cursor-pointer"
          >
            İptal
          </Button>
          <Button type="submit" disabled={isPending} className="cursor-pointer">
            {isPending
              ? "Kaydediliyor..."
              : item
                ? "Güncelle"
                : "Kaydet"}
          </Button>
        </div>
      </form>
    </>
  );
}
