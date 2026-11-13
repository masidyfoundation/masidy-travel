import type { BookingStatus, Language } from '../shared/types.ts';
import { BOOKING_STATUS_LABELS } from '../shared/i18n.ts';

const STATUS_STYLES: Record<BookingStatus, { dot: string; box: string }> = {
  Draft: {
    dot: 'bg-slate-400',
    box: 'border-slate-200 bg-slate-50 text-slate-700 dark:border-slate-700 dark:bg-slate-800/60 dark:text-slate-300',
  },
  Pending: {
    dot: 'bg-amber-500',
    box: 'border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-900/60 dark:bg-amber-950/40 dark:text-amber-300',
  },
  'Awaiting Provider Confirmation': {
    dot: 'bg-amber-500',
    box: 'border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-900/60 dark:bg-amber-950/40 dark:text-amber-300',
  },
  Confirmed: {
    dot: 'bg-emerald-500',
    box: 'border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-900/60 dark:bg-emerald-950/40 dark:text-emerald-300',
  },
  Completed: {
    dot: 'bg-blue-500',
    box: 'border-blue-200 bg-blue-50 text-blue-800 dark:border-blue-900/60 dark:bg-blue-950/40 dark:text-blue-300',
  },
  Rejected: {
    dot: 'bg-red-500',
    box: 'border-red-200 bg-red-50 text-red-700 dark:border-red-900/60 dark:bg-red-950/40 dark:text-red-300',
  },
  Cancelled: {
    dot: 'bg-red-500',
    box: 'border-red-200 bg-red-50 text-red-700 dark:border-red-900/60 dark:bg-red-950/40 dark:text-red-300',
  },
  'Refund Pending': {
    dot: 'bg-orange-500',
    box: 'border-orange-200 bg-orange-50 text-orange-800 dark:border-orange-900/60 dark:bg-orange-950/40 dark:text-orange-300',
  },
  Refunded: {
    dot: 'bg-slate-500',
    box: 'border-slate-200 bg-slate-100 text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300',
  },
  'Partially Refunded': {
    dot: 'bg-orange-500',
    box: 'border-orange-200 bg-orange-50 text-orange-800 dark:border-orange-900/60 dark:bg-orange-950/40 dark:text-orange-300',
  },
};

export function BookingStatusBadge({ status, lang }: { status: BookingStatus; lang: Language }) {
  const style = STATUS_STYLES[status] || STATUS_STYLES.Pending;
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-md border px-2 py-0.5 text-[11px] font-medium whitespace-nowrap ${style.box}`}
    >
      <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${style.dot}`} />
      <span>{BOOKING_STATUS_LABELS[status][lang]}</span>
    </span>
  );
}
