"use client";

import * as React from "react";
import { ChevronDown, Search, X } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

export interface SearchableMultiSelectOption {
  value: string;
  label: string;
  description?: string;
  count?: number;
}

interface SearchableMultiSelectProps {
  options: SearchableMultiSelectOption[];
  values: string[];
  onChange: (values: string[]) => void;
  placeholder?: string;
  searchPlaceholder?: string;
  emptyText?: string;
  className?: string;
  ariaLabel: string;
  disabled?: boolean;
}

export function SearchableMultiSelect({
  options,
  values,
  onChange,
  placeholder = "Tümü",
  searchPlaceholder = "Ara",
  emptyText = "Sonuç bulunamadı.",
  className,
  ariaLabel,
  disabled = false,
}: SearchableMultiSelectProps) {
  const [open, setOpen] = React.useState(false);
  const [query, setQuery] = React.useState("");
  const inputId = React.useId();
  const searchInputRef = React.useRef<HTMLInputElement>(null);
  const firstOptionRef = React.useRef<HTMLInputElement>(null);
  const skipFocusOpenRef = React.useRef(false);
  const selectedValues = React.useMemo(() => [...new Set(values)], [values]);
  const selectedOptions = React.useMemo(
    () => selectedValues.map((value) => options.find((option) => option.value === value)?.label ?? value),
    [options, selectedValues],
  );

  const filteredOptions = React.useMemo(() => {
    const term = query.trim().toLocaleLowerCase("tr-TR");
    if (!term) return options;

    return options.filter((option) =>
      `${option.label} ${option.description ?? ""}`.toLocaleLowerCase("tr-TR").includes(term),
    );
  }, [options, query]);

  const toggleOption = (value: string, checked: boolean) => {
    onChange(
      checked
        ? [...selectedValues, value]
        : selectedValues.filter((selectedValue) => selectedValue !== value),
    );
  };

  const handleSearchKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Escape" && open) {
      event.preventDefault();
      setOpen(false);
      setQuery("");
    } else if (event.key === "ArrowDown" && open) {
      event.preventDefault();
      firstOptionRef.current?.focus();
    }
  };

  return (
    <Popover
      open={open}
      onOpenChange={(nextOpen) => {
        setOpen(nextOpen);
        if (!nextOpen) setQuery("");
      }}
    >
      <div className={cn("relative", className)}>
        <Search className="pointer-events-none absolute left-3 top-1/2 z-10 h-4 w-4 -translate-y-1/2 text-slate-400" aria-hidden="true" />
        <PopoverTrigger asChild>
          <input
            ref={searchInputRef}
            id={inputId}
            name={`${inputId}-search`}
            type="text"
            role="combobox"
            aria-label={`${searchPlaceholder}${selectedOptions.length > 0 ? `, ${selectedOptions.length} seçili` : ""}`}
            aria-controls={`${inputId}-popover`}
            aria-expanded={open}
            aria-haspopup="dialog"
            autoComplete="off"
            placeholder={searchPlaceholder}
            value={query}
            disabled={disabled}
            onChange={(event) => setQuery(event.target.value)}
            onFocus={() => {
              if (skipFocusOpenRef.current) {
                skipFocusOpenRef.current = false;
                return;
              }
              setOpen(true);
            }}
            onClick={(event) => {
              event.preventDefault();
              setOpen(true);
            }}
            onKeyDown={handleSearchKeyDown}
            className={cn(
              "h-12 w-full rounded-xl border border-slate-300 bg-white pl-10 pr-20 text-base text-slate-900 shadow-2xs outline-none transition-colors placeholder:text-slate-500 hover:border-blue-300 focus-visible:border-blue-500 focus-visible:ring-2 focus-visible:ring-blue-100 data-[state=open]:border-blue-500 data-[state=open]:ring-2 data-[state=open]:ring-blue-100",
              selectedOptions.length > 0 && "border-blue-200",
              disabled && "cursor-not-allowed opacity-60",
            )}
          />
        </PopoverTrigger>
        <span className="pointer-events-none absolute right-3 top-1/2 z-10 flex -translate-y-1/2 items-center gap-2">
          {query && (
            <button
              type="button"
              data-search-clear={inputId}
              onPointerDown={(event) => event.preventDefault()}
              onClick={() => {
                setQuery("");
                searchInputRef.current?.focus();
                setOpen(true);
              }}
              aria-label="Aramayı temizle"
              className="pointer-events-auto inline-flex h-8 w-8 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
            >
              <X className="h-4 w-4" aria-hidden="true" />
            </button>
          )}
          {selectedOptions.length > 0 && (
            <span className="inline-flex min-w-6 items-center justify-center rounded-full bg-blue-100 px-1.5 py-0.5 text-xs font-semibold tabular-nums text-blue-800">
              {selectedOptions.length}
            </span>
          )}
          <ChevronDown
            className={cn("h-4 w-4 text-slate-500 transition-transform", open && "rotate-180")}
            aria-hidden="true"
          />
        </span>
      </div>

      <PopoverContent
        id={`${inputId}-popover`}
        align="start"
        aria-label={ariaLabel}
        className="w-[var(--radix-popover-trigger-width)] min-w-64 rounded-2xl border-slate-200 p-2.5 shadow-xl"
        onOpenAutoFocus={(event) => event.preventDefault()}
        onEscapeKeyDown={() => {
          skipFocusOpenRef.current = true;
        }}
        onPointerDownOutside={(event) => {
          const target = event.target;
          if (target instanceof Element && target.closest("[data-search-clear]")?.getAttribute("data-search-clear") === inputId) {
            event.preventDefault();
          }
        }}
      >
        <div className="flex items-center justify-between gap-3 px-1 py-2 text-xs">
          <span className="font-semibold text-slate-700" role="status" aria-live="polite">
            {selectedOptions.length === 0 ? placeholder : `${selectedOptions.length} seçili`}
          </span>
          <span className="shrink-0 text-slate-500">
            {filteredOptions.length} seçenek
          </span>
        </div>

        <div
          id={`${inputId}-options`}
          role="group"
          aria-label={`${ariaLabel} seçenekleri`}
          className="max-h-64 space-y-0.5 overflow-y-auto overscroll-contain border-t border-slate-100 pt-1 sm:max-h-72"
        >
          {filteredOptions.map((option, index) => {
            const checkboxId = `${inputId}-option-${index}`;
            const isChecked = selectedValues.includes(option.value);

            return (
              <label
                key={option.value}
                htmlFor={checkboxId}
                className={cn(
                  "flex min-h-11 cursor-pointer items-center gap-3 rounded-xl px-3 py-2 text-sm transition-colors hover:bg-slate-50",
                  isChecked && "bg-blue-50 text-blue-900 hover:bg-blue-50",
                )}
              >
                <input
                  id={checkboxId}
                  name={`${inputId}-options`}
                  type="checkbox"
                  value={option.value}
                  checked={isChecked}
                  ref={index === 0 ? firstOptionRef : undefined}
                  onChange={(event) => toggleOption(option.value, event.target.checked)}
                  className="h-4 w-4 shrink-0 rounded border-slate-300 accent-blue-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
                />
                <span className="min-w-0 flex-1 truncate font-medium">{option.label}</span>
                {option.description && (
                  <span className="shrink-0 text-xs text-slate-500">{option.description}</span>
                )}
                {option.count !== undefined && (
                  <span className="shrink-0 text-xs tabular-nums text-slate-500">{option.count}</span>
                )}
              </label>
            );
          })}

          {filteredOptions.length === 0 && (
            <p className="px-3 py-8 text-center text-sm text-slate-500">{emptyText}</p>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
