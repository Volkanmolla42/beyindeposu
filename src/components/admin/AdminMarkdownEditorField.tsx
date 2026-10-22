"use client";

import { useState } from "react";
import { Code, Eye } from "lucide-react";
import { MarkdownRenderer } from "@/components/MarkdownRenderer";

interface AdminMarkdownEditorFieldProps {
  value: string;
  onChange: (value: string) => void;
  rows?: number;
  placeholder?: string;
  minHeightClass?: string;
  label?: string;
  helperText?: string;
}

export function AdminMarkdownEditorField({
  value,
  onChange,
  rows = 12,
  placeholder = "İçeriği markdown formatında girin...",
  minHeightClass = "min-h-[300px]",
  label,
  helperText,
}: AdminMarkdownEditorFieldProps) {
  const [showPreview, setShowPreview] = useState(false);

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        {label ? (
          <div>
            <label className="text-xs font-bold text-slate-700">{label}</label>
            {helperText && (
              <p className="text-3xs text-slate-500">{helperText}</p>
            )}
          </div>
        ) : <div />}

        <div className="flex items-center gap-1 rounded-md bg-slate-100 p-0.5 border border-slate-200">
          <button
            type="button"
            onClick={() => setShowPreview(false)}
            className={`flex items-center gap-1 rounded-sm px-2.5 py-1 text-xs font-semibold transition-colors ${
              !showPreview
                ? "bg-white text-slate-900 shadow-2xs"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <Code className="h-3 w-3" />
            <span>Kaynak</span>
          </button>
          <button
            type="button"
            onClick={() => setShowPreview(true)}
            className={`flex items-center gap-1 rounded-sm px-2.5 py-1 text-xs font-semibold transition-colors ${
              showPreview
                ? "bg-white text-slate-900 shadow-2xs"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <Eye className="h-3 w-3" />
            <span>Önizleme</span>
          </button>
        </div>
      </div>

      {showPreview ? (
        <div
          className={`overflow-y-auto rounded-xl border border-slate-200 bg-white p-5 ${minHeightClass}`}
        >
          {value ? (
            <MarkdownRenderer content={value} />
          ) : (
            <p className="text-xs text-slate-400 italic">
              Henüz içerik girilmedi veya AI ile üretilmedi.
            </p>
          )}
        </div>
      ) : (
        <textarea
          rows={rows}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="w-full rounded-xl border border-slate-200 bg-white p-3.5 font-mono text-xs leading-relaxed text-slate-800 placeholder-slate-400 focus:border-amber-400 focus:outline-none focus:ring-1 focus:ring-amber-200"
        />
      )}
    </div>
  );
}

export default AdminMarkdownEditorField;
