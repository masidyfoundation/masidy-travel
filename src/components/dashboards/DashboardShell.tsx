import { useMarketplace } from '../../context/MarketplaceContext.tsx';
import type { CurrencyCode, Language, UserRole } from '../../shared/types.ts';
import { UI_TEXT } from '../../shared/i18n.ts';
import { CustomerDashboard } from './CustomerDashboard.tsx';
import { CompanyDashboard } from './CompanyDashboard.tsx';
import { SellerDashboard } from './SellerDashboard.tsx';
import { AdminDashboard } from './AdminDashboard.tsx';

export function DashboardShell({
  roleOverride,
  initialTab,
}: {
  roleOverride?: UserRole;
  initialTab?: string;
}) {
  const {
    lang,
    setLang,
    currency,
    setCurrency,
    users,
    organizations,
    sellers,
    activeUser,
    switchDemoRole,
    navigate,
  } = useMarketplace();
  const t = UI_TEXT[lang];
  const currentRole: UserRole = roleOverride || activeUser?.role || 'customer';
  const displayUser =
    (activeUser && activeUser.role === currentRole ? activeUser : null) ||
    users.find((u) => u.role === currentRole && u.status !== 'suspended') ||
    users.find((u) => u.role === currentRole) ||
    users[0];

  const accountOrg =
    currentRole === 'provider'
      ? organizations.find((o) => o.id === displayUser.organizationId) || organizations[0]
      : undefined;
  const accountSeller =
    currentRole === 'seller'
      ? sellers.find((s) => s.id === displayUser.sellerId) || sellers[0]
      : undefined;
  const accountAvatarUrl = accountOrg?.logoUrl || accountSeller?.avatarUrl;

  const roleLabels: Record<UserRole, string> = {
    customer: t.roleCustomer,
    provider: t.roleProvider,
    seller: t.roleSeller,
    admin: t.roleAdmin,
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
      <div className="flex flex-col lg:flex-row gap-6 lg:gap-8">
        {/* Compact Mobile / Tablet Workspace Switcher (< lg) */}
        <div className="lg:hidden rounded-xl border border-slate-200 dark:border-slate-800 p-3.5 sm:p-4 space-y-3 bg-slate-50/50 dark:bg-slate-900/40">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2.5 min-w-0">
              {accountAvatarUrl && (
                <img
                  src={accountAvatarUrl}
                  alt={displayUser.name}
                  className="w-9 h-9 rounded-full object-cover border border-slate-200 dark:border-slate-700 shrink-0"
                />
              )}
              <div className="min-w-0">
                <p className="text-[11px] text-slate-500">{roleLabels[currentRole]}</p>
                <p className="text-sm font-semibold text-slate-900 dark:text-white truncate">
                  {accountOrg?.name || accountSeller?.displayName || displayUser.name}
                </p>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2 text-xs">
              <button
                type="button"
                onClick={() => navigate({ page: 'search' })}
                className="px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 cursor-pointer"
              >
                {lang === 'ar' ? 'السوق' : 'Marketplace'}
              </button>
              <button
                type="button"
                onClick={() => navigate({ page: 'quotations' })}
                className="px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 cursor-pointer"
              >
                {lang === 'ar' ? 'العروض' : 'Quotes'}
              </button>
            </div>
          </div>

          <div className="flex flex-nowrap sm:grid sm:grid-cols-4 gap-1.5 overflow-x-auto no-scrollbar pb-0.5 sm:pb-0">
            {(['customer', 'provider', 'seller', 'admin'] as UserRole[]).map((r) => (
              <button
                key={r}
                type="button"
                onClick={() => {
                  switchDemoRole(r);
                  navigate({ page: 'dashboard', role: r });
                }}
                className={`px-3 py-2 text-xs font-medium rounded-lg border transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
                  currentRole === r
                    ? 'border-blue-600 bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300'
                    : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300'
                }`}
              >
                {roleLabels[r]}
              </button>
            ))}
          </div>
        </div>

        {/* Desktop 260px Sidebar (lg+) */}
        <aside className="hidden lg:block w-[260px] shrink-0 space-y-5">
          <div className="rounded-xl border border-slate-200 dark:border-slate-800 p-4 space-y-3">
            <div className="flex items-center gap-3 min-w-0">
              {accountAvatarUrl && (
                <img
                  src={accountAvatarUrl}
                  alt={displayUser.name}
                  className="w-10 h-10 rounded-full object-cover border border-slate-200 dark:border-slate-700 shrink-0"
                />
              )}
              <div className="min-w-0">
                <p className="text-xs text-slate-500">{roleLabels[currentRole]}</p>
                <p className="text-sm font-semibold text-slate-900 dark:text-white truncate mt-0.5">
                  {accountOrg?.name || accountSeller?.displayName || displayUser.name}
                </p>
                <p className="text-xs font-mono text-slate-500 truncate">{displayUser.email}</p>
              </div>
            </div>

            <div className="pt-3 border-t border-slate-200 dark:border-slate-800">
              <p className="text-[11px] font-medium text-slate-500 mb-2">{t.switchDemoRole}</p>
              <div className="grid grid-cols-2 gap-1.5">
                {(['customer', 'provider', 'seller', 'admin'] as UserRole[]).map((r) => (
                  <button
                    key={r}
                    type="button"
                    onClick={() => {
                      switchDemoRole(r);
                      navigate({ page: 'dashboard', role: r });
                    }}
                    className={`px-2 py-1.5 text-[11px] font-medium rounded-md border transition-colors cursor-pointer truncate ${
                      currentRole === r
                        ? 'border-blue-600 bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300'
                        : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:border-slate-400'
                    }`}
                  >
                    {roleLabels[r]}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Quick Discovery Links from Workspace */}
          <div className="rounded-xl border border-slate-200 dark:border-slate-800 p-4 space-y-2 text-xs">
            <p className="font-semibold text-slate-700 dark:text-slate-300">
              {lang === 'ar' ? 'روابط سريعة' : 'Quick Links'}
            </p>
            <button
              type="button"
              onClick={() => navigate({ page: 'home' })}
              className="block w-full text-start py-1 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white cursor-pointer"
            >
              {t.navExplore}
            </button>
            <button
              type="button"
              onClick={() => navigate({ page: 'search' })}
              className="block w-full text-start py-1 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white cursor-pointer"
            >
              {lang === 'ar' ? 'البحث المتقدم' : 'Advanced Search'}
            </button>
            <button
              type="button"
              onClick={() => navigate({ page: 'quotations' })}
              className="block w-full text-start py-1 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white cursor-pointer"
            >
              {lang === 'ar' ? 'مقارنة عروض الأسعار' : 'Compare Quotations'}
            </button>
          </div>
        </aside>

        {/* Main Workspace Viewport */}
        <div className="flex-1 min-w-0 space-y-5 sm:space-y-6">
          <div className="pb-3 sm:pb-4 border-b border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3">
            <div className="text-sm text-slate-500">
              <button
                type="button"
                onClick={() => navigate({ page: 'home' })}
                className="hover:underline cursor-pointer"
              >
                Masidy
              </button>
              <span className="mx-2">/</span>
              <span className="text-slate-900 dark:text-white font-semibold">
                {roleLabels[currentRole]}
              </span>
            </div>

            <div className="hidden sm:flex items-center gap-2">
              <div className="flex items-center gap-0.5 rounded-lg border border-slate-200 dark:border-slate-700 p-0.5">
                {(['ar', 'en', 'it'] as Language[]).map((l) => (
                  <button
                    key={l}
                    type="button"
                    onClick={() => setLang(l)}
                    className={`px-2 py-1 rounded text-[11px] font-medium uppercase cursor-pointer ${
                      lang === l
                        ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900'
                        : 'text-slate-600 dark:text-slate-300'
                    }`}
                  >
                    {l}
                  </button>
                ))}
              </div>
              <div className="flex items-center gap-0.5 rounded-lg border border-slate-200 dark:border-slate-700 p-0.5">
                {(['EUR', 'USD', 'EGP'] as CurrencyCode[]).map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setCurrency(c)}
                    className={`px-2 py-1 rounded text-[11px] font-mono font-medium cursor-pointer ${
                      currency === c
                        ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900'
                        : 'text-slate-600 dark:text-slate-300'
                    }`}
                  >
                    {c}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {currentRole === 'customer' && <CustomerDashboard initialTab={initialTab} />}
          {currentRole === 'provider' && <CompanyDashboard initialTab={initialTab} />}
          {currentRole === 'seller' && <SellerDashboard initialTab={initialTab} />}
          {currentRole === 'admin' && <AdminDashboard initialTab={initialTab} />}
        </div>
      </div>
    </div>
  );
}
