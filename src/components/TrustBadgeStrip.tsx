import type { ComponentType } from "react";
import { cn } from "@/lib/utils";

export interface TrustBadgeItem {
  icon: ComponentType<{ className?: string }>;
  title: string;
  description?: string;
}

interface TrustBadgeStripProps {
  items: TrustBadgeItem[];
  className?: string;
  /**
   * "strip": Sayfa üstü / hero altı tam genişlikli yatay şerit (varsayılan)
   * "cards": Sayfa içi / CTA altı kutulu kart ızgarası
   */
  variant?: "strip" | "cards";
}

export default function TrustBadgeStrip({
  items,
  className,
  variant = "strip",
}: TrustBadgeStripProps) {
  if (variant === "cards") {
    return (
      <div
        className={cn(
          "grid grid-cols-1 gap-3.5 sm:grid-cols-2 lg:grid-cols-4 sm:gap-4",
          className
        )}
      >
        {items.map((item, idx) => (
          <div
            key={idx}
            className="flex items-center gap-3.5 rounded-2xl border border-slate-200/90 bg-white p-4 text-slate-800 shadow-2xs transition-all hover:border-amber-400/70 hover:shadow-xs"
          >
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-amber-400/30 bg-amber-50 text-amber-600">
              <item.icon className="h-5 w-5" aria-hidden="true" />
            </div>
            <div className="min-w-0">
              <h4 className="text-sm font-semibold text-slate-900 truncate">
                {item.title}
              </h4>
              {item.description && (
                <p className="truncate text-xs text-slate-500">
                  {item.description}
                </p>
              )}
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <section
      className={cn(
        "border-b border-slate-200/80 bg-white py-6 shadow-xs",
        className
      )}
    >
      <div className="container">
        <div className="grid grid-cols-2 gap-x-4 gap-y-5 sm:gap-6 lg:grid-cols-4">
          {items.map((item, idx) => (
            <div
              key={idx}
              className="flex min-w-0 flex-col items-start gap-2.5 sm:flex-row sm:items-center sm:gap-3.5"
            >
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-amber-400/30 bg-amber-50 text-amber-600">
                <item.icon className="h-5 w-5" aria-hidden="true" />
              </div>
              <div className="min-w-0">
                <h4 className="text-sm font-semibold leading-snug text-slate-900">
                  {item.title}
                </h4>
                {item.description && (
                  <p className="text-xs leading-snug text-slate-500">
                    {item.description}
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
