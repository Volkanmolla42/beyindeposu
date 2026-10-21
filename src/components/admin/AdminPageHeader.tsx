import type { ReactNode } from "react";

interface AdminPageHeaderProps {
  title: string;
  badge?: ReactNode;
  description?: ReactNode;
  tabs?: ReactNode;
  actions?: ReactNode;
  className?: string;
}

export default function AdminPageHeader({
  title,
  badge,
  description,
  tabs,
  actions,
  className = "",
}: AdminPageHeaderProps) {
  return (
    <header
      className={`flex flex-col gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-xs sm:flex-row sm:flex-wrap sm:items-center sm:p-6 xl:grid xl:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] ${className}`}
    >
      <div className="min-w-0 xl:col-start-1">
        <h1 className="flex flex-wrap items-center gap-2 text-xl font-bold tracking-tight text-slate-900 sm:text-2xl">
          <span>{title}</span>
          {badge !== undefined &&
            badge !== null &&
            (typeof badge === "string" || typeof badge === "number" ? (
              <span className="rounded-full border border-slate-200 bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-600">
                {badge}
              </span>
            ) : (
              badge
            ))}
        </h1>
        {description && (
          <p className="mt-1.5 text-sm text-slate-500">
            {description}
          </p>
        )}
      </div>

      {tabs && (
        <div className="shrink-0 xl:col-start-2 xl:justify-self-center">
          {tabs}
        </div>
      )}

      {actions && (
        <div className="flex flex-wrap items-center gap-2 sm:ml-auto sm:shrink-0 xl:col-start-3 xl:ml-0 xl:justify-self-end">
          {actions}
        </div>
      )}
    </header>
  );
}
