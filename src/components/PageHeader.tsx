import type { ReactNode } from 'react';

interface BreadcrumbItem {
  label: string;
  onClick?: () => void;
}

interface PageHeaderProps {
  breadcrumbs: BreadcrumbItem[];
  title: string;
  subtitle?: string;
  actions?: ReactNode;
}

export function PageHeader({ breadcrumbs, title, subtitle, actions }: PageHeaderProps) {
  return (
    <div className="pb-6 border-b border-slate-200 dark:border-slate-800 flex flex-col md:flex-row md:items-end justify-between gap-4">
      <div className="min-w-0">
        <nav aria-label="Breadcrumb" className="flex flex-wrap items-center gap-1.5 text-xs text-slate-500">
          {breadcrumbs.map((b, i) => (
            <span key={`${b.label}-${i}`} className="inline-flex items-center gap-1.5 min-w-0">
              {i > 0 && <span aria-hidden="true">/</span>}
              {b.onClick ? (
                <button
                  type="button"
                  onClick={b.onClick}
                  className="hover:text-slate-900 dark:hover:text-white hover:underline cursor-pointer py-0.5"
                >
                  {b.label}
                </button>
              ) : (
                <span className="text-slate-700 dark:text-slate-300 font-medium break-words">{b.label}</span>
              )}
            </span>
          ))}
        </nav>
        <h1 className="mt-2 text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 dark:text-white break-words">
          {title}
        </h1>
        {subtitle && (
          <p className="mt-1.5 text-sm text-slate-600 dark:text-slate-300 max-w-2xl">{subtitle}</p>
        )}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2.5 shrink-0">{actions}</div>}
    </div>
  );
}
