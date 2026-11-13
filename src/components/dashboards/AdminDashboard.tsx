import { useState } from 'react';
import {
  BarChart2,
  BookOpen,
  Building2,
  Package,
  Percent,
  Settings,
  ShieldCheck,
  Tag,
  Users,
  Wallet,
} from 'lucide-react';
import { useMarketplace } from '../../context/MarketplaceContext.tsx';
import type { Payout, SellerProfile, ServiceCategory, User } from '../../shared/types.ts';
import { CATEGORIES } from '../../shared/i18n.ts';
import { BookingStatusBadge } from '../StatusBadge.tsx';
import { ConfirmDialog } from '../ConfirmDialog.tsx';

export function AdminDashboard({ initialTab = 'overview' }: { initialTab?: string }) {
  const {
    lang,
    users,
    organizations,
    sellers,
    products,
    bookings,
    commissionRules,
    ledgerEntries,
    payouts,
    tickets,
    platformSettings,
    toggleUserStatus,
    toggleOrganizationVerify,
    toggleSellerStatus,
    toggleProductPublish,
    updateBookingStatus,
    addCommissionRule,
    settlePayout,
    updateTicketStatus,
    updatePlatformSettings,
    showToast,
  } = useMarketplace();
  const [tab, setTab] = useState(initialTab);
  const [newRule, setNewRule] = useState({
    name: '',
    scope: 'category' as 'global' | 'category' | 'organization',
    category: 'hotels' as ServiceCategory,
    platformPercent: 5,
    sellerPercent: 10,
    fixedFeeEur: 0,
  });
  const [ruleError, setRuleError] = useState('');
  const [settingsError, setSettingsError] = useState('');

  const [confirmSuspendUser, setConfirmSuspendUser] = useState<User | null>(null);
  const [confirmPauseSeller, setConfirmPauseSeller] = useState<SellerProfile | null>(null);
  const [confirmSettlePayout, setConfirmSettlePayout] = useState<Payout | null>(null);

  const gmvEur = bookings.reduce((s, b) => s + b.totalEur, 0);
  const platformRevEur = bookings.reduce((s, b) => s + b.commissionSnapshot.platformFeeEur, 0);

  const tabs = [
    { id: 'overview', label: lang === 'ar' ? 'نظرة عامة' : 'Platform Overview', icon: ShieldCheck },
    { id: 'users', label: lang === 'ar' ? 'المستخدمون' : 'Users', icon: Users },
    { id: 'companies', label: lang === 'ar' ? 'الشركات' : 'Companies', icon: Building2 },
    { id: 'sellers', label: lang === 'ar' ? 'البائعون' : 'Sellers', icon: Tag },
    { id: 'products', label: lang === 'ar' ? 'الخدمات والتصنيفات' : 'Products & Categories', icon: Package },
    { id: 'bookings', label: lang === 'ar' ? 'الحجوزات' : 'Bookings', icon: BookOpen },
    { id: 'commissions', label: lang === 'ar' ? 'العمولات' : 'Commissions', icon: Percent },
    { id: 'finance', label: lang === 'ar' ? 'المالية والدفتر' : 'Financial Overview', icon: Wallet },
    { id: 'reports', label: lang === 'ar' ? 'التقارير' : 'Reports', icon: BarChart2 },
    { id: 'settings', label: lang === 'ar' ? 'إعدادات المنصة' : 'Platform Settings', icon: Settings },
  ];

  function handleUserToggle(u: User) {
    if (u.status !== 'suspended') {
      setConfirmSuspendUser(u);
      return;
    }
    toggleUserStatus(u.id);
    showToast(`${u.name} re-activated`, 'success');
  }

  function handleSellerToggle(s: SellerProfile) {
    if (s.status !== 'paused') {
      setConfirmPauseSeller(s);
      return;
    }
    toggleSellerStatus(s.id);
    showToast(`${s.displayName} re-activated`, 'success');
  }

  return (
    <div className="space-y-6">
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
              <p className="text-xs text-slate-500">Gross Marketplace Volume</p>
              <p className="mt-1 text-xl font-bold font-mono tabular-nums">€{gmvEur.toFixed(2)}</p>
            </div>
            <div className="rounded-xl border border-slate-200 dark:border-slate-800 p-4">
              <p className="text-xs text-slate-500">Platform Fees</p>
              <p className="mt-1 text-xl font-bold font-mono tabular-nums text-emerald-600">
                €{platformRevEur.toFixed(2)}
              </p>
            </div>
            <div className="rounded-xl border border-slate-200 dark:border-slate-800 p-4">
              <p className="text-xs text-slate-500">Companies (Free Plan)</p>
              <p className="mt-1 text-xl font-bold font-mono tabular-nums">{organizations.length}</p>
            </div>
            <div className="rounded-xl border border-slate-200 dark:border-slate-800 p-4">
              <p className="text-xs text-slate-500">Open Support Tickets</p>
              <p className="mt-1 text-xl font-bold font-mono tabular-nums text-amber-600">
                {tickets.filter((t) => t.status !== 'Resolved').length}
              </p>
            </div>
          </div>

          <div className="rounded-xl border border-slate-200 dark:border-slate-800 overflow-x-auto">
            <div className="px-4 py-3 border-b border-slate-200 dark:border-slate-800 text-sm font-semibold">
              Support Disputes & Tickets
            </div>
            {tickets.length === 0 ? (
              <div className="p-8 text-center text-sm text-slate-500">No support tickets.</div>
            ) : (
              <table className="w-full text-sm min-w-[460px]">
                <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                  {tickets.map((t) => (
                    <tr key={t.id}>
                      <td className="px-4 py-3">
                        <div className="font-medium">{t.subject}</div>
                        <div className="text-xs text-slate-500">
                          {t.userName} · {t.message}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-end">
                        <button
                          type="button"
                          onClick={() => {
                            const next = t.status === 'Resolved' ? 'Open' : 'Resolved';
                            updateTicketStatus(t.id, next);
                            showToast(`Ticket marked ${next}`, 'info');
                          }}
                          className="text-xs font-medium text-blue-600 cursor-pointer"
                        >
                          {t.status} (Toggle)
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

      {tab === 'users' && (
        <>
          <div className="md:hidden space-y-3">
            {users.map((u) => (
              <div
                key={u.id}
                className="rounded-xl border border-slate-200 dark:border-slate-800 p-4 flex items-center justify-between gap-3"
              >
                <div className="min-w-0">
                  <div className="font-semibold text-sm truncate">{u.name}</div>
                  <div className="text-xs font-mono text-slate-500 truncate">{u.email}</div>
                  <div className="text-xs text-slate-500 capitalize mt-0.5">{u.role}</div>
                </div>
                <button
                  type="button"
                  onClick={() => handleUserToggle(u)}
                  className={`shrink-0 min-h-[36px] px-3 py-1 rounded-lg border border-slate-200 dark:border-slate-700 text-xs font-medium cursor-pointer ${
                    u.status === 'suspended' ? 'text-red-600' : 'text-emerald-600'
                  }`}
                >
                  {u.status === 'suspended' ? 'Suspended' : 'Active'}
                </button>
              </div>
            ))}
          </div>

          <div className="hidden md:block rounded-xl border border-slate-200 dark:border-slate-800 overflow-x-auto">
            <table className="w-full text-sm min-w-[520px]">
              <thead className="bg-slate-50 dark:bg-slate-900/50 text-xs text-slate-500 border-b border-slate-200 dark:border-slate-800">
                <tr>
                  <th className="px-4 py-3 text-start">Name</th>
                  <th className="px-4 py-3 text-start">Email</th>
                  <th className="px-4 py-3 text-start">Role</th>
                  <th className="px-4 py-3 text-end">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                {users.map((u) => (
                  <tr key={u.id}>
                    <td className="px-4 py-3 font-medium">{u.name}</td>
                    <td className="px-4 py-3 font-mono text-xs">{u.email}</td>
                    <td className="px-4 py-3 text-xs capitalize">{u.role}</td>
                    <td className="px-4 py-3 text-end">
                      <button
                        type="button"
                        onClick={() => handleUserToggle(u)}
                        className={`text-xs font-medium cursor-pointer ${
                          u.status === 'suspended' ? 'text-red-600' : 'text-emerald-600'
                        }`}
                      >
                        {u.status === 'suspended' ? 'Suspended' : 'Active'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      {tab === 'companies' && (
        <>
          <div className="md:hidden space-y-3">
            {organizations.map((o) => (
              <div
                key={o.id}
                className="rounded-xl border border-slate-200 dark:border-slate-800 p-4 flex items-center justify-between gap-3"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  {o.logoUrl && (
                    <img
                      src={o.logoUrl}
                      alt={o.name}
                      className="w-9 h-9 rounded-lg object-cover border border-slate-200 dark:border-slate-700 shrink-0"
                    />
                  )}
                  <div className="min-w-0">
                    <div className="font-semibold text-sm truncate">{o.name}</div>
                    <div className="text-xs text-slate-500">
                      {o.city}, {o.country} · <span className="font-mono uppercase">{o.subscriptionPlan}</span>
                    </div>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    toggleOrganizationVerify(o.id);
                    showToast(`${o.name}: ${o.verified ? 'Pending' : 'Verified'}`, 'info');
                  }}
                  className={`shrink-0 min-h-[36px] px-3 py-1 rounded-lg border border-slate-200 dark:border-slate-700 text-xs font-medium cursor-pointer ${
                    o.verified ? 'text-emerald-600' : 'text-amber-600'
                  }`}
                >
                  {o.verified ? 'Verified' : 'Pending'}
                </button>
              </div>
            ))}
          </div>

          <div className="hidden md:block rounded-xl border border-slate-200 dark:border-slate-800 overflow-x-auto">
            <table className="w-full text-sm min-w-[520px]">
              <thead className="bg-slate-50 dark:bg-slate-900/50 text-xs text-slate-500 border-b border-slate-200 dark:border-slate-800">
                <tr>
                  <th className="px-4 py-3 text-start">Company</th>
                  <th className="px-4 py-3 text-start">City / Country</th>
                  <th className="px-4 py-3 text-start">Plan / Media</th>
                  <th className="px-4 py-3 text-end">Verification</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                {organizations.map((o) => (
                  <tr key={o.id}>
                    <td className="px-4 py-3 font-medium">
                      <div className="flex items-center gap-2.5">
                        {o.logoUrl && (
                          <img
                            src={o.logoUrl}
                            alt={o.name}
                            className="w-8 h-8 rounded-lg object-cover border border-slate-200 dark:border-slate-700 shrink-0"
                          />
                        )}
                        <span>{o.name}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-500">
                      {o.city}, {o.country}
                    </td>
                    <td className="px-4 py-3 font-mono text-xs uppercase">
                      {o.subscriptionPlan}
                      {(o.mediaGallery || []).length > 0 ? ` · ${(o.mediaGallery || []).length} media` : ''}
                    </td>
                    <td className="px-4 py-3 text-end">
                      <button
                        type="button"
                        onClick={() => {
                          toggleOrganizationVerify(o.id);
                          showToast(`${o.name}: ${o.verified ? 'Pending' : 'Verified'}`, 'info');
                        }}
                        className={`text-xs font-medium cursor-pointer ${
                          o.verified ? 'text-emerald-600' : 'text-amber-600'
                        }`}
                      >
                        {o.verified ? 'Verified' : 'Pending Verification'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      {tab === 'sellers' && (
        <>
          <div className="md:hidden space-y-3">
            {sellers.map((s) => (
              <div
                key={s.id}
                className="rounded-xl border border-slate-200 dark:border-slate-800 p-4 flex items-center justify-between gap-3"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  {s.avatarUrl && (
                    <img
                      src={s.avatarUrl}
                      alt={s.displayName}
                      className="w-9 h-9 rounded-full object-cover border border-slate-200 dark:border-slate-700 shrink-0"
                    />
                  )}
                  <div className="min-w-0">
                    <div className="font-semibold text-sm truncate">{s.displayName}</div>
                    <div className="text-xs font-mono text-slate-500">
                      {s.referralCode} · {s.totalClicks}/{s.totalConversions} · €{s.pendingBalanceEur.toFixed(2)}
                    </div>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => handleSellerToggle(s)}
                  className={`shrink-0 min-h-[36px] px-3 py-1 rounded-lg border border-slate-200 dark:border-slate-700 text-xs font-medium cursor-pointer ${
                    s.status === 'paused' ? 'text-amber-600' : 'text-emerald-600'
                  }`}
                >
                  {s.status === 'paused' ? 'Paused' : 'Active'}
                </button>
              </div>
            ))}
          </div>

          <div className="hidden md:block rounded-xl border border-slate-200 dark:border-slate-800 overflow-x-auto">
            <table className="w-full text-sm min-w-[540px]">
              <thead className="bg-slate-50 dark:bg-slate-900/50 text-xs text-slate-500 border-b border-slate-200 dark:border-slate-800">
                <tr>
                  <th className="px-4 py-3 text-start">Seller</th>
                  <th className="px-4 py-3 text-start">Code</th>
                  <th className="px-4 py-3 text-end">Clicks / Conv.</th>
                  <th className="px-4 py-3 text-end">Pending EUR</th>
                  <th className="px-4 py-3 text-end">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                {sellers.map((s) => (
                  <tr key={s.id}>
                    <td className="px-4 py-3 font-medium">
                      <div className="flex items-center gap-2.5">
                        {s.avatarUrl && (
                          <img
                            src={s.avatarUrl}
                            alt={s.displayName}
                            className="w-8 h-8 rounded-full object-cover border border-slate-200 dark:border-slate-700 shrink-0"
                          />
                        )}
                        <div>
                          <div>{s.displayName}</div>
                          {(s.mediaGallery || []).length > 0 && (
                            <div className="text-[11px] text-slate-500">
                              {(s.mediaGallery || []).length} promo media
                            </div>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 font-mono text-xs">{s.referralCode}</td>
                    <td className="px-4 py-3 text-end font-mono tabular-nums">
                      {s.totalClicks} / {s.totalConversions}
                    </td>
                    <td className="px-4 py-3 text-end font-mono tabular-nums">
                      €{s.pendingBalanceEur.toFixed(2)}
                    </td>
                    <td className="px-4 py-3 text-end">
                      <button
                        type="button"
                        onClick={() => handleSellerToggle(s)}
                        className={`text-xs font-medium cursor-pointer ${
                          s.status === 'paused' ? 'text-amber-600' : 'text-emerald-600'
                        }`}
                      >
                        {s.status === 'paused' ? 'Paused' : 'Active'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      {tab === 'products' && (
        <>
          <div className="md:hidden space-y-3">
            {products.map((p) => (
              <div
                key={p.id}
                className="rounded-xl border border-slate-200 dark:border-slate-800 p-4 flex items-center justify-between gap-3"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <img
                    src={p.imageUrl}
                    alt={p.title[lang]}
                    className="w-10 h-10 rounded-lg object-cover border border-slate-200 dark:border-slate-700 shrink-0"
                  />
                  <div className="min-w-0">
                    <div className="font-semibold text-sm truncate">{p.title[lang]}</div>
                    <div className="text-xs text-slate-500 truncate">
                      {p.providerName} · {CATEGORIES[p.category][lang]}
                    </div>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    toggleProductPublish(p.id);
                    showToast(`${p.title.en}: ${p.published ? 'Unpublished' : 'Published'}`, 'info');
                  }}
                  className={`shrink-0 min-h-[36px] px-3 py-1 rounded-lg border border-slate-200 dark:border-slate-700 text-xs font-medium cursor-pointer ${
                    p.published ? 'text-emerald-600' : 'text-slate-400'
                  }`}
                >
                  {p.published ? 'Published' : 'Unpublished'}
                </button>
              </div>
            ))}
          </div>

          <div className="hidden md:block rounded-xl border border-slate-200 dark:border-slate-800 overflow-x-auto">
            <table className="w-full text-sm min-w-[540px]">
              <thead className="bg-slate-50 dark:bg-slate-900/50 text-xs text-slate-500 border-b border-slate-200 dark:border-slate-800">
                <tr>
                  <th className="px-4 py-3 text-start">Service</th>
                  <th className="px-4 py-3 text-start">Provider</th>
                  <th className="px-4 py-3 text-start">Category</th>
                  <th className="px-4 py-3 text-end">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                {products.map((p) => (
                  <tr key={p.id}>
                    <td className="px-4 py-3 font-medium">
                      <div className="flex items-center gap-2.5">
                        <img
                          src={p.imageUrl}
                          alt={p.title[lang]}
                          className="w-9 h-9 rounded-lg object-cover border border-slate-200 dark:border-slate-700 shrink-0"
                        />
                        <span>{p.title[lang]}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-500">{p.providerName}</td>
                    <td className="px-4 py-3 text-xs">{CATEGORIES[p.category][lang]}</td>
                    <td className="px-4 py-3 text-end">
                      <button
                        type="button"
                        onClick={() => {
                          toggleProductPublish(p.id);
                          showToast(`${p.title.en}: ${p.published ? 'Unpublished' : 'Published'}`, 'info');
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
        </>
      )}

      {tab === 'bookings' && (
        bookings.length === 0 ? (
          <div className="rounded-xl border border-slate-200 dark:border-slate-800 p-10 text-center text-sm text-slate-500">
            No bookings recorded on the platform yet.
          </div>
        ) : (
          <>
            <div className="md:hidden space-y-3">
              {bookings.map((b) => (
                <div
                  key={b.id}
                  className="rounded-xl border border-slate-200 dark:border-slate-800 p-4 space-y-2"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="font-mono text-[11px] text-slate-500">{b.referenceCode}</div>
                      <div className="font-semibold text-sm">{b.productTitle[lang]}</div>
                    </div>
                    <div className="font-mono tabular-nums font-bold text-sm shrink-0">
                      €{b.totalEur.toFixed(2)}
                    </div>
                  </div>
                  <div className="flex items-center justify-between text-xs pt-1 border-t border-slate-100 dark:border-slate-800">
                    <BookingStatusBadge status={b.status} lang={lang} />
                    {b.status === 'Awaiting Provider Confirmation' && (
                      <button
                        type="button"
                        onClick={() => {
                          updateBookingStatus(b.id, 'Confirmed');
                          showToast(`Confirmed ${b.referenceCode}`, 'success');
                        }}
                        className="text-emerald-600 font-semibold hover:underline cursor-pointer py-1"
                      >
                        Confirm
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>

            <div className="hidden md:block rounded-xl border border-slate-200 dark:border-slate-800 overflow-x-auto">
              <table className="w-full text-sm min-w-[600px]">
                <thead className="bg-slate-50 dark:bg-slate-900/50 text-xs text-slate-500 border-b border-slate-200 dark:border-slate-800">
                  <tr>
                    <th className="px-4 py-3 text-start">Ref</th>
                    <th className="px-4 py-3 text-start">Service</th>
                    <th className="px-4 py-3 text-end">Gross (EUR)</th>
                    <th className="px-4 py-3 text-end">Platform / Seller</th>
                    <th className="px-4 py-3 text-start">Status</th>
                    <th className="px-4 py-3 text-end">Override</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                  {bookings.map((b) => (
                    <tr key={b.id}>
                      <td className="px-4 py-3 font-mono text-xs">{b.referenceCode}</td>
                      <td className="px-4 py-3 text-xs">{b.productTitle[lang]}</td>
                      <td className="px-4 py-3 text-end font-mono tabular-nums">€{b.totalEur.toFixed(2)}</td>
                      <td className="px-4 py-3 text-end font-mono tabular-nums text-xs">
                        €{b.commissionSnapshot.platformFeeEur.toFixed(2)} / €
                        {b.commissionSnapshot.sellerCommissionEur.toFixed(2)}
                      </td>
                      <td className="px-4 py-3">
                        <BookingStatusBadge status={b.status} lang={lang} />
                      </td>
                      <td className="px-4 py-3 text-end">
                        {b.status === 'Awaiting Provider Confirmation' && (
                          <button
                            type="button"
                            onClick={() => {
                              updateBookingStatus(b.id, 'Confirmed');
                              showToast(`Confirmed ${b.referenceCode}`, 'success');
                            }}
                            className="text-xs text-emerald-600 hover:underline cursor-pointer"
                          >
                            Confirm
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )
      )}

      {tab === 'commissions' && (
        <div className="space-y-4">
          {ruleError && (
            <div role="alert" className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
              {ruleError}
            </div>
          )}
          <form
            noValidate
            onSubmit={(e) => {
              e.preventDefault();
              setRuleError('');
              if (newRule.name.trim().length < 2) {
                const msg =
                  lang === 'ar' ? 'يرجى إدخال اسم قاعدة العمولة.' : 'Please enter a rule name.';
                setRuleError(msg);
                showToast(msg, 'error');
                return;
              }
              if (
                newRule.platformPercent < 0 ||
                newRule.platformPercent > 50 ||
                newRule.sellerPercent < 0 ||
                newRule.sellerPercent > 50
              ) {
                const msg =
                  lang === 'ar'
                    ? 'يجب أن تكون نسب العمولة بين 0% و50%.'
                    : 'Commission percentages must be between 0% and 50%.';
                setRuleError(msg);
                showToast(msg, 'error');
                return;
              }
              addCommissionRule({ ...newRule, name: newRule.name.trim() });
              setNewRule({ ...newRule, name: '' });
              showToast(lang === 'ar' ? 'تمت إضافة قاعدة العمولة' : 'Commission rule added', 'success');
            }}
            className="rounded-xl border border-slate-200 dark:border-slate-800 p-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3"
          >
            <input
              type="text"
              value={newRule.name}
              onChange={(e) => {
                setNewRule({ ...newRule, name: e.target.value });
                if (ruleError) setRuleError('');
              }}
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
              value={newRule.platformPercent}
              onChange={(e) =>
                setNewRule({ ...newRule, platformPercent: Number(e.target.value) })
              }
              placeholder="Platform %"
              className="rounded-lg border border-slate-200 dark:border-slate-700 px-3 py-2 text-sm font-mono"
            />
            <input
              type="number"
              value={newRule.sellerPercent}
              onChange={(e) => setNewRule({ ...newRule, sellerPercent: Number(e.target.value) })}
              placeholder="Seller %"
              className="rounded-lg border border-slate-200 dark:border-slate-700 px-3 py-2 text-sm font-mono"
            />
            <button
              type="submit"
              className="min-h-[40px] px-4 py-2 rounded-lg bg-[#0052CC] text-white text-xs font-semibold cursor-pointer"
            >
              Add Rule
            </button>
          </form>

          <div className="rounded-xl border border-slate-200 dark:border-slate-800 overflow-x-auto">
            <table className="w-full text-sm min-w-[500px]">
              <thead className="bg-slate-50 dark:bg-slate-900/50 text-xs text-slate-500 border-b border-slate-200 dark:border-slate-800">
                <tr>
                  <th className="px-4 py-3 text-start">Rule</th>
                  <th className="px-4 py-3 text-start">Scope</th>
                  <th className="px-4 py-3 text-end">Platform %</th>
                  <th className="px-4 py-3 text-end">Seller %</th>
                  <th className="px-4 py-3 text-end">Fixed</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                {commissionRules.map((r) => (
                  <tr key={r.id}>
                    <td className="px-4 py-3 font-medium">{r.name}</td>
                    <td className="px-4 py-3 font-mono text-xs">{r.category || r.scope}</td>
                    <td className="px-4 py-3 text-end font-mono tabular-nums">{r.platformPercent}%</td>
                    <td className="px-4 py-3 text-end font-mono tabular-nums">{r.sellerPercent}%</td>
                    <td className="px-4 py-3 text-end font-mono tabular-nums">€{r.fixedFeeEur}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {tab === 'finance' && (
        <div className="space-y-6">
          <div className="rounded-xl border border-slate-200 dark:border-slate-800 overflow-x-auto">
            <div className="px-4 py-3 border-b border-slate-200 dark:border-slate-800 text-sm font-semibold">
              Payouts Queue
            </div>
            {payouts.length === 0 ? (
              <div className="p-8 text-center text-sm text-slate-500">No payouts queued.</div>
            ) : (
              <table className="w-full text-sm min-w-[460px]">
                <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                  {payouts.map((p) => (
                    <tr key={p.id}>
                      <td className="px-4 py-3 font-medium">{p.recipientName}</td>
                      <td className="px-4 py-3 text-xs capitalize">{p.recipientType}</td>
                      <td className="px-4 py-3 text-end font-mono tabular-nums">€{p.amountEur.toFixed(2)}</td>
                      <td className="px-4 py-3 text-end">
                        {p.status === 'Pending' ? (
                          <button
                            type="button"
                            onClick={() => setConfirmSettlePayout(p)}
                            className="px-3 py-1 rounded bg-emerald-600 text-white text-xs cursor-pointer"
                          >
                            Settle Payout
                          </button>
                        ) : (
                          <span className="text-xs text-emerald-600">Settled</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          <div className="rounded-xl border border-slate-200 dark:border-slate-800 overflow-x-auto">
            <div className="px-4 py-3 border-b border-slate-200 dark:border-slate-800 text-sm font-semibold">
              Immutable Ledger ({ledgerEntries.length} entries)
            </div>
            <table className="w-full text-sm min-w-[520px]">
              <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                {ledgerEntries.map((l) => (
                  <tr key={l.id}>
                    <td className="px-4 py-2.5 text-xs font-medium">{l.entityName}</td>
                    <td className="px-4 py-2.5 font-mono text-xs">{l.entryType}</td>
                    <td className="px-4 py-2.5 text-xs text-slate-500">{l.description}</td>
                    <td className="px-4 py-2.5 text-end font-mono tabular-nums">€{l.amountEur.toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {tab === 'reports' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="rounded-xl border border-slate-200 dark:border-slate-800 p-5 space-y-3">
            <h3 className="text-sm font-semibold">Volume by Sector (EUR)</h3>
            {(Object.keys(CATEGORIES) as ServiceCategory[]).map((cat) => {
              const total = bookings
                .filter((b) => b.category === cat)
                .reduce((s, b) => s + b.totalEur, 0);
              return (
                <div
                  key={cat}
                  className="flex justify-between text-xs py-1 border-b border-slate-100 dark:border-slate-800"
                >
                  <span>{CATEGORIES[cat][lang]}</span>
                  <span className="font-mono tabular-nums font-semibold">€{total.toFixed(2)}</span>
                </div>
              );
            })}
          </div>
          <div className="rounded-xl border border-slate-200 dark:border-slate-800 p-5 space-y-3">
            <h3 className="text-sm font-semibold">Currency Split</h3>
            {(['EUR', 'USD', 'EGP'] as const).map((cur) => {
              const count = bookings.filter((b) => b.originalCurrency === cur).length;
              return (
                <div
                  key={cur}
                  className="flex justify-between text-xs py-1.5 border-b border-slate-100 dark:border-slate-800"
                >
                  <span className="font-mono">{cur}</span>
                  <span className="font-mono tabular-nums">{count} bookings</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {tab === 'settings' && (
        <form
          noValidate
          onSubmit={(e) => {
            e.preventDefault();
            setSettingsError('');
            if (
              platformSettings.defaultPlatformFeePercent < 0 ||
              platformSettings.defaultPlatformFeePercent > 50 ||
              platformSettings.defaultSellerCommissionPercent < 0 ||
              platformSettings.defaultSellerCommissionPercent > 50
            ) {
              const msg = 'Fee and commission defaults must be between 0% and 50%.';
              setSettingsError(msg);
              showToast(msg, 'error');
              return;
            }
            showToast(
              lang === 'ar' ? 'تم حفظ إعدادات المنصة' : 'Platform settings saved',
              'success'
            );
          }}
          className="rounded-xl border border-slate-200 dark:border-slate-800 p-6 max-w-2xl space-y-4"
        >
          <h3 className="text-base font-semibold">MASIDY Platform Settings</h3>
          {settingsError && (
            <div role="alert" className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
              {settingsError}
            </div>
          )}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs text-slate-500 mb-1">Default Platform Fee (%)</label>
              <input
                type="number"
                value={platformSettings.defaultPlatformFeePercent}
                onChange={(e) =>
                  updatePlatformSettings({ defaultPlatformFeePercent: Number(e.target.value) })
                }
                className="w-full rounded-lg border border-slate-200 dark:border-slate-700 px-3 py-2 text-sm font-mono"
              />
            </div>
            <div>
              <label className="block text-xs text-slate-500 mb-1">Default Seller Commission (%)</label>
              <input
                type="number"
                value={platformSettings.defaultSellerCommissionPercent}
                onChange={(e) =>
                  updatePlatformSettings({
                    defaultSellerCommissionPercent: Number(e.target.value),
                  })
                }
                className="w-full rounded-lg border border-slate-200 dark:border-slate-700 px-3 py-2 text-sm font-mono"
              />
            </div>
          </div>
          <div className="space-y-2 text-xs">
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={platformSettings.freeCompanyOnboarding}
                onChange={(e) =>
                  updatePlatformSettings({ freeCompanyOnboarding: e.target.checked })
                }
              />
              <span>Free Company Subscription Policy (Mandatory)</span>
            </label>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={platformSettings.openSellerRegistration}
                onChange={(e) =>
                  updatePlatformSettings({ openSellerRegistration: e.target.checked })
                }
              />
              <span>Open Seller & Affiliate Registration</span>
            </label>
          </div>
          <button
            type="submit"
            className="px-5 py-2.5 rounded-lg bg-slate-900 text-white text-xs font-semibold cursor-pointer"
          >
            Save Settings
          </button>
        </form>
      )}

      <ConfirmDialog
        open={Boolean(confirmSuspendUser)}
        title="Suspend User Account"
        message={
          confirmSuspendUser
            ? `Are you sure you want to suspend ${confirmSuspendUser.name} (${confirmSuspendUser.email})? They will be blocked from signing in.`
            : ''
        }
        confirmLabel="Yes, Suspend User"
        cancelLabel="Cancel"
        variant="danger"
        onConfirm={() => {
          if (confirmSuspendUser) {
            toggleUserStatus(confirmSuspendUser.id);
            showToast(`${confirmSuspendUser.name} suspended`, 'info');
          }
          setConfirmSuspendUser(null);
        }}
        onCancel={() => setConfirmSuspendUser(null)}
      />

      <ConfirmDialog
        open={Boolean(confirmPauseSeller)}
        title="Pause Seller Account"
        message={
          confirmPauseSeller
            ? `Are you sure you want to pause ${confirmPauseSeller.displayName} (${confirmPauseSeller.referralCode})? New referral commissions and payouts will be halted.`
            : ''
        }
        confirmLabel="Yes, Pause Seller"
        cancelLabel="Cancel"
        variant="danger"
        onConfirm={() => {
          if (confirmPauseSeller) {
            toggleSellerStatus(confirmPauseSeller.id);
            showToast(`${confirmPauseSeller.displayName} paused`, 'info');
          }
          setConfirmPauseSeller(null);
        }}
        onCancel={() => setConfirmPauseSeller(null)}
      />

      <ConfirmDialog
        open={Boolean(confirmSettlePayout)}
        title="Settle Affiliate Payout"
        message={
          confirmSettlePayout
            ? `Confirm settling €${confirmSettlePayout.amountEur.toFixed(2)} for ${confirmSettlePayout.recipientName}? This will append an immutable ledger settlement entry.`
            : ''
        }
        confirmLabel="Confirm Settlement"
        cancelLabel="Cancel"
        variant="primary"
        onConfirm={() => {
          if (confirmSettlePayout) {
            settlePayout(confirmSettlePayout.id);
            showToast(`Payout ${confirmSettlePayout.id} settled`, 'success');
          }
          setConfirmSettlePayout(null);
        }}
        onCancel={() => setConfirmSettlePayout(null)}
      />
    </div>
  );
}
