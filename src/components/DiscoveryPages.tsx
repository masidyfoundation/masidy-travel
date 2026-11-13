import { useEffect, useMemo, useState } from 'react';
import {
  AlertCircle,
  Building2,
  Calendar,
  CheckCircle2,
  Clock,
  Film,
  Globe,
  Image as ImageIcon,
  Mail,
  MapPin,
  Phone,
  SearchX,
  SlidersHorizontal,
  Star,
} from 'lucide-react';
import { useMarketplace } from '../context/MarketplaceContext.tsx';
import type { MediaItem, ProductModel, ServiceCategory } from '../shared/types.ts';
import { CATEGORIES, PRODUCT_MODELS, UI_TEXT } from '../shared/i18n.ts';
import { convertAmount, formatMoney } from '../shared/currency.ts';
import { PageHeader } from './PageHeader.tsx';
import { ProductCard } from './ProductCard.tsx';
import { MediaRenderer } from './MediaUploader.tsx';

export function SearchResultsPage({
  initialQuery = '',
  initialCategory = 'all',
}: {
  initialQuery?: string;
  initialCategory?: string;
}) {
  const {
    lang,
    currency,
    products,
    organizations,
    favoriteIds,
    toggleFavorite,
    navigate,
  } = useMarketplace();
  const t = UI_TEXT[lang];

  const [query, setQuery] = useState(initialQuery);
  const [category, setCategory] = useState<string>(initialCategory);
  const [model, setModel] = useState<string>('all');
  const [providerId, setProviderId] = useState<string>('all');
  const [maxPrice, setMaxPrice] = useState<string>('');
  const [minRating, setMinRating] = useState<number>(0);
  const [instantOnly, setInstantOnly] = useState(false);
  const [sort, setSort] = useState<'rating' | 'price_asc' | 'price_desc'>('rating');
  const [showFiltersMobile, setShowFiltersMobile] = useState(false);
  const [isFiltering, setIsFiltering] = useState(false);

  useEffect(() => {
    setIsFiltering(true);
    const id = window.setTimeout(() => setIsFiltering(false), 160);
    return () => window.clearTimeout(id);
  }, [query, category, model, providerId, maxPrice, minRating, instantOnly, sort]);

  function resetAll() {
    setQuery('');
    setCategory('all');
    setModel('all');
    setProviderId('all');
    setMaxPrice('');
    setMinRating(0);
    setInstantOnly(false);
  }

  const filtered = useMemo(() => {
    let list = products.filter((p) => p.published);
    if (category !== 'all') list = list.filter((p) => p.category === category);
    if (model !== 'all') list = list.filter((p) => p.productModel === model);
    if (providerId !== 'all') list = list.filter((p) => p.organizationId === providerId);
    if (instantOnly) list = list.filter((p) => p.instantBooking);
    if (minRating > 0) list = list.filter((p) => p.rating >= minRating);
    if (maxPrice && Number(maxPrice) > 0) {
      list = list.filter(
        (p) => convertAmount(p.price, p.baseCurrency, currency) <= Number(maxPrice)
      );
    }
    if (query.trim()) {
      const q = query.trim().toLowerCase();
      list = list.filter((p) =>
        [
          p.title.ar,
          p.title.en,
          p.title.it,
          p.destination.ar,
          p.destination.en,
          p.destination.it,
          p.providerName,
          p.country,
        ]
          .join(' ')
          .toLowerCase()
          .includes(q)
      );
    }
    if (sort === 'price_asc') {
      list = [...list].sort(
        (a, b) =>
          convertAmount(a.price, a.baseCurrency, 'EUR') -
          convertAmount(b.price, b.baseCurrency, 'EUR')
      );
    } else if (sort === 'price_desc') {
      list = [...list].sort(
        (a, b) =>
          convertAmount(b.price, b.baseCurrency, 'EUR') -
          convertAmount(a.price, a.baseCurrency, 'EUR')
      );
    } else {
      list = [...list].sort((a, b) => b.rating - a.rating);
    }
    return list;
  }, [products, category, model, providerId, instantOnly, minRating, maxPrice, currency, query, sort]);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      <PageHeader
        breadcrumbs={[
          { label: t.navExplore, onClick: () => navigate({ page: 'home' }) },
          { label: lang === 'ar' ? 'نتائج البحث المتقدم' : 'Search Results' },
        ]}
        title={lang === 'ar' ? 'نتائج البحث في السوق السياحي' : 'Marketplace Search Results'}
        subtitle={
          lang === 'ar'
            ? 'صفِّ وقارن جميع الخدمات السياحية عبر الشركات المعتمدة والعملات المتعددة.'
            : 'Filter and compare multi-sector travel services across verified providers.'
        }
        actions={
          <button
            type="button"
            onClick={() => navigate({ page: 'quotations' })}
            className="px-4 py-2 rounded-lg bg-[#0052CC] text-white text-xs font-semibold cursor-pointer"
          >
            {t.heroSecondaryCta}
          </button>
        }
      />

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8">
        {/* Mobile/Tablet Filter Toggle */}
        <div className="lg:hidden flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={() => setShowFiltersMobile((v) => !v)}
            className="inline-flex items-center gap-2 min-h-[42px] px-4 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-semibold cursor-pointer"
          >
            <SlidersHorizontal className="w-4 h-4" />
            <span>
              {showFiltersMobile
                ? lang === 'ar'
                  ? 'إخفاء الفلاتر'
                  : 'Hide Filters'
                : lang === 'ar'
                ? 'عرض الفلاتر'
                : 'Show Filters'}
            </span>
          </button>
          <span className="text-xs font-mono tabular-nums text-slate-500">
            {filtered.length} {t.servicesAvailable}
          </span>
        </div>

        {/* Sidebar Filters */}
        <aside className={`lg:col-span-3 space-y-5 ${showFiltersMobile ? 'block' : 'hidden lg:block'}`}>
          <div className="rounded-xl border border-slate-200 dark:border-slate-800 p-4 sm:p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold flex items-center gap-2">
                <SlidersHorizontal className="w-4 h-4" />
                <span>{lang === 'ar' ? 'تصفية النتائج' : 'Filters'}</span>
              </h2>
              <button
                type="button"
                onClick={resetAll}
                className="text-xs text-blue-600 hover:underline cursor-pointer"
              >
                {t.resetFilters}
              </button>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">
                {lang === 'ar' ? 'كلمة البحث / الوجهة' : 'Keyword / Destination'}
              </label>
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={t.searchPlaceholder}
                className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-sm"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">
                {lang === 'ar' ? 'القطاع السياحي' : 'Category'}
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-sm"
              >
                <option value="all">{t.allCategories}</option>
                {(Object.keys(CATEGORIES) as ServiceCategory[]).map((c) => (
                  <option key={c} value={c}>
                    {CATEGORIES[c][lang]}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">
                {lang === 'ar' ? 'نموذج المنتج' : 'Product Model'}
              </label>
              <select
                value={model}
                onChange={(e) => setModel(e.target.value)}
                className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-sm"
              >
                <option value="all">{t.allModels}</option>
                {(Object.keys(PRODUCT_MODELS) as ProductModel[]).map((m) => (
                  <option key={m} value={m}>
                    {PRODUCT_MODELS[m][lang]}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">
                {lang === 'ar' ? 'الشركة المزودة' : 'Provider'}
              </label>
              <select
                value={providerId}
                onChange={(e) => setProviderId(e.target.value)}
                className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-sm"
              >
                <option value="all">{lang === 'ar' ? 'كل الشركات' : 'All Providers'}</option>
                {organizations.map((o) => (
                  <option key={o.id} value={o.id}>
                    {o.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">
                {lang === 'ar' ? `أقصى سعر (${currency})` : `Max Price (${currency})`}
              </label>
              <input
                type="number"
                value={maxPrice}
                onChange={(e) => setMaxPrice(e.target.value)}
                placeholder="e.g. 1000"
                className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-sm font-mono"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">
                {lang === 'ar' ? 'الحد الأدنى للتقييم' : 'Minimum Rating'}
              </label>
              <select
                value={minRating}
                onChange={(e) => setMinRating(Number(e.target.value))}
                className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-sm font-mono"
              >
                <option value={0}>Any</option>
                <option value={4.5}>4.5+</option>
                <option value={4.8}>4.8+</option>
              </select>
            </div>

            <label className="flex items-center gap-2 text-xs text-slate-700 dark:text-slate-300 cursor-pointer pt-1">
              <input
                type="checkbox"
                checked={instantOnly}
                onChange={(e) => setInstantOnly(e.target.checked)}
              />
              <span>{t.instantConfirm}</span>
            </label>
          </div>
        </aside>

        {/* Results Grid */}
        <div className="lg:col-span-9 space-y-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-xs font-mono tabular-nums text-slate-500">
              {filtered.length} {t.servicesAvailable}
            </p>
            <select
              value={sort}
              onChange={(e) => setSort(e.target.value as any)}
              className="rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-1.5 text-xs"
            >
              <option value="rating">{t.sortRecommended}</option>
              <option value="price_asc">{t.sortPriceLow}</option>
              <option value="price_desc">{t.sortPriceHigh}</option>
            </select>
          </div>

          {isFiltering ? (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6" aria-busy="true">
              {[0, 1, 2].map((skeleton) => (
                <div
                  key={skeleton}
                  className="rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden animate-pulse"
                >
                  <div className="aspect-4/3 bg-slate-100 dark:bg-slate-800" />
                  <div className="p-5 space-y-3">
                    <div className="h-3 w-24 rounded bg-slate-100 dark:bg-slate-800" />
                    <div className="h-5 w-3/4 rounded bg-slate-100 dark:bg-slate-800" />
                    <div className="h-3 w-1/2 rounded bg-slate-100 dark:bg-slate-800" />
                  </div>
                </div>
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <div className="rounded-xl border border-slate-200 dark:border-slate-800 p-8 sm:p-12 text-center space-y-4">
              <div className="mx-auto w-11 h-11 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-500">
                <SearchX className="w-5 h-5" />
              </div>
              <div className="space-y-1">
                <p className="text-sm font-semibold text-slate-900 dark:text-white">
                  {t.noResults}
                </p>
                <p className="text-xs text-slate-500 max-w-md mx-auto">
                  {lang === 'ar'
                    ? 'جرب توسيع معايير البحث أو إزالة الفلاتر الحالية، أو أرسل طلب رحلة مخصص لشركات السياحة.'
                    : 'Try broadening your filters or keyword, or submit a custom trip request for tailored offers.'}
                </p>
              </div>
              <div className="flex flex-wrap items-center justify-center gap-2 pt-1">
                <button
                  type="button"
                  onClick={resetAll}
                  className="px-4 py-2 rounded-lg border border-slate-200 dark:border-slate-700 text-xs font-semibold hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer"
                >
                  {t.resetFilters}
                </button>
                <button
                  type="button"
                  onClick={() => navigate({ page: 'quotations' })}
                  className="px-4 py-2 rounded-lg bg-[#0052CC] text-white text-xs font-semibold cursor-pointer"
                >
                  {t.heroSecondaryCta}
                </button>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
              {filtered.map((p) => (
                <ProductCard
                  key={p.id}
                  product={p}
                  lang={lang}
                  currency={currency}
                  isFavorite={favoriteIds.includes(p.id)}
                  onOpenProduct={(prod) => navigate({ page: 'product', productId: prod.id })}
                  onOpenProvider={(orgId) => navigate({ page: 'provider', organizationId: orgId })}
                  onToggleFavorite={toggleFavorite}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export function CategoryListingPage({ category }: { category: ServiceCategory }) {
  const { lang, currency, products, favoriteIds, toggleFavorite, navigate } = useMarketplace();
  const t = UI_TEXT[lang];
  const [sort, setSort] = useState<'rating' | 'price_asc' | 'price_desc'>('rating');

  const categoryProducts = useMemo(() => {
    const list = products.filter((p) => p.published && p.category === category);
    if (sort === 'price_asc') {
      return [...list].sort(
        (a, b) =>
          convertAmount(a.price, a.baseCurrency, 'EUR') -
          convertAmount(b.price, b.baseCurrency, 'EUR')
      );
    }
    if (sort === 'price_desc') {
      return [...list].sort(
        (a, b) =>
          convertAmount(b.price, b.baseCurrency, 'EUR') -
          convertAmount(a.price, a.baseCurrency, 'EUR')
      );
    }
    return [...list].sort((a, b) => b.rating - a.rating);
  }, [products, category, sort]);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      <PageHeader
        breadcrumbs={[
          { label: t.navExplore, onClick: () => navigate({ page: 'home' }) },
          { label: CATEGORIES[category][lang] },
        ]}
        title={CATEGORIES[category][lang]}
        subtitle={
          lang === 'ar'
            ? `استعرض جميع العروض والخدمات المعتمدة في قطاع ${CATEGORIES[category].ar}`
            : `Browse verified listings and instant offers in ${CATEGORIES[category][lang]}`
        }
        actions={
          <button
            type="button"
            onClick={() => navigate({ page: 'search', category })}
            className="px-4 py-2 rounded-lg border border-slate-200 dark:border-slate-700 text-xs font-medium cursor-pointer"
          >
            {lang === 'ar' ? 'بحث متقدم' : 'Advanced Filters'}
          </button>
        }
      />

      {/* All 8 Sectors Switcher */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-200 dark:border-slate-800">
        <div className="flex flex-nowrap sm:flex-wrap gap-1.5 overflow-x-auto sm:overflow-visible pb-1 sm:pb-0 no-scrollbar">
          {(Object.keys(CATEGORIES) as ServiceCategory[]).map((cat) => (
            <button
              key={cat}
              type="button"
              onClick={() => navigate({ page: 'category', category: cat })}
              className={`px-3 py-2 sm:py-1.5 text-xs font-medium rounded-md transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
                cat === category
                  ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900'
                  : 'border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:border-slate-400'
              }`}
            >
              {CATEGORIES[cat][lang]}
            </button>
          ))}
        </div>

        <select
          value={sort}
          onChange={(e) => setSort(e.target.value as any)}
          className="self-start sm:self-auto rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-xs"
        >
          <option value="rating">{t.sortRecommended}</option>
          <option value="price_asc">{t.sortPriceLow}</option>
          <option value="price_desc">{t.sortPriceHigh}</option>
        </select>
      </div>

      {categoryProducts.length === 0 ? (
        <div className="rounded-xl border border-slate-200 dark:border-slate-800 p-8 sm:p-12 text-center space-y-4">
          <div className="mx-auto w-11 h-11 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-500">
            <SearchX className="w-5 h-5" />
          </div>
          <p className="text-sm font-medium text-slate-700 dark:text-slate-300">{t.noResults}</p>
          <div className="flex flex-wrap items-center justify-center gap-2">
            <button
              type="button"
              onClick={() => navigate({ page: 'search' })}
              className="px-4 py-2 rounded-lg border border-slate-200 dark:border-slate-700 text-xs font-semibold cursor-pointer"
            >
              {lang === 'ar' ? 'استعراض جميع القطاعات' : 'Browse All Sectors'}
            </button>
            <button
              type="button"
              onClick={() => navigate({ page: 'quotations' })}
              className="px-4 py-2 rounded-lg bg-[#0052CC] text-white text-xs font-semibold cursor-pointer"
            >
              {t.heroSecondaryCta}
            </button>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {categoryProducts.map((p) => (
            <ProductCard
              key={p.id}
              product={p}
              lang={lang}
              currency={currency}
              isFavorite={favoriteIds.includes(p.id)}
              onOpenProduct={(prod) => navigate({ page: 'product', productId: prod.id })}
              onOpenProvider={(orgId) => navigate({ page: 'provider', organizationId: orgId })}
              onToggleFavorite={toggleFavorite}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export function ProviderProfilePage({ organizationId }: { organizationId: string }) {
  const { lang, currency, organizations, products, favoriteIds, toggleFavorite, navigate } =
    useMarketplace();
  const t = UI_TEXT[lang];
  const org = organizations.find((o) => o.id === organizationId) || organizations[0];
  const orgProducts = products.filter((p) => p.organizationId === org.id && p.published);
  const orgMedia = org.mediaGallery || [];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      <PageHeader
        breadcrumbs={[
          { label: t.navExplore, onClick: () => navigate({ page: 'home' }) },
          { label: t.navPartners },
          { label: org.name },
        ]}
        title={org.name}
        subtitle={org.description[lang]}
        actions={
          <button
            type="button"
            onClick={() => navigate({ page: 'quotations' })}
            className="px-4 py-2 rounded-lg bg-[#0052CC] text-white text-xs font-semibold cursor-pointer"
          >
            {t.heroSecondaryCta}
          </button>
        }
      />

      {(org.coverImageUrl || org.logoUrl) && (
        <div className="rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden bg-slate-50 dark:bg-slate-900">
          {org.coverImageUrl && (
            <div className="h-44 sm:h-60 w-full overflow-hidden bg-slate-100 dark:bg-slate-800">
              <img
                src={org.coverImageUrl}
                alt={org.name}
                className="h-full w-full object-cover"
              />
            </div>
          )}
          <div className="p-4 sm:p-5 flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3.5 min-w-0">
              {org.logoUrl && (
                <img
                  src={org.logoUrl}
                  alt={org.name}
                  className="w-14 h-14 rounded-xl object-cover border border-slate-200 dark:border-slate-700 bg-white shrink-0"
                />
              )}
              <div className="min-w-0">
                <p className="text-sm font-bold text-slate-900 dark:text-white truncate">{org.name}</p>
                {org.website && (
                  <p className="text-xs font-mono text-blue-600 dark:text-blue-400 truncate mt-0.5">
                    {org.website}
                  </p>
                )}
              </div>
            </div>
            {org.languagesServed && org.languagesServed.length > 0 && (
              <div className="text-xs text-slate-500">
                {lang === 'ar' ? 'اللغات:' : 'Languages:'} {org.languagesServed.join(', ')}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Company Overview Metadata */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="rounded-xl border border-slate-200 dark:border-slate-800 p-4">
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <MapPin className="w-3.5 h-3.5" />
            <span>{lang === 'ar' ? 'المقر' : 'Location'}</span>
          </div>
          <p className="mt-1.5 text-sm font-semibold">
            {org.city}, {org.country}
          </p>
        </div>
        <div className="rounded-xl border border-slate-200 dark:border-slate-800 p-4">
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <Mail className="w-3.5 h-3.5" />
            <span>{lang === 'ar' ? 'البريد التجاري' : 'Reservations Email'}</span>
          </div>
          <p className="mt-1.5 text-xs font-mono truncate">{org.contactEmail}</p>
        </div>
        <div className="rounded-xl border border-slate-200 dark:border-slate-800 p-4">
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <Phone className="w-3.5 h-3.5" />
            <span>{lang === 'ar' ? 'الهاتف' : 'Phone'}</span>
          </div>
          <p className="mt-1.5 text-xs font-mono">{org.phone}</p>
        </div>
        <div className="rounded-xl border border-slate-200 dark:border-slate-800 p-4">
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <Globe className="w-3.5 h-3.5" />
            <span>{lang === 'ar' ? 'حالة الاعتماد' : 'Verification'}</span>
          </div>
          <p className="mt-1.5 text-sm font-semibold text-emerald-600">
            {org.verified
              ? lang === 'ar'
                ? 'شركة معتمدة · باقة مجانية'
                : 'Verified · Free Plan'
              : 'Pending Review'}
          </p>
        </div>
      </div>

      {/* Company Uploaded Photos & Videos Gallery */}
      {orgMedia.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Film className="w-5 h-5 text-slate-500" />
            <span>
              {lang === 'ar' ? 'معرض صور وفيديوهات الشركة' : 'Company Photos & Videos'} ({orgMedia.length})
            </span>
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {orgMedia.map((m) => (
              <div
                key={m.id}
                className="rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden bg-white dark:bg-slate-900"
              >
                <div className="aspect-video w-full bg-slate-100 dark:bg-slate-800">
                  <MediaRenderer item={m} className="h-full w-full object-cover" />
                </div>
                {(m.caption || m.name) && (
                  <div className="p-3 text-xs text-slate-600 dark:text-slate-300 truncate">
                    {m.caption || m.name}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Company Services Grid */}
      <div className="space-y-4">
        <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
          <Building2 className="w-5 h-5 text-slate-500" />
          <span>
            {lang === 'ar' ? 'الخدمات المتاحة لدى الشركة' : 'Services Offered'} ({orgProducts.length})
          </span>
        </h2>

        {orgProducts.length === 0 ? (
          <div className="rounded-xl border border-slate-200 dark:border-slate-800 p-8 sm:p-10 text-center space-y-3">
            <p className="text-sm font-medium text-slate-700 dark:text-slate-300">
              {lang === 'ar'
                ? 'لا توجد خدمات منشورة لهذه الشركة حاليًا.'
                : 'No published services from this provider yet.'}
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
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {orgProducts.map((p) => (
              <ProductCard
                key={p.id}
                product={p}
                lang={lang}
                currency={currency}
                isFavorite={favoriteIds.includes(p.id)}
                onOpenProduct={(prod) => navigate({ page: 'product', productId: prod.id })}
                onOpenProvider={(orgId) => navigate({ page: 'provider', organizationId: orgId })}
                onToggleFavorite={toggleFavorite}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export function ProductDetailPage({ productId }: { productId: string }) {
  const {
    lang,
    currency,
    products,
    organizations,
    sellers,
    activeReferral,
    availabilitySlots,
    reviews,
    favoriteIds,
    toggleFavorite,
    addReview,
    navigate,
    showToast,
  } = useMarketplace();
  const t = UI_TEXT[lang];

  const product = products.find((p) => p.id === productId) || products[0];
  const org = organizations.find((o) => o.id === product.organizationId);
  const referralSeller = activeReferral
    ? sellers.find(
        (s) =>
          s.status !== 'paused' &&
          (s.referralCode.toUpperCase() === activeReferral.toUpperCase() ||
            s.couponCode.toUpperCase() === activeReferral.toUpperCase())
      )
    : undefined;

  const galleryItems: MediaItem[] = useMemo(() => {
    const cover: MediaItem = {
      id: 'cover',
      type: 'image',
      url: product.imageUrl,
      name: product.title[lang],
      createdAt: product.createdAt,
    };
    const extras = (product.mediaGallery || []).filter((m) => m.url !== product.imageUrl);
    return [cover, ...extras];
  }, [product, lang]);

  const [activeMediaId, setActiveMediaId] = useState('cover');
  useEffect(() => {
    setActiveMediaId('cover');
  }, [product.id]);

  const activeMedia = galleryItems.find((m) => m.id === activeMediaId) || galleryItems[0];

  const allProductSlots = availabilitySlots.filter((s) => s.productId === product.id);
  const openSlots = allProductSlots.filter((s) => s.available && s.remainingUnits > 0);
  const [selectedDate, setSelectedDate] = useState(
    openSlots[0]?.date || product.availableDates[0] || '2026-11-25'
  );
  const [travelers, setTravelers] = useState(1);
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');
  const [reviewError, setReviewError] = useState('');

  const productReviews = reviews.filter((r) => r.productId === product.id);
  const related = products
    .filter((p) => p.id !== product.id && p.published)
    .sort((a, b) => (a.category === product.category ? -1 : 1) - (b.category === product.category ? -1 : 1))
    .slice(0, 3);

  const selectedSlot = allProductSlots.find((s) => s.date === selectedDate);
  const isSlotBlocked = selectedSlot ? !selectedSlot.available || selectedSlot.remainingUnits <= 0 : false;
  const maxAllowed = selectedSlot
    ? Math.max(1, Math.min(product.maxCapacity, selectedSlot.remainingUnits))
    : product.maxCapacity;
  const baseUnitPrice = selectedSlot?.priceOverride ?? product.price;
  const displayUnit = convertAmount(baseUnitPrice, product.baseCurrency, currency);
  const totalDisplay = Number((displayUnit * travelers).toFixed(2));
  const isFav = favoriteIds.includes(product.id);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-12">
      <PageHeader
        breadcrumbs={[
          { label: t.navExplore, onClick: () => navigate({ page: 'home' }) },
          {
            label: CATEGORIES[product.category][lang],
            onClick: () => navigate({ page: 'category', category: product.category }),
          },
          { label: product.title[lang] },
        ]}
        title={product.title[lang]}
        subtitle={`${product.destination[lang]} · ${product.durationLabel[lang]}`}
        actions={
          <button
            type="button"
            onClick={() => toggleFavorite(product.id)}
            className="px-4 py-2 rounded-lg border border-slate-200 dark:border-slate-700 text-xs font-medium cursor-pointer"
          >
            {isFav ? t.savedFavorite : t.saveFavorite}
          </button>
        }
      />

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Content Column */}
        <div className="lg:col-span-7 space-y-8">
          <div className="space-y-3">
            <div className="aspect-4/3 w-full overflow-hidden rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-800">
              <MediaRenderer item={activeMedia} className="h-full w-full object-cover" />
            </div>

            {galleryItems.length > 1 && (
              <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar">
                {galleryItems.map((m) => (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => setActiveMediaId(m.id)}
                    className={`relative w-24 h-16 rounded-lg overflow-hidden border-2 shrink-0 cursor-pointer bg-slate-100 dark:bg-slate-800 ${
                      activeMedia.id === m.id
                        ? 'border-[#F95738]'
                        : 'border-slate-200 dark:border-slate-700 opacity-80 hover:opacity-100'
                    }`}
                  >
                    {m.type === 'video' ? (
                      <div className="h-full w-full flex flex-col items-center justify-center bg-slate-900 text-white text-[10px] gap-1 px-1">
                        <Film className="w-4 h-4" />
                        <span className="truncate max-w-full">{m.caption || 'Video'}</span>
                      </div>
                    ) : (
                      <img src={m.url} alt={m.caption || m.name} className="h-full w-full object-cover" />
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="space-y-4">
            <div className="flex flex-wrap items-center gap-3 text-sm text-slate-600 dark:text-slate-300">
              <button
                type="button"
                onClick={() =>
                  navigate({ page: 'provider', organizationId: product.organizationId })
                }
                className="inline-flex items-center gap-1.5 font-semibold text-blue-600 dark:text-blue-400 hover:underline cursor-pointer"
              >
                {org?.logoUrl ? (
                  <img
                    src={org.logoUrl}
                    alt={product.providerName}
                    className="w-5 h-5 rounded object-cover border border-slate-200 dark:border-slate-700 shrink-0"
                  />
                ) : (
                  <Building2 className="w-4 h-4" />
                )}
                <span>{product.providerName}</span>
              </button>
              <span aria-hidden="true">·</span>
              <span className="inline-flex items-center gap-1 font-mono tabular-nums">
                <Star className="w-4 h-4 fill-amber-400 text-amber-400" />
                {product.rating.toFixed(1)} ({product.reviewCount})
              </span>
              <span aria-hidden="true">·</span>
              <span>{PRODUCT_MODELS[product.productModel][lang]}</span>
            </div>

            <p className="text-base text-slate-700 dark:text-slate-300 leading-relaxed">
              {product.description[lang]}
            </p>

            {referralSeller && (
              <div className="rounded-xl border border-blue-200 dark:border-blue-900/60 bg-blue-50/50 dark:bg-blue-950/30 p-4 space-y-3">
                <div className="flex items-center gap-3">
                  {referralSeller.avatarUrl ? (
                    <img
                      src={referralSeller.avatarUrl}
                      alt={referralSeller.displayName}
                      className="w-10 h-10 rounded-full object-cover border border-blue-200 shrink-0"
                    />
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center shrink-0">
                      <ImageIcon className="w-4 h-4 text-blue-600" />
                    </div>
                  )}
                  <div className="min-w-0">
                    <p className="text-xs font-semibold text-blue-900 dark:text-blue-200">
                      {lang === 'ar'
                        ? `موصى به عبر المسوق: ${referralSeller.displayName} (${referralSeller.referralCode})`
                        : `Recommended by Partner: ${referralSeller.displayName} (${referralSeller.referralCode})`}
                    </p>
                    <p className="text-xs text-slate-600 dark:text-slate-300 truncate">
                      {referralSeller.bio}
                    </p>
                  </div>
                </div>
                {referralSeller.mediaGallery && referralSeller.mediaGallery.length > 0 && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    {referralSeller.mediaGallery.slice(0, 2).map((m) => (
                      <div key={m.id} className="rounded-lg overflow-hidden border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
                        <div className="aspect-video">
                          <MediaRenderer item={m} className="h-full w-full object-cover" />
                        </div>
                        {(m.caption || m.name) && (
                          <p className="px-2.5 py-1.5 text-[11px] text-slate-600 dark:text-slate-300 truncate">
                            {m.caption || m.name}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {product.highlights && product.highlights.length > 0 && (
              <div className="pt-4 border-t border-slate-200 dark:border-slate-800">
                <h2 className="text-sm font-semibold mb-2">
                  {lang === 'ar' ? 'أبرز المزايا المشمولة' : 'Included Highlights'}
                </h2>
                <ul className="space-y-1.5 text-sm text-slate-600 dark:text-slate-300">
                  {product.highlights.map((h) => (
                    <li key={h} className="flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                      <span>{h}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          {/* Specs & Cancellation */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 pt-6 border-t border-slate-200 dark:border-slate-800">
            <div>
              <h3 className="text-sm font-semibold mb-2">
                {lang === 'ar' ? 'تفاصيل ومواصفات الخدمة' : 'Service Specifications'}
              </h3>
              <dl className="space-y-2 text-xs">
                {Object.entries(product.specs).map(([k, v]) => (
                  <div key={k} className="flex justify-between gap-3 pb-1.5 border-b border-slate-100 dark:border-slate-800">
                    <dt className="text-slate-500 capitalize shrink-0">{k}</dt>
                    <dd className="font-medium text-slate-800 dark:text-slate-200 text-end break-words min-w-0">{v}</dd>
                  </div>
                ))}
              </dl>
            </div>
            <div>
              <h3 className="text-sm font-semibold mb-2">
                {lang === 'ar' ? 'سياسة الإلغاء والشروط' : 'Cancellation Policy'}
              </h3>
              <p className="text-xs leading-relaxed text-slate-600 dark:text-slate-400">
                {product.cancellationPolicy[lang]}
              </p>
            </div>
          </div>

          {/* Reviews */}
          <div className="pt-6 border-t border-slate-200 dark:border-slate-800 space-y-4">
            <h3 className="text-base font-semibold">
              {lang === 'ar' ? 'تقييمات المسافرين' : 'Traveler Reviews'}
            </h3>
            <div className="space-y-3">
              {productReviews.length === 0 ? (
                <p className="text-xs text-slate-500">
                  {lang === 'ar' ? 'لا توجد مراجعات بعد.' : 'No reviews yet.'}
                </p>
              ) : (
                productReviews.map((rev) => (
                  <div
                    key={rev.id}
                    className="rounded-lg border border-slate-200 dark:border-slate-800 p-4"
                  >
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-semibold">{rev.customerName}</span>
                      <span className="font-mono text-amber-600">★ {rev.rating}.0</span>
                    </div>
                    <p className="mt-1.5 text-sm text-slate-600 dark:text-slate-300">{rev.comment}</p>
                  </div>
                ))
              )}
            </div>

            {reviewError && (
              <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700" role="alert">
                {reviewError}
              </div>
            )}

            <form
              noValidate
              onSubmit={(e) => {
                e.preventDefault();
                setReviewError('');
                if (comment.trim().length < 5) {
                  setReviewError(
                    lang === 'ar'
                      ? 'يرجى كتابة مراجعة لا تقل عن 5 أحرف قبل النشر.'
                      : 'Please write a review of at least 5 characters before posting.'
                  );
                  return;
                }
                addReview(product.id, rating, comment.trim());
                setComment('');
                showToast(
                  lang === 'ar' ? 'تم نشر تقييمك بنجاح' : 'Traveler review published',
                  'success'
                );
              }}
              className="flex flex-col sm:flex-row gap-2"
            >
              <select
                value={rating}
                onChange={(e) => setRating(Number(e.target.value))}
                className="rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2.5 text-xs font-mono"
              >
                {[5, 4, 3, 2, 1].map((n) => (
                  <option key={n} value={n}>
                    {n}★
                  </option>
                ))}
              </select>
              <input
                type="text"
                value={comment}
                onChange={(e) => {
                  setComment(e.target.value);
                  if (reviewError) setReviewError('');
                }}
                placeholder={lang === 'ar' ? 'أضف مراجعتك لهذه الخدمة...' : 'Add your review...'}
                className="flex-1 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2.5 text-sm"
              />
              <button
                type="submit"
                className="min-h-[42px] px-4 py-2 rounded-lg bg-slate-900 text-white text-xs font-semibold cursor-pointer shrink-0"
              >
                {lang === 'ar' ? 'نشر' : 'Post'}
              </button>
            </form>
          </div>
        </div>

        {/* Right Sticky Booking & Availability Module */}
        <div className="lg:col-span-5">
          <div className="lg:sticky lg:top-24 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/60 p-4 sm:p-6 space-y-5">
            <div className="flex flex-wrap items-baseline justify-between gap-2 pb-4 border-b border-slate-200 dark:border-slate-800">
              <div>
                <div className="text-3xl font-bold font-mono tabular-nums text-slate-900 dark:text-white">
                  {formatMoney(displayUnit, currency)}
                </div>
                <div className="text-xs text-slate-500 mt-1">{t.perTraveler}</div>
              </div>
              <div className="flex items-center gap-1.5 text-xs font-medium">
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

            <div className="space-y-3">
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300">
                <Calendar className="w-3.5 h-3.5 inline me-1" />
                {lang === 'ar' ? 'اختيار التاريخ والتوافر' : 'Select Date & Availability'}
              </label>
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-sm font-mono"
              />
              {(openSlots.length > 0 || product.availableDates.length > 0) && (
                <div className="flex flex-wrap gap-1.5">
                  {(allProductSlots.length > 0
                    ? allProductSlots.map((s) => s.date)
                    : product.availableDates
                  ).map((d) => {
                    const slotInfo = allProductSlots.find((s) => s.date === d);
                    const soldOut = slotInfo ? !slotInfo.available || slotInfo.remainingUnits <= 0 : false;
                    return (
                      <button
                        key={d}
                        type="button"
                        onClick={() => setSelectedDate(d)}
                        className={`px-2.5 py-1.5 text-xs font-mono rounded-md border transition-colors cursor-pointer ${
                          selectedDate === d
                            ? 'border-blue-600 bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300'
                            : soldOut
                            ? 'border-red-200 text-red-500 bg-red-50/40 dark:border-red-900/50'
                            : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300'
                        }`}
                      >
                        {d}
                        {slotInfo ? ` (${slotInfo.remainingUnits})` : ''}
                      </button>
                    );
                  })}
                </div>
              )}
              {isSlotBlocked && (
                <div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>
                    {lang === 'ar'
                      ? 'هذا التاريخ غير متاح أو نفدت المقاعد المتاحة. يرجى اختيار تاريخ آخر.'
                      : 'Selected date is blocked or sold out. Please select another date.'}
                  </span>
                </div>
              )}
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                {t.travelersCount}
              </label>
              <input
                type="number"
                min={1}
                max={maxAllowed}
                value={travelers}
                onChange={(e) =>
                  setTravelers(Math.max(1, Math.min(maxAllowed, Number(e.target.value) || 1)))
                }
                className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-sm font-mono"
              />
            </div>

            <div className="pt-3 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between text-sm">
              <span className="text-slate-600 dark:text-slate-400">
                {lang === 'ar' ? 'الإجمالي المقدر' : 'Estimated Total'}
              </span>
              <span className="text-lg font-bold font-mono tabular-nums text-slate-900 dark:text-white">
                {formatMoney(totalDisplay, currency)}
              </span>
            </div>

            {product.productModel === 'request' ? (
              <button
                type="button"
                onClick={() => navigate({ page: 'quotations' })}
                className="w-full py-3 px-4 rounded-lg bg-[#0052CC] hover:bg-[#0041a3] text-white text-sm font-semibold transition-colors cursor-pointer"
              >
                {t.heroSecondaryCta}
              </button>
            ) : (
              <button
                type="button"
                disabled={isSlotBlocked}
                onClick={() =>
                  navigate({
                    page: 'booking',
                    productId: product.id,
                    date: selectedDate,
                    travelers,
                  })
                }
                className="w-full py-3 px-4 rounded-lg bg-[#F95738] hover:bg-[#e1482b] disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-semibold transition-colors cursor-pointer"
              >
                {lang === 'ar' ? 'المتابعة لإتمام الحجز' : 'Continue to Booking'}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Related Services & Recommendations */}
      <section className="pt-8 border-t border-slate-200 dark:border-slate-800 space-y-5">
        <h2 className="text-xl font-bold text-slate-900 dark:text-white">
          {lang === 'ar' ? 'خدمات مشابهة وتوصيات مختارة' : 'Related Services & Recommendations'}
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {related.map((p) => (
            <ProductCard
              key={p.id}
              product={p}
              lang={lang}
              currency={currency}
              isFavorite={favoriteIds.includes(p.id)}
              onOpenProduct={(prod) => navigate({ page: 'product', productId: prod.id })}
              onOpenProvider={(orgId) => navigate({ page: 'provider', organizationId: orgId })}
              onToggleFavorite={toggleFavorite}
            />
          ))}
        </div>
      </section>
    </div>
  );
}
