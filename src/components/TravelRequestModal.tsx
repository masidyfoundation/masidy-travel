import { useState } from 'react';
import { X } from 'lucide-react';
import { api } from '../lib/api.ts';
import type { CurrencyCode, Language, ServiceCategory, User } from '../shared/types.ts';
import { CATEGORIES, UI_TEXT } from '../shared/i18n.ts';

interface TravelRequestModalProps {
  lang: Language;
  currency: CurrencyCode;
  user: User | null;
  onRequireAuth: () => void;
  onClose: () => void;
  onCreated: () => void;
}

export function TravelRequestModal({
  lang,
  currency,
  user,
  onRequireAuth,
  onClose,
  onCreated,
}: TravelRequestModalProps) {
  const t = UI_TEXT[lang];
  const [destination, setDestination] = useState('');
  const [travelDate, setTravelDate] = useState('2026-12-15');
  const [travelersCount, setTravelersCount] = useState(2);
  const [budget, setBudget] = useState(2200);
  const [accommodationType, setAccommodationType] = useState('4-5 Star Boutique Hotel');
  const [services, setServices] = useState<ServiceCategory[]>(['flights', 'hotels', 'transport']);
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  function toggleService(cat: ServiceCategory) {
    setServices((prev) =>
      prev.includes(cat) ? prev.filter((c) => c !== cat) : [...prev, cat]
    );
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!user) {
      onRequireAuth();
      return;
    }
    setSubmitting(true);
    setError('');
    try {
      await api.createTravelRequest({
        destination,
        travelDate,
        travelersCount,
        budget,
        currency,
        accommodationType,
        requestedServices: services,
        notes,
      });
      onCreated();
      onClose();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-xs">
      <div className="w-full max-w-xl rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between pb-4 border-b border-slate-200 dark:border-slate-800">
          <div>
            <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
              {t.requestQuoteTitle}
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">{t.requestQuoteDesc}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-lg text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {error && (
          <div className="mt-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          <div>
            <label className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1">
              {t.destinationLabel}
            </label>
            <input
              type="text"
              required
              value={destination}
              onChange={(e) => setDestination(e.target.value)}
              placeholder={lang === 'ar' ? 'مثال: إسطنبول أو ساحل أمالفي' : 'e.g. Rome & Amalfi Coast'}
              className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-sm"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1">
                {t.travelDate}
              </label>
              <input
                type="date"
                required
                value={travelDate}
                onChange={(e) => setTravelDate(e.target.value)}
                className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-sm font-mono"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1">
                {t.travelersCount}
              </label>
              <input
                type="number"
                min={1}
                max={100}
                required
                value={travelersCount}
                onChange={(e) => setTravelersCount(Number(e.target.value))}
                className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-sm font-mono"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1">
                {t.budgetLabel} ({currency})
              </label>
              <input
                type="number"
                min={50}
                required
                value={budget}
                onChange={(e) => setBudget(Number(e.target.value))}
                className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-sm font-mono"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1">
              {t.accommodationLabel}
            </label>
            <input
              type="text"
              value={accommodationType}
              onChange={(e) => setAccommodationType(e.target.value)}
              className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-sm"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1.5">
              {lang === 'ar' ? 'الخدمات المطلوبة' : 'Required Services'}
            </label>
            <div className="flex flex-wrap gap-2">
              {(Object.keys(CATEGORIES) as ServiceCategory[]).map((cat) => {
                const active = services.includes(cat);
                return (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => toggleService(cat)}
                    className={`px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors cursor-pointer ${
                      active
                        ? 'border-blue-600 bg-blue-50 text-blue-700 dark:bg-blue-950/50 dark:text-blue-300'
                        : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300'
                    }`}
                  >
                    {CATEGORIES[cat][lang]}
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1">
              {t.specialNotes}
            </label>
            <textarea
              rows={3}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder={
                lang === 'ar'
                  ? 'تفاصيل إضافية: تأشيرات، مرشد عربي، رحلات يومية...'
                  : 'Additional preferences, visa needs, private transfers...'
              }
              className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-sm"
            />
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="w-full py-2.5 px-4 rounded-lg bg-[#0052CC] hover:bg-[#0041a3] text-white text-sm font-semibold transition-colors cursor-pointer disabled:opacity-50"
          >
            {submitting ? '...' : t.submitRequest}
          </button>
        </form>
      </div>
    </div>
  );
}
