import { useEffect, useState } from 'react';
import {
  Bell,
  BookOpen,
  FileText,
  Heart,
  Layers,
  MessageSquare,
  Scale,
  User as UserIcon,
} from 'lucide-react';
import { useMarketplace } from '../../context/MarketplaceContext.tsx';
import type { Booking } from '../../shared/types.ts';
import { UI_TEXT } from '../../shared/i18n.ts';
import { formatMoney } from '../../shared/currency.ts';
import { ProductCard } from '../ProductCard.tsx';
import { BookingStatusBadge } from '../StatusBadge.tsx';
import { ConfirmDialog } from '../ConfirmDialog.tsx';

export function CustomerDashboard({ initialTab = 'overview' }: { initialTab?: string }) {
  const {
    lang,
    currency,
    activeUser,
    bookings,
    travelRequests,
    quotations,
    products,
    favoriteIds,
    notifications,
    messages,
    toggleFavorite,
    updateBookingStatus,
    respondToQuotation,
    markNotificationRead,
    markAllNotificationsRead,
    sendMessage,
    updateCustomerProfile,
    navigate,
    showToast,
  } = useMarketplace();
  const t = UI_TEXT[lang];
  const [tab, setTab] = useState(initialTab);
  const [bookingFilter, setBookingFilter] = useState('all');
  const [replyText, setReplyText] = useState('');
  const [replyError, setReplyError] = useState('');
  const [profileError, setProfileError] = useState('');
  const [confirmBookingAction, setConfirmBookingAction] = useState<Booking | null>(null);
  const [confirmRejectQuoteId, setConfirmRejectQuoteId] = useState<string | null>(null);

  const userId = activeUser?.id || 'usr_customer_layla';
  const myBookings = bookings.filter((b) => b.customerId === userId);
  const filteredBookings =
    bookingFilter === 'all' ? myBookings : myBookings.filter((b) => b.status === bookingFilter);
  const myRequests = travelRequests.filter((r) => r.customerId === userId);
  const myRequestIds = new Set(myRequests.map((r) => r.id));
  const myQuotations = quotations.filter((q) => myRequestIds.has(q.requestId));
  const favProducts = products.filter((p) => favoriteIds.includes(p.id));
  const myNotifications = notifications.filter((n) => n.userId === userId);

  const [profileForm, setProfileForm] = useState({
    name: activeUser?.name || 'ليلى المنصور',
    phone: activeUser?.phone || '+20 100 482 9102',
    nationality: activeUser?.nationality || 'Egyptian',
    passportNo: activeUser?.passportNo || 'DEMO-DOC-01',
  });

  useEffect(() => {
    setProfileForm({
      name: activeUser?.name || 'ليلى المنصور',
      phone: activeUser?.phone || '+20 100 482 9102',
      nationality: activeUser?.nationality || 'Egyptian',
      passportNo: activeUser?.passportNo || 'DEMO-DOC-01',
    });
  }, [activeUser]);

  const tabs = [
    { id: 'overview', label: lang === 'ar' ? 'نظرة عامة' : 'Overview', icon: Layers },
    { id: 'profile', label: lang === 'ar' ? 'الملف الشخصي' : 'Profile', icon: UserIcon },
    { id: 'bookings', label: lang === 'ar' ? 'حجوزاتي' : 'My Bookings', icon: BookOpen },
    { id: 'requests', label: lang === 'ar' ? 'طلبات الرحلات' : 'My Trip Requests', icon: FileText },
    { id: 'quotations', label: lang === 'ar' ? 'عروض الأسعار' : 'My Quotations', icon: Scale },
    { id: 'favorites', label: lang === 'ar' ? 'المفضلة' : 'Favorites', icon: Heart },
    { id: 'notifications', label: lang === 'ar' ? 'الإشعارات' : 'Notifications', icon: Bell },
    { id: 'messages', label: lang === 'ar' ? 'الرسائل' : 'Messages', icon: MessageSquare },
  ];

  return (
    <div className="space-y-6">
      {/* Sub-navigation bar */}
      <div className="flex flex-nowrap lg:flex-wrap gap-1.5 pb-3 lg:pb-4 border-b border-slate-200 dark:border-slate-800 overflow-x-auto lg:overflow-visible no-scrollbar">
        {tabs.map((item) => {
          const Icon = item.icon;
          const unreadCount =
            item.id === 'notifications'
              ? myNotifications.filter((n) => !n.read).length
              : 0;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => setTab(item.id)}
              className={`inline-flex items-center gap-1.5 px-3 py-2 lg:py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
                tab === item.id
                  ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900'
                  : 'border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:border-slate-400'
              }`}
            >
              <Icon className="w-3.5 h-3.5 shrink-0" />
              <span>{item.label}</span>
              {unreadCount > 0 && <span className="font-mono">({unreadCount})</span>}
            </button>
          );
        })}
      </div>

      {tab === 'overview' && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="rounded-xl border border-slate-200 dark:border-slate-800 p-4">
              <p className="text-xs text-slate-500">{lang === 'ar' ? 'الحجوزات' : 'Bookings'}</p>
              <p className="mt-1 text-xl font-bold font-mono tabular-nums">{myBookings.length}</p>
            </div>
            <div className="rounded-xl border border-slate-200 dark:border-slate-800 p-4">
              <p className="text-xs text-slate-500">{lang === 'ar' ? 'طلبات الأسعار' : 'Trip Requests'}</p>
              <p className="mt-1 text-xl font-bold font-mono tabular-nums">{myRequests.length}</p>
            </div>
            <div className="rounded-xl border border-slate-200 dark:border-slate-800 p-4">
              <p className="text-xs text-slate-500">{lang === 'ar' ? 'العروض المستلمة' : 'Quotations'}</p>
              <p className="mt-1 text-xl font-bold font-mono tabular-nums text-blue-600">
                {myQuotations.length}
              </p>
            </div>
            <div className="rounded-xl border border-slate-200 dark:border-slate-800 p-4">
              <p className="text-xs text-slate-500">{lang === 'ar' ? 'المفضلة' : 'Favorites'}</p>
              <p className="mt-1 text-xl font-bold font-mono tabular-nums">{favProducts.length}</p>
            </div>
          </div>

          <div className="rounded-xl border border-slate-200 dark:border-slate-800 p-5 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold">
                {lang === 'ar' ? 'أحدث حجوزاتك' : 'Recent Bookings'}
              </h3>
              <button
                type="button"
                onClick={() => setTab('bookings')}
                className="text-xs text-blue-600 hover:underline cursor-pointer"
              >
                {lang === 'ar' ? 'عرض الكل' : 'View All'}
              </button>
            </div>
            {myBookings.length === 0 ? (
              <div className="py-6 text-center space-y-3 border-t border-slate-100 dark:border-slate-800">
                <p className="text-xs text-slate-500">
                  {lang === 'ar' ? 'لا توجد حجوزات مسجلة حتى الآن.' : 'No bookings recorded yet.'}
                </p>
                <button
                  type="button"
                  onClick={() => navigate({ page: 'search' })}
                  className="px-3.5 py-2 rounded-lg bg-[#F95738] text-white text-xs font-semibold cursor-pointer"
                >
                  {t.heroPrimaryCta}
                </button>
              </div>
            ) : (
              myBookings.slice(0, 3).map((b) => (
                <div
                  key={b.id}
                  className="py-2.5 border-t border-slate-100 dark:border-slate-800 flex flex-wrap items-center justify-between gap-2 text-sm"
                >
                  <div>
                    <span className="font-mono text-xs text-slate-500 me-2">{b.referenceCode}</span>
                    <span className="font-medium">{b.productTitle[lang]}</span>
                  </div>
                  <div className="flex items-center gap-3 text-xs">
                    <BookingStatusBadge status={b.status} lang={lang} />
                    <span className="font-mono font-semibold">
                      {formatMoney(b.totalOriginal, b.originalCurrency)}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {tab === 'profile' && (
        <form
          noValidate
          onSubmit={(e) => {
            e.preventDefault();
            setProfileError('');
            if (profileForm.name.trim().length < 2) {
              const msg =
                lang === 'ar' ? 'يرجى إدخال الاسم الكامل بشكل صحيح.' : 'Please enter a valid full name.';
              setProfileError(msg);
              showToast(msg, 'error');
              return;
            }
            if (!profileForm.phone.trim()) {
              const msg =
                lang === 'ar' ? 'يرجى إدخال رقم الهاتف للتواصل.' : 'Please provide a contact phone number.';
              setProfileError(msg);
              showToast(msg, 'error');
              return;
            }
            updateCustomerProfile({
              name: profileForm.name.trim(),
              phone: profileForm.phone.trim(),
              nationality: profileForm.nationality.trim(),
              passportNo: profileForm.passportNo.trim() || 'DEMO-DOC-01',
            });
            showToast(
              lang === 'ar' ? 'تم تحديث بيانات المسافر بنجاح' : 'Customer profile updated',
              'success'
            );
          }}
          className="rounded-xl border border-slate-200 dark:border-slate-800 p-6 max-w-2xl space-y-4"
        >
          <h3 className="text-base font-semibold">
            {lang === 'ar' ? 'بيانات المسافر الشخصية' : 'Traveler Profile & Passport Details'}
          </h3>
          {profileError && (
            <div role="alert" className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
              {profileError}
            </div>
          )}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs text-slate-500 mb-1">Full Name</label>
              <input
                type="text"
                value={profileForm.name}
                onChange={(e) => {
                  setProfileForm({ ...profileForm, name: e.target.value });
                  if (profileError) setProfileError('');
                }}
                className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs text-slate-500 mb-1">Phone</label>
              <input
                type="text"
                value={profileForm.phone}
                onChange={(e) => {
                  setProfileForm({ ...profileForm, phone: e.target.value });
                  if (profileError) setProfileError('');
                }}
                className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-sm font-mono"
              />
            </div>
            <div>
              <label className="block text-xs text-slate-500 mb-1">Nationality</label>
              <input
                type="text"
                value={profileForm.nationality}
                onChange={(e) => setProfileForm({ ...profileForm, nationality: e.target.value })}
                className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs text-slate-500 mb-1">
                {lang === 'ar' ? 'معرّف جواز تجريبي' : 'Demo Passport Token'}
              </label>
              <input
                type="text"
                value={profileForm.passportNo}
                onChange={(e) => setProfileForm({ ...profileForm, passportNo: e.target.value })}
                className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-sm font-mono"
              />
            </div>
          </div>
          <button
            type="submit"
            className="px-5 py-2.5 rounded-lg bg-slate-900 text-white dark:bg-white dark:text-slate-900 text-xs font-semibold cursor-pointer"
          >
            {lang === 'ar' ? 'حفظ التغييرات' : 'Save Profile'}
          </button>
        </form>
      )}

      {tab === 'bookings' && (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h3 className="text-sm font-semibold">
              {lang === 'ar' ? 'إدارة حجوزاتي' : 'My Bookings'} ({filteredBookings.length})
            </h3>
            <select
              value={bookingFilter}
              onChange={(e) => setBookingFilter(e.target.value)}
              className="rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-1.5 text-xs"
            >
              <option value="all">{lang === 'ar' ? 'كل الحالات' : 'All Statuses'}</option>
              <option value="Confirmed">Confirmed</option>
              <option value="Awaiting Provider Confirmation">Awaiting Provider</option>
              <option value="Cancelled">Cancelled</option>
              <option value="Refund Pending">Refund Pending</option>
              <option value="Completed">Completed</option>
            </select>
          </div>

          {filteredBookings.length === 0 ? (
            <div className="rounded-xl border border-slate-200 dark:border-slate-800 p-10 text-center space-y-3">
              <p className="text-sm text-slate-500">
                {lang === 'ar'
                  ? 'لا توجد حجوزات مطابقة للتصفية الحالية.'
                  : 'No bookings match the selected status filter.'}
              </p>
              <div className="flex justify-center gap-2">
                {bookingFilter !== 'all' && (
                  <button
                    type="button"
                    onClick={() => setBookingFilter('all')}
                    className="px-3.5 py-2 rounded-lg border border-slate-200 dark:border-slate-700 text-xs font-medium cursor-pointer"
                  >
                    {t.resetFilters}
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => navigate({ page: 'search' })}
                  className="px-4 py-2 rounded-lg bg-[#F95738] text-white text-xs font-semibold cursor-pointer"
                >
                  {t.heroPrimaryCta}
                </button>
              </div>
            </div>
          ) : (
            <>
              {/* Mobile Booking Cards */}
              <div className="md:hidden space-y-3">
                {filteredBookings.map((b) => (
                  <div
                    key={b.id}
                    className="rounded-xl border border-slate-200 dark:border-slate-800 p-4 space-y-2.5"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <span className="font-mono text-[11px] text-slate-500">{b.referenceCode}</span>
                        <div className="font-semibold text-sm">{b.productTitle[lang]}</div>
                        <div className="text-xs text-slate-500">{b.providerName}</div>
                      </div>
                      <div className="text-end shrink-0">
                        <div className="font-mono tabular-nums font-bold text-sm">
                          {formatMoney(b.totalOriginal, b.originalCurrency)}
                        </div>
                        <div className="font-mono text-[11px] text-slate-500">{b.checkInDate}</div>
                      </div>
                    </div>
                    <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                      <BookingStatusBadge status={b.status} lang={lang} />
                      <div className="flex items-center gap-3">
                        <button
                          type="button"
                          onClick={() => navigate({ page: 'booking-confirmation', bookingId: b.id })}
                          className="text-xs font-medium text-blue-600 hover:underline cursor-pointer py-1"
                        >
                          {lang === 'ar' ? 'الإيصال' : 'Receipt'}
                        </button>
                        {(b.status === 'Awaiting Provider Confirmation' || b.status === 'Confirmed') && (
                          <button
                            type="button"
                            onClick={() => setConfirmBookingAction(b)}
                            className="text-xs font-medium text-red-600 hover:underline cursor-pointer py-1"
                          >
                            {b.status === 'Confirmed'
                              ? lang === 'ar'
                                ? 'استرداد'
                                : 'Refund'
                              : lang === 'ar'
                              ? 'إلغاء'
                              : 'Cancel'}
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Desktop/Tablet Bookings Table */}
              <div className="hidden md:block rounded-xl border border-slate-200 dark:border-slate-800 overflow-x-auto">
                <table className="w-full text-sm min-w-[600px]">
                  <thead className="bg-slate-50 dark:bg-slate-900/50 text-xs text-slate-500 border-b border-slate-200 dark:border-slate-800">
                    <tr>
                      <th className="px-4 py-3 text-start">Ref</th>
                      <th className="px-4 py-3 text-start">Service & Provider</th>
                      <th className="px-4 py-3 text-start">Date</th>
                      <th className="px-4 py-3 text-end">Total</th>
                      <th className="px-4 py-3 text-start">Status</th>
                      <th className="px-4 py-3 text-end">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                    {filteredBookings.map((b) => (
                      <tr key={b.id}>
                        <td className="px-4 py-3 font-mono text-xs">{b.referenceCode}</td>
                        <td className="px-4 py-3">
                          <div className="font-medium">{b.productTitle[lang]}</div>
                          <div className="text-xs text-slate-500">{b.providerName}</div>
                        </td>
                        <td className="px-4 py-3 font-mono text-xs">{b.checkInDate}</td>
                        <td className="px-4 py-3 text-end font-mono tabular-nums font-semibold">
                          {formatMoney(b.totalOriginal, b.originalCurrency)}
                        </td>
                        <td className="px-4 py-3">
                          <BookingStatusBadge status={b.status} lang={lang} />
                        </td>
                        <td className="px-4 py-3 text-end space-x-2">
                          <button
                            type="button"
                            onClick={() => navigate({ page: 'booking-confirmation', bookingId: b.id })}
                            className="text-xs text-blue-600 hover:underline cursor-pointer"
                          >
                            {lang === 'ar' ? 'الإيصال' : 'Receipt'}
                          </button>
                          {(b.status === 'Awaiting Provider Confirmation' || b.status === 'Confirmed') && (
                            <button
                              type="button"
                              onClick={() => setConfirmBookingAction(b)}
                              className="text-xs text-red-600 hover:underline cursor-pointer"
                            >
                              {b.status === 'Confirmed'
                                ? lang === 'ar'
                                  ? 'استرداد'
                                  : 'Refund'
                                : lang === 'ar'
                                ? 'إلغاء'
                                : 'Cancel'}
                            </button>
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
      )}

      {tab === 'requests' && (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h3 className="text-sm font-semibold">
              {lang === 'ar' ? 'طلبات الرحلات المخصصة' : 'My Trip Requests'}
            </h3>
            <button
              type="button"
              onClick={() => navigate({ page: 'quotations' })}
              className="px-4 py-2 rounded-lg bg-[#0052CC] text-white text-xs font-semibold cursor-pointer"
            >
              {t.heroSecondaryCta}
            </button>
          </div>
          {myRequests.length === 0 ? (
            <div className="rounded-xl border border-slate-200 dark:border-slate-800 p-10 text-center space-y-3">
              <p className="text-sm text-slate-500">
                {lang === 'ar' ? 'لم ترسل أي طلب رحلة مخصص بعد.' : 'No custom trip requests submitted yet.'}
              </p>
              <button
                type="button"
                onClick={() => navigate({ page: 'quotations' })}
                className="px-4 py-2 rounded-lg bg-[#0052CC] text-white text-xs font-semibold cursor-pointer"
              >
                {t.heroSecondaryCta}
              </button>
            </div>
          ) : (
            myRequests.map((r) => (
              <div
                key={r.id}
                className="rounded-xl border border-slate-200 dark:border-slate-800 p-5 flex flex-wrap items-center justify-between gap-4"
              >
                <div>
                  <h4 className="font-semibold">{r.destination}</h4>
                  <p className="text-xs text-slate-500 font-mono mt-0.5">
                    {r.travelDate} · {r.travelersCount} pax · Budget:{' '}
                    {formatMoney(r.budget, r.currency)} · {r.status}
                  </p>
                  <p className="text-xs text-slate-600 dark:text-slate-300 mt-1">{r.notes}</p>
                </div>
                <button
                  type="button"
                  onClick={() => navigate({ page: 'quotations', requestId: r.id })}
                  className="px-3.5 py-2 rounded-lg border border-slate-200 dark:border-slate-700 text-xs font-medium cursor-pointer"
                >
                  {lang === 'ar' ? 'مقارنة العروض' : 'Compare Quotes'}
                </button>
              </div>
            ))
          )}
        </div>
      )}

      {tab === 'quotations' && (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h3 className="text-sm font-semibold">
              {lang === 'ar' ? 'عروض الأسعار المستلمة' : 'Received Quotations'}
            </h3>
            <button
              type="button"
              onClick={() => navigate({ page: 'quotations' })}
              className="text-xs text-blue-600 hover:underline cursor-pointer"
            >
              {lang === 'ar' ? 'فتح جدول المقارنة الكامل' : 'Open Full Comparison Matrix'}
            </button>
          </div>
          {myQuotations.length === 0 ? (
            <div className="rounded-xl border border-slate-200 dark:border-slate-800 p-10 text-center space-y-3">
              <p className="text-sm text-slate-500">
                {lang === 'ar'
                  ? 'لا توجد عروض أسعار مستلمة حتى الآن.'
                  : 'No quotations received for your trip requests yet.'}
              </p>
              <button
                type="button"
                onClick={() => navigate({ page: 'quotations' })}
                className="px-4 py-2 rounded-lg bg-[#0052CC] text-white text-xs font-semibold cursor-pointer"
              >
                {t.heroSecondaryCta}
              </button>
            </div>
          ) : (
            myQuotations.map((q) => (
              <div
                key={q.id}
                className="rounded-xl border border-slate-200 dark:border-slate-800 p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
              >
                <div>
                  <div className="font-semibold">
                    {q.providerName} —{' '}
                    <span className="font-mono">{formatMoney(q.quotedPrice, q.currency)}</span>
                  </div>
                  <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">{q.summary}</p>
                  <p className="text-[11px] font-mono text-slate-500 mt-1">
                    Valid until {q.validUntil} · {q.status}
                  </p>
                </div>
                {q.status === 'Quoted' && (
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        const b = respondToQuotation(q.id, 'accept');
                        if (b) {
                          showToast(
                            lang === 'ar'
                              ? `تم قبول العرض وإنشاء الحجز ${b.referenceCode}`
                              : `Quotation converted to booking ${b.referenceCode}`,
                            'success'
                          );
                          navigate({ page: 'booking-confirmation', bookingId: b.id });
                        }
                      }}
                      className="px-3.5 py-2 rounded-lg bg-[#F95738] text-white text-xs font-semibold cursor-pointer"
                    >
                      {lang === 'ar' ? 'قبول وحجز' : 'Accept & Book'}
                    </button>
                    <button
                      type="button"
                      onClick={() => setConfirmRejectQuoteId(q.id)}
                      className="px-3.5 py-2 rounded-lg border border-red-200 text-red-600 text-xs cursor-pointer"
                    >
                      {lang === 'ar' ? 'رفض' : 'Reject'}
                    </button>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      )}

      {tab === 'favorites' && (
        favProducts.length === 0 ? (
          <div className="rounded-xl border border-slate-200 dark:border-slate-800 p-10 text-center space-y-3">
            <p className="text-sm text-slate-500">
              {lang === 'ar'
                ? 'قائمة المفضلة فارغة حاليًا. احفظ الخدمات التي تفضلها للرجوع إليها سريعًا.'
                : 'No saved favorite services yet. Bookmark any offer to find it here.'}
            </p>
            <button
              type="button"
              onClick={() => navigate({ page: 'search' })}
              className="px-4 py-2 rounded-lg bg-slate-900 text-white text-xs font-semibold cursor-pointer"
            >
              {t.heroPrimaryCta}
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6">
            {favProducts.map((p) => (
              <ProductCard
                key={p.id}
                product={p}
                lang={lang}
                currency={currency}
                isFavorite={true}
                onOpenProduct={(prod) => navigate({ page: 'product', productId: prod.id })}
                onOpenProvider={(orgId) => navigate({ page: 'provider', organizationId: orgId })}
                onToggleFavorite={toggleFavorite}
              />
            ))}
          </div>
        )
      )}

      {tab === 'notifications' && (
        <div className="space-y-3">
          {myNotifications.some((n) => !n.read) && (
            <div className="flex justify-end">
              <button
                type="button"
                onClick={() => markAllNotificationsRead(userId)}
                className="text-xs text-blue-600 hover:underline cursor-pointer"
              >
                {lang === 'ar' ? 'تحديد الكل كمقروء' : 'Mark all as read'}
              </button>
            </div>
          )}
          <div className="rounded-xl border border-slate-200 dark:border-slate-800 divide-y divide-slate-200 dark:divide-slate-800">
            {myNotifications.length === 0 ? (
              <div className="p-10 text-center text-sm text-slate-500">
                {lang === 'ar' ? 'لا توجد إشعارات جديدة حاليًا.' : 'No notifications yet.'}
              </div>
            ) : (
              myNotifications.map((n) => (
                <div
                  key={n.id}
                  className={`p-4 flex items-start justify-between gap-4 ${
                    !n.read ? 'bg-blue-50/30 dark:bg-blue-950/15' : ''
                  }`}
                >
                  <div>
                    <p className="text-sm font-semibold">{n.title[lang]}</p>
                    <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">{n.body[lang]}</p>
                  </div>
                  {!n.read && (
                    <button
                      type="button"
                      onClick={() => markNotificationRead(n.id)}
                      className="text-xs text-blue-600 hover:underline shrink-0 cursor-pointer"
                    >
                      {lang === 'ar' ? 'تحديد كمقروء' : 'Mark Read'}
                    </button>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {tab === 'messages' && (
        <div className="rounded-xl border border-slate-200 dark:border-slate-800 p-5 space-y-4">
          <h3 className="text-sm font-semibold">
            {lang === 'ar' ? 'المحادثات مع شركات السياحة' : 'Provider Messages'}
          </h3>
          <div className="space-y-3 max-h-80 overflow-y-auto">
            {messages.length === 0 ? (
              <p className="text-xs text-slate-500 py-4 text-center">
                {lang === 'ar' ? 'لا توجد رسائل بعد.' : 'No messages yet.'}
              </p>
            ) : (
              messages.map((m) => (
                <div
                  key={m.id}
                  className="rounded-lg border border-slate-100 dark:border-slate-800 p-3 text-sm"
                >
                  <div className="flex justify-between text-xs text-slate-500">
                    <span className="font-semibold text-slate-800 dark:text-slate-200">
                      {m.senderName}
                    </span>
                    <span className="font-mono">{m.subject}</span>
                  </div>
                  <p className="mt-1 text-slate-700 dark:text-slate-300">{m.text}</p>
                </div>
              ))
            )}
          </div>
          {replyError && (
            <p className="text-xs text-red-600" role="alert">
              {replyError}
            </p>
          )}
          <form
            noValidate
            onSubmit={(e) => {
              e.preventDefault();
              if (!replyText.trim()) {
                setReplyError(
                  lang === 'ar' ? 'يرجى كتابة نص الرسالة أولًا.' : 'Please type a message before sending.'
                );
                return;
              }
              sendMessage({
                recipientId: 'usr_provider_med',
                recipientName: 'Mediterranean Horizons Travel',
                subject: 'MSD-2611-101 Check-in Details',
                text: replyText.trim(),
              });
              setReplyText('');
              setReplyError('');
              showToast(lang === 'ar' ? 'تم إرسال الرسالة للشركة' : 'Message sent to provider', 'success');
            }}
            className="flex flex-col sm:flex-row gap-2"
          >
            <input
              type="text"
              value={replyText}
              onChange={(e) => {
                setReplyText(e.target.value);
                if (replyError) setReplyError('');
              }}
              placeholder={lang === 'ar' ? 'اكتب رسالتك للشركة...' : 'Reply to provider...'}
              className="flex-1 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2.5 text-sm"
            />
            <button
              type="submit"
              className="min-h-[42px] px-4 py-2 rounded-lg bg-[#0052CC] text-white text-xs font-semibold cursor-pointer shrink-0"
            >
              {lang === 'ar' ? 'إرسال' : 'Send'}
            </button>
          </form>
        </div>
      )}

      <ConfirmDialog
        open={Boolean(confirmBookingAction)}
        title={
          confirmBookingAction?.status === 'Confirmed'
            ? lang === 'ar'
              ? 'طلب استرداد الحجز'
              : 'Request Booking Refund'
            : lang === 'ar'
            ? 'إلغاء طلب الحجز'
            : 'Cancel Booking Request'
        }
        message={
          confirmBookingAction
            ? lang === 'ar'
              ? `هل أنت متأكد من المتابعة للحجز ${confirmBookingAction.referenceCode} (${confirmBookingAction.productTitle.ar})؟`
              : `Are you sure you want to proceed on booking ${confirmBookingAction.referenceCode} (${confirmBookingAction.productTitle.en})?`
            : ''
        }
        confirmLabel={
          confirmBookingAction?.status === 'Confirmed'
            ? lang === 'ar'
              ? 'نعم، طلب استرداد'
              : 'Yes, Request Refund'
            : lang === 'ar'
            ? 'نعم، إلغاء الحجز'
            : 'Yes, Cancel Booking'
        }
        cancelLabel={lang === 'ar' ? 'تراجع' : 'Keep Booking'}
        variant="danger"
        onConfirm={() => {
          if (confirmBookingAction) {
            const nextStatus =
              confirmBookingAction.status === 'Confirmed' ? 'Refund Pending' : 'Cancelled';
            updateBookingStatus(confirmBookingAction.id, nextStatus);
            showToast(
              lang === 'ar'
                ? `تم تحديث حالة الحجز ${confirmBookingAction.referenceCode}`
                : `Booking ${confirmBookingAction.referenceCode} updated to ${nextStatus}`,
              'info'
            );
          }
          setConfirmBookingAction(null);
        }}
        onCancel={() => setConfirmBookingAction(null)}
      />

      <ConfirmDialog
        open={Boolean(confirmRejectQuoteId)}
        title={lang === 'ar' ? 'رفض عرض السعر' : 'Reject Quotation'}
        message={
          lang === 'ar'
            ? 'هل أنت متأكد من رفض هذا العرض؟'
            : 'Are you sure you want to reject this quotation?'
        }
        confirmLabel={lang === 'ar' ? 'نعم، رفض' : 'Reject'}
        cancelLabel={lang === 'ar' ? 'إلغاء' : 'Cancel'}
        variant="danger"
        onConfirm={() => {
          if (confirmRejectQuoteId) respondToQuotation(confirmRejectQuoteId, 'reject');
          setConfirmRejectQuoteId(null);
        }}
        onCancel={() => setConfirmRejectQuoteId(null)}
      />
    </div>
  );
}
