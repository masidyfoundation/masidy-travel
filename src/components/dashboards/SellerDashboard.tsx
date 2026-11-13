import { useEffect, useState } from 'react';
import {
  AlertCircle,
  BarChart3,
  BookOpen,
  Check,
  Compass,
  Copy,
  Image as ImageIcon,
  Layers,
  Link2,
  Percent,
  TrendingUp,
  User as UserIcon,
  Wallet,
} from 'lucide-react';
import { useMarketplace } from '../../context/MarketplaceContext.tsx';
import type { MediaItem } from '../../shared/types.ts';
import { CATEGORIES } from '../../shared/i18n.ts';
import { formatMoney } from '../../shared/currency.ts';
import { BookingStatusBadge } from '../StatusBadge.tsx';
import { MediaRenderer, MediaUploader, SingleImageUploader } from '../MediaUploader.tsx';

export function SellerDashboard({ initialTab = 'overview' }: { initialTab?: string }) {
  const {
    lang,
    activeUser,
    sellers,
    products,
    affiliateLinks,
    bookings,
    commissionRules,
    payouts,
    generateAffiliateLink,
    simulateAffiliateClick,
    updateSellerProfile,
    requestSellerPayout,
    navigate,
    showToast,
  } = useMarketplace();
  const [tab, setTab] = useState(initialTab);
  const [searchTerm, setSearchTerm] = useState('');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const seller = sellers.find((s) => s.id === activeUser?.sellerId) || sellers[0];
  const [sellerForm, setSellerForm] = useState({
    displayName: seller.displayName,
    bio: seller.bio,
    avatarUrl: seller.avatarUrl || '',
    mediaGallery: seller.mediaGallery || ([] as MediaItem[]),
  });
  const [sellerError, setSellerError] = useState('');

  useEffect(() => {
    setSellerForm({
      displayName: seller.displayName,
      bio: seller.bio,
      avatarUrl: seller.avatarUrl || '',
      mediaGallery: seller.mediaGallery || [],
    });
  }, [seller]);

  const myLinks = affiliateLinks.filter((l) => l.sellerId === seller.id);
  const myBookings = bookings.filter((b) => b.sellerId === seller.id);
  const myPayouts = payouts.filter(
    (p) => p.recipientType === 'seller' && p.recipientId === seller.id
  );
  const discoverable = products.filter(
    (p) =>
      p.published &&
      (!searchTerm.trim() ||
        p.title[lang].toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.providerName.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const conversionRate =
    seller.totalClicks > 0
      ? ((seller.totalConversions / seller.totalClicks) * 100).toFixed(1)
      : '0.0';

  const tabs = [
    { id: 'overview', label: lang === 'ar' ? 'نظرة عامة' : 'Overview', icon: Layers },
    { id: 'media', label: lang === 'ar' ? 'الملف والوسائط' : 'Profile & Media', icon: ImageIcon },
    { id: 'discover', label: lang === 'ar' ? 'استكشاف الخدمات' : 'Discover Services', icon: Compass },
    { id: 'links', label: lang === 'ar' ? 'روابط التسويق' : 'Affiliate Links', icon: Link2 },
    { id: 'performance', label: lang === 'ar' ? 'أداء الإحالات' : 'Referral Performance', icon: TrendingUp },
    { id: 'bookings', label: lang === 'ar' ? 'الحجوزات المحالة' : 'Referred Bookings', icon: BookOpen },
    { id: 'commissions', label: lang === 'ar' ? 'ملخص العمولات' : 'Commission Overview', icon: Percent },
    { id: 'payouts', label: lang === 'ar' ? 'الأرباح والمدفوعات' : 'Earnings & Payouts', icon: Wallet },
    { id: 'analytics', label: lang === 'ar' ? 'تحليلات التسويق' : 'Marketing Analytics', icon: BarChart3 },
  ];

  function copyLink(id: string, url: string) {
    try {
      navigator.clipboard?.writeText(`${window.location.origin}${url}`);
    } catch {
      // Ignore clipboard API failure
    }
    setCopiedId(id);
    showToast(lang === 'ar' ? 'تم نسخ رابط الإحالة' : 'Affiliate referral URL copied', 'info');
    window.setTimeout(() => setCopiedId(null), 2000);
  }

  return (
    <div className="space-y-6">
      {seller.status === 'paused' && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 dark:border-amber-900/60 dark:bg-amber-950/30 px-4 py-3 text-xs text-amber-800 dark:text-amber-300 flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>
            {lang === 'ar'
              ? 'حساب المسوق موقوف مؤقتًا من الإدارة؛ سيتم تعليق العمولات والسحب حتى إعادة التفعيل.'
              : 'Your affiliate account is currently paused by Admin; new commissions and payouts are paused.'}
          </span>
        </div>
      )}

      <div className="flex flex-nowrap lg:flex-wrap gap-1.5 pb-3 lg:pb-4 border-b border-slate-200 dark:border-slate-800 overflow-x-auto lg:overflow-visible no-scrollbar">
        {tabs.map((item) => {
          const Icon = item.icon;
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
            </button>
          );
        })}
      </div>

      {tab === 'overview' && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="rounded-xl border border-slate-200 dark:border-slate-800 p-4">
              <p className="text-xs text-slate-500">Referral / Coupon</p>
              <p className="mt-1 text-base font-bold font-mono text-blue-600">
                {seller.referralCode} · {seller.couponCode}
              </p>
            </div>
            <div className="rounded-xl border border-slate-200 dark:border-slate-800 p-4">
              <p className="text-xs text-slate-500">Clicks / Conversions</p>
              <p className="mt-1 text-xl font-bold font-mono tabular-nums">
                {seller.totalClicks} / {seller.totalConversions}
              </p>
            </div>
            <div className="rounded-xl border border-slate-200 dark:border-slate-800 p-4">
              <p className="text-xs text-slate-500">Pending Balance</p>
              <p className="mt-1 text-xl font-bold font-mono tabular-nums text-[#F95738]">
                €{seller.pendingBalanceEur.toFixed(2)}
              </p>
            </div>
            <div className="rounded-xl border border-slate-200 dark:border-slate-800 p-4">
              <p className="text-xs text-slate-500">Settled Earnings</p>
              <p className="mt-1 text-xl font-bold font-mono tabular-nums text-emerald-600">
                €{seller.settledBalanceEur.toFixed(2)}
              </p>
            </div>
          </div>

          <div className="rounded-xl border border-slate-200 dark:border-slate-800 p-4 sm:p-5 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3.5 min-w-0">
                {seller.avatarUrl ? (
                  <img
                    src={seller.avatarUrl}
                    alt={seller.displayName}
                    className="w-14 h-14 rounded-full object-cover border border-slate-200 dark:border-slate-700 shrink-0"
                  />
                ) : (
                  <div className="w-14 h-14 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center shrink-0">
                    <UserIcon className="w-6 h-6 text-slate-400" />
                  </div>
                )}
                <div className="min-w-0">
                  <h3 className="text-sm font-semibold truncate">{seller.displayName}</h3>
                  <p className="text-xs text-slate-500 mt-0.5 line-clamp-2">{seller.bio}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setTab('media')}
                className="px-4 py-2 rounded-lg bg-[#0052CC] hover:bg-[#0041a3] text-white text-xs font-semibold cursor-pointer shrink-0"
              >
                {lang === 'ar' ? 'تعديل الملف ورفع صور/فيديو' : 'Upload Profile & Promo Media'}
              </button>
            </div>

            {seller.mediaGallery && seller.mediaGallery.length > 0 && (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 border-t border-slate-100 dark:border-slate-800">
                {seller.mediaGallery.slice(0, 3).map((m) => (
                  <div key={m.id} className="rounded-lg border border-slate-200 dark:border-slate-800 overflow-hidden">
                    <div className="aspect-video bg-slate-100 dark:bg-slate-800">
                      <MediaRenderer item={m} className="h-full w-full object-cover" />
                    </div>
                    {(m.caption || m.name) && (
                      <p className="p-2 text-[11px] text-slate-600 dark:text-slate-300 truncate">
                        {m.caption || m.name}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {tab === 'media' && (
        <form
          noValidate
          onSubmit={(e) => {
            e.preventDefault();
            setSellerError('');
            if (sellerForm.displayName.trim().length < 2) {
              const msg =
                lang === 'ar'
                  ? 'يرجى إدخال الاسم التجاري للمسوق.'
                  : 'Display name must be at least 2 characters.';
              setSellerError(msg);
              showToast(msg, 'error');
              return;
            }
            updateSellerProfile(seller.id, {
              displayName: sellerForm.displayName.trim(),
              bio: sellerForm.bio.trim() || seller.bio,
              avatarUrl: sellerForm.avatarUrl.trim() || undefined,
              mediaGallery: sellerForm.mediaGallery,
            });
            showToast(
              lang === 'ar'
                ? 'تم حفظ ملف المسوق والوسائط وتحديثها في المنصة'
                : 'Seller profile & promotional media saved across marketplace',
              'success'
            );
          }}
          className="rounded-xl border border-slate-200 dark:border-slate-800 p-5 sm:p-6 max-w-4xl space-y-5"
        >
          <h3 className="text-base font-semibold">
            {lang === 'ar'
              ? 'ملف المسوق وصور وفيديوهات الترويج'
              : 'Seller Profile & Promotional Media Kit'}
          </h3>

          {sellerError && (
            <div role="alert" className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
              {sellerError}
            </div>
          )}

          <SingleImageUploader
            lang={lang}
            label={lang === 'ar' ? 'الصورة الشخصية للمسوق (Avatar)' : 'Seller Profile Photo / Avatar'}
            value={sellerForm.avatarUrl}
            aspectClass="w-16 h-16 rounded-full"
            onChange={(avatarUrl) => setSellerForm((prev) => ({ ...prev, avatarUrl }))}
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <input
              type="text"
              value={sellerForm.displayName}
              onChange={(e) => {
                setSellerForm({ ...sellerForm, displayName: e.target.value });
                if (sellerError) setSellerError('');
              }}
              placeholder={lang === 'ar' ? 'الاسم المعروض' : 'Display Name'}
              className="rounded-lg border border-slate-200 dark:border-slate-700 px-3 py-2 text-sm"
            />
            <input
              type="text"
              value={seller.referralCode}
              readOnly
              className="rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 px-3 py-2 text-sm font-mono text-slate-500"
            />
          </div>

          <textarea
            rows={2}
            value={sellerForm.bio}
            onChange={(e) => setSellerForm({ ...sellerForm, bio: e.target.value })}
            placeholder={lang === 'ar' ? 'نبذة عن خبرتك في تسويق السفر...' : 'Short travel creator / affiliate bio...'}
            className="w-full rounded-lg border border-slate-200 dark:border-slate-700 px-3 py-2 text-sm"
          />

          <MediaUploader
            lang={lang}
            title={lang === 'ar' ? 'فيديوهات وصور الحملات الترويجية' : 'Promotional Photos & Travel Reels'}
            subtitle={
              lang === 'ar'
                ? 'تظهر هذه الصور والفيديوهات في حسابك وعند فتح روابط الإحالة الخاصة بك في السوق.'
                : 'Displayed in your account, admin directory, and to travelers arriving via your referral links.'
            }
            items={sellerForm.mediaGallery}
            onChange={(mediaGallery) => setSellerForm((prev) => ({ ...prev, mediaGallery }))}
          />

          <button
            type="submit"
            className="px-5 py-2.5 rounded-lg bg-[#F95738] hover:bg-[#e1482b] text-white text-xs font-semibold cursor-pointer"
          >
            {lang === 'ar' ? 'حفظ الملف والوسائط' : 'Save Seller Profile & Media'}
          </button>
        </form>
      )}

      {tab === 'discover' && (
        <div className="space-y-4">
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder={lang === 'ar' ? 'ابحث عن خدمة للتسويق...' : 'Search services to promote...'}
            className="w-full max-w-md rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-sm"
          />
          {discoverable.length === 0 ? (
            <div className="rounded-xl border border-slate-200 dark:border-slate-800 p-10 text-center space-y-3">
              <p className="text-sm text-slate-500">
                {lang === 'ar'
                  ? 'لا توجد خدمات مطابقة لبحثك حاليًا.'
                  : 'No published services match your search.'}
              </p>
              {searchTerm && (
                <button
                  type="button"
                  onClick={() => setSearchTerm('')}
                  className="px-4 py-2 rounded-lg border border-slate-200 text-xs font-medium cursor-pointer"
                >
                  {lang === 'ar' ? 'مسح البحث' : 'Clear Search'}
                </button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {discoverable.map((p) => {
                const link = myLinks.find((l) => l.productId === p.id);
                return (
                  <div
                    key={p.id}
                    className="rounded-xl border border-slate-200 dark:border-slate-800 p-4 flex flex-col justify-between gap-3"
                  >
                    <div>
                      <p className="text-xs text-slate-500">
                        {CATEGORIES[p.category][lang]} · {p.providerName}
                      </p>
                      <h4 className="font-semibold mt-1">{p.title[lang]}</h4>
                      <p className="text-xs font-mono mt-1">
                        {formatMoney(p.price, p.baseCurrency)} · Est. Commission 10–12%
                      </p>
                    </div>
                    <div className="flex items-center justify-between pt-3 border-t border-slate-100 dark:border-slate-800">
                      <span className="text-xs text-slate-500">
                        {link ? `${link.clicks} clicks` : 'Available'}
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          const generated = generateAffiliateLink(p.id);
                          if (!generated) {
                            showToast('Unable to generate affiliate link', 'error');
                            return;
                          }
                          showToast(
                            lang === 'ar' ? 'رابط الإحالة جاهز للاستخدام' : 'Affiliate link ready',
                            'success'
                          );
                          setTab('links');
                        }}
                        className="px-3 py-1.5 rounded-lg bg-slate-900 text-white text-xs font-medium cursor-pointer"
                      >
                        {link ? 'View Link' : 'Generate Link'}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {tab === 'links' && (
        myLinks.length === 0 ? (
          <div className="rounded-xl border border-slate-200 dark:border-slate-800 p-10 text-center space-y-3">
            <p className="text-sm text-slate-500">
              {lang === 'ar'
                ? 'لم تقم بإنشاء أي روابط تسويقية بعد.'
                : 'You have not generated any affiliate links yet.'}
            </p>
            <button
              type="button"
              onClick={() => setTab('discover')}
              className="px-4 py-2 rounded-lg bg-[#0052CC] text-white text-xs font-semibold cursor-pointer"
            >
              {lang === 'ar' ? 'استكشاف الخدمات للترويج' : 'Discover Services to Promote'}
            </button>
          </div>
        ) : (
          <>
            <div className="md:hidden space-y-3">
              {myLinks.map((l) => (
                <div
                  key={l.id}
                  className="rounded-xl border border-slate-200 dark:border-slate-800 p-4 space-y-2.5"
                >
                  <div className="font-semibold text-sm">{l.productTitle?.[lang] || l.productId}</div>
                  <div className="text-xs font-mono text-slate-500 break-all">{l.url}</div>
                  <div className="flex items-center justify-between text-xs pt-1">
                    <span className="font-mono tabular-nums text-slate-600 dark:text-slate-300">
                      {l.clicks} clicks · {l.conversions} conv
                    </span>
                    <span className="font-mono tabular-nums font-bold">€{l.earnedEur.toFixed(2)}</span>
                  </div>
                  <div className="flex gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                    <button
                      type="button"
                      onClick={() => copyLink(l.id, l.url)}
                      className="flex-1 min-h-[38px] inline-flex items-center justify-center gap-1 px-3 py-1.5 rounded-lg border border-slate-200 text-xs cursor-pointer"
                    >
                      {copiedId === l.id ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                      <span>Copy</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        simulateAffiliateClick(l.id);
                        navigate({ page: 'product', productId: l.productId });
                      }}
                      className="flex-1 min-h-[38px] px-3 py-1.5 rounded-lg bg-[#0052CC] text-white text-xs font-medium cursor-pointer"
                    >
                      Test Visit
                    </button>
                  </div>
                </div>
              ))}
            </div>

            <div className="hidden md:block rounded-xl border border-slate-200 dark:border-slate-800 overflow-x-auto">
              <table className="w-full text-sm min-w-[600px]">
                <thead className="bg-slate-50 dark:bg-slate-900/50 text-xs text-slate-500 border-b border-slate-200 dark:border-slate-800">
                  <tr>
                    <th className="px-4 py-3 text-start">Service & URL</th>
                    <th className="px-4 py-3 text-end">Clicks</th>
                    <th className="px-4 py-3 text-end">Conversions</th>
                    <th className="px-4 py-3 text-end">Earned</th>
                    <th className="px-4 py-3 text-end">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                  {myLinks.map((l) => (
                    <tr key={l.id}>
                      <td className="px-4 py-3">
                        <div className="font-medium">{l.productTitle?.[lang] || l.productId}</div>
                        <div className="text-xs font-mono text-slate-500">{l.url}</div>
                      </td>
                      <td className="px-4 py-3 text-end font-mono tabular-nums">{l.clicks}</td>
                      <td className="px-4 py-3 text-end font-mono tabular-nums">{l.conversions}</td>
                      <td className="px-4 py-3 text-end font-mono tabular-nums font-semibold">
                        €{l.earnedEur.toFixed(2)}
                      </td>
                      <td className="px-4 py-3 text-end space-x-2">
                        <button
                          type="button"
                          onClick={() => copyLink(l.id, l.url)}
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded border border-slate-200 text-xs cursor-pointer"
                        >
                          {copiedId === l.id ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                          <span>Copy</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            simulateAffiliateClick(l.id);
                            navigate({ page: 'product', productId: l.productId });
                          }}
                          className="px-2.5 py-1 rounded bg-[#0052CC] text-white text-xs cursor-pointer"
                        >
                          Test Visit
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )
      )}

      {tab === 'performance' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="rounded-xl border border-slate-200 dark:border-slate-800 p-5">
            <p className="text-xs text-slate-500">Click-Through Conversion Rate</p>
            <p className="mt-2 text-2xl font-bold font-mono tabular-nums">{conversionRate}%</p>
          </div>
          <div className="rounded-xl border border-slate-200 dark:border-slate-800 p-5">
            <p className="text-xs text-slate-500">Active Marketing Links</p>
            <p className="mt-2 text-2xl font-bold font-mono tabular-nums">{myLinks.length}</p>
          </div>
          <div className="rounded-xl border border-slate-200 dark:border-slate-800 p-5">
            <p className="text-xs text-slate-500">Avg Commission / Booking</p>
            <p className="mt-2 text-2xl font-bold font-mono tabular-nums">
              €
              {myBookings.length
                ? (
                    myBookings.reduce((s, b) => s + b.commissionSnapshot.sellerCommissionEur, 0) /
                    myBookings.length
                  ).toFixed(2)
                : '0.00'}
            </p>
          </div>
        </div>
      )}

      {tab === 'bookings' && (
        myBookings.length === 0 ? (
          <div className="rounded-xl border border-slate-200 dark:border-slate-800 p-10 text-center space-y-3">
            <p className="text-sm text-slate-500">
              {lang === 'ar'
                ? 'لا توجد حجوزات محالة بكودك حتى الآن.'
                : 'No bookings referred with your code yet.'}
            </p>
            <button
              type="button"
              onClick={() => setTab('links')}
              className="px-4 py-2 rounded-lg bg-[#0052CC] text-white text-xs font-semibold cursor-pointer"
            >
              {lang === 'ar' ? 'تجربة رابط إحالة' : 'Open Affiliate Links'}
            </button>
          </div>
        ) : (
          <div className="rounded-xl border border-slate-200 dark:border-slate-800 overflow-x-auto">
            <table className="w-full text-sm min-w-[480px]">
              <thead className="bg-slate-50 dark:bg-slate-900/50 text-xs text-slate-500 border-b border-slate-200 dark:border-slate-800">
                <tr>
                  <th className="px-4 py-3 text-start">Ref</th>
                  <th className="px-4 py-3 text-start">Service</th>
                  <th className="px-4 py-3 text-start">Status</th>
                  <th className="px-4 py-3 text-end">Commission (EUR)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                {myBookings.map((b) => (
                  <tr key={b.id}>
                    <td className="px-4 py-3 font-mono text-xs">{b.referenceCode}</td>
                    <td className="px-4 py-3">{b.productTitle[lang]}</td>
                    <td className="px-4 py-3">
                      <BookingStatusBadge status={b.status} lang={lang} />
                    </td>
                    <td className="px-4 py-3 text-end font-mono tabular-nums font-semibold text-emerald-600">
                      €{b.commissionSnapshot.sellerCommissionEur.toFixed(2)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )
      )}

      {tab === 'commissions' && (
        <div className="rounded-xl border border-slate-200 dark:border-slate-800 overflow-x-auto">
          <table className="w-full text-sm min-w-[440px]">
            <thead className="bg-slate-50 dark:bg-slate-900/50 text-xs text-slate-500 border-b border-slate-200 dark:border-slate-800">
              <tr>
                <th className="px-4 py-3 text-start">Tier Rule</th>
                <th className="px-4 py-3 text-start">Category / Scope</th>
                <th className="px-4 py-3 text-end">Your Seller Rate</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
              {commissionRules.map((r) => (
                <tr key={r.id}>
                  <td className="px-4 py-3 font-medium">{r.name}</td>
                  <td className="px-4 py-3 text-xs font-mono">
                    {r.category ? CATEGORIES[r.category][lang] : 'Global Default'}
                  </td>
                  <td className="px-4 py-3 text-end font-mono tabular-nums font-semibold">
                    {r.sellerPercent}%
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {tab === 'payouts' && (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="text-sm">
              Available for Withdrawal:{' '}
              <span className="font-mono font-bold">€{seller.pendingBalanceEur.toFixed(2)}</span>
            </div>
            <button
              type="button"
              onClick={requestSellerPayout}
              className="min-h-[40px] px-4 py-2 rounded-lg bg-[#0052CC] hover:bg-[#0041a3] text-white text-xs font-semibold cursor-pointer"
            >
              Request Payout
            </button>
          </div>
          <div className="rounded-xl border border-slate-200 dark:border-slate-800 overflow-x-auto">
            {myPayouts.length === 0 ? (
              <div className="p-8 text-center text-sm text-slate-500">
                {lang === 'ar' ? 'لا توجد طلبات سحب مسجلة بعد.' : 'No payout requests yet.'}
              </div>
            ) : (
              <table className="w-full text-sm min-w-[440px]">
                <thead className="bg-slate-50 dark:bg-slate-900/50 text-xs text-slate-500 border-b border-slate-200 dark:border-slate-800">
                  <tr>
                    <th className="px-4 py-3 text-start">Payout ID</th>
                    <th className="px-4 py-3 text-start">Method</th>
                    <th className="px-4 py-3 text-end">Amount</th>
                    <th className="px-4 py-3 text-end">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                  {myPayouts.map((p) => (
                    <tr key={p.id}>
                      <td className="px-4 py-3 font-mono text-xs">{p.id}</td>
                      <td className="px-4 py-3 text-xs">{p.method || 'Bank Transfer'}</td>
                      <td className="px-4 py-3 text-end font-mono tabular-nums font-semibold">
                        €{p.amountEur.toFixed(2)}
                      </td>
                      <td className="px-4 py-3 text-end text-xs">
                        <span
                          className={
                            p.status === 'Settled' ? 'text-emerald-600 font-medium' : 'text-amber-600 font-medium'
                          }
                        >
                          {p.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

      {tab === 'analytics' && (
        <div className="rounded-xl border border-slate-200 dark:border-slate-800 p-5 space-y-4">
          <h3 className="text-sm font-semibold">Top Performing Affiliate Channels</h3>
          {[
            { channel: 'Travel Blog & Guides', share: 54 },
            { channel: 'Instagram & Reels', share: 28 },
            { channel: 'Direct WhatsApp Advisory', share: 18 },
          ].map((c) => (
            <div key={c.channel} className="space-y-1">
              <div className="flex justify-between text-xs">
                <span>{c.channel}</span>
                <span className="font-mono tabular-nums">{c.share}%</span>
              </div>
              <div className="h-2 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                <div className="h-full bg-[#F95738]" style={{ width: `${c.share}%` }} />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
