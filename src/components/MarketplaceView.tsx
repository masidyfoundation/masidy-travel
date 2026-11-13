import { useState } from 'react';
import { Bookmark, Building2, Film, Image as ImageIcon, Search, Star } from 'lucide-react';
import type {
  CurrencyCode,
  Language,
  Organization,
  Product,
  ProductModel,
  ServiceCategory,
} from '../shared/types.ts';
import { CATEGORIES, PRODUCT_MODELS, UI_TEXT } from '../shared/i18n.ts';
import { convertAmount, formatMoney } from '../shared/currency.ts';

interface MarketplaceViewProps {
  lang: Language;
  currency: CurrencyCode;
  onChangeLang: (lang: Language) => void;
  onChangeCurrency: (currency: CurrencyCode) => void;
  products: Product[];
  organizations: Organization[];
  favoriteIds: string[];
  loading: boolean;
  searchQuery: string;
  selectedCategory: string;
  selectedModel: string;
  selectedProviderId: string;
  sortBy: string;
  activeReferral: string;
  onSearchChange: (q: string) => void;
  onCategoryChange: (cat: string) => void;
  onModelChange: (model: string) => void;
  onProviderChange: (id: string) => void;
  onSortChange: (sort: string) => void;
  onResetFilters: () => void;
  onSelectProduct: (product: Product) => void;
  onToggleFavorite: (productId: string) => void;
  onOpenRequestQuote: () => void;
  onOpenAuthForPartner: () => void;
}

