"use client";

import * as React from "react";
import { Check, ChevronsUpDown, Search, X } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export interface ComboboxOption {
  value: string;
  label: string;
  count?: number;
  description?: string;
}

interface SearchableComboboxProps {
  options: ComboboxOption[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  searchPlaceholder?: string;
  emptyText?: string;
  className?: string;
  allOptionLabel?: string;
}

export function SearchableCombobox({
  options,
  value,
  onChange,
  placeholder = "Seçiniz...",
  searchPlaceholder = "Ara...",
  emptyText = "Sonuç bulunamadı.",
  className,
  allOptionLabel = "Tümü",
}: SearchableComboboxProps) {
  const [open, setOpen] = React.useState(false);
  const [query, setQuery] = React.useState("");

  const filteredOptions = React.useMemo(() => {
    let opts = options;
    if (allOptionLabel) {
      opts = opts.filter((opt) => opt.value !== "" && opt.value.toLowerCase() !== "tümü");
    }
    if (!query.trim()) return opts;
    const term = query.toLowerCase();
    return opts.filter(
      (opt) =>
        opt.label.toLowerCase().includes(term) ||
        (opt.description && opt.description.toLowerCase().includes(term))
    );
  }, [options, query, allOptionLabel]);

  const selectedLabel = React.useMemo(() => {
    if (!value || value === "Tümü" || value === "") return placeholder;
    const found = options.find((opt) => opt.value === value);
    return found ? found.label : value;
  }, [value, options, placeholder]);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={cn(
            "w-full justify-between text-xs font-medium h-9 px-3 bg-slate-50 hover:bg-white border-slate-200 text-slate-800 transition-all",
            !value && "text-slate-500",
            className
          )}
        >
          <span className="truncate">{selectedLabel}</span>
          <div className="flex items-center gap-1 shrink-0 ml-1">
            {value && value !== "Tümü" && value !== "" && (
              <span
                onClick={(e) => {
                  e.stopPropagation();
                  onChange("");
                }}
                className="p-0.5 rounded-full hover:bg-slate-200 text-slate-400 hover:text-slate-700"
                title="Temizle"
              >
                <X className="h-3 w-3" />
              </span>
            )}
            <ChevronsUpDown className="h-3.5 w-3.5 opacity-50" />
          </div>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[--radix-popover-trigger-width] min-w-[200px] p-2 bg-white rounded-xl shadow-xl border border-slate-200 z-50">
        {/* Search Input */}
        <div className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-slate-50 border border-slate-200 mb-2">
          <Search className="h-3.5 w-3.5 text-slate-400 shrink-0" />
          <input
            type="text"
            placeholder={searchPlaceholder}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="w-full bg-transparent text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none"
            autoFocus
          />
          {query && (
            <button
              onClick={() => setQuery("")}
              className="text-slate-400 hover:text-slate-700 text-xs"
            >
              <X className="h-3 w-3" />
            </button>
          )}
        </div>

        {/* Options List */}
        <div className="max-h-56 overflow-y-auto space-y-0.5 text-xs">
          {/* All / Clear Option */}
          <div
            onClick={() => {
              onChange("");
              setOpen(false);
              setQuery("");
            }}
            className={cn(
              "flex items-center justify-between px-2.5 py-1.5 rounded-lg cursor-pointer transition-colors",
              !value || value === "" || value === "Tümü"
                ? "bg-blue-50 text-blue-700 font-bold"
                : "text-slate-700 hover:bg-slate-100"
            )}
          >
            <span>{allOptionLabel}</span>
            {(!value || value === "" || value === "Tümü") && (
              <Check className="h-3.5 w-3.5 text-blue-600" />
            )}
          </div>

          {filteredOptions.map((opt) => {
            const isSelected = value === opt.value;
            return (
              <div
                key={opt.value}
                onClick={() => {
                  onChange(opt.value);
                  setOpen(false);
                  setQuery("");
                }}
                className={cn(
                  "flex items-center justify-between px-2.5 py-1.5 rounded-lg cursor-pointer transition-colors",
                  isSelected
                    ? "bg-blue-50 text-blue-700 font-bold"
                    : "text-slate-700 hover:bg-slate-100"
                )}
              >
                <div className="truncate">
                  <span>{opt.label}</span>
                  {opt.description && (
                    <span className="text-[10px] text-slate-400 ml-1.5">
                      ({opt.description})
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-1.5 shrink-0 ml-2">
                  {opt.count !== undefined && (
                    <span className="text-[10px] text-slate-400 font-mono">
                      {opt.count}
                    </span>
                  )}
                  {isSelected && <Check className="h-3.5 w-3.5 text-blue-600" />}
                </div>
              </div>
            );
          })}

          {filteredOptions.length === 0 && (
            <div className="p-3 text-center text-xs text-slate-400">
              {emptyText}
            </div>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
