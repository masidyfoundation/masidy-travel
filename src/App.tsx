import { useEffect, useMemo, useState } from 'react';
import { Menu, RotateCcw, X } from 'lucide-react';
import { useMarketplace } from './context/MarketplaceContext.tsx';
import type { CurrencyCode, Language, ServiceCategory } from './shared/types.ts';
import { CATEGORIES, UI_TEXT } from './shared/i18n.ts';
import { convertAmount } from './shared/currency.ts';
import { BrandMark } from './components/BrandMark.tsx';
import { ConfirmDialog } from './components/ConfirmDialog.tsx';
import { MarketplaceView } from './components/MarketplaceView.tsx';
import { AuthModal } from './components/AuthModal.tsx';
import {
  CategoryListingPage,
  ProductDetailPage,
  ProviderProfilePage,
  SearchResultsPage,
} from './components/DiscoveryPages.tsx';
import {
  BookingConfirmationPage,
  BookingFlowPage,
  QuotationsPage,
} from './components/BookingAndQuotationPages.tsx';
import { DashboardShell } from './components/dashboards/DashboardShell.tsx';

export default function App() {
  const {
    route,
    navigate,
    lang,
    setLang,
    currency,
    setCurrency,
    activeUser,
    products,
    organizations,
    favoriteIds,
    activeReferral,
    toast,
    dismissToast,
    resetDemoData,
    toggleFavorite,
    logout,
  } = useMarketplace();

  const t = UI_TEXT[lang];

  // Homepage-local filter state (preserves exact existing homepage behavior)
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedModel, setSelectedModel] = useState('all');
  const [selectedProviderId, setSelectedProviderId] = useState('all');
  const [sortBy, setSortBy] = useState('rating');
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authInitialMode, setAuthInitialMode] = useState<'login' | 'register'>('login');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [confirmResetOpen, setConfirmResetOpen] = useState(false);

  useEffect(() => {
    if (!mobileMenuOpen) return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setMobileMenuOpen(false);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => {
      document.body.style.overflow = prevOverflow;
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [mobileMenuOpen]);

  function navigateAndClose(next: Parameters<typeof navigate>[0]) {
    navigate(next);
    setMobileMenuOpen(false);
  }

  const homepageProducts = useMemo(() => {
    let list = products.filter((p) => p.published);
    if (selectedCategory !== 'all') list = list.filter((p) => p.category === selectedCategory);
    if (selectedModel !== 'all') list = list.filter((p) => p.productModel === selectedModel);
    if (selectedProviderId !== 'all')
      list = list.filter((p) => p.organizationId === selectedProviderId);
    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase();
      list = list.filter((p) =>
        [
          p.title.ar,
          p.title.en,
          p.title.it,
          p.destination.ar,
          p.destination.en,
          p.destination.it,
          p.providerName,
        ]
          .join(' ')
          .toLowerCase()
          .includes(q)
      );
    }
    if (sortBy === 'price_asc') {
      list = [...list].sort(
        (a, b) =>
          convertAmount(a.price, a.baseCurrency, 'EUR') -
          convertAmount(b.price, b.baseCurrency, 'EUR')
      );
    } else if (sortBy === 'price_desc') {
      list = [...list].sort(
        (a, b) =>
          convertAmount(b.price, b.baseCurrency, 'EUR') -
          convertAmount(a.price, a.baseCurrency, 'EUR')
      );
    } else {
      list = [...list].sort((a, b) => b.rating - a.rating);
    }
    return list;
  }, [products, searchQuery, selectedCategory, selectedModel, selectedProviderId, sortBy]);

  return (
    <div className="min-h-screen flex flex-col bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100">
      {/* Strict 3-Zone Top Bar Contract */}
      <header className="sticky top-0 z-40 bg-white/95 dark:bg-slate-950/95 backdrop-blur-xs border-b border-slate-200 dark:border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-8">
          {/* Zone 1: Brand wordmark */}
          <BrandMark onClick={() => navigate({ page: 'home' })} />

          {/* Zone 2: 4 concise single-line nav links */}
          <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-slate-600 dark:text-slate-300">
            <button
              type="button"
              onClick={() => navigate({ page: 'home' })}
              className={`hover:text-slate-900 dark:hover:text-white hover:underline underline-offset-4 transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                route.page === 'home' ? 'text-slate-900 dark:text-white font-semibold' : ''
              }`}
            >
              {t.navExplore}
            </button>
            <button
              type="button"
              onClick={() => navigate({ page: 'search' })}
              className={`hover:text-slate-900 dark:hover:text-white hover:underline underline-offset-4 transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                route.page === 'search' || route.page === 'category'
                  ? 'text-slate-900 dark:text-white font-semibold'
                  : ''
              }`}
            >
              {lang === 'ar' ? 'البحث والقطاعات' : lang === 'it' ? 'Ricerca & Settori' : 'Search & Sectors'}
            </button>
            <button
              type="button"
              onClick={() => navigate({ page: 'quotations' })}
              className={`hover:text-slate-900 dark:hover:text-white hover:underline underline-offset-4 transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                route.page === 'quotations' ? 'text-slate-900 dark:text-white font-semibold' : ''
              }`}
            >
              {t.navRequestQuote}
            </button>
            <button
              type="button"
              onClick={() =>
                navigate({ page: 'dashboard', role: activeUser?.role || 'customer' })
              }
              className={`hover:text-slate-900 dark:hover:text-white hover:underline underline-offset-4 transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                route.page === 'dashboard' ? 'text-slate-900 dark:text-white font-semibold' : ''
              }`}
            >
              {t.navWorkspace}
            </button>
          </nav>

          {/* Zone 3: Single primary action (+ mobile hamburger trigger) */}
          <div className="flex items-center gap-2 shrink-0">
            {activeUser ? (
              <button
                type="button"
                onClick={() =>
                  route.page === 'dashboard'
                    ? navigate({ page: 'home' })
                    : navigate({ page: 'dashboard', role: activeUser.role })
                }
                className="px-3.5 sm:px-4 py-2 rounded-lg bg-slate-900 hover:bg-slate-800 dark:bg-white dark:text-slate-900 text-white text-xs font-semibold transition-colors whitespace-nowrap shrink-0 max-w-[140px] sm:max-w-none truncate cursor-pointer"
              >
                {route.page === 'dashboard' ? t.navExplore : activeUser.name}
              </button>
            ) : (
              <button
                type="button"
                onClick={() => {
                  setAuthInitialMode('login');
                  setShowAuthModal(true);
                }}
                className="px-3.5 sm:px-4 py-2 rounded-lg bg-[#F95738] hover:bg-[#e1482b] text-white text-xs font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer"
              >
                {t.signIn}
              </button>
            )}

            <button
              type="button"
              onClick={() => setMobileMenuOpen((v) => !v)}
              aria-expanded={mobileMenuOpen}
              aria-controls="mobile-nav-drawer"
              aria-label={
                mobileMenuOpen
                  ? lang === 'ar'
                    ? 'إغلاق القائمة'
                    : 'Close menu'
                  : lang === 'ar'
                  ? 'فتح القائمة'
                  : 'Open menu'
              }
              className="md:hidden inline-flex items-center justify-center w-11 h-11 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>
      </header>

      {/* Mobile Slide-Over Navigation Drawer */}
      {mobileMenuOpen && (
        <div
          className="fixed inset-0 z-50 md:hidden"
          role="dialog"
          aria-modal="true"
          id="mobile-nav-drawer"
        >
          <div
            onClick={() => setMobileMenuOpen(false)}
            className="fixed inset-0 bg-slate-950/55 backdrop-blur-xs"
          />
          <aside className="fixed inset-y-0 end-0 w-[86vw] max-w-sm bg-white dark:bg-slate-950 border-s border-slate-200 dark:border-slate-800 shadow-2xl flex flex-col overflow-y-auto">
            <div className="h-16 px-4 flex items-center justify-between border-b border-slate-200 dark:border-slate-800 shrink-0">
              <BrandMark onClick={() => navigateAndClose({ page: 'home' })} />
              <button
                type="button"
                onClick={() => setMobileMenuOpen(false)}
                aria-label={lang === 'ar' ? 'إغلاق القائمة' : 'Close menu'}
                className="inline-flex items-center justify-center w-11 h-11 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-4 space-y-6 flex-1">
              {/* Primary Links */}
              <nav className="space-y-1">
                <p className="px-2 pb-1 text-[11px] font-semibold text-slate-400">
                  {lang === 'ar' ? 'التنقل الرئيسي' : lang === 'it' ? 'Navigazione' : 'Navigation'}
                </p>
                <button
                  type="button"
                  onClick={() => navigateAndClose({ page: 'home' })}
                  className={`w-full text-start px-3 py-3 rounded-lg text-sm font-medium transition-colors cursor-pointer ${
                    route.page === 'home'
                      ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900'
                      : 'text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800'
                  }`}
                >
                  {t.navExplore}
                </button>
                <button
                  type="button"
                  onClick={() => navigateAndClose({ page: 'search' })}
                  className={`w-full text-start px-3 py-3 rounded-lg text-sm font-medium transition-colors cursor-pointer ${
                    route.page === 'search' || route.page === 'category'
                      ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900'
                      : 'text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800'
                  }`}
                >
                  {lang === 'ar' ? 'البحث والقطاعات' : lang === 'it' ? 'Ricerca & Settori' : 'Search & Sectors'}
                </button>
                <button
                  type="button"
                  onClick={() => navigateAndClose({ page: 'quotations' })}
                  className={`w-full text-start px-3 py-3 rounded-lg text-sm font-medium transition-colors cursor-pointer ${
                    route.page === 'quotations'
                      ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900'
                      : 'text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800'
                  }`}
                >
                  {t.navRequestQuote}
                </button>
                <button
                  type="button"
                  onClick={() =>
                    navigateAndClose({ page: 'dashboard', role: activeUser?.role || 'customer' })
                  }
                  className={`w-full text-start px-3 py-3 rounded-lg text-sm font-medium transition-colors cursor-pointer ${
                    route.page === 'dashboard'
                      ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900'
                      : 'text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800'
                  }`}
                >
                  {t.navWorkspace}
                </button>
              </nav>

              {/* Auth Actions */}
              <div className="pt-4 border-t border-slate-200 dark:border-slate-800 space-y-2.5">
                {activeUser ? (
                  <>
                    <div className="px-3 py-2.5 rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                      <p className="text-xs font-semibold text-slate-900 dark:text-white truncate">
                        {activeUser.name}
                      </p>
                      <p className="text-[11px] font-mono text-slate-500 truncate">
                        {activeUser.email}
                      </p>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() =>
                          navigateAndClose({ page: 'dashboard', role: activeUser.role })
                        }
                        className="py-2.5 px-3 rounded-lg bg-slate-900 text-white dark:bg-white dark:text-slate-900 text-xs font-semibold cursor-pointer"
                      >
                        {t.navWorkspace}
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          logout();
                          setMobileMenuOpen(false);
                        }}
                        className="py-2.5 px-3 rounded-lg border border-red-200 text-red-600 text-xs font-semibold cursor-pointer"
                      >
                        {t.logout}
                      </button>
                    </div>
                  </>
                ) : (
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setMobileMenuOpen(false);
                        setAuthInitialMode('login');
                        setShowAuthModal(true);
                      }}
                      className="py-2.5 px-3 rounded-lg bg-[#F95738] text-white text-xs font-semibold cursor-pointer"
                    >
                      {t.loginTab}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setMobileMenuOpen(false);
                        setAuthInitialMode('register');
                        setShowAuthModal(true);
                      }}
                      className="py-2.5 px-3 rounded-lg border border-slate-300 dark:border-slate-700 text-slate-800 dark:text-slate-100 text-xs font-semibold cursor-pointer"
                    >
                      {t.registerTab}
                    </button>
                  </div>
                )}
              </div>

              {/* Language & Currency Selectors */}
              <div className="pt-4 border-t border-slate-200 dark:border-slate-800 space-y-3">
                <div>
                  <p className="text-xs font-medium text-slate-500 mb-1.5">
                    {lang === 'ar' ? 'اللغة' : lang === 'it' ? 'Lingua' : 'Language'}
                  </p>
                  <div className="grid grid-cols-3 gap-1 p-1 rounded-lg bg-slate-100 dark:bg-slate-800">
                    {(['ar', 'en', 'it'] as Language[]).map((l) => (
                      <button
                        key={l}
                        type="button"
                        onClick={() => setLang(l)}
                        className={`py-2 text-xs font-medium rounded-md uppercase cursor-pointer ${
                          lang === l
                            ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                            : 'text-slate-600 dark:text-slate-300'
                        }`}
                      >
                        {l}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <p className="text-xs font-medium text-slate-500 mb-1.5">
                    {lang === 'ar' ? 'العملة' : lang === 'it' ? 'Valuta' : 'Currency'}
                  </p>
                  <div className="grid grid-cols-3 gap-1 p-1 rounded-lg bg-slate-100 dark:bg-slate-800">
                    {(['EUR', 'USD', 'EGP'] as CurrencyCode[]).map((c) => (
                      <button
                        key={c}
                        type="button"
                        onClick={() => setCurrency(c)}
                        className={`py-2 text-xs font-mono font-medium rounded-md cursor-pointer ${
                          currency === c
                            ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                            : 'text-slate-600 dark:text-slate-300'
                        }`}
                      >
                        {c}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Quick Sectors & Dashboards */}
              <div className="pt-4 border-t border-slate-200 dark:border-slate-800 space-y-3">
                <p className="text-xs font-medium text-slate-500">
                  {lang === 'ar' ? 'القطاعات السياحية' : lang === 'it' ? 'Settori' : 'Travel Sectors'}
                </p>
                <div className="grid grid-cols-2 gap-1.5">
                  {(Object.keys(CATEGORIES) as ServiceCategory[]).map((cat) => (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => navigateAndClose({ page: 'category', category: cat })}
                      className="text-start px-2.5 py-2 rounded-lg border border-slate-200 dark:border-slate-800 text-xs text-slate-700 dark:text-slate-200 hover:border-slate-400 truncate cursor-pointer"
                    >
                      {CATEGORIES[cat][lang]}
                    </button>
                  ))}
                </div>
              </div>
              <div className="pt-4 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => {
                    setMobileMenuOpen(false);
                    setConfirmResetOpen(true);
                  }}
                  className="w-full inline-flex items-center justify-center gap-2 py-2.5 px-3 rounded-lg border border-slate-200 dark:border-slate-700 text-xs font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>{lang === 'ar' ? 'إعادة ضبط البيانات التجريبية' : 'Reset Demo Data'}</span>
                </button>
              </div>
            </div>
          </aside>
        </div>
      )}

      {toast && (
        <div className="max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 pt-4" role="status" aria-live="polite">
          <div
            className={`rounded-lg border px-4 py-2.5 text-sm flex items-center justify-between gap-3 ${
              toast.type === 'error'
                ? 'border-red-200 bg-red-50 text-red-800 dark:border-red-900/60 dark:bg-red-950/40 dark:text-red-300'
                : toast.type === 'info'
                ? 'border-blue-200 bg-blue-50 text-blue-800 dark:border-blue-900/60 dark:bg-blue-950/40 dark:text-blue-300'
                : 'border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-900/60 dark:bg-emerald-950/40 dark:text-emerald-300'
            }`}
          >
            <span>{toast.message}</span>
            <button
              type="button"
              onClick={dismissToast}
              aria-label="Dismiss"
              className="p-1 rounded hover:bg-black/5 dark:hover:bg-white/10 shrink-0 cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* Main Viewport */}
      <main className="flex-1">
        {route.page === 'home' && (
          <MarketplaceView
            lang={lang}
            currency={currency}
            onChangeLang={setLang}
            onChangeCurrency={setCurrency}
            products={homepageProducts}
            organizations={organizations}
            favoriteIds={favoriteIds}
            loading={false}
            searchQuery={searchQuery}
            selectedCategory={selectedCategory}
            selectedModel={selectedModel}
            selectedProviderId={selectedProviderId}
            sortBy={sortBy}
            activeReferral={activeReferral}
            onSearchChange={setSearchQuery}
            onCategoryChange={setSelectedCategory}
            onModelChange={setSelectedModel}
            onProviderChange={(id) => navigate({ page: 'provider', organizationId: id })}
            onSortChange={setSortBy}
            onResetFilters={() => {
              setSearchQuery('');
              setSelectedCategory('all');
              setSelectedModel('all');
              setSelectedProviderId('all');
              setSortBy('rating');
            }}
            onSelectProduct={(p) => navigate({ page: 'product', productId: p.id })}
            onToggleFavorite={toggleFavorite}
            onOpenRequestQuote={() => navigate({ page: 'quotations' })}
            onOpenAuthForPartner={() => {
              setAuthInitialMode('register');
              setShowAuthModal(true);
            }}
          />
        )}

        {route.page === 'search' && (
          <SearchResultsPage initialQuery={route.query} initialCategory={route.category} />
        )}

        {route.page === 'category' && <CategoryListingPage category={route.category} />}

        {route.page === 'provider' && (
          <ProviderProfilePage organizationId={route.organizationId} />
        )}

        {route.page === 'product' && <ProductDetailPage productId={route.productId} />}

        {route.page === 'booking' && (
          <BookingFlowPage
            productId={route.productId}
            initialDate={route.date}
            initialTravelers={route.travelers}
          />
        )}

        {route.page === 'booking-confirmation' && (
          <BookingConfirmationPage bookingId={route.bookingId} />
        )}

        {route.page === 'quotations' && <QuotationsPage initialRequestId={route.requestId} />}

        {route.page === 'dashboard' && (
          <DashboardShell roleOverride={route.role} initialTab={route.tab} />
        )}
      </main>

      {/* Quiet Editorial Footer with Complete Sector & Workspace Navigation */}
      <footer className="border-t border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950 py-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-6 text-xs">
            <div className="space-y-2">
              <p className="font-semibold text-slate-900 dark:text-white">
                {lang === 'ar' ? 'السوق والاكتشاف' : 'Discovery'}
              </p>
              <button
                type="button"
                onClick={() => navigate({ page: 'home' })}
                className="block text-slate-500 hover:text-slate-900 dark:hover:text-white cursor-pointer"
              >
                {t.navExplore}
              </button>
              <button
                type="button"
                onClick={() => navigate({ page: 'search' })}
                className="block text-slate-500 hover:text-slate-900 dark:hover:text-white cursor-pointer"
              >
                {lang === 'ar' ? 'نتائج البحث' : 'Search Results'}
              </button>
              <button
                type="button"
                onClick={() => navigate({ page: 'quotations' })}
                className="block text-slate-500 hover:text-slate-900 dark:hover:text-white cursor-pointer"
              >
                {lang === 'ar' ? 'الطلبات وعروض الأسعار' : 'Quotations & Requests'}
              </button>
            </div>

            <div className="space-y-2">
              <p className="font-semibold text-slate-900 dark:text-white">
                {lang === 'ar' ? 'القطاعات السياحية' : 'Categories'}
              </p>
              {(['flights', 'hotels', 'tours', 'transport'] as ServiceCategory[]).map((cat) => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => navigate({ page: 'category', category: cat })}
                  className="block text-slate-500 hover:text-slate-900 dark:hover:text-white cursor-pointer"
                >
                  {CATEGORIES[cat][lang]}
                </button>
              ))}
            </div>

            <div className="space-y-2">
              <p className="font-semibold text-slate-900 dark:text-white">
                {lang === 'ar' ? 'قطاعات إضافية' : 'More Sectors'}
              </p>
              {(['car_rentals', 'cruises', 'hajj_umrah', 'visas_packages'] as ServiceCategory[]).map(
                (cat) => (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => navigate({ page: 'category', category: cat })}
                    className="block text-slate-500 hover:text-slate-900 dark:hover:text-white cursor-pointer"
                  >
                    {CATEGORIES[cat][lang]}
                  </button>
                )
              )}
            </div>

            <div className="space-y-2">
              <p className="font-semibold text-slate-900 dark:text-white">
                {lang === 'ar' ? 'لوحات التحكم' : 'Dashboards'}
              </p>
              <button
                type="button"
                onClick={() => navigate({ page: 'dashboard', role: 'customer' })}
                className="block text-slate-500 hover:text-slate-900 dark:hover:text-white cursor-pointer"
              >
                {t.roleCustomer}
              </button>
              <button
                type="button"
                onClick={() => navigate({ page: 'dashboard', role: 'provider' })}
                className="block text-slate-500 hover:text-slate-900 dark:hover:text-white cursor-pointer"
              >
                {t.roleProvider}
              </button>
              <button
                type="button"
                onClick={() => navigate({ page: 'dashboard', role: 'seller' })}
                className="block text-slate-500 hover:text-slate-900 dark:hover:text-white cursor-pointer"
              >
                {t.roleSeller}
              </button>
              <button
                type="button"
                onClick={() => navigate({ page: 'dashboard', role: 'admin' })}
                className="block text-slate-500 hover:text-slate-900 dark:hover:text-white cursor-pointer"
              >
                {t.roleAdmin}
              </button>
            </div>
          </div>

          <div className="pt-6 border-t border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500">
            <p>{t.footerNote}</p>
            <div className="flex flex-wrap items-center justify-center gap-3 sm:gap-4">
              <div className="flex items-center gap-1 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-0.5">
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
              <div className="flex items-center gap-1 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-0.5">
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
              <button
                type="button"
                onClick={() => setConfirmResetOpen(true)}
                className="inline-flex items-center gap-1.5 text-slate-500 hover:text-slate-900 dark:hover:text-white hover:underline cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>{lang === 'ar' ? 'إعادة ضبط العرض التجريبي' : 'Reset Demo Data'}</span>
              </button>
              {activeUser && (
                <button
                  type="button"
                  onClick={logout}
                  className="text-red-600 hover:underline cursor-pointer"
                >
                  {t.logout}
                </button>
              )}
            </div>
          </div>
        </div>
      </footer>

      {showAuthModal && (
        <AuthModal
          lang={lang}
          initialMode={authInitialMode}
          onClose={() => setShowAuthModal(false)}
          onAuthenticated={(authedUser) => {
            navigate({ page: 'dashboard', role: authedUser.role });
          }}
        />
      )}

      <ConfirmDialog
        open={confirmResetOpen}
        title={lang === 'ar' ? 'إعادة ضبط البيانات التجريبية' : 'Reset Demo Marketplace Data'}
        message={
          lang === 'ar'
            ? 'سيتم مسح جميع الحجوزات والمنتجات والروابط والتغييرات المحفوظة محليًا وإرجاع المنصة إلى بياناتها الافتراضية.'
            : 'This will clear all locally persisted demo bookings, custom products, affiliate links, and restore initial marketplace data.'
        }
        confirmLabel={lang === 'ar' ? 'نعم، إعادة الضبط' : 'Yes, Reset Data'}
        cancelLabel={lang === 'ar' ? 'إلغاء' : 'Cancel'}
        variant="danger"
        onConfirm={() => {
          resetDemoData();
          setConfirmResetOpen(false);
        }}
        onCancel={() => setConfirmResetOpen(false)}
      />
    </div>
  );
}
