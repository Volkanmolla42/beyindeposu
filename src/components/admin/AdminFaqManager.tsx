"use client";

import { useState } from "react";
import { PlusCircle, Trash2, HelpCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export interface FaqEntry {
  question: string;
  answer: string;
}

interface AdminFaqManagerProps {
  faqs: FaqEntry[];
  onChange: (faqs: FaqEntry[]) => void;
  title?: string;
  description?: string;
}

export function AdminFaqManager({
  faqs,
  onChange,
  title = "Sıkça Sorulan Sorular (SSS / FAQ)",
  description = "Google arama sonuçlarında FAQPage zengin şeması ve sayfa içi SSS akordiyonu olarak listelenir.",
}: AdminFaqManagerProps) {
  const [newQuestion, setNewQuestion] = useState("");
  const [newAnswer, setNewAnswer] = useState("");

  const handleAddFaq = () => {
    const q = newQuestion.trim();
    const a = newAnswer.trim();
    if (!q || !a) return;

    onChange([...faqs, { question: q, answer: a }]);
    setNewQuestion("");
    setNewAnswer("");
  };

  const handleRemoveFaq = (index: number) => {
    onChange(faqs.filter((_, i) => i !== index));
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <label className="flex items-center gap-1.5 text-xs font-bold text-slate-700">
            <HelpCircle className="h-3.5 w-3.5 text-amber-500" />
            <span>{title}</span>
            <span className="rounded-full bg-slate-100 px-2 py-0.5 text-3xs font-semibold text-slate-600">
              {faqs.length} soru
            </span>
          </label>
          {description && (
            <p className="mt-0.5 text-3xs text-slate-500">{description}</p>
          )}
        </div>
      </div>

      {/* Mevcut Sorular Listesi */}
      {faqs.length > 0 && (
        <div className="space-y-2">
          {faqs.map((faq, index) => (
            <div
              key={index}
              className="group flex items-start justify-between gap-3 rounded-xl border border-slate-200 bg-slate-50/60 p-3 text-xs transition-colors hover:border-slate-300"
            >
              <div className="min-w-0 flex-1 space-y-1">
                <p className="font-semibold text-slate-900">
                  {index + 1}. {faq.question}
                </p>
                <p className="line-clamp-2 text-3xs leading-relaxed text-slate-600">
                  {faq.answer}
                </p>
              </div>
              <button
                type="button"
                onClick={() => handleRemoveFaq(index)}
                className="shrink-0 rounded-lg p-1 text-slate-400 opacity-60 transition-opacity hover:bg-rose-50 hover:text-rose-600 group-hover:opacity-100"
                title="Soruyu Sil"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Yeni Soru Ekleme Formu */}
      <div className="space-y-2.5 rounded-xl border border-dashed border-slate-300 bg-slate-50/30 p-3.5">
        <span className="text-3xs font-bold uppercase tracking-wider text-slate-500">
          Yeni Soru & Cevap Ekle
        </span>
        <Input
          placeholder="Soru (örn: ECU tamiri ne kadar sürer?)"
          value={newQuestion}
          onChange={(e) => setNewQuestion(e.target.value)}
          className="text-xs"
        />
        <textarea
          rows={2}
          placeholder="Cevap (detaylı teknik açıklama...)"
          value={newAnswer}
          onChange={(e) => setNewAnswer(e.target.value)}
          className="w-full rounded-md border border-slate-200 bg-white p-2.5 text-xs text-slate-800 placeholder-slate-400 focus:border-amber-400 focus:outline-none focus:ring-1 focus:ring-amber-200"
        />
        <div className="flex justify-end">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleAddFaq}
            disabled={!newQuestion.trim() || !newAnswer.trim()}
            className="h-7 text-xs font-semibold"
          >
            <PlusCircle className="mr-1 h-3 w-3" />
            Listeye Ekle
          </Button>
        </div>
      </div>
    </div>
  );
}

export default AdminFaqManager;