export function MarketplaceView({
  lang,
  currency,
  onChangeLang,
  onChangeCurrency,
  products,
  organizations,
  favoriteIds,
  loading,
  searchQuery,
  selectedCategory,
  selectedModel,
  selectedProviderId,
  sortBy,
  activeReferral,
  onSearchChange,
  onCategoryChange,
  onModelChange,
  onProviderChange,
  onSortChange,
  onResetFilters,
  onSelectProduct,
  onToggleFavorite,
  onOpenRequestQuote,
  onOpenAuthForPartner,
}: MarketplaceViewProps) {
  const t = UI_TEXT[lang];
  const [heroImgFailed, setHeroImgFailed] = useState(false);

  return (
    <div className="space-y-12 pb-16">
      {/* Section 1: Editorial Split Hero Showcase */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch">
          <div className="lg:col-span-6 flex flex-col justify-between py-2">
            <div>
              <p className="text-xs font-medium text-blue-600 dark:text-blue-400">
                {t.freeCompanyBanner}
              </p>
              <h1
                className="mt-3 font-bold tracking-tight text-slate-900 dark:text-white leading-[1.15]"
                style={{ fontSize: 'clamp(2rem, 3.6vw, 3.15rem)', textWrap: 'balance' }}
              >
                {t.heroTitle}
              </h1>
              <p className="mt-4 text-base text-slate-600 dark:text-slate-300 leading-relaxed max-w-xl">
                {t.heroSubtitle}
              </p>

              <div className="mt-7 flex flex-wrap items-center gap-3">
                <a
                  href="#marketplace-catalog"
                  className="px-5 py-2.5 rounded-lg bg-[#F95738] hover:bg-[#e1482b] text-white text-sm font-semibold transition-colors whitespace-nowrap shrink-0"
                >
                  {t.heroPrimaryCta}
                </a>
                <button
                  type="button"
                  onClick={onOpenRequestQuote}
                  className="px-5 py-2.5 rounded-lg border border-slate-300 dark:border-slate-700 hover:border-slate-400 text-slate-800 dark:text-slate-100 text-sm font-medium transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                >
                  {t.heroSecondaryCta}
                </button>
              </div>
            </div>

            {activeReferral && (
              <div className="mt-6 text-xs text-slate-600 dark:text-slate-300 border-t border-slate-200 dark:border-slate-800 pt-3">
                <span>
                  {lang === 'ar'
                    ? 'كود المسوق النشط لهذا التصفح:'
                    : 'Active affiliate referral code:'}{' '}
                </span>
                <span className="font-mono font-semibold text-blue-600 dark:text-blue-400">
                  {activeReferral}
                </span>
              </div>
            )}
          </div>

          <div className="lg:col-span-6">
            <div className="h-64 sm:h-96 lg:h-full lg:min-h-[340px] w-full overflow-hidden rounded-xl bg-slate-100 dark:bg-slate-800">
              {!heroImgFailed ? (
                <img
                  src="/src/assets/images/hero_masidy_travel_1794591852990.jpg"
                  alt="Masidy Global Travel Marketplace"
                  referrerPolicy="no-referrer"
                  onError={() => setHeroImgFailed(true)}
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="h-full w-full flex items-center justify-center bg-slate-100 dark:bg-slate-800 text-slate-500 text-sm">
                  MASIDY Travel Marketplace
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Section 2: Unified Search & Localization Utility Bar (Below Hero) */}
      <section id="marketplace-catalog" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/60 p-4 sm:p-5 space-y-4">
          <div className="flex flex-col lg:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-400 absolute top-1/2 -translate-y-1/2 start-3.5 pointer-events-none" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => onSearchChange(e.target.value)}
                placeholder={t.searchPlaceholder}
                className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 ps-10 pe-4 py-2.5 text-sm text-slate-900 dark:text-white focus:outline-2 focus:outline-blue-600"
              />
            </div>

            <div className="flex flex-wrap lg:flex-nowrap items-center gap-2.5">
              <select
                value={selectedModel}
                onChange={(e) => onModelChange(e.target.value)}
                className="flex-1 sm:flex-none min-w-[140px] rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2.5 text-sm text-slate-700 dark:text-slate-200"
              >
                <option value="all">{t.allModels}</option>
                {(Object.keys(PRODUCT_MODELS) as ProductModel[]).map((m) => (
                  <option key={m} value={m}>
                    {PRODUCT_MODELS[m][lang]}
                  </option>
                ))}
              </select>

              <select
                value={sortBy}
                onChange={(e) => onSortChange(e.target.value)}
                className="flex-1 sm:flex-none min-w-[140px] rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2.5 text-sm text-slate-700 dark:text-slate-200"
              >
                <option value="rating">{t.sortRecommended}</option>
                <option value="price_asc">{t.sortPriceLow}</option>
                <option value="price_desc">{t.sortPriceHigh}</option>
              </select>

              {/* Language Switcher (AR RTL / EN LTR / IT LTR) */}
              <div className="flex items-center p-1 rounded-lg bg-slate-200/70 dark:bg-slate-800">
                {(['ar', 'en', 'it'] as Language[]).map((l) => (
                  <button
                    key={l}
                    type="button"
                    onClick={() => onChangeLang(l)}
                    className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors cursor-pointer uppercase ${
                      lang === l
                        ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                        : 'text-slate-600 dark:text-slate-300'
                    }`}
                  >
                    {l}
                  </button>
                ))}
              </div>

              {/* Currency Switcher (EUR / USD / EGP) */}
              <div className="flex items-center p-1 rounded-lg bg-slate-200/70 dark:bg-slate-800">
                {(['EUR', 'USD', 'EGP'] as CurrencyCode[]).map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => onChangeCurrency(c)}
                    className={`px-2.5 py-1 text-xs font-mono font-medium rounded-md transition-colors cursor-pointer ${
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

          {/* Interactive Sector Filter Tabs */}
          <div className="flex flex-col sm:flex-row sm:flex-wrap sm:items-center justify-between gap-3 pt-1">
            <div className="flex flex-nowrap sm:flex-wrap items-center gap-1.5 overflow-x-auto sm:overflow-visible pb-1 sm:pb-0 no-scrollbar">
              <button
                type="button"
                onClick={() => onCategoryChange('all')}
                className={`px-3 py-2 sm:py-1.5 text-xs font-medium rounded-md transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
                  selectedCategory === 'all'
                    ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900'
                    : 'text-slate-600 dark:text-slate-300 hover:bg-slate-200/60 dark:hover:bg-slate-800'
                }`}
              >
                {t.allCategories}
              </button>
              {(Object.keys(CATEGORIES) as ServiceCategory[]).map((cat) => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => onCategoryChange(cat)}
                  className={`px-3 py-2 sm:py-1.5 text-xs font-medium rounded-md transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
                    selectedCategory === cat
                      ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900'
                      : 'text-slate-600 dark:text-slate-300 hover:bg-slate-200/60 dark:hover:bg-slate-800'
                  }`}
                >
                  {CATEGORIES[cat][lang]}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-3 text-xs text-slate-500">
              <span className="font-mono tabular-nums">
                {products.length} {t.servicesAvailable}
              </span>
              {(searchQuery ||
                selectedCategory !== 'all' ||
                selectedModel !== 'all' ||
                selectedProviderId !== 'all') && (
                <button
                  type="button"
                  onClick={onResetFilters}
                  className="text-blue-600 dark:text-blue-400 hover:underline font-medium cursor-pointer"
                >
                  {t.resetFilters}
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Section 3: 3-Column Product Catalog Grid */}
        {loading ? (
          <div className="mt-8 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3].map((n) => (
              <div
                key={n}
                className="h-96 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 animate-pulse"
              />
            ))}
          </div>
        ) : products.length === 0 ? (
          <div className="mt-8 rounded-xl border border-slate-200 dark:border-slate-800 p-12 text-center">
            <p className="text-sm text-slate-600 dark:text-slate-300">{t.noResults}</p>
            <button
              type="button"
              onClick={onResetFilters}
              className="mt-4 px-4 py-2 rounded-lg bg-slate-900 text-white dark:bg-white dark:text-slate-900 text-xs font-medium cursor-pointer"
            >
              {t.resetFilters}
            </button>
          </div>
        ) : (
          <div className="mt-8 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {products.map((product) => {
              const displayPrice = convertAmount(product.price, product.baseCurrency, currency);
              const isFav = favoriteIds.includes(product.id);

              return (
                <article
                  key={product.id}
                  className="group flex flex-col rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden transition-transform duration-200 hover:-translate-y-0.5"
                >
                  <div
                    onClick={() => onSelectProduct(product)}
                    className="aspect-4/3 w-full overflow-hidden bg-slate-100 dark:bg-slate-800 cursor-pointer relative"
                  >
                    <img
                      src={product.imageUrl}
                      alt={product.title[lang]}
                      referrerPolicy="no-referrer"
                      className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.02]"
                    />
                    {product.mediaGallery && product.mediaGallery.length > 0 && (
                      <span className="absolute bottom-3 start-3 inline-flex items-center gap-1 rounded-md bg-slate-950/75 px-2 py-1 text-[10px] font-medium text-white">
                        {product.mediaGallery.some((m) => m.type === 'video') ? (
                          <Film className="w-3 h-3" />
                        ) : (
                          <ImageIcon className="w-3 h-3" />
                        )}
                        <span>{product.mediaGallery.length}</span>
                      </span>
                    )}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onToggleFavorite(product.id);
                      }}
                      className="absolute top-3 end-3 p-2 rounded-lg bg-white/90 dark:bg-slate-900/90 text-slate-700 dark:text-slate-200 hover:text-[#F95738] transition-colors cursor-pointer"
                      aria-label={isFav ? t.savedFavorite : t.saveFavorite}
                    >
                      <Bookmark
                        className={`w-4 h-4 ${isFav ? 'fill-[#F95738] text-[#F95738]' : ''}`}
                      />
                    </button>
                  </div>

                  <div className="flex flex-1 flex-col justify-between p-4 sm:p-5 min-w-0">
                    <div className="min-w-0">
                      {/* Clean unboxed metadata with typographic separator */}
                      <div className="flex flex-wrap items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
                        <span>{CATEGORIES[product.category][lang]}</span>
                        <span aria-hidden="true">·</span>
                        <span className="truncate">{product.destination[lang]}</span>
                      </div>

                      <h3
                        onClick={() => onSelectProduct(product)}
                        className="mt-1.5 text-base font-semibold text-slate-900 dark:text-white leading-snug cursor-pointer group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors"
                      >
                        {product.title[lang]}
                      </h3>

                      <div className="mt-2 flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 min-w-0">
                        <button
                          type="button"
                          onClick={() => onProviderChange(product.organizationId)}
                          className="hover:text-slate-900 dark:hover:text-white hover:underline cursor-pointer truncate min-w-0"
                        >
                          {product.providerName}
                        </button>
                        <span aria-hidden="true">·</span>
                        <span className="inline-flex items-center gap-1 font-mono tabular-nums text-slate-700 dark:text-slate-200 shrink-0">
                          <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                          {product.rating.toFixed(1)}
                        </span>
                      </div>
                    </div>

                    <div className="mt-5 pt-4 border-t border-slate-100 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3">
                      <div className="min-w-0">
                        <div className="text-base font-bold font-mono tabular-nums text-slate-900 dark:text-white">
                          {formatMoney(displayPrice, currency)}
                        </div>
                        <div className="text-[11px] text-slate-500">
                          {PRODUCT_MODELS[product.productModel][lang]} ·{' '}
                          {product.instantBooking ? t.instantConfirm : t.requiresApproval}
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => onSelectProduct(product)}
                        className="min-h-[40px] px-4 py-2 rounded-lg bg-slate-900 hover:bg-slate-800 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-100 text-white text-xs font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                      >
                        {t.viewAndBook}
                      </button>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>

      {/* Section 4: Verified Partners & Multi-Vendor Architecture Strip */}
      <section id="partners-section" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="rounded-xl border border-slate-200 dark:border-slate-800 p-6 sm:p-8 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
          <div className="max-w-2xl">
            <h2 className="text-xl font-bold text-slate-900 dark:text-white">
              {lang === 'ar'
                ? 'شركات السياحة المعتمدة وشبكة المسوقين'
                : lang === 'it'
                ? 'Operatori Verificati e Rete Affiliati'
                : 'Verified Tourism Providers & Affiliate Network'}
            </h2>
            <p className="mt-1.5 text-sm text-slate-600 dark:text-slate-300">
              {t.freeCompanyBanner}
            </p>
            <div className="mt-4 flex flex-wrap gap-3">
              {organizations.map((org) => (
                <button
                  key={org.id}
                  type="button"
                  onClick={() => onProviderChange(org.id)}
                  className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border text-xs font-medium transition-colors cursor-pointer ${
                    selectedProviderId === org.id
                      ? 'border-blue-600 bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300'
                      : 'border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:border-slate-400'
                  }`}
                >
                  {org.logoUrl ? (
                    <img
                      src={org.logoUrl}
                      alt={org.name}
                      className="w-4 h-4 rounded-sm object-cover shrink-0"
                    />
                  ) : (
                    <Building2 className="w-3.5 h-3.5" />
                  )}
                  <span>{org.name}</span>
                  <span className="text-slate-400">· {org.city}</span>
                </button>
              ))}
            </div>
          </div>

          <button
            type="button"
            onClick={onOpenAuthForPartner}
            className="px-5 py-2.5 rounded-lg bg-[#0052CC] hover:bg-[#0041a3] text-white text-sm font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            {lang === 'ar'
              ? 'سجل شركتك مجانًا أو انضم كبائع'
              : lang === 'it'
              ? 'Registra Agenzia Gratis o Affiliato'
              : 'Join Free as Provider or Seller'}
          </button>
        </div>
      </section>
    </div>
  );
}
