import { useEffect, useState } from 'react';
import { Star, X, Building2, CheckCircle2, Clock } from 'lucide-react';
import { api, getStoredReferral } from '../lib/api.ts';
import type { Booking, CurrencyCode, Language, Product, Review, User } from '../shared/types.ts';
import { CATEGORIES, PRODUCT_MODELS, UI_TEXT } from '../shared/i18n.ts';
import { convertAmount, formatMoney } from '../shared/currency.ts';

interface ProductDetailModalProps {
  product: Product;
  lang: Language;
  currency: CurrencyCode;
  user: User | null;
  onRequireAuth: () => void;
  onClose: () => void;
  onBooked: (booking: Booking) => void;
  onFilterByProvider: (providerId: string) => void;
}

export function ProductDetailModal({
  product,
  lang,
  currency,
  user,
  onRequireAuth,
  onClose,
  onBooked,
  onFilterByProvider,
}: ProductDetailModalProps) {
  const t = UI_TEXT[lang];
  const [checkInDate, setCheckInDate] = useState(product.availableDates[0] || '2026-11-25');
  const [travelersCount, setTravelersCount] = useState(1);
  const [travelerName, setTravelerName] = useState(user?.name || '');
  const [affiliateCode, setAffiliateCode] = useState(getStoredReferral());
  const [specialNotes, setSpecialNotes] = useState('');
  const [reviews, setReviews] = useState<Review[]>([]);
  const [newComment, setNewComment] = useState('');
  const [newRating, setNewRating] = useState(5);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [imgFailed, setImgFailed] = useState(false);

  useEffect(() => {
    setTravelerName(user?.name || '');
  }, [user]);

  useEffect(() => {
    api
      .getProduct(product.id, getStoredReferral() || undefined)
      .then((res) => setReviews(res.reviews || []))
      .catch(() => {});
  }, [product.id]);

  const unitConverted = convertAmount(product.price, product.baseCurrency, currency);
  const totalConverted = Number((unitConverted * travelersCount).toFixed(2));

  async function handleBook(e: React.FormEvent) {
    e.preventDefault();
    if (!user) {
      onRequireAuth();
      return;
    }
    setSubmitting(true);
    setError('');
    try {
      const res = await api.createBooking({
        productId: product.id,
        checkInDate,
        travelersCount,
        travelerNames: [travelerName || user.name],
        affiliateCode: affiliateCode.trim() || undefined,
        specialNotes: specialNotes.trim() || undefined,
        currency,
      });
      onBooked(res.booking);
    } catch (err: any) {
      setError(err.message || 'Booking error');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleAddReview(e: React.FormEvent) {
    e.preventDefault();
    if (!user) {
      onRequireAuth();
      return;
    }
    if (!newComment.trim()) return;
    try {
      const res = await api.createReview(product.id, newRating, newComment.trim());
      setReviews((prev) => [res.review, ...prev]);
      setNewComment('');
    } catch (err: any) {
      setError(err.message);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-xs">
      <div className="w-full max-w-5xl rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xl max-h-[92vh] overflow-y-auto">
        {/* Top Modal Bar */}
        <div className="sticky top-0 z-10 flex items-center justify-between px-6 py-4 bg-white/95 dark:bg-slate-900/95 backdrop-blur-xs border-b border-slate-200 dark:border-slate-800">
          <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
            <span>{CATEGORIES[product.category][lang]}</span>
            <span aria-hidden="true">·</span>
            <span>{PRODUCT_MODELS[product.productModel][lang]}</span>
            <span aria-hidden="true">·</span>
            <span>{product.destination[lang]}</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-lg text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
            aria-label="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 p-6">
          {/* Left Column: Media, Specs, Provider, Reviews */}
          <div className="lg:col-span-7 space-y-6">
            <div className="aspect-4/3 w-full overflow-hidden rounded-lg bg-slate-100 dark:bg-slate-800">
              {!imgFailed ? (
                <img
                  src={product.imageUrl}
                  alt={product.title[lang]}
                  referrerPolicy="no-referrer"
                  onError={() => setImgFailed(true)}
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center bg-slate-100 dark:bg-slate-800 text-slate-400 text-sm">
                  {product.title[lang]}
                </div>
              )}
            </div>

            <div>
              <h2 className="text-2xl font-bold text-slate-900 dark:text-white leading-snug">
                {product.title[lang]}
              </h2>
              <div className="mt-2 flex flex-wrap items-center gap-3 text-sm text-slate-600 dark:text-slate-300">
                <button
                  type="button"
                  onClick={() => {
                    onFilterByProvider(product.organizationId);
                    onClose();
                  }}
                  className="inline-flex items-center gap-1.5 font-medium text-blue-600 dark:text-blue-400 hover:underline cursor-pointer"
                >
                  <Building2 className="w-4 h-4" />
                  <span>{product.providerName}</span>
                </button>
                <span aria-hidden="true">·</span>
                <span className="inline-flex items-center gap-1 font-mono tabular-nums">
                  <Star className="w-4 h-4 fill-amber-400 text-amber-400" />
                  {product.rating.toFixed(1)} ({product.reviewCount})
                </span>
                <span aria-hidden="true">·</span>
                <span>{product.durationLabel[lang]}</span>
              </div>
              <p className="mt-4 text-sm leading-relaxed text-slate-600 dark:text-slate-300">
                {product.description[lang]}
              </p>
            </div>

            {/* Technical Specs & Cancellation Policy */}
            <div className="pt-4 border-t border-slate-200 dark:border-slate-800 grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
              <div>
                <h3 className="font-semibold text-slate-900 dark:text-white mb-2">
                  {lang === 'ar' ? 'سياسة الإلغاء' : lang === 'it' ? 'Cancellazione' : 'Cancellation Policy'}
                </h3>
                <p className="text-slate-600 dark:text-slate-400 text-xs leading-relaxed">
                  {product.cancellationPolicy[lang]}
                </p>
              </div>
              <div>
                <h3 className="font-semibold text-slate-900 dark:text-white mb-2">
                  {lang === 'ar' ? 'تفاصيل الخدمة' : lang === 'it' ? 'Dettagli Servizio' : 'Service Specifications'}
                </h3>
                <dl className="space-y-1 text-xs">
                  {Object.entries(product.specs).map(([k, v]) => (
                    <div key={k} className="flex justify-between gap-2">
                      <dt className="text-slate-500 capitalize">{k}</dt>
                      <dd className="font-medium text-slate-800 dark:text-slate-200">{v}</dd>
                    </div>
                  ))}
                </dl>
              </div>
            </div>

            {/* Reviews Section */}
            <div className="pt-4 border-t border-slate-200 dark:border-slate-800">
              <h3 className="text-sm font-semibold text-slate-900 dark:text-white mb-3">
                {lang === 'ar' ? 'تقييمات المسافرين' : lang === 'it' ? 'Recensioni' : 'Traveler Reviews'}
              </h3>
              <div className="space-y-3 mb-4">
                {reviews.length === 0 ? (
                  <p className="text-xs text-slate-500">
                    {lang === 'ar' ? 'لا توجد مراجعات بعد.' : 'No reviews yet.'}
                  </p>
                ) : (
                  reviews.map((rev) => (
                    <div
                      key={rev.id}
                      className="pb-3 border-b border-slate-100 dark:border-slate-800 last:border-0"
                    >
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-semibold text-slate-800 dark:text-slate-200">
                          {rev.customerName}
                        </span>
                        <span className="font-mono tabular-nums text-amber-600">
                          ★ {rev.rating}.0
                        </span>
                      </div>
                      <p className="mt-1 text-xs text-slate-600 dark:text-slate-400">
                        {rev.comment}
                      </p>
                    </div>
                  ))
                )}
              </div>

              <form onSubmit={handleAddReview} className="flex gap-2">
                <select
                  value={newRating}
                  onChange={(e) => setNewRating(Number(e.target.value))}
                  className="rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-2.5 py-2 text-xs font-mono"
                >
                  {[5, 4, 3, 2, 1].map((n) => (
                    <option key={n} value={n}>
                      {n}★
                    </option>
                  ))}
                </select>
                <input
                  type="text"
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  placeholder={lang === 'ar' ? 'أضف تقييمك للخدمة...' : 'Write a review...'}
                  className="flex-1 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-xs"
                />
                <button
                  type="submit"
                  className="px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 text-xs font-medium hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer"
                >
                  {lang === 'ar' ? 'إرسال' : 'Post'}
                </button>
              </form>
            </div>
          </div>

          {/* Right Column: Contiguous Booking Module */}
          <div className="lg:col-span-5">
            <div className="sticky top-20 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/40 p-5">
              <div className="flex items-baseline justify-between pb-4 border-b border-slate-200 dark:border-slate-800">
                <div>
                  <div className="text-2xl font-bold font-mono tabular-nums text-slate-900 dark:text-white">
                    {formatMoney(unitConverted, currency)}
                  </div>
                  <div className="text-xs text-slate-500 mt-0.5">{t.perTraveler}</div>
                </div>
                <div className="flex items-center gap-1.5 text-xs font-medium text-slate-700 dark:text-slate-300">
                  {product.instantBooking ? (
                    <>
                      <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                      <span>{t.instantConfirm}</span>
                    </>
                  ) : (
                    <>
                      <Clock className="w-4 h-4 text-amber-600" />
                      <span>{t.requiresApproval}</span>
                    </>
                  )}
                </div>
              </div>

              {error && (
                <div className="mt-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
                  {error}
                </div>
              )}

              <form onSubmit={handleBook} className="mt-4 space-y-3.5">
                <div>
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                    {t.travelDate}
                  </label>
                  <input
                    type="date"
                    required
                    value={checkInDate}
                    onChange={(e) => setCheckInDate(e.target.value)}
                    className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-sm font-mono"
                  />
                  {product.availableDates.length > 0 && (
                    <div className="mt-1.5 flex flex-wrap gap-1.5">
                      {product.availableDates.map((d) => (
                        <button
                          key={d}
                          type="button"
                          onClick={() => setCheckInDate(d)}
                          className={`px-2 py-1 text-[11px] font-mono rounded-md border transition-colors cursor-pointer ${
                            checkInDate === d
                              ? 'border-blue-600 bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300'
                              : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400'
                          }`}
                        >
                          {d}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                      {t.travelersCount}
                    </label>
                    <input
                      type="number"
                      min={1}
                      max={product.maxCapacity}
                      required
                      value={travelersCount}
                      onChange={(e) => setTravelersCount(Math.max(1, Number(e.target.value)))}
                      className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-sm font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                      {t.affiliateCodeLabel}
                    </label>
                    <input
                      type="text"
                      value={affiliateCode}
                      onChange={(e) => setAffiliateCode(e.target.value.toUpperCase())}
                      placeholder="MARCO10"
                      className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-sm font-mono uppercase"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                    {t.travelerName}
                  </label>
                  <input
                    type="text"
                    required
                    value={travelerName}
                    onChange={(e) => setTravelerName(e.target.value)}
                    placeholder={lang === 'ar' ? 'الاسم كما في جواز السفر' : 'Full name as on passport'}
                    className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-sm"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                    {t.specialNotes}
                  </label>
                  <textarea
                    rows={2}
                    value={specialNotes}
                    onChange={(e) => setSpecialNotes(e.target.value)}
                    className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-sm"
                  />
                </div>

                <div className="pt-3 border-t border-slate-200 dark:border-slate-800 space-y-1.5 text-sm">
                  <div className="flex justify-between text-slate-600 dark:text-slate-400">
                    <span>
                      {formatMoney(unitConverted, currency)} × {travelersCount}
                    </span>
                    <span className="font-mono tabular-nums font-semibold text-slate-900 dark:text-white">
                      {formatMoney(totalConverted, currency)}
                    </span>
                  </div>
                  {product.baseCurrency !== currency && (
                    <div className="flex justify-between text-xs text-slate-500">
                      <span>{lang === 'ar' ? 'السعر الأصلي للمزود' : 'Provider Base Price'}</span>
                      <span className="font-mono tabular-nums">
                        {formatMoney(product.price * travelersCount, product.baseCurrency)}
                      </span>
                    </div>
                  )}
                </div>

                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full py-3 px-4 rounded-lg bg-[#F95738] hover:bg-[#e1482b] text-white text-sm font-semibold transition-colors cursor-pointer disabled:opacity-50"
                >
                  {submitting ? '...' : t.submitBooking}
                </button>
              </form>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
