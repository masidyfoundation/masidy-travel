import { useState } from 'react';
import { AlertCircle, CheckCircle2, FileText, Printer, Scale } from 'lucide-react';
import { useMarketplace } from '../context/MarketplaceContext.tsx';
import type { ServiceCategory, TravelerDetail } from '../shared/types.ts';
import { BOOKING_STATUS_LABELS, CATEGORIES, UI_TEXT } from '../shared/i18n.ts';
import { CURRENCY_RATES_FROM_EUR, convertAmount, formatMoney } from '../shared/currency.ts';
import { PageHeader } from './PageHeader.tsx';
import { BookingStatusBadge } from './StatusBadge.tsx';
import { ConfirmDialog } from './ConfirmDialog.tsx';

export function BookingFlowPage({
  productId,
  initialDate,
  initialTravelers,
}: {
  productId: string;
  initialDate?: string;
  initialTravelers?: number;
}) {
  const {
    lang,
    currency,
    products,
    availabilitySlots,
    sellers,
    activeUser,
    activeReferral,
    createBooking,
    navigate,
    showToast,
  } = useMarketplace();
  const t = UI_TEXT[lang];

  const product = products.find((p) => p.id === productId) || products[0];
  const [checkInDate, setCheckInDate] = useState(
    initialDate || product.availableDates[0] || '2026-11-25'
  );
  const [checkOutDate, setCheckOutDate] = useState('2026-11-28');
  const [travelersCount, setTravelersCount] = useState(initialTravelers || 1);
  const [affiliateCode, setAffiliateCode] = useState(activeReferral);
  const [specialNotes, setSpecialNotes] = useState('');
  const [formError, setFormError] = useState('');
  const [travelers, setTravelers] = useState<TravelerDetail[]>(() => {
    const count = Math.max(1, initialTravelers || 1);
    return Array.from({ length: count }, (_, idx) =>
      idx === 0
        ? {
            fullName: activeUser?.name || 'ليلى المنصور',
            passportNumber: activeUser?.passportNo || 'DEMO-DOC-01',
            nationality: activeUser?.nationality || 'Egyptian',
            email: activeUser?.email || 'customer@masidy.com',
          }
        : {
            fullName: '',
            passportNumber: `DEMO-DOC-0${idx + 1}`,
            nationality: '',
          }
    );
  });

  const matchedSlot = availabilitySlots.find(
    (s) => s.productId === product.id && s.date === checkInDate
  );
  const maxAllowed = matchedSlot
    ? Math.max(1, Math.min(product.maxCapacity, matchedSlot.remainingUnits))
    : product.maxCapacity;
  const isSlotUnavailable = matchedSlot
    ? !matchedSlot.available || matchedSlot.remainingUnits < travelersCount
    : false;

  const unitBasePrice = matchedSlot?.priceOverride ?? product.price;
  const unitConverted = convertAmount(unitBasePrice, product.baseCurrency, currency);
  const totalConverted = Number((unitConverted * travelersCount).toFixed(2));

  const codeNorm = affiliateCode.trim().toUpperCase();
  const matchedSeller = codeNorm
    ? sellers.find(
        (s) =>
          s.status !== 'paused' &&
          (s.referralCode.toUpperCase() === codeNorm || s.couponCode.toUpperCase() === codeNorm)
      )
    : undefined;

  function handleTravelersCountChange(count: number) {
    const safe = Math.max(1, Math.min(maxAllowed, count || 1));
    setTravelersCount(safe);
    setTravelers((prev) => {
      const next = [...prev];
      while (next.length < safe) {
        next.push({
          fullName: '',
          passportNumber: `DEMO-DOC-0${next.length + 1}`,
          nationality: '',
        });
      }
      return next.slice(0, safe);
    });
  }

  function updateTraveler(idx: number, field: keyof TravelerDetail, value: string) {
    setTravelers((prev) =>
      prev.map((item, i) => (i === idx ? { ...item, [field]: value } : item))
    );
    if (formError) setFormError('');
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setFormError('');

    if (!checkInDate) {
      const msg =
        lang === 'ar' ? 'يرجى تحديد تاريخ السفر / الوصول.' : 'Please select a travel check-in date.';
      setFormError(msg);
      showToast(msg, 'error');
      return;
    }

    if (checkOutDate && checkOutDate < checkInDate) {
      const msg =
        lang === 'ar'
          ? 'تاريخ المغادرة يجب أن يكون بعد تاريخ الوصول أو مساويًا له.'
          : 'Check-out date cannot be earlier than the check-in date.';
      setFormError(msg);
      showToast(msg, 'error');
      return;
    }

    if (isSlotUnavailable) {
      const msg =
        lang === 'ar'
          ? 'التاريخ المحدد غير متاح حاليًا أو لا يتسع لعدد المسافرين المطلوب.'
          : 'Selected date is blocked or does not have enough remaining units.';
      setFormError(msg);
      showToast(msg, 'error');
      return;
    }

    for (let i = 0; i < travelers.length; i += 1) {
      const tr = travelers[i];
      if (tr.fullName.trim().length < 2 || !tr.passportNumber.trim() || !tr.nationality.trim()) {
        const msg =
          lang === 'ar'
            ? `يرجى إكمال الاسم ورقم الجواز التجريبي والجنسية للمسافر رقم ${i + 1}.`
            : `Please complete full name, demo ID/passport token, and nationality for Traveler ${i + 1}.`;
        setFormError(msg);
        showToast(msg, 'error');
        return;
      }
    }

    const booking = createBooking({
      productId: product.id,
      checkInDate,
      checkOutDate,
      travelersCount,
      travelers: travelers.map((tr) => ({
        ...tr,
        fullName: tr.fullName.trim(),
        passportNumber: tr.passportNumber.trim(),
        nationality: tr.nationality.trim(),
      })),
      affiliateCode,
      specialNotes: specialNotes.trim(),
      currency,
    });
    showToast(`${t.bookingCreatedNote} (${booking.referenceCode})`, 'success');
    navigate({ page: 'booking-confirmation', bookingId: booking.id });
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      <PageHeader
        breadcrumbs={[
          { label: t.navExplore, onClick: () => navigate({ page: 'home' }) },
          {
            label: product.title[lang],
            onClick: () => navigate({ page: 'product', productId: product.id }),
          },
          { label: t.bookingPanelTitle },
        ]}
        title={t.bookingPanelTitle}
        subtitle={`${product.providerName} · ${CATEGORIES[product.category][lang]}`}
      />

      {formError && (
        <div
          role="alert"
          className="rounded-xl border border-red-200 bg-red-50 dark:border-red-900/60 dark:bg-red-950/40 px-4 py-3 text-sm text-red-700 dark:text-red-300 flex items-center gap-2.5"
        >
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{formError}</span>
        </div>
      )}

      <form noValidate onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        <div className="lg:col-span-8 space-y-6">
          {/* Step 1: Date & Availability Selection */}
          <section className="rounded-xl border border-slate-200 dark:border-slate-800 p-4 sm:p-6 space-y-4">
            <h2 className="text-base font-semibold">
              {lang === 'ar' ? '1. تفاصيل التواريخ والتوافر' : '1. Dates & Availability'}
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                  {t.travelDate}
                </label>
                <input
                  type="date"
                  value={checkInDate}
                  onChange={(e) => {
                    setCheckInDate(e.target.value);
                    if (formError) setFormError('');
                  }}
                  className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-sm font-mono"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                  {lang === 'ar' ? 'تاريخ العودة / المغادرة' : 'Check-out / Return Date'}
                </label>
                <input
                  type="date"
                  value={checkOutDate}
                  onChange={(e) => {
                    setCheckOutDate(e.target.value);
                    if (formError) setFormError('');
                  }}
                  className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-sm font-mono"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                  {t.travelersCount}
                </label>
                <input
                  type="number"
                  min={1}
                  max={maxAllowed}
                  value={travelersCount}
                  onChange={(e) => handleTravelersCountChange(Number(e.target.value))}
                  className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-sm font-mono"
                />
              </div>
            </div>
            {matchedSlot && (
              <p className={`text-xs ${isSlotUnavailable ? 'text-red-600' : 'text-slate-500'}`}>
                {isSlotUnavailable
                  ? lang === 'ar'
                    ? `التاريخ ${checkInDate} غير متاح أو لا يكفي لـ ${travelersCount} مسافر.`
                    : `Slot ${checkInDate} is unavailable or lacks capacity for ${travelersCount} travelers.`
                  : lang === 'ar'
                  ? `الوحدات المتاحة لهذا التاريخ: ${matchedSlot.remainingUnits}`
                  : `Available units for ${checkInDate}: ${matchedSlot.remainingUnits}`}
              </p>
            )}
          </section>

          {/* Step 2: Traveler Manifest */}
          <section className="rounded-xl border border-slate-200 dark:border-slate-800 p-4 sm:p-6 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="text-base font-semibold">
                {lang === 'ar' ? '2. بيانات المسافرين' : '2. Traveler Information'}
              </h2>
              <span className="text-[11px] text-slate-500">
                {lang === 'ar'
                  ? 'بيانات تجريبية — لا تُدخِل أرقام جوازات حقيقية'
                  : 'Demo mode — use fictional placeholder IDs only'}
              </span>
            </div>
            <div className="space-y-4">
              {travelers.map((trav, idx) => (
                <div
                  key={idx}
                  className="grid grid-cols-1 sm:grid-cols-3 gap-3 pb-4 border-b border-slate-100 dark:border-slate-800 last:border-0 last:pb-0"
                >
                  <div>
                    <label className="block text-xs text-slate-500 mb-1">
                      {lang === 'ar' ? `اسم المسافر ${idx + 1}` : `Traveler ${idx + 1} Full Name`}
                    </label>
                    <input
                      type="text"
                      value={trav.fullName}
                      onChange={(e) => updateTraveler(idx, 'fullName', e.target.value)}
                      className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-slate-500 mb-1">
                      {lang === 'ar' ? 'معرّف جواز تجريبي' : 'Demo Passport / ID'}
                    </label>
                    <input
                      type="text"
                      value={trav.passportNumber}
                      onChange={(e) => updateTraveler(idx, 'passportNumber', e.target.value)}
                      placeholder="DEMO-DOC-01"
                      className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-sm font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-slate-500 mb-1">
                      {lang === 'ar' ? 'الجنسية' : 'Nationality'}
                    </label>
                    <input
                      type="text"
                      value={trav.nationality}
                      onChange={(e) => updateTraveler(idx, 'nationality', e.target.value)}
                      className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-sm"
                    />
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* Step 3: Promo / Affiliate & Notes */}
          <section className="rounded-xl border border-slate-200 dark:border-slate-800 p-4 sm:p-6 space-y-4">
            <h2 className="text-base font-semibold">
              {lang === 'ar' ? '3. كود المسوق وملاحظات إضافية' : '3. Referral Code & Notes'}
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                  {t.affiliateCodeLabel}
                </label>
                <input
                  type="text"
                  value={affiliateCode}
                  onChange={(e) => setAffiliateCode(e.target.value.toUpperCase())}
                  placeholder="MARCO10"
                  className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-sm font-mono uppercase"
                />
                {codeNorm && (
                  <p className={`mt-1 text-[11px] ${matchedSeller ? 'text-emerald-600' : 'text-amber-600'}`}>
                    {matchedSeller
                      ? lang === 'ar'
                        ? `كود مسوق مفعل: ${matchedSeller.displayName}`
                        : `Active affiliate partner: ${matchedSeller.displayName}`
                      : lang === 'ar'
                      ? 'الكود غير مطابق لمسوق نشط حاليًا'
                      : 'Code does not match an active seller'}
                  </p>
                )}
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                  {t.specialNotes}
                </label>
                <input
                  type="text"
                  value={specialNotes}
                  onChange={(e) => setSpecialNotes(e.target.value)}
                  className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-sm"
                />
              </div>
            </div>
          </section>
        </div>

        {/* Sticky Booking Summary */}
        <aside className="lg:col-span-4">
          <div className="lg:sticky lg:top-24 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/60 p-4 sm:p-6 space-y-4">
            <h2 className="text-base font-semibold">
              {lang === 'ar' ? 'ملخص الحجز' : 'Booking Summary'}
            </h2>
            <div className="flex items-center gap-3">
              <img
                src={product.imageUrl}
                alt={product.title[lang]}
                className="w-16 h-12 rounded-lg object-cover border border-slate-200 dark:border-slate-700 shrink-0"
              />
              <div className="min-w-0">
                <div className="text-sm font-medium text-slate-900 dark:text-white truncate">
                  {product.title[lang]}
                </div>
                <div className="text-xs text-slate-500 truncate">
                  {product.providerName} · {checkInDate}
                </div>
              </div>
            </div>

            <div className="pt-4 border-t border-slate-200 dark:border-slate-800 space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-slate-600 dark:text-slate-400">
                  {formatMoney(unitConverted, currency)} × {travelersCount}
                </span>
                <span className="font-mono tabular-nums font-semibold">
                  {formatMoney(totalConverted, currency)}
                </span>
              </div>
              <div className="flex justify-between text-xs text-slate-500">
                <span>{lang === 'ar' ? 'سعر الصرف المثبت' : 'Locked Exchange Rate'}</span>
                <span className="font-mono">
                  1 EUR = {CURRENCY_RATES_FROM_EUR[currency]} {currency}
                </span>
              </div>
              <div className="flex justify-between text-xs text-slate-500">
                <span>{lang === 'ar' ? 'حالة التأكيد' : 'Confirmation Mode'}</span>
                <span>{product.instantBooking ? t.instantConfirm : t.requiresApproval}</span>
              </div>
            </div>

            <button
              type="submit"
              disabled={isSlotUnavailable}
              className="w-full py-3 px-4 rounded-lg bg-[#F95738] hover:bg-[#e1482b] disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-semibold transition-colors cursor-pointer"
            >
              {t.submitBooking}
            </button>
            <p className="text-[11px] text-slate-500 text-center">
              {lang === 'ar'
                ? 'محاكاة حجز بالواجهة الأمامية (بيانات تجريبية محلية)'
                : 'Frontend mock booking simulation — no payment charged'}
            </p>
          </div>
        </aside>
      </form>
    </div>
  );
}

export function BookingConfirmationPage({ bookingId }: { bookingId: string }) {
  const { lang, bookings, navigate } = useMarketplace();
  const booking = bookings.find((b) => b.id === bookingId) || bookings[0];

  if (!booking) {
    return (
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-12 text-center space-y-4">
        <p className="text-sm text-slate-500">
          {lang === 'ar' ? 'لم يتم العثور على الحجز المطلوب.' : 'Requested booking could not be found.'}
        </p>
        <button
          type="button"
          onClick={() => navigate({ page: 'home' })}
          className="px-4 py-2 rounded-lg bg-slate-900 text-white text-xs font-semibold cursor-pointer"
        >
          {lang === 'ar' ? 'العودة للسوق' : 'Back to Marketplace'}
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
      <div className="rounded-xl border border-slate-200 dark:border-slate-800 p-6 sm:p-8 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-200 dark:border-slate-800">
          <div className="flex items-start gap-3">
            <CheckCircle2 className="w-7 h-7 text-emerald-600 shrink-0 mt-0.5" />
            <div>
              <p className="text-xs font-mono text-slate-500">{booking.referenceCode}</p>
              <h1 className="text-2xl font-bold text-slate-900 dark:text-white mt-0.5">
                {lang === 'ar' ? 'تم استلام طلب الحجز بنجاح' : 'Booking Request Recorded'}
              </h1>
              <div className="mt-2 flex flex-wrap items-center gap-2 text-sm text-slate-600 dark:text-slate-300">
                <BookingStatusBadge status={booking.status} lang={lang} />
                <span>· {booking.providerName}</span>
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={() => window.print()}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-slate-200 dark:border-slate-700 text-xs font-medium cursor-pointer self-start"
          >
            <Printer className="w-4 h-4" />
            <span>{lang === 'ar' ? 'طباعة الإيصال' : 'Print Summary'}</span>
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm">
          <div>
            <p className="text-xs text-slate-500">{lang === 'ar' ? 'الخدمة' : 'Service'}</p>
            <p className="font-semibold mt-0.5">{booking.productTitle[lang]}</p>
          </div>
          <div>
            <p className="text-xs text-slate-500">
              {lang === 'ar' ? 'التاريخ والمسافرون' : 'Date & Travelers'}
            </p>
            <p className="font-mono mt-0.5">
              {booking.checkInDate} · {booking.travelersCount} pax
            </p>
          </div>
          <div>
            <p className="text-xs text-slate-500">{lang === 'ar' ? 'الإجمالي المثبت' : 'Locked Total'}</p>
            <p className="font-mono font-bold text-lg mt-0.5">
              {formatMoney(booking.totalOriginal, booking.originalCurrency)}
            </p>
          </div>
        </div>

        <div className="pt-4 border-t border-slate-200 dark:border-slate-800 space-y-2">
          <h2 className="text-xs font-semibold text-slate-500 uppercase">
            {lang === 'ar' ? 'سجل حالة الحجز' : 'Status Timeline'}
          </h2>
          {booking.statusHistory.map((h, i) => (
            <div
              key={i}
              className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 text-xs py-1.5"
            >
              <span className="font-medium">
                {BOOKING_STATUS_LABELS[h.status][lang]} — {h.note}
              </span>
              <span className="font-mono text-slate-500">{h.actorName}</span>
            </div>
          ))}
        </div>

        <div className="pt-4 border-t border-slate-200 dark:border-slate-800 flex flex-wrap gap-3">
          <button
            type="button"
            onClick={() => navigate({ page: 'dashboard', role: 'customer', tab: 'bookings' })}
            className="px-5 py-2.5 rounded-lg bg-slate-900 text-white dark:bg-white dark:text-slate-900 text-xs font-semibold cursor-pointer"
          >
            {lang === 'ar' ? 'متابعة حجوزاتي' : 'Go to My Bookings'}
          </button>
          <button
            type="button"
            onClick={() => navigate({ page: 'home' })}
            className="px-5 py-2.5 rounded-lg border border-slate-200 dark:border-slate-700 text-xs font-medium cursor-pointer"
          >
            {lang === 'ar' ? 'العودة إلى السوق' : 'Back to Marketplace'}
          </button>
        </div>
      </div>
    </div>
  );
}

export function QuotationsPage({ initialRequestId }: { initialRequestId?: string }) {
  const {
    lang,
    currency,
    travelRequests,
    quotations,
    createTravelRequest,
    respondToQuotation,
    navigate,
    showToast,
  } = useMarketplace();
  const t = UI_TEXT[lang];

  const [selectedReqId, setSelectedReqId] = useState(
    initialRequestId || travelRequests[0]?.id || ''
  );
  const [selectedQuotationId, setSelectedQuotationId] = useState<string>('');
  const [destination, setDestination] = useState('');
  const [travelDate, setTravelDate] = useState('2026-12-22');
  const [travelersCount, setTravelersCount] = useState(2);
  const [budget, setBudget] = useState(2500);
  const [accommodationType, setAccommodationType] = useState('5-Star Boutique Hotel');
  const [services, setServices] = useState<ServiceCategory[]>(['flights', 'hotels', 'transport']);
  const [notes, setNotes] = useState('');
  const [requestError, setRequestError] = useState('');
  const [rejectConfirmId, setRejectConfirmId] = useState<string | null>(null);

  const activeRequest = travelRequests.find((r) => r.id === selectedReqId) || travelRequests[0];
  const requestQuotations = activeRequest
    ? quotations.filter((q) => q.requestId === activeRequest.id)
    : [];
  const activeQuotation =
    requestQuotations.find((q) => q.id === selectedQuotationId) || requestQuotations[0];

  function toggleService(cat: ServiceCategory) {
    setServices((prev) =>
      prev.includes(cat) ? prev.filter((c) => c !== cat) : [...prev, cat]
    );
    if (requestError) setRequestError('');
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      <PageHeader
        breadcrumbs={[
          { label: t.navExplore, onClick: () => navigate({ page: 'home' }) },
          { label: lang === 'ar' ? 'الطلبات وعروض الأسعار' : 'Trip Requests & Quotations' },
        ]}
        title={
          lang === 'ar' ? 'طلبات السفر المخصصة ومقارنة العروض' : 'Custom Trip Requests & Quotations'
        }
        subtitle={t.requestQuoteDesc}
      />

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left: Custom Trip Request Form */}
        <div className="lg:col-span-5">
          <form
            noValidate
            onSubmit={(e) => {
              e.preventDefault();
              setRequestError('');
              if (destination.trim().length < 2) {
                const msg =
                  lang === 'ar'
                    ? 'يرجى تحديد الوجهة المطلوبة للرحلة.'
                    : 'Please enter a valid travel destination.';
                setRequestError(msg);
                showToast(msg, 'error');
                return;
              }
              if (!travelDate) {
                const msg =
                  lang === 'ar' ? 'يرجى تحديد تاريخ السفر.' : 'Please select a travel date.';
                setRequestError(msg);
                showToast(msg, 'error');
                return;
              }
              if (travelersCount < 1 || budget < 100) {
                const msg =
                  lang === 'ar'
                    ? 'يرجى التحقق من عدد المسافرين والميزانية (100 على الأقل).'
                    : 'Travelers must be at least 1 and estimated budget at least 100.';
                setRequestError(msg);
                showToast(msg, 'error');
                return;
              }
              if (services.length === 0) {
                const msg =
                  lang === 'ar'
                    ? 'يرجى اختيار خدمة واحدة على الأقل ضمن الطلب.'
                    : 'Please select at least one requested travel service.';
                setRequestError(msg);
                showToast(msg, 'error');
                return;
              }

              const created = createTravelRequest({
                destination: destination.trim(),
                travelDate,
                travelersCount,
                budget,
                currency,
                accommodationType: accommodationType.trim(),
                requestedServices: services,
                notes: notes.trim(),
              });
              setDestination('');
              setNotes('');
              setSelectedReqId(created.id);
              showToast(
                lang === 'ar'
                  ? 'تم إرسال طلب الرحلة إلى شركات السياحة'
                  : 'Custom trip request submitted',
                'success'
              );
            }}
            className="rounded-xl border border-slate-200 dark:border-slate-800 p-4 sm:p-6 space-y-4"
          >
            <h2 className="text-base font-semibold">{t.requestQuoteTitle}</h2>

            {requestError && (
              <div
                role="alert"
                className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700"
              >
                {requestError}
              </div>
            )}

            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">
                {t.destinationLabel}
              </label>
              <input
                type="text"
                value={destination}
                onChange={(e) => {
                  setDestination(e.target.value);
                  if (requestError) setRequestError('');
                }}
                placeholder="e.g. Venice & Milan, Italy"
                className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2.5 text-sm"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">
                  {t.travelDate}
                </label>
                <input
                  type="date"
                  value={travelDate}
                  onChange={(e) => setTravelDate(e.target.value)}
                  className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-2.5 py-2 text-xs font-mono"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">
                  {t.travelersCount}
                </label>
                <input
                  type="number"
                  min={1}
                  value={travelersCount}
                  onChange={(e) => setTravelersCount(Number(e.target.value))}
                  className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-2.5 py-2 text-xs font-mono"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">
                  {t.budgetLabel} ({currency})
                </label>
                <input
                  type="number"
                  min={100}
                  value={budget}
                  onChange={(e) => setBudget(Number(e.target.value))}
                  className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-2.5 py-2 text-xs font-mono"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">
                {t.accommodationLabel}
              </label>
              <input
                type="text"
                value={accommodationType}
                onChange={(e) => setAccommodationType(e.target.value)}
                className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-sm"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1.5">
                {lang === 'ar' ? 'الخدمات المطلوبة' : 'Required Services'}
              </label>
              <div className="flex flex-wrap gap-1.5">
                {(Object.keys(CATEGORIES) as ServiceCategory[]).map((cat) => (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => toggleService(cat)}
                    className={`px-2.5 py-1 text-xs rounded-md border cursor-pointer ${
                      services.includes(cat)
                        ? 'border-blue-600 bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300'
                        : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300'
                    }`}
                  >
                    {CATEGORIES[cat][lang]}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">
                {t.specialNotes}
              </label>
              <textarea
                rows={3}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-sm"
              />
            </div>

            <button
              type="submit"
              className="w-full py-2.5 px-4 rounded-lg bg-[#0052CC] hover:bg-[#0041a3] text-white text-sm font-semibold cursor-pointer"
            >
              {t.submitRequest}
            </button>
          </form>
        </div>

        {/* Right: Request Selector, Side-by-Side Comparison Matrix & Quotation Details */}
        <div className="lg:col-span-7 space-y-6">
          {travelRequests.length === 0 ? (
            <div className="rounded-xl border border-slate-200 dark:border-slate-800 p-10 text-center text-sm text-slate-500">
              {lang === 'ar'
                ? 'لا توجد طلبات رحلات حتى الآن. أنشئ أول طلب مخصص من النموذج.'
                : 'No trip requests yet. Submit your first custom request using the form.'}
            </div>
          ) : (
            <>
              <div className="flex flex-wrap gap-2">
                {travelRequests.map((r) => (
                  <button
                    key={r.id}
                    type="button"
                    onClick={() => {
                      setSelectedReqId(r.id);
                      setSelectedQuotationId('');
                    }}
                    className={`px-3.5 py-2 rounded-lg border text-xs font-medium cursor-pointer ${
                      activeRequest?.id === r.id
                        ? 'border-slate-900 bg-slate-900 text-white dark:border-white dark:bg-white dark:text-slate-900'
                        : 'border-slate-200 dark:border-slate-700'
                    }`}
                  >
                    {r.destination} · {r.status}
                  </button>
                ))}
              </div>

              {activeRequest && (
                <>
                  {/* Compare Quotations Side-by-Side */}
                  <div className="rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden">
                    <div className="px-4 sm:px-5 py-4 border-b border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-2">
                      <h3 className="text-sm font-semibold flex items-center gap-2">
                        <Scale className="w-4 h-4 text-blue-600" />
                        <span>
                          {lang === 'ar'
                            ? `مقارنة عروض الأسعار (${requestQuotations.length})`
                            : `Compare Quotations (${requestQuotations.length})`}
                        </span>
                      </h3>
                      <span className="text-xs font-mono text-slate-500">
                        {activeRequest.travelDate} · {activeRequest.travelersCount} pax
                      </span>
                    </div>

                    {requestQuotations.length === 0 ? (
                      <div className="p-8 text-center text-sm text-slate-500">
                        {lang === 'ar'
                          ? 'لا توجد عروض أسعار لهذا الطلب بعد. يمكن لشركات السياحة تقديم عرض من لوحة الشركة.'
                          : 'No provider quotations submitted for this request yet. Tourism companies can respond from Company Dashboard.'}
                      </div>
                    ) : (
                      <>
                        {/* Mobile stacked quotation comparison cards */}
                        <div className="md:hidden divide-y divide-slate-200 dark:divide-slate-800">
                          {requestQuotations.map((q) => (
                            <div
                              key={q.id}
                              onClick={() => setSelectedQuotationId(q.id)}
                              className={`p-4 space-y-2.5 cursor-pointer ${
                                activeQuotation?.id === q.id
                                  ? 'bg-blue-50/40 dark:bg-blue-950/20'
                                  : ''
                              }`}
                            >
                              <div className="flex items-start justify-between gap-2">
                                <div>
                                  <div className="font-semibold text-sm">{q.providerName}</div>
                                  <div className="text-xs text-slate-500 mt-0.5">
                                    {q.accommodationTier || '5-Star'} ·{' '}
                                    {q.includesTransfers ? 'Transfers Included' : 'Self-Arrival'}
                                  </div>
                                </div>
                                <div className="text-end shrink-0">
                                  <div className="font-mono tabular-nums font-bold text-sm">
                                    {formatMoney(q.quotedPrice, q.currency)}
                                  </div>
                                  <div className="font-mono text-[11px] text-slate-500">
                                    {q.validUntil}
                                  </div>
                                </div>
                              </div>
                              <div className="flex items-center justify-between pt-1">
                                <span className="text-xs text-slate-500">{q.status}</span>
                                {q.status === 'Quoted' && (
                                  <div className="flex items-center gap-2">
                                    <button
                                      type="button"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setRejectConfirmId(q.id);
                                      }}
                                      className="min-h-[38px] px-3 py-1.5 rounded-lg border border-red-200 text-red-600 text-xs font-medium cursor-pointer"
                                    >
                                      {lang === 'ar' ? 'رفض' : 'Decline'}
                                    </button>
                                    <button
                                      type="button"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        const booking = respondToQuotation(q.id, 'accept');
                                        if (booking) {
                                          showToast(
                                            `Quotation converted to booking ${booking.referenceCode}`,
                                            'success'
                                          );
                                          navigate({
                                            page: 'booking-confirmation',
                                            bookingId: booking.id,
                                          });
                                        }
                                      }}
                                      className="min-h-[38px] px-3.5 py-1.5 rounded-lg bg-[#F95738] text-white text-xs font-semibold cursor-pointer"
                                    >
                                      {lang === 'ar' ? 'قبول وحجز' : 'Accept & Book'}
                                    </button>
                                  </div>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>

                        {/* Desktop/Tablet comparison table */}
                        <div className="hidden md:block overflow-x-auto">
                          <table className="w-full text-sm min-w-[580px]">
                            <thead className="bg-slate-50 dark:bg-slate-900/50 text-xs text-slate-500 border-b border-slate-200 dark:border-slate-800">
                              <tr>
                                <th className="px-4 py-3 text-start">
                                  {lang === 'ar' ? 'الشركة' : 'Provider'}
                                </th>
                                <th className="px-4 py-3 text-end">
                                  {lang === 'ar' ? 'السعر' : 'Total Price'}
                                </th>
                                <th className="px-4 py-3 text-start">
                                  {lang === 'ar' ? 'الإقامة والنقل' : 'Tier & Transfers'}
                                </th>
                                <th className="px-4 py-3 text-start">
                                  {lang === 'ar' ? 'صالح حتى' : 'Valid Until'}
                                </th>
                                <th className="px-4 py-3 text-end">
                                  {lang === 'ar' ? 'إجراء' : 'Action'}
                                </th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                              {requestQuotations.map((q) => (
                                <tr
                                  key={q.id}
                                  onClick={() => setSelectedQuotationId(q.id)}
                                  className={`cursor-pointer ${
                                    activeQuotation?.id === q.id
                                      ? 'bg-blue-50/40 dark:bg-blue-950/20'
                                      : 'hover:bg-slate-50 dark:hover:bg-slate-800/30'
                                  }`}
                                >
                                  <td className="px-4 py-3 font-medium">{q.providerName}</td>
                                  <td className="px-4 py-3 text-end font-mono tabular-nums font-bold">
                                    {formatMoney(q.quotedPrice, q.currency)}
                                  </td>
                                  <td className="px-4 py-3 text-xs text-slate-600 dark:text-slate-300">
                                    {q.accommodationTier || '5-Star'} ·{' '}
                                    {q.includesTransfers ? 'Transfers Included' : 'Self-Arrival'}
                                  </td>
                                  <td className="px-4 py-3 font-mono text-xs">{q.validUntil}</td>
                                  <td className="px-4 py-3 text-end">
                                    {q.status === 'Quoted' ? (
                                      <div className="inline-flex items-center gap-2">
                                        <button
                                          type="button"
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            setRejectConfirmId(q.id);
                                          }}
                                          className="px-2.5 py-1.5 rounded-lg border border-red-200 text-red-600 text-xs cursor-pointer"
                                        >
                                          {lang === 'ar' ? 'رفض' : 'Decline'}
                                        </button>
                                        <button
                                          type="button"
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            const booking = respondToQuotation(q.id, 'accept');
                                            if (booking) {
                                              showToast(
                                                `Quotation converted to booking ${booking.referenceCode}`,
                                                'success'
                                              );
                                              navigate({
                                                page: 'booking-confirmation',
                                                bookingId: booking.id,
                                              });
                                            }
                                          }}
                                          className="px-3 py-1.5 rounded-lg bg-[#F95738] text-white text-xs font-semibold cursor-pointer"
                                        >
                                          {lang === 'ar' ? 'قبول وحجز' : 'Accept & Book'}
                                        </button>
                                      </div>
                                    ) : (
                                      <span
                                        className={`text-xs font-medium ${
                                          q.status === 'Rejected'
                                            ? 'text-red-600'
                                            : 'text-emerald-600'
                                        }`}
                                      >
                                        {q.status}
                                      </span>
                                    )}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </>
                    )}
                  </div>

                  {/* Quotation Itemized Details Panel */}
                  {activeQuotation && (
                    <div className="rounded-xl border border-slate-200 dark:border-slate-800 p-4 sm:p-6 space-y-4">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <h3 className="text-sm font-semibold flex items-center gap-2">
                          <FileText className="w-4 h-4 text-slate-500 shrink-0" />
                          <span>
                            {lang === 'ar' ? 'تفاصيل عرض السعر:' : 'Quotation Details:'}{' '}
                            {activeQuotation.providerName}
                          </span>
                        </h3>
                        <span className="font-mono text-sm font-bold">
                          {formatMoney(activeQuotation.quotedPrice, activeQuotation.currency)}
                        </span>
                      </div>
                      <p className="text-sm text-slate-600 dark:text-slate-300">
                        {activeQuotation.summary}
                      </p>
                      <div className="divide-y divide-slate-100 dark:divide-slate-800 border-t border-slate-200 dark:border-slate-800 pt-2">
                        {activeQuotation.items.map((item, i) => (
                          <div key={i} className="py-2 flex justify-between text-xs">
                            <span>{item.title}</span>
                            <span className="font-mono tabular-nums font-medium">
                              {formatMoney(item.amount, activeQuotation.currency)}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </>
              )}
            </>
          )}
        </div>
      </div>

      <ConfirmDialog
        open={Boolean(rejectConfirmId)}
        title={lang === 'ar' ? 'رفض عرض السعر' : 'Decline Provider Quotation'}
        message={
          lang === 'ar'
            ? 'هل أنت متأكد من رفض عرض السعر هذا؟ لا يمكن التراجع عن هذا الإجراء.'
            : 'Are you sure you want to decline this quotation? This action cannot be undone.'
        }
        confirmLabel={lang === 'ar' ? 'نعم، رفض العرض' : 'Yes, Decline'}
        cancelLabel={lang === 'ar' ? 'إلغاء' : 'Cancel'}
        variant="danger"
        onConfirm={() => {
          if (rejectConfirmId) respondToQuotation(rejectConfirmId, 'reject');
          setRejectConfirmId(null);
        }}
        onCancel={() => setRejectConfirmId(null)}
      />
    </div>
  );
}
