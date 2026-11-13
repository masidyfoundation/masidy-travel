import { useEffect, useState } from 'react';
import {
  BookOpen,
  Building2,
  Check,
  Copy,
  FileText,
  Layers,
  Link2,
  Plus,
  RefreshCw,
  ShieldCheck,
  Sliders,
  Ticket,
  Users,
  Wallet,
} from 'lucide-react';
import { api, setStoredReferral } from '../lib/api.ts';
import type {
  AffiliateLink,
  AuditLog,
  Booking,
  CommissionRule,
  CurrencyCode,
  Language,
  LedgerEntry,
  Organization,
  OrganizationMember,
  Payout,
  Product,
  ProductModel,
  Quotation,
  SellerProfile,
  ServiceCategory,
  SupportTicket,
  TravelRequest,
  User,
  UserRole,
} from '../shared/types.ts';
import { BOOKING_STATUS_LABELS, CATEGORIES, PRODUCT_MODELS, UI_TEXT } from '../shared/i18n.ts';
import { formatMoney } from '../shared/currency.ts';

interface WorkspacesProps {
  lang: Language;
  currency: CurrencyCode;
  user: User;
  onSwitchRole: (role: UserRole) => void;
  onSelectProductForBooking: (product: Product, refCode?: string) => void;
  onOpenRequestQuote: () => void;
  onDataMutated: () => void;
}

