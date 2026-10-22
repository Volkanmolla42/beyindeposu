import type { ComponentType } from "react";
import { cn } from "@/lib/utils";

export interface FeatureCardItem {
  icon: ComponentType<{ className?: string }>;
  title: string;
  description: string;
}

interface FeatureCardGridProps {
  items: FeatureCardItem[];
  columns?: 3 | 4;
  className?: string;
}

export default function FeatureCardGrid({
  items,
  columns = 4,
  className,
}: FeatureCardGridProps) {
  const colClass =
    columns === 3
      ? "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3"
      : "grid-cols-1 sm:grid-cols-2 lg:grid-cols-4";

  return (
    <div className={cn("grid gap-4 sm:gap-6", colClass, className)}>
      {items.map((item, idx) => (
        <div
          key={idx}
          className="flex flex-col space-y-3 rounded-2xl border border-slate-200/90 bg-white p-6 shadow-2xs transition-all duration-200 hover:border-amber-400/80 hover:shadow-xs"
        >
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-amber-400/30 bg-amber-50 text-amber-600">
            <item.icon className="h-5 w-5" aria-hidden="true" />
          </div>
          <h3 className="text-base font-semibold text-slate-900">
            {item.title}
          </h3>
          <p className="text-xs sm:text-sm leading-relaxed text-slate-600">
            {item.description}
          </p>
        </div>
      ))}
    </div>
  );
}