export function Workspaces({
  lang,
  currency,
  user,
  onSwitchRole,
  onSelectProductForBooking,
  onOpenRequestQuote,
  onDataMutated,
}: WorkspacesProps) {
  const t = UI_TEXT[lang];
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [activeTab, setActiveTab] = useState<string>('overview');

  // Role-specific dashboard payloads
  const [customerData, setCustomerData] = useState<{
    bookings: Booking[];
    favoriteProducts: Product[];
    travelRequests: TravelRequest[];
    quotations: Quotation[];
    tickets: SupportTicket[];
  } | null>(null);

  const [providerData, setProviderData] = useState<{
    organization: Organization;
    products: Product[];
    bookings: Booking[];
    staff: OrganizationMember[];
    customers: Array<{ id: string; name: string; email: string; bookingsCount: number }>;
    ledger: LedgerEntry[];
    payouts: Payout[];
    openRequests: TravelRequest[];
    myQuotations: Quotation[];
  } | null>(null);

  const [sellerData, setSellerData] = useState<{
    seller: SellerProfile;
    availableProducts: Product[];
    links: AffiliateLink[];
    bookings: Booking[];
    ledger: LedgerEntry[];
    payouts: Payout[];
  } | null>(null);

  const [adminData, setAdminData] = useState<{
    organizations: Organization[];
    sellers: SellerProfile[];
    customers: User[];
    products: Product[];
    bookings: Booking[];
    commissionRules: CommissionRule[];
    ledgerEntries: LedgerEntry[];
    payouts: Payout[];
    supportTickets: SupportTicket[];
    auditLogs: AuditLog[];
  } | null>(null);

  // Forms state
  const [newProd, setNewProd] = useState({
    category: 'tours' as ServiceCategory,
    productModel: 'fixed' as ProductModel,
    titleAr: '',
    titleEn: '',
    destinationEn: '',
    baseCurrency: 'EUR' as CurrencyCode,
    price: 150,
    providerCost: 105,
    instantBooking: false,
  });

  const [newStaff, setNewStaff] = useState({ name: '', email: '', memberRole: 'agent' as 'manager' | 'agent' });
  const [quoteDraft, setQuoteDraft] = useState<{
    requestId: string;
    quotedPrice: number;
    validUntil: string;
    summary: string;
  } | null>(null);

  const [newRule, setNewRule] = useState({
    name: '',
    scope: 'category' as 'global' | 'category' | 'organization',
    category: 'tours' as ServiceCategory,
    platformPercent: 5,
    sellerPercent: 10,
    fixedFeeEur: 0,
  });

  const [copiedId, setCopiedId] = useState<string | null>(null);

  async function loadDashboard() {
    setLoading(true);
    setError('');
    try {
      if (user.role === 'customer') {
        setCustomerData(await api.getCustomerDashboard());
      } else if (user.role === 'provider') {
        setProviderData(await api.getProviderDashboard());
      } else if (user.role === 'seller') {
        setSellerData(await api.getSellerDashboard());
      } else if (user.role === 'admin') {
        setAdminData(await api.getAdminDashboard());
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load workspace');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    setActiveTab('overview');
    loadDashboard();
  }, [user.id, user.role]);

  function flash(msg: string) {
    setNotice(msg);
    setTimeout(() => setNotice(''), 4000);
  }

  const tabsByRole: Record<UserRole, Array<{ id: string; label: string; icon: any }>> = {
    customer: [
      { id: 'overview', label: lang === 'ar' ? 'حجوزاتي' : 'My Bookings', icon: BookOpen },
      { id: 'requests', label: lang === 'ar' ? 'طلبات الأسعار' : 'Quote Requests', icon: FileText },
      { id: 'favorites', label: lang === 'ar' ? 'المفضلة' : 'Favorites', icon: Layers },
    ],
    provider: [
      { id: 'overview', label: lang === 'ar' ? 'نظرة عامة' : 'Overview', icon: Layers },
      { id: 'products', label: lang === 'ar' ? 'الخدمات والمنتجات' : 'Services', icon: Plus },
      { id: 'bookings', label: lang === 'ar' ? 'الحجوزات' : 'Bookings', icon: BookOpen },
      { id: 'requests', label: lang === 'ar' ? 'عروض الأسعار' : 'Quotations', icon: FileText },
      { id: 'staff', label: lang === 'ar' ? 'الموظفون' : 'Team & Staff', icon: Users },
      { id: 'finance', label: lang === 'ar' ? 'المستحقات والدفتر' : 'Finance', icon: Wallet },
    ],
    seller: [
      { id: 'overview', label: lang === 'ar' ? 'نظرة عامة' : 'Overview', icon: Layers },
      { id: 'catalog', label: lang === 'ar' ? 'خدمات للتسويق' : 'Promote Services', icon: Link2 },
      { id: 'commissions', label: lang === 'ar' ? 'العمولات والمدفوعات' : 'Commissions', icon: Wallet },
    ],
    admin: [
      { id: 'overview', label: lang === 'ar' ? 'نظرة عامة' : 'Overview', icon: ShieldCheck },
      { id: 'partners', label: lang === 'ar' ? 'الشركات والبائعون' : 'Partners', icon: Building2 },
      { id: 'bookings', label: lang === 'ar' ? 'مراقبة الحجوزات' : 'Bookings', icon: BookOpen },
      { id: 'rules', label: lang === 'ar' ? 'قواعد العمولات' : 'Commission Rules', icon: Sliders },
      { id: 'ledger', label: lang === 'ar' ? 'الدفتر والمستحقات' : 'Ledger & Payouts', icon: Wallet },
      { id: 'audit', label: lang === 'ar' ? 'الشكاوى والتدقيق' : 'Tickets & Audit', icon: Ticket },
    ],
  };

  const roleTabs = tabsByRole[user.role];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Workspace Shell: 260px Sidebar + Main Content */}
      <div className="flex flex-col lg:flex-row gap-8">
        {/* Sidebar */}
        <aside className="w-full lg:w-[260px] shrink-0 space-y-6">
          <div className="rounded-xl border border-slate-200 dark:border-slate-800 p-4 space-y-3">
            <div>
              <p className="text-xs text-slate-500">
                {user.role === 'customer'
                  ? t.roleCustomer
                  : user.role === 'provider'
                  ? t.roleProvider
                  : user.role === 'seller'
                  ? t.roleSeller
                  : t.roleAdmin}
              </p>
              <p className="text-sm font-semibold text-slate-900 dark:text-white truncate mt-0.5">
                {user.name}
              </p>
              <p className="text-xs font-mono text-slate-500 truncate">{user.email}</p>
            </div>

            <div className="pt-3 border-t border-slate-200 dark:border-slate-800">
              <p className="text-[11px] font-medium text-slate-500 mb-2">{t.switchDemoRole}</p>
              <div className="grid grid-cols-2 gap-1.5">
                {(['customer', 'provider', 'seller', 'admin'] as UserRole[]).map((r) => (
                  <button
                    key={r}
                    type="button"
                    onClick={() => onSwitchRole(r)}
                    className={`px-2 py-1.5 text-[11px] font-medium rounded-md border transition-colors cursor-pointer truncate ${
                      user.role === r
                        ? 'border-blue-600 bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300'
                        : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:border-slate-400'
                    }`}
                  >
                    {r === 'customer'
                      ? t.roleCustomer
                      : r === 'provider'
                      ? t.roleProvider
                      : r === 'seller'
                      ? t.roleSeller
                      : t.roleAdmin}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <nav className="rounded-xl border border-slate-200 dark:border-slate-800 p-2 space-y-1">
            {roleTabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id)}
                  className={`w-full flex items-center gap-2.5 px-3 py-2 text-sm font-medium rounded-lg transition-colors cursor-pointer ${
                    isActive
                      ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900'
                      : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                  }`}
                >
                  <Icon className="w-4 h-4 shrink-0" />
                  <span className="truncate">{tab.label}</span>
                </button>
              );
            })}
          </nav>
        </aside>

        {/* Main Workspace Content */}
        <div className="flex-1 min-w-0 space-y-6">
          {/* Top Breadcrumb Bar */}
          <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-slate-200 dark:border-slate-800">
            <div className="text-sm text-slate-500">
              <span>Masidy</span>
              <span className="mx-2">/</span>
              <span className="text-slate-900 dark:text-white font-semibold">
                {roleTabs.find((x) => x.id === activeTab)?.label}
              </span>
            </div>
            <button
              type="button"
              onClick={loadDashboard}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>{lang === 'ar' ? 'تحديث' : 'Refresh'}</span>
            </button>
          </div>

          {notice && (
            <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-2.5 text-sm text-emerald-800">
              {notice}
            </div>
          )}

          {error && (
            <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-2.5 text-sm text-red-700">
              {error}
            </div>
          )}

          {loading ? (
            <div className="space-y-3">
              <div className="h-24 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 animate-pulse" />
              <div className="h-64 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 animate-pulse" />
            </div>
          ) : (
            <>
              {/* ================================================================= */}
              {/* CUSTOMER WORKSPACE                                                */}
              {/* ================================================================= */}
              {user.role === 'customer' && customerData && (
                <div className="space-y-6">
                  {activeTab === 'overview' && (
                    <div className="rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden">
                      <div className="px-5 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
                        <h3 className="text-sm font-semibold text-slate-900 dark:text-white">
                          {lang === 'ar' ? 'سجل الحجوزات الموحد' : 'Unified Bookings'}
                        </h3>
                        <span className="text-xs font-mono tabular-nums text-slate-500">
                          {customerData.bookings.length}
                        </span>
                      </div>
                      {customerData.bookings.length === 0 ? (
                        <div className="p-8 text-center text-sm text-slate-500">
                          {lang === 'ar' ? 'لا توجد حجوزات بعد.' : 'No bookings yet.'}
                        </div>
                      ) : (
                        <div className="overflow-x-auto">
                          <table className="w-full text-sm">
                            <thead className="bg-slate-50 dark:bg-slate-900/50 text-xs text-slate-500 border-b border-slate-200 dark:border-slate-800">
                              <tr>
                                <th className="px-4 py-3 text-start font-medium">Ref</th>
                                <th className="px-4 py-3 text-start font-medium">
                                  {lang === 'ar' ? 'الخدمة والشركة' : 'Service & Provider'}
                                </th>
                                <th className="px-4 py-3 text-start font-medium">
                                  {lang === 'ar' ? 'التاريخ' : 'Date'}
                                </th>
                                <th className="px-4 py-3 text-end font-medium">
                                  {lang === 'ar' ? 'الإجمالي' : 'Total'}
                                </th>
                                <th className="px-4 py-3 text-start font-medium">
                                  {lang === 'ar' ? 'الحالة' : 'Status'}
                                </th>
                                <th className="px-4 py-3 text-end font-medium">
                                  {lang === 'ar' ? 'إجراء' : 'Action'}
                                </th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                              {customerData.bookings.map((b) => (
                                <tr key={b.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/30">
                                  <td className="px-4 py-3 font-mono text-xs text-slate-700 dark:text-slate-300">
                                    {b.referenceCode}
                                  </td>
                                  <td className="px-4 py-3">
                                    <div className="font-medium text-slate-900 dark:text-white">
                                      {b.productTitle[lang]}
                                    </div>
                                    <div className="text-xs text-slate-500">
                                      {b.providerName}
                                      {b.affiliateCode ? ` · Ref: ${b.affiliateCode}` : ''}
                                    </div>
                                  </td>
                                  <td className="px-4 py-3 font-mono text-xs text-slate-600 dark:text-slate-300">
                                    {b.checkInDate} · {b.travelersCount} pax
                                  </td>
                                  <td className="px-4 py-3 text-end font-mono tabular-nums font-semibold text-slate-900 dark:text-white">
                                    {formatMoney(b.totalOriginal, b.originalCurrency)}
                                  </td>
                                  <td className="px-4 py-3 text-xs font-medium">
                                    {BOOKING_STATUS_LABELS[b.status][lang]}
                                  </td>
                                  <td className="px-4 py-3 text-end">
                                    {(b.status === 'Awaiting Provider Confirmation' ||
                                      b.status === 'Confirmed') && (
                                      <button
                                        type="button"
                                        onClick={async () => {
                                          await api.updateBookingStatus(
                                            b.id,
                                            b.status === 'Confirmed' ? 'Refund Pending' : 'Cancelled',
                                            'Customer requested cancellation'
                                          );
                                          flash('Booking updated');
                                          loadDashboard();
                                        }}
                                        className="text-xs text-red-600 hover:underline cursor-pointer"
                                      >
                                        {b.status === 'Confirmed'
                                          ? lang === 'ar'
                                            ? 'طلب استرداد'
                                            : 'Request Refund'
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
                      )}
                    </div>
                  )}

                  {activeTab === 'requests' && (
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <h3 className="text-sm font-semibold text-slate-900 dark:text-white">
                          {lang === 'ar' ? 'طلبات الرحلات وعروض الأسعار المستلمة' : 'Travel Requests & Quotations'}
                        </h3>
                        <button
                          type="button"
                          onClick={onOpenRequestQuote}
                          className="px-3.5 py-2 rounded-lg bg-[#0052CC] text-white text-xs font-semibold cursor-pointer"
                        >
                          {t.heroSecondaryCta}
                        </button>
                      </div>

                      {customerData.travelRequests.map((req) => {
                        const quotes = customerData.quotations.filter((q) => q.requestId === req.id);
                        return (
                          <div
                            key={req.id}
                            className="rounded-xl border border-slate-200 dark:border-slate-800 p-5 space-y-4"
                          >
                            <div className="flex flex-wrap items-center justify-between gap-2">
                              <div>
                                <h4 className="font-semibold text-slate-900 dark:text-white">
                                  {req.destination}
                                </h4>
                                <p className="text-xs text-slate-500 font-mono">
                                  {req.travelDate} · {req.travelersCount} pax · Budget:{' '}
                                  {formatMoney(req.budget, req.currency)}
                                </p>
                              </div>
                              <span className="text-xs font-medium text-blue-600">{req.status}</span>
                            </div>

                            {quotes.length === 0 ? (
                              <p className="text-xs text-slate-500">
                                {lang === 'ar'
                                  ? 'بانتظار عروض الأسعار من الشركات...'
                                  : 'Awaiting provider quotations...'}
                              </p>
                            ) : (
                              <div className="divide-y divide-slate-200 dark:divide-slate-800 border-t border-slate-200 dark:border-slate-800 pt-3">
                                {quotes.map((q) => (
                                  <div
                                    key={q.id}
                                    className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                                  >
                                    <div>
                                      <p className="text-sm font-semibold text-slate-900 dark:text-white">
                                        {q.providerName} —{' '}
                                        <span className="font-mono tabular-nums">
                                          {formatMoney(q.quotedPrice, q.currency)}
                                        </span>
                                      </p>
                                      <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">
                                        {q.summary}
                                      </p>
                                      <p className="text-[11px] font-mono text-slate-500 mt-0.5">
                                        Valid until: {q.validUntil} · Status: {q.status}
                                      </p>
                                    </div>
                                    {q.status === 'Quoted' && (
                                      <div className="flex gap-2 shrink-0">
                                        <button
                                          type="button"
                                          onClick={async () => {
                                            await api.respondToQuotation(q.id, 'accept');
                                            flash('Quotation accepted & converted to confirmed booking');
                                            loadDashboard();
                                          }}
                                          className="px-3 py-1.5 rounded-lg bg-[#F95738] text-white text-xs font-semibold cursor-pointer"
                                        >
                                          {lang === 'ar' ? 'قبول وتحويل لحجز' : 'Accept & Book'}
                                        </button>
                                        <button
                                          type="button"
                                          onClick={async () => {
                                            await api.respondToQuotation(q.id, 'reject');
                                            loadDashboard();
                                          }}
                                          className="px-3 py-1.5 rounded-lg border border-slate-200 text-xs cursor-pointer"
                                        >
                                          {lang === 'ar' ? 'رفض' : 'Reject'}
                                        </button>
                                      </div>
                                    )}
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {activeTab === 'favorites' && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {customerData.favoriteProducts.length === 0 ? (
                        <p className="text-sm text-slate-500">
                          {lang === 'ar' ? 'لا توجد خدمات محفوظة.' : 'No saved favorites.'}
                        </p>
                      ) : (
                        customerData.favoriteProducts.map((p) => (
                          <div
                            key={p.id}
                            className="rounded-xl border border-slate-200 dark:border-slate-800 p-4 flex items-center justify-between gap-4"
                          >
                            <div>
                              <p className="text-xs text-slate-500">{p.providerName}</p>
                              <p className="text-sm font-semibold text-slate-900 dark:text-white mt-0.5">
                                {p.title[lang]}
                              </p>
                              <p className="text-xs font-mono mt-1">
                                {formatMoney(p.price, p.baseCurrency)}
                              </p>
                            </div>
                            <button
                              type="button"
                              onClick={() => onSelectProductForBooking(p)}
                              className="px-3 py-2 rounded-lg bg-slate-900 text-white text-xs font-medium shrink-0 cursor-pointer"
                            >
                              {t.viewAndBook}
                            </button>
                          </div>
                        ))
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* ================================================================= */}
              {/* PROVIDER COMPANY WORKSPACE (FREE PLAN)                            */}
              {/* ================================================================= */}
              {user.role === 'provider' && providerData && (
                <div className="space-y-6">
                  {activeTab === 'overview' && (
                    <div className="space-y-6">
                      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                        <div className="rounded-xl border border-slate-200 dark:border-slate-800 p-4">
                          <p className="text-xs text-slate-500">
                            {lang === 'ar' ? 'الباقة' : 'Subscription'}
                          </p>
                          <p className="mt-1 text-lg font-bold text-emerald-600">
                            {lang === 'ar' ? 'مجاني (Free)' : 'Free Partner'}
                          </p>
                        </div>
                        <div className="rounded-xl border border-slate-200 dark:border-slate-800 p-4">
                          <p className="text-xs text-slate-500">
                            {lang === 'ar' ? 'الخدمات المنشورة' : 'Services'}
                          </p>
                          <p className="mt-1 text-xl font-bold font-mono tabular-nums text-slate-900 dark:text-white">
                            {providerData.products.length}
                          </p>
                        </div>
                        <div className="rounded-xl border border-slate-200 dark:border-slate-800 p-4">
                          <p className="text-xs text-slate-500">
                            {lang === 'ar' ? 'بانتظار التأكيد' : 'Awaiting Approval'}
                          </p>
                          <p className="mt-1 text-xl font-bold font-mono tabular-nums text-amber-600">
                            {
                              providerData.bookings.filter(
                                (b) => b.status === 'Awaiting Provider Confirmation'
                              ).length
                            }
                          </p>
                        </div>
                        <div className="rounded-xl border border-slate-200 dark:border-slate-800 p-4">
                          <p className="text-xs text-slate-500">
                            {lang === 'ar' ? 'المستحقات (EUR)' : 'Ledger Payable (EUR)'}
                          </p>
                          <p className="mt-1 text-xl font-bold font-mono tabular-nums text-slate-900 dark:text-white">
                            €
                            {providerData.ledger
                              .reduce((sum, l) => sum + l.amountEur, 0)
                              .toFixed(2)}
                          </p>
                        </div>
                      </div>

                      <div className="rounded-xl border border-slate-200 dark:border-slate-800 p-5">
                        <h3 className="text-sm font-semibold text-slate-900 dark:text-white">
                          {providerData.organization.name} — {providerData.organization.city},{' '}
                          {providerData.organization.country}
                        </h3>
                        <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">
                          {providerData.organization.description[lang]}
                        </p>
                      </div>
                    </div>
                  )}

                  {activeTab === 'products' && (
                    <div className="space-y-6">
                      {/* Create New Service Form */}
                      <form
                        onSubmit={async (e) => {
                          e.preventDefault();
                          await api.createProviderProduct({ ...newProd, published: true });
                          setNewProd({ ...newProd, titleAr: '', titleEn: '', destinationEn: '' });
                          flash('Service created & published to marketplace');
                          await loadDashboard();
                          onDataMutated();
                        }}
                        className="rounded-xl border border-slate-200 dark:border-slate-800 p-5 space-y-4"
                      >
                        <h3 className="text-sm font-semibold text-slate-900 dark:text-white">
                          {lang === 'ar' ? 'إضافة خدمة سياحية جديدة' : 'Add & Publish Tourism Service'}
                        </h3>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                          <select
                            value={newProd.category}
                            onChange={(e) =>
                              setNewProd({ ...newProd, category: e.target.value as ServiceCategory })
                            }
                            className="rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-sm"
                          >
                            {(Object.keys(CATEGORIES) as ServiceCategory[]).map((c) => (
                              <option key={c} value={c}>
                                {CATEGORIES[c][lang]}
                              </option>
                            ))}
                          </select>
                          <select
                            value={newProd.productModel}
                            onChange={(e) =>
                              setNewProd({ ...newProd, productModel: e.target.value as ProductModel })
                            }
                            className="rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-sm"
                          >
                            {(Object.keys(PRODUCT_MODELS) as ProductModel[]).map((m) => (
                              <option key={m} value={m}>
                                {PRODUCT_MODELS[m][lang]}
                              </option>
                            ))}
                          </select>
                          <select
                            value={newProd.baseCurrency}
                            onChange={(e) =>
                              setNewProd({ ...newProd, baseCurrency: e.target.value as CurrencyCode })
                            }
                            className="rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-sm font-mono"
                          >
                            <option value="EUR">EUR</option>
                            <option value="USD">USD</option>
                            <option value="EGP">EGP</option>
                          </select>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <input
                            type="text"
                            required
                            value={newProd.titleAr}
                            onChange={(e) => setNewProd({ ...newProd, titleAr: e.target.value })}
                            placeholder={lang === 'ar' ? 'اسم الخدمة بالعربية' : 'Service Title (Arabic)'}
                            className="rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-sm"
                          />
                          <input
                            type="text"
                            required
                            value={newProd.titleEn}
                            onChange={(e) => setNewProd({ ...newProd, titleEn: e.target.value })}
                            placeholder="Service Title (English)"
                            className="rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-sm"
                          />
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                          <input
                            type="text"
                            value={newProd.destinationEn}
                            onChange={(e) =>
                              setNewProd({ ...newProd, destinationEn: e.target.value })
                            }
                            placeholder={lang === 'ar' ? 'الوجهة' : 'Destination'}
                            className="sm:col-span-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-sm"
                          />
                          <input
                            type="number"
                            required
                            min={1}
                            value={newProd.price}
                            onChange={(e) =>
                              setNewProd({ ...newProd, price: Number(e.target.value) })
                            }
                            placeholder="Price"
                            className="rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-sm font-mono"
                          />
                          <input
                            type="number"
                            required
                            min={1}
                            value={newProd.providerCost}
                            onChange={(e) =>
                              setNewProd({ ...newProd, providerCost: Number(e.target.value) })
                            }
                            placeholder="Net Cost"
                            className="rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-sm font-mono"
                          />
                        </div>

                        <div className="flex flex-wrap items-center justify-between gap-3">
                          <label className="inline-flex items-center gap-2 text-xs text-slate-600 dark:text-slate-300">
                            <input
                              type="checkbox"
                              checked={newProd.instantBooking}
                              onChange={(e) =>
                                setNewProd({ ...newProd, instantBooking: e.target.checked })
                              }
                            />
                            <span>{t.instantConfirm}</span>
                          </label>
                          <button
                            type="submit"
                            className="px-4 py-2 rounded-lg bg-[#F95738] text-white text-xs font-semibold cursor-pointer"
                          >
                            {lang === 'ar' ? 'نشر الخدمة في السوق' : 'Publish to Marketplace'}
                          </button>
                        </div>
                      </form>

                      {/* Provider Services Table */}
                      <div className="rounded-xl border border-slate-200 dark:border-slate-800 overflow-x-auto">
                        <table className="w-full text-sm">
                          <thead className="bg-slate-50 dark:bg-slate-900/50 text-xs text-slate-500 border-b border-slate-200 dark:border-slate-800">
                            <tr>
                              <th className="px-4 py-3 text-start font-medium">Service</th>
                              <th className="px-4 py-3 text-start font-medium">Category</th>
                              <th className="px-4 py-3 text-end font-medium">Price</th>
                              <th className="px-4 py-3 text-end font-medium">Net Cost</th>
                              <th className="px-4 py-3 text-end font-medium">Status</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                            {providerData.products.map((p) => (
                              <tr key={p.id}>
                                <td className="px-4 py-3 font-medium text-slate-900 dark:text-white">
                                  {p.title[lang]}
                                </td>
                                <td className="px-4 py-3 text-xs text-slate-500">
                                  {CATEGORIES[p.category][lang]} · {PRODUCT_MODELS[p.productModel][lang]}
                                </td>
                                <td className="px-4 py-3 text-end font-mono tabular-nums">
                                  {formatMoney(p.price, p.baseCurrency)}
                                </td>
                                <td className="px-4 py-3 text-end font-mono tabular-nums text-slate-500">
                                  {formatMoney(p.providerCost, p.baseCurrency)}
                                </td>
                                <td className="px-4 py-3 text-end">
                                  <button
                                    type="button"
                                    onClick={async () => {
                                      await api.updateProviderProduct(p.id, {
                                        published: !p.published,
                                      });
                                      await loadDashboard();
                                      onDataMutated();
                                    }}
                                    className={`text-xs font-medium cursor-pointer ${
                                      p.published ? 'text-emerald-600' : 'text-slate-400'
                                    }`}
                                  >
                                    {p.published ? 'Published' : 'Unpublished'}
                                  </button>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}

                  {activeTab === 'bookings' && (
                    <div className="rounded-xl border border-slate-200 dark:border-slate-800 overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead className="bg-slate-50 dark:bg-slate-900/50 text-xs text-slate-500 border-b border-slate-200 dark:border-slate-800">
                          <tr>
                            <th className="px-4 py-3 text-start font-medium">Ref</th>
                            <th className="px-4 py-3 text-start font-medium">Customer & Service</th>
                            <th className="px-4 py-3 text-end font-medium">Gross</th>
                            <th className="px-4 py-3 text-start font-medium">Status</th>
                            <th className="px-4 py-3 text-end font-medium">Provider Actions</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                          {providerData.bookings.map((b) => (
                            <tr key={b.id}>
                              <td className="px-4 py-3 font-mono text-xs">{b.referenceCode}</td>
                              <td className="px-4 py-3">
                                <div className="font-medium text-slate-900 dark:text-white">
                                  {b.productTitle[lang]}
                                </div>
                                <div className="text-xs text-slate-500">
                                  {b.customerName} · {b.checkInDate} · {b.travelersCount} pax
                                  {b.affiliateCode ? ` · Affiliate: ${b.affiliateCode}` : ''}
                                </div>
                              </td>
                              <td className="px-4 py-3 text-end font-mono tabular-nums font-semibold">
                                {formatMoney(b.totalOriginal, b.originalCurrency)}
                              </td>
                              <td className="px-4 py-3 text-xs font-medium">
                                {BOOKING_STATUS_LABELS[b.status][lang]}
                              </td>
                              <td className="px-4 py-3 text-end space-x-2">
                                {b.status === 'Awaiting Provider Confirmation' && (
                                  <>
                                    <button
                                      type="button"
                                      onClick={async () => {
                                        await api.updateBookingStatus(
                                          b.id,
                                          'Confirmed',
                                          'Confirmed by provider operations'
                                        );
                                        flash('Booking confirmed and commissions recorded in ledger');
                                        loadDashboard();
                                      }}
                                      className="px-2.5 py-1 rounded bg-emerald-600 text-white text-xs font-medium cursor-pointer"
                                    >
                                      {lang === 'ar' ? 'تأكيد' : 'Confirm'}
                                    </button>
                                    <button
                                      type="button"
                                      onClick={async () => {
                                        await api.updateBookingStatus(
                                          b.id,
                                          'Rejected',
                                          'Unavailable on requested date'
                                        );
                                        loadDashboard();
                                      }}
                                      className="px-2.5 py-1 rounded border border-red-200 text-red-600 text-xs cursor-pointer"
                                    >
                                      {lang === 'ar' ? 'رفض' : 'Reject'}
                                    </button>
                                  </>
                                )}
                                {b.status === 'Confirmed' && (
                                  <button
                                    type="button"
                                    onClick={async () => {
                                      await api.updateBookingStatus(b.id, 'Completed');
                                      loadDashboard();
                                    }}
                                    className="px-2.5 py-1 rounded border border-slate-200 text-xs cursor-pointer"
                                  >
                                    {lang === 'ar' ? 'مكتمل' : 'Complete'}
                                  </button>
                                )}
                                {b.status === 'Refund Pending' && (
                                  <button
                                    type="button"
                                    onClick={async () => {
                                      await api.updateBookingStatus(b.id, 'Refunded');
                                      flash('Refund recorded in ledger');
                                      loadDashboard();
                                    }}
                                    className="px-2.5 py-1 rounded bg-slate-900 text-white text-xs cursor-pointer"
                                  >
                                    {lang === 'ar' ? 'إتمام الاسترداد' : 'Issue Refund'}
                                  </button>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}

                  {activeTab === 'requests' && (
                    <div className="space-y-4">
                      {providerData.openRequests.map((req) => (
                        <div
                          key={req.id}
                          className="rounded-xl border border-slate-200 dark:border-slate-800 p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                        >
                          <div>
                            <h4 className="font-semibold text-slate-900 dark:text-white">
                              {req.destination}
                            </h4>
                            <p className="text-xs text-slate-500 mt-0.5">
                              {req.customerName} · {req.travelDate} · {req.travelersCount} pax ·
                              Budget: {formatMoney(req.budget, req.currency)}
                            </p>
                            <p className="text-xs text-slate-600 dark:text-slate-300 mt-1">
                              {req.notes}
                            </p>
                          </div>
                          <button
                            type="button"
                            onClick={() =>
                              setQuoteDraft({
                                requestId: req.id,
                                quotedPrice: req.budget,
                                validUntil: '2026-12-05',
                                summary: `Tailored package for ${req.destination}`,
                              })
                            }
                            className="px-4 py-2 rounded-lg bg-[#0052CC] text-white text-xs font-semibold shrink-0 cursor-pointer"
                          >
                            {lang === 'ar' ? 'إرسال عرض سعر' : 'Send Quotation'}
                          </button>
                        </div>
                      ))}

                      {quoteDraft && (
                        <form
                          onSubmit={async (e) => {
                            e.preventDefault();
                            await api.createQuotation(quoteDraft.requestId, quoteDraft);
                            setQuoteDraft(null);
                            flash('Quotation sent to traveler');
                            loadDashboard();
                          }}
                          className="rounded-xl border border-blue-200 dark:border-blue-900 bg-blue-50/40 dark:bg-blue-950/20 p-5 space-y-3"
                        >
                          <h4 className="text-sm font-semibold">Create Quotation</h4>
                          <div className="grid grid-cols-2 gap-3">
                            <input
                              type="number"
                              required
                              value={quoteDraft.quotedPrice}
                              onChange={(e) =>
                                setQuoteDraft({
                                  ...quoteDraft,
                                  quotedPrice: Number(e.target.value),
                                })
                              }
                              className="rounded-lg border border-slate-200 bg-white dark:bg-slate-900 px-3 py-2 text-sm font-mono"
                            />
                            <input
                              type="date"
                              required
                              value={quoteDraft.validUntil}
                              onChange={(e) =>
                                setQuoteDraft({ ...quoteDraft, validUntil: e.target.value })
                              }
                              className="rounded-lg border border-slate-200 bg-white dark:bg-slate-900 px-3 py-2 text-sm font-mono"
                            />
                          </div>
                          <textarea
                            rows={2}
                            required
                            value={quoteDraft.summary}
                            onChange={(e) =>
                              setQuoteDraft({ ...quoteDraft, summary: e.target.value })
                            }
                            className="w-full rounded-lg border border-slate-200 bg-white dark:bg-slate-900 px-3 py-2 text-sm"
                          />
                          <div className="flex gap-2">
                            <button
                              type="submit"
                              className="px-4 py-2 rounded-lg bg-[#0052CC] text-white text-xs font-semibold cursor-pointer"
                            >
                              Submit Quotation
                            </button>
                            <button
                              type="button"
                              onClick={() => setQuoteDraft(null)}
                              className="px-4 py-2 rounded-lg border border-slate-200 text-xs cursor-pointer"
                            >
                              Cancel
                            </button>
                          </div>
                        </form>
                      )}
                    </div>
                  )}

                  {activeTab === 'staff' && (
                    <div className="space-y-4">
                      <form
                        onSubmit={async (e) => {
                          e.preventDefault();
                          await api.addProviderStaff(newStaff);
                          setNewStaff({ name: '', email: '', memberRole: 'agent' });
                          flash('Staff member added');
                          loadDashboard();
                        }}
                        className="rounded-xl border border-slate-200 dark:border-slate-800 p-4 flex flex-wrap gap-3"
                      >
                        <input
                          type="text"
                          required
                          value={newStaff.name}
                          onChange={(e) => setNewStaff({ ...newStaff, name: e.target.value })}
                          placeholder="Staff Name"
                          className="flex-1 min-w-[160px] rounded-lg border border-slate-200 dark:border-slate-700 px-3 py-2 text-sm"
                        />
                        <input
                          type="email"
                          required
                          value={newStaff.email}
                          onChange={(e) => setNewStaff({ ...newStaff, email: e.target.value })}
                          placeholder="staff@company.com"
                          className="flex-1 min-w-[180px] rounded-lg border border-slate-200 dark:border-slate-700 px-3 py-2 text-sm"
                        />
                        <select
                          value={newStaff.memberRole}
                          onChange={(e) =>
                            setNewStaff({
                              ...newStaff,
                              memberRole: e.target.value as 'manager' | 'agent',
                            })
                          }
                          className="rounded-lg border border-slate-200 dark:border-slate-700 px-3 py-2 text-sm"
                        >
                          <option value="manager">Manager</option>
                          <option value="agent">Agent</option>
                        </select>
                        <button
                          type="submit"
                          className="px-4 py-2 rounded-lg bg-slate-900 text-white text-xs font-semibold cursor-pointer"
                        >
                          Add Member
                        </button>
                      </form>

                      <div className="rounded-xl border border-slate-200 dark:border-slate-800 overflow-x-auto">
                        <table className="w-full text-sm">
                          <thead className="bg-slate-50 dark:bg-slate-900/50 text-xs text-slate-500 border-b border-slate-200 dark:border-slate-800">
                            <tr>
                              <th className="px-4 py-3 text-start">Name</th>
                              <th className="px-4 py-3 text-start">Email</th>
                              <th className="px-4 py-3 text-start">Role</th>
                              <th className="px-4 py-3 text-start">Permissions</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                            {providerData.staff.map((m) => (
                              <tr key={m.id}>
                                <td className="px-4 py-3 font-medium">{m.name}</td>
                                <td className="px-4 py-3 font-mono text-xs">{m.email}</td>
                                <td className="px-4 py-3 text-xs capitalize">{m.memberRole}</td>
                                <td className="px-4 py-3 text-xs font-mono text-slate-500">
                                  {m.permissions.join(', ')}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}

                  {activeTab === 'finance' && (
                    <div className="rounded-xl border border-slate-200 dark:border-slate-800 overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead className="bg-slate-50 dark:bg-slate-900/50 text-xs text-slate-500 border-b border-slate-200 dark:border-slate-800">
                          <tr>
                            <th className="px-4 py-3 text-start">Entry</th>
                            <th className="px-4 py-3 text-start">Description</th>
                            <th className="px-4 py-3 text-end">Amount (EUR)</th>
                            <th className="px-4 py-3 text-end">Original Snapshot</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                          {providerData.ledger.map((l) => (
                            <tr key={l.id}>
                              <td className="px-4 py-3 font-mono text-xs">{l.entryType}</td>
                              <td className="px-4 py-3 text-xs">{l.description}</td>
                              <td className="px-4 py-3 text-end font-mono tabular-nums font-semibold">
                                €{l.amountEur.toFixed(2)}
                              </td>
                              <td className="px-4 py-3 text-end font-mono text-xs text-slate-500">
                                {formatMoney(l.originalAmount, l.originalCurrency)} (@{l.exchangeRate})
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}

              {/* ================================================================= */}
              {/* SELLER / AFFILIATE WORKSPACE                                      */}
              {/* ================================================================= */}
              {user.role === 'seller' && sellerData && (
                <div className="space-y-6">
                  {activeTab === 'overview' && (
                    <div className="space-y-6">
                      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                        <div className="rounded-xl border border-slate-200 dark:border-slate-800 p-4">
                          <p className="text-xs text-slate-500">Referral / Coupon</p>
                          <p className="mt-1 text-base font-bold font-mono text-blue-600">
                            {sellerData.seller.referralCode} · {sellerData.seller.couponCode}
                          </p>
                        </div>
                        <div className="rounded-xl border border-slate-200 dark:border-slate-800 p-4">
                          <p className="text-xs text-slate-500">
                            {lang === 'ar' ? 'الزيارات والتحويلات' : 'Clicks / Conversions'}
                          </p>
                          <p className="mt-1 text-xl font-bold font-mono tabular-nums">
                            {sellerData.seller.totalClicks} / {sellerData.seller.totalConversions}
                          </p>
                        </div>
                        <div className="rounded-xl border border-slate-200 dark:border-slate-800 p-4">
                          <p className="text-xs text-slate-500">
                            {lang === 'ar' ? 'رصيد معلق (EUR)' : 'Pending Balance'}
                          </p>
                          <p className="mt-1 text-xl font-bold font-mono tabular-nums text-[#F95738]">
                            €{sellerData.seller.pendingBalanceEur.toFixed(2)}
                          </p>
                        </div>
                        <div className="rounded-xl border border-slate-200 dark:border-slate-800 p-4">
                          <p className="text-xs text-slate-500">
                            {lang === 'ar' ? 'مدفوعات مسواة' : 'Settled Paid'}
                          </p>
                          <p className="mt-1 text-xl font-bold font-mono tabular-nums text-emerald-600">
                            €{sellerData.seller.settledBalanceEur.toFixed(2)}
                          </p>
                        </div>
                      </div>

                      <div className="rounded-xl border border-slate-200 dark:border-slate-800 overflow-x-auto">
                        <div className="px-5 py-3.5 border-b border-slate-200 dark:border-slate-800 text-sm font-semibold">
                          {lang === 'ar' ? 'روابط التسويق النشطة' : 'Active Affiliate Links'}
                        </div>
                        <table className="w-full text-sm">
                          <thead className="bg-slate-50 dark:bg-slate-900/50 text-xs text-slate-500 border-b border-slate-200 dark:border-slate-800">
                            <tr>
                              <th className="px-4 py-3 text-start">Service</th>
                              <th className="px-4 py-3 text-end">Clicks</th>
                              <th className="px-4 py-3 text-end">Conversions</th>
                              <th className="px-4 py-3 text-end">Earned</th>
                              <th className="px-4 py-3 text-end">Actions</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                            {sellerData.links.map((l) => (
                              <tr key={l.id}>
                                <td className="px-4 py-3">
                                  <div className="font-medium">
                                    {l.productTitle ? l.productTitle[lang] : l.productId}
                                  </div>
                                  <div className="text-xs font-mono text-slate-500">{l.url}</div>
                                </td>
                                <td className="px-4 py-3 text-end font-mono tabular-nums">
                                  {l.clicks}
                                </td>
                                <td className="px-4 py-3 text-end font-mono tabular-nums">
                                  {l.conversions}
                                </td>
                                <td className="px-4 py-3 text-end font-mono tabular-nums font-semibold">
                                  €{l.earnedEur.toFixed(2)}
                                </td>
                                <td className="px-4 py-3 text-end space-x-2">
                                  <button
                                    type="button"
                                    onClick={() => {
                                      navigator.clipboard?.writeText(
                                        `${window.location.origin}${l.url}`
                                      );
                                      setCopiedId(l.id);
                                      setTimeout(() => setCopiedId(null), 2000);
                                    }}
                                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded border border-slate-200 text-xs cursor-pointer"
                                  >
                                    {copiedId === l.id ? (
                                      <Check className="w-3 h-3 text-emerald-600" />
                                    ) : (
                                      <Copy className="w-3 h-3" />
                                    )}
                                    <span>Copy</span>
                                  </button>
                                  <button
                                    type="button"
                                    onClick={async () => {
                                      await api.trackReferral(l.code, l.productId);
                                      setStoredReferral(l.code);
                                      const prod = sellerData.availableProducts.find(
                                        (p) => p.id === l.productId
                                      );
                                      if (prod) onSelectProductForBooking(prod, l.code);
                                    }}
                                    className="px-2.5 py-1 rounded bg-[#0052CC] text-white text-xs font-medium cursor-pointer"
                                  >
                                    {lang === 'ar' ? 'فتح وحجز بالرابط' : 'Test & Book'}
                                  </button>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}

                  {activeTab === 'catalog' && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {sellerData.availableProducts.map((p) => {
                        const existingLink = sellerData.links.find((l) => l.productId === p.id);
                        return (
                          <div
                            key={p.id}
                            className="rounded-xl border border-slate-200 dark:border-slate-800 p-4 flex flex-col justify-between gap-3"
                          >
                            <div>
                              <p className="text-xs text-slate-500">
                                {CATEGORIES[p.category][lang]} · {p.providerName}
                              </p>
                              <h4 className="font-semibold text-slate-900 dark:text-white mt-1">
                                {p.title[lang]}
                              </h4>
                              <p className="text-xs font-mono mt-1">
                                {formatMoney(p.price, p.baseCurrency)}
                              </p>
                            </div>
                            <div className="flex items-center justify-between pt-3 border-t border-slate-100 dark:border-slate-800">
                              <span className="text-xs text-slate-500">
                                {existingLink
                                  ? `${existingLink.clicks} clicks · ${existingLink.conversions} conv.`
                                  : lang === 'ar'
                                  ? 'متاح للتسويق'
                                  : 'Ready to promote'}
                              </span>
                              <button
                                type="button"
                                onClick={async () => {
                                  await api.createAffiliateLink(p.id);
                                  flash('Affiliate tracking link generated');
                                  loadDashboard();
                                }}
                                className="px-3 py-1.5 rounded-lg bg-slate-900 text-white text-xs font-medium cursor-pointer"
                              >
                                {existingLink
                                  ? lang === 'ar'
                                    ? 'الرابط جاهز'
                                    : 'Link Ready'
                                  : lang === 'ar'
                                  ? 'إنشاء رابط تسويق'
                                  : 'Generate Link'}
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {activeTab === 'commissions' && (
                    <div className="rounded-xl border border-slate-200 dark:border-slate-800 overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead className="bg-slate-50 dark:bg-slate-900/50 text-xs text-slate-500 border-b border-slate-200 dark:border-slate-800">
                          <tr>
                            <th className="px-4 py-3 text-start">Booking Ref</th>
                            <th className="px-4 py-3 text-start">Service</th>
                            <th className="px-4 py-3 text-start">Status</th>
                            <th className="px-4 py-3 text-end">Seller Commission (EUR)</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                          {sellerData.bookings.map((b) => (
                            <tr key={b.id}>
                              <td className="px-4 py-3 font-mono text-xs">{b.referenceCode}</td>
                              <td className="px-4 py-3 text-xs">{b.productTitle[lang]}</td>
                              <td className="px-4 py-3 text-xs">
                                {BOOKING_STATUS_LABELS[b.status][lang]}
                              </td>
                              <td className="px-4 py-3 text-end font-mono tabular-nums font-semibold text-emerald-600">
                                €{b.commissionSnapshot.sellerCommissionEur.toFixed(2)}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}

              {/* ================================================================= */}
              {/* SUPER ADMIN WORKSPACE                                             */}
              {/* ================================================================= */}
              {user.role === 'admin' && adminData && (
                <div className="space-y-6">
                  {activeTab === 'overview' && (
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                      <div className="rounded-xl border border-slate-200 dark:border-slate-800 p-4">
                        <p className="text-xs text-slate-500">Organizations (Free)</p>
                        <p className="mt-1 text-xl font-bold font-mono tabular-nums">
                          {adminData.organizations.length}
                        </p>
                      </div>
                      <div className="rounded-xl border border-slate-200 dark:border-slate-800 p-4">
                        <p className="text-xs text-slate-500">Affiliate Sellers</p>
                        <p className="mt-1 text-xl font-bold font-mono tabular-nums">
                          {adminData.sellers.length}
                        </p>
                      </div>
                      <div className="rounded-xl border border-slate-200 dark:border-slate-800 p-4">
                        <p className="text-xs text-slate-500">Total Bookings</p>
                        <p className="mt-1 text-xl font-bold font-mono tabular-nums">
                          {adminData.bookings.length}
                        </p>
                      </div>
                      <div className="rounded-xl border border-slate-200 dark:border-slate-800 p-4">
                        <p className="text-xs text-slate-500">Platform Fees (EUR)</p>
                        <p className="mt-1 text-xl font-bold font-mono tabular-nums text-emerald-600">
                          €
                          {adminData.ledgerEntries
                            .filter((l) => l.entryType === 'platform_fee')
                            .reduce((s, l) => s + l.amountEur, 0)
                            .toFixed(2)}
                        </p>
                      </div>
                    </div>
                  )}

                  {activeTab === 'partners' && (
                    <div className="space-y-6">
                      <div className="rounded-xl border border-slate-200 dark:border-slate-800 overflow-x-auto">
                        <div className="px-4 py-3 border-b border-slate-200 dark:border-slate-800 text-sm font-semibold">
                          Tourism Companies (Free Subscription)
                        </div>
                        <table className="w-full text-sm">
                          <thead className="bg-slate-50 dark:bg-slate-900/50 text-xs text-slate-500 border-b border-slate-200 dark:border-slate-800">
                            <tr>
                              <th className="px-4 py-3 text-start">Company</th>
                              <th className="px-4 py-3 text-start">Location</th>
                              <th className="px-4 py-3 text-start">Plan</th>
                              <th className="px-4 py-3 text-end">Verification</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                            {adminData.organizations.map((org) => (
                              <tr key={org.id}>
                                <td className="px-4 py-3 font-medium">{org.name}</td>
                                <td className="px-4 py-3 text-xs text-slate-500">
                                  {org.city}, {org.country}
                                </td>
                                <td className="px-4 py-3 font-mono text-xs uppercase">
                                  {org.subscriptionPlan}
                                </td>
                                <td className="px-4 py-3 text-end">
                                  <button
                                    type="button"
                                    onClick={async () => {
                                      await api.toggleOrganizationVerify(org.id);
                                      loadDashboard();
                                    }}
                                    className={`text-xs font-medium cursor-pointer ${
                                      org.verified ? 'text-emerald-600' : 'text-amber-600'
                                    }`}
                                  >
                                    {org.verified ? 'Verified (Toggle)' : 'Pending (Verify)'}
                                  </button>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>

                      <div className="rounded-xl border border-slate-200 dark:border-slate-800 overflow-x-auto">
                        <div className="px-4 py-3 border-b border-slate-200 dark:border-slate-800 text-sm font-semibold">
                          Sellers & Affiliates (Open Registration)
                        </div>
                        <table className="w-full text-sm">
                          <thead className="bg-slate-50 dark:bg-slate-900/50 text-xs text-slate-500 border-b border-slate-200 dark:border-slate-800">
                            <tr>
                              <th className="px-4 py-3 text-start">Seller</th>
                              <th className="px-4 py-3 text-start">Code</th>
                              <th className="px-4 py-3 text-end">Clicks / Conv.</th>
                              <th className="px-4 py-3 text-end">Pending EUR</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                            {adminData.sellers.map((s) => (
                              <tr key={s.id}>
                                <td className="px-4 py-3 font-medium">{s.displayName}</td>
                                <td className="px-4 py-3 font-mono text-xs">{s.referralCode}</td>
                                <td className="px-4 py-3 text-end font-mono tabular-nums">
                                  {s.totalClicks} / {s.totalConversions}
                                </td>
                                <td className="px-4 py-3 text-end font-mono tabular-nums">
                                  €{s.pendingBalanceEur.toFixed(2)}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}

                  {activeTab === 'bookings' && (
                    <div className="rounded-xl border border-slate-200 dark:border-slate-800 overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead className="bg-slate-50 dark:bg-slate-900/50 text-xs text-slate-500 border-b border-slate-200 dark:border-slate-800">
                          <tr>
                            <th className="px-4 py-3 text-start">Ref</th>
                            <th className="px-4 py-3 text-start">Service / Provider</th>
                            <th className="px-4 py-3 text-end">Gross (EUR)</th>
                            <th className="px-4 py-3 text-end">Platform Fee</th>
                            <th className="px-4 py-3 text-end">Seller Comm.</th>
                            <th className="px-4 py-3 text-start">Status</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                          {adminData.bookings.map((b) => (
                            <tr key={b.id}>
                              <td className="px-4 py-3 font-mono text-xs">{b.referenceCode}</td>
                              <td className="px-4 py-3">
                                <div className="font-medium">{b.productTitle[lang]}</div>
                                <div className="text-xs text-slate-500">
                                  {b.providerName} · {b.customerName}
                                </div>
                              </td>
                              <td className="px-4 py-3 text-end font-mono tabular-nums">
                                €{b.totalEur.toFixed(2)}
                              </td>
                              <td className="px-4 py-3 text-end font-mono tabular-nums text-blue-600">
                                €{b.commissionSnapshot.platformFeeEur.toFixed(2)}
                              </td>
                              <td className="px-4 py-3 text-end font-mono tabular-nums text-emerald-600">
                                €{b.commissionSnapshot.sellerCommissionEur.toFixed(2)}
                              </td>
                              <td className="px-4 py-3 text-xs">
                                {BOOKING_STATUS_LABELS[b.status][lang]}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}

                  {activeTab === 'rules' && (
                    <div className="space-y-5">
                      <form
                        onSubmit={async (e) => {
                          e.preventDefault();
                          await api.createCommissionRule(newRule);
                          setNewRule({ ...newRule, name: '' });
                          flash('Commission rule added');
                          loadDashboard();
                        }}
                        className="rounded-xl border border-slate-200 dark:border-slate-800 p-4 grid grid-cols-1 sm:grid-cols-6 gap-3"
                      >
                        <input
                          type="text"
                          required
                          value={newRule.name}
                          onChange={(e) => setNewRule({ ...newRule, name: e.target.value })}
                          placeholder="Rule Name"
                          className="sm:col-span-2 rounded-lg border border-slate-200 dark:border-slate-700 px-3 py-2 text-sm"
                        />
                        <select
                          value={newRule.category}
                          onChange={(e) =>
                            setNewRule({ ...newRule, category: e.target.value as ServiceCategory })
                          }
                          className="rounded-lg border border-slate-200 dark:border-slate-700 px-3 py-2 text-sm"
                        >
                          {(Object.keys(CATEGORIES) as ServiceCategory[]).map((c) => (
                            <option key={c} value={c}>
                              {CATEGORIES[c][lang]}
                            </option>
                          ))}
                        </select>
                        <input
                          type="number"
                          step="0.5"
                          value={newRule.platformPercent}
                          onChange={(e) =>
                            setNewRule({ ...newRule, platformPercent: Number(e.target.value) })
                          }
                          placeholder="Platform %"
                          className="rounded-lg border border-slate-200 dark:border-slate-700 px-3 py-2 text-sm font-mono"
                        />
                        <input
                          type="number"
                          step="0.5"
                          value={newRule.sellerPercent}
                          onChange={(e) =>
                            setNewRule({ ...newRule, sellerPercent: Number(e.target.value) })
                          }
                          placeholder="Seller %"
                          className="rounded-lg border border-slate-200 dark:border-slate-700 px-3 py-2 text-sm font-mono"
                        />
                        <button
                          type="submit"
                          className="px-4 py-2 rounded-lg bg-[#0052CC] text-white text-xs font-semibold cursor-pointer"
                        >
                          Add Rule
                        </button>
                      </form>

                      <div className="rounded-xl border border-slate-200 dark:border-slate-800 overflow-x-auto">
                        <table className="w-full text-sm">
                          <thead className="bg-slate-50 dark:bg-slate-900/50 text-xs text-slate-500 border-b border-slate-200 dark:border-slate-800">
                            <tr>
                              <th className="px-4 py-3 text-start">Rule</th>
                              <th className="px-4 py-3 text-start">Scope</th>
                              <th className="px-4 py-3 text-end">Platform %</th>
                              <th className="px-4 py-3 text-end">Seller %</th>
                              <th className="px-4 py-3 text-end">Fixed Fee</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                            {adminData.commissionRules.map((r) => (
                              <tr key={r.id}>
                                <td className="px-4 py-3 font-medium">{r.name}</td>
                                <td className="px-4 py-3 text-xs font-mono">
                                  {r.scope} {r.category ? `(${r.category})` : ''}
                                </td>
                                <td className="px-4 py-3 text-end font-mono tabular-nums">
                                  {r.platformPercent}%
                                </td>
                                <td className="px-4 py-3 text-end font-mono tabular-nums">
                                  {r.sellerPercent}%
                                </td>
                                <td className="px-4 py-3 text-end font-mono tabular-nums">
                                  €{r.fixedFeeEur}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}

                  {activeTab === 'ledger' && (
                    <div className="space-y-6">
                      <div className="rounded-xl border border-slate-200 dark:border-slate-800 overflow-x-auto">
                        <div className="px-4 py-3 border-b border-slate-200 dark:border-slate-800 text-sm font-semibold">
                          Payout Settlements
                        </div>
                        <table className="w-full text-sm">
                          <thead className="bg-slate-50 dark:bg-slate-900/50 text-xs text-slate-500 border-b border-slate-200 dark:border-slate-800">
                            <tr>
                              <th className="px-4 py-3 text-start">Recipient</th>
                              <th className="px-4 py-3 text-start">Type</th>
                              <th className="px-4 py-3 text-end">Amount (EUR)</th>
                              <th className="px-4 py-3 text-start">Status</th>
                              <th className="px-4 py-3 text-end">Action</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                            {adminData.payouts.map((p) => (
                              <tr key={p.id}>
                                <td className="px-4 py-3 font-medium">{p.recipientName}</td>
                                <td className="px-4 py-3 text-xs capitalize">{p.recipientType}</td>
                                <td className="px-4 py-3 text-end font-mono tabular-nums font-semibold">
                                  €{p.amountEur.toFixed(2)}
                                </td>
                                <td className="px-4 py-3 text-xs">{p.status}</td>
                                <td className="px-4 py-3 text-end">
                                  {p.status === 'Pending' && (
                                    <button
                                      type="button"
                                      onClick={async () => {
                                        await api.settlePayout(p.id);
                                        flash('Payout settled and immutable ledger entry recorded');
                                        loadDashboard();
                                      }}
                                      className="px-3 py-1 rounded bg-emerald-600 text-white text-xs font-medium cursor-pointer"
                                    >
                                      Settle Payout
                                    </button>
                                  )}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>

                      <div className="rounded-xl border border-slate-200 dark:border-slate-800 overflow-x-auto">
                        <div className="px-4 py-3 border-b border-slate-200 dark:border-slate-800 text-sm font-semibold">
                          Immutable Financial Ledger
                        </div>
                        <table className="w-full text-sm">
                          <thead className="bg-slate-50 dark:bg-slate-900/50 text-xs text-slate-500 border-b border-slate-200 dark:border-slate-800">
                            <tr>
                              <th className="px-4 py-3 text-start">Account</th>
                              <th className="px-4 py-3 text-start">Type</th>
                              <th className="px-4 py-3 text-start">Description</th>
                              <th className="px-4 py-3 text-end">EUR</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                            {adminData.ledgerEntries.map((l) => (
                              <tr key={l.id}>
                                <td className="px-4 py-3 text-xs font-medium">{l.entityName}</td>
                                <td className="px-4 py-3 font-mono text-xs">{l.entryType}</td>
                                <td className="px-4 py-3 text-xs text-slate-600 dark:text-slate-400">
                                  {l.description}
                                </td>
                                <td className="px-4 py-3 text-end font-mono tabular-nums font-semibold">
                                  €{l.amountEur.toFixed(2)}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}

                  {activeTab === 'audit' && (
                    <div className="space-y-6">
                      <div className="rounded-xl border border-slate-200 dark:border-slate-800 overflow-x-auto">
                        <div className="px-4 py-3 border-b border-slate-200 dark:border-slate-800 text-sm font-semibold">
                          Support Tickets & Disputes
                        </div>
                        <table className="w-full text-sm">
                          <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                            {adminData.supportTickets.map((tkt) => (
                              <tr key={tkt.id}>
                                <td className="px-4 py-3">
                                  <div className="font-medium">{tkt.subject}</div>
                                  <div className="text-xs text-slate-500">
                                    {tkt.userName} · {tkt.message}
                                  </div>
                                </td>
                                <td className="px-4 py-3 text-end">
                                  <button
                                    type="button"
                                    onClick={async () => {
                                      await api.updateTicketStatus(
                                        tkt.id,
                                        tkt.status === 'Resolved' ? 'Open' : 'Resolved'
                                      );
                                      loadDashboard();
                                    }}
                                    className="text-xs font-medium text-blue-600 cursor-pointer"
                                  >
                                    {tkt.status} (Toggle)
                                  </button>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>

                      <div className="rounded-xl border border-slate-200 dark:border-slate-800 overflow-x-auto">
                        <div className="px-4 py-3 border-b border-slate-200 dark:border-slate-800 text-sm font-semibold">
                          System Audit Logs
                        </div>
                        <table className="w-full text-sm">
                          <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                            {adminData.auditLogs.slice(0, 20).map((a) => (
                              <tr key={a.id}>
                                <td className="px-4 py-2.5 font-mono text-xs text-slate-600 dark:text-slate-300">
                                  {a.action}
                                </td>
                                <td className="px-4 py-2.5 text-xs">
                                  {a.actorName} ({a.actorRole})
                                </td>
                                <td className="px-4 py-2.5 text-xs text-slate-500">{a.details}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
