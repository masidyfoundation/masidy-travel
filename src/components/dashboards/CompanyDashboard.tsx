import { useEffect, useState } from 'react';
import {
  BarChart3,
  BookOpen,
  Building2,
  Calendar,
  FileText,
  Layers,
  Package,
  PlusCircle,
  Users,
} from 'lucide-react';
import { useMarketplace } from '../../context/MarketplaceContext.tsx';
import type {
  Booking,
  CurrencyCode,
  MediaItem,
  Product,
  ProductModel,
  ServiceCategory,
} from '../../shared/types.ts';
import { CATEGORIES, PRODUCT_MODELS, UI_TEXT } from '../../shared/i18n.ts';
import { formatMoney } from '../../shared/currency.ts';
import { BookingStatusBadge } from '../StatusBadge.tsx';
import { ConfirmDialog } from '../ConfirmDialog.tsx';
import { MediaUploader, SingleImageUploader } from '../MediaUploader.tsx';

export function CompanyDashboard({ initialTab = 'overview' }: { initialTab?: string }) {
  const {
    lang,
    activeUser,
    organizations,
    products,
    bookings,
    availabilitySlots,
    travelRequests,
    orgMembers,
    saveProduct,
    toggleProductPublish,
    updateBookingStatus,
    updateAvailabilitySlot,
    updateOrganizationProfile,
    createQuotation,
    addStaffMember,
    showToast,
  } = useMarketplace();
  const t = UI_TEXT[lang];
  const [tab, setTab] = useState(initialTab);

  const orgId = activeUser?.organizationId || 'org_med_horizons';
  const org = organizations.find((o) => o.id === orgId) || organizations[0];
  const orgProducts = products.filter((p) => p.organizationId === org.id);
  const orgBookings = bookings.filter((b) => b.organizationId === org.id);
  const orgStaff = orgMembers.filter((m) => m.organizationId === org.id);

  const [companyForm, setCompanyForm] = useState({
    name: org.name,
    city: org.city,
    country: org.country,
    contactEmail: org.contactEmail,
    phone: org.phone,
    website: org.website || '',
    descriptionAr: org.description.ar,
    descriptionEn: org.description.en,
    logoUrl: org.logoUrl || '',
    coverImageUrl: org.coverImageUrl || '',
    mediaGallery: org.mediaGallery || ([] as MediaItem[]),
  });
  const [companyError, setCompanyError] = useState('');

  const [editingId, setEditingId] = useState<string | null>(null);
  const [productForm, setProductForm] = useState({
    category: 'tours' as ServiceCategory,
    productModel: 'fixed' as ProductModel,
    titleAr: '',
    titleEn: '',
    titleIt: '',
    descriptionAr: '',
    descriptionEn: '',
    destinationEn: '',
    baseCurrency: 'EUR' as CurrencyCode,
    price: 150,
    providerCost: 105,
    maxCapacity: 12,
    instantBooking: false,
    imageUrl: '',
    mediaGallery: [] as MediaItem[],
  });
  const [productError, setProductError] = useState('');

  const [selectedSlotProductId, setSelectedSlotProductId] = useState(orgProducts[0]?.id || '');
  const [staffForm, setStaffForm] = useState({
    name: '',
    email: '',
    memberRole: 'agent' as 'manager' | 'agent',
  });
  const [staffError, setStaffError] = useState('');

  const [quoteDraft, setQuoteDraft] = useState<{
    requestId: string;
    quotedPrice: number;
    validUntil: string;
    summary: string;
  } | null>(null);
  const [quoteError, setQuoteError] = useState('');

  const [confirmRejectBooking, setConfirmRejectBooking] = useState<Booking | null>(null);
  const [confirmUnpublishProduct, setConfirmUnpublishProduct] = useState<Product | null>(null);

  useEffect(() => {
    setCompanyForm({
      name: org.name,
      city: org.city,
      country: org.country,
      contactEmail: org.contactEmail,
      phone: org.phone,
      website: org.website || '',
      descriptionAr: org.description.ar,
      descriptionEn: org.description.en,
      logoUrl: org.logoUrl || '',
      coverImageUrl: org.coverImageUrl || '',
      mediaGallery: org.mediaGallery || [],
    });
  }, [org]);

  useEffect(() => {
    if (!orgProducts.some((p) => p.id === selectedSlotProductId)) {
      setSelectedSlotProductId(orgProducts[0]?.id || '');
    }
  }, [orgProducts, selectedSlotProductId]);

  function resetProductForm() {
    setEditingId(null);
    setProductError('');
    setProductForm({
      category: 'tours',
      productModel: 'fixed',
      titleAr: '',
      titleEn: '',
      titleIt: '',
      descriptionAr: '',
      descriptionEn: '',
      destinationEn: '',
      baseCurrency: 'EUR',
      price: 150,
      providerCost: 105,
      maxCapacity: 12,
      instantBooking: false,
      imageUrl: '',
      mediaGallery: [],
    });
  }

  function startEditProduct(p: Product) {
    setEditingId(p.id);
    setProductError('');
    setProductForm({
      category: p.category,
      productModel: p.productModel,
      titleAr: p.title.ar,
      titleEn: p.title.en,
      titleIt: p.title.it,
      descriptionAr: p.description.ar,
      descriptionEn: p.description.en,
      destinationEn: p.destination.en,
      baseCurrency: p.baseCurrency,
      price: p.price,
      providerCost: p.providerCost,
      maxCapacity: p.maxCapacity,
      instantBooking: p.instantBooking,
      imageUrl: p.imageUrl,
      mediaGallery: p.mediaGallery || [],
    });
    setTab('product-form');
  }

  function handleTogglePublish(p: Product) {
    if (p.published) {
      setConfirmUnpublishProduct(p);
      return;
    }
    toggleProductPublish(p.id);
    showToast(
      lang === 'ar' ? `تم نشر الخدمة: ${p.title.ar}` : `Published: ${p.title.en}`,
      'success'
    );
  }

  const tabs = [
    { id: 'overview', label: lang === 'ar' ? 'نظرة عامة' : 'Overview', icon: Layers },
    { id: 'profile', label: lang === 'ar' ? 'ملف الشركة' : 'Company Profile', icon: Building2 },
    { id: 'products', label: lang === 'ar' ? 'الخدمات' : 'Products & Services', icon: Package },
    { id: 'product-form', label: lang === 'ar' ? 'إضافة / تعديل خدمة' : 'Add / Edit Product', icon: PlusCircle },
    { id: 'bookings', label: lang === 'ar' ? 'الحجوزات' : 'Bookings', icon: BookOpen },
    { id: 'availability', label: lang === 'ar' ? 'التوافر والتسعير' : 'Availability & Pricing', icon: Calendar },
    { id: 'requests', label: lang === 'ar' ? 'طلبات العملاء' : 'Customer Requests', icon: FileText },
    { id: 'staff', label: lang === 'ar' ? 'الموظفون' : 'Staff', icon: Users },
    { id: 'analytics', label: lang === 'ar' ? 'المبيعات والتحليلات' : 'Sales & Analytics', icon: BarChart3 },
  ];

  const totalEurSales = orgBookings.reduce((s, b) => s + b.totalEur, 0);
  const confirmedCount = orgBookings.filter(
    (b) => b.status === 'Confirmed' || b.status === 'Completed'
  ).length;
  const confirmRate = orgBookings.length
    ? ((confirmedCount / orgBookings.length) * 100).toFixed(1)
    : '0.0';

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
              <p className="text-xs text-slate-500">{lang === 'ar' ? 'خطة الاشتراك' : 'Partner Plan'}</p>
              <p className="mt-1 text-lg font-bold text-emerald-600">Free Plan ($0/mo)</p>
            </div>
            <div className="rounded-xl border border-slate-200 dark:border-slate-800 p-4">
              <p className="text-xs text-slate-500">{lang === 'ar' ? 'الخدمات المنشورة' : 'Services'}</p>
              <p className="mt-1 text-xl font-bold font-mono tabular-nums">{orgProducts.length}</p>
            </div>
            <div className="rounded-xl border border-slate-200 dark:border-slate-800 p-4">
              <p className="text-xs text-slate-500">{lang === 'ar' ? 'إجمالي الحجوزات' : 'Bookings'}</p>
              <p className="mt-1 text-xl font-bold font-mono tabular-nums">{orgBookings.length}</p>
            </div>
            <div className="rounded-xl border border-slate-200 dark:border-slate-800 p-4">
              <p className="text-xs text-slate-500">{lang === 'ar' ? 'المبيعات (EUR)' : 'Gross Volume'}</p>
              <p className="mt-1 text-xl font-bold font-mono tabular-nums">€{totalEurSales.toFixed(2)}</p>
            </div>
          </div>

          <div className="rounded-xl border border-slate-200 dark:border-slate-800 p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3.5 min-w-0">
              {org.logoUrl ? (
                <img
                  src={org.logoUrl}
                  alt={org.name}
                  className="w-14 h-14 rounded-xl object-cover border border-slate-200 dark:border-slate-700 shrink-0"
                />
              ) : (
                <div className="w-14 h-14 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center shrink-0">
                  <Building2 className="w-6 h-6 text-slate-400" />
                </div>
              )}
              <div className="min-w-0">
                <h3 className="text-sm font-semibold truncate">{org.name}</h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  {lang === 'ar'
                    ? `الصور والفيديوهات المنشورة في ملف الشركة: ${(org.mediaGallery || []).length}`
                    : `Company showcase media items: ${(org.mediaGallery || []).length}`}
                </p>
              </div>
            </div>
            <div className="flex flex-wrap gap-2 shrink-0">
              <button
                type="button"
                onClick={() => setTab('profile')}
                className="px-3.5 py-2 rounded-lg border border-slate-200 dark:border-slate-700 text-xs font-semibold hover:border-slate-400 cursor-pointer"
              >
                {lang === 'ar' ? 'رفع شعار وصور/فيديو الشركة' : 'Upload Brand Photos & Videos'}
              </button>
              <button
                type="button"
                onClick={() => {
                  resetProductForm();
                  setTab('product-form');
                }}
                className="px-3.5 py-2 rounded-lg bg-[#F95738] text-white text-xs font-semibold cursor-pointer"
              >
                {lang === 'ar' ? '+ إضافة خدمة مع صور/فيديو' : '+ Add Service & Media'}
              </button>
            </div>
          </div>
        </div>
      )}

      {tab === 'profile' && (
        <form
          noValidate
          onSubmit={(e) => {
            e.preventDefault();
            setCompanyError('');
            if (companyForm.name.trim().length < 2) {
              const msg =
                lang === 'ar' ? 'يرجى إدخال اسم الشركة.' : 'Company name must be at least 2 characters.';
              setCompanyError(msg);
              showToast(msg, 'error');
              return;
            }
            if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(companyForm.contactEmail.trim())) {
              const msg =
                lang === 'ar' ? 'يرجى إدخال بريد تواصل صحيح.' : 'Please enter a valid contact email.';
              setCompanyError(msg);
              showToast(msg, 'error');
              return;
            }
            updateOrganizationProfile(org.id, {
              name: companyForm.name.trim(),
              city: companyForm.city.trim(),
              country: companyForm.country.trim(),
              contactEmail: companyForm.contactEmail.trim(),
              phone: companyForm.phone.trim(),
              website: companyForm.website.trim() || undefined,
              logoUrl: companyForm.logoUrl.trim() || undefined,
              coverImageUrl: companyForm.coverImageUrl.trim() || undefined,
              mediaGallery: companyForm.mediaGallery,
              description: {
                ar: companyForm.descriptionAr.trim() || org.description.ar,
                en: companyForm.descriptionEn.trim() || org.description.en,
                it: companyForm.descriptionEn.trim() || org.description.it,
              },
            });
            showToast(
              lang === 'ar'
                ? 'تم حفظ ملف الشركة والوسائط وتحديثها في السوق'
                : 'Company profile & media saved and synced across marketplace',
              'success'
            );
          }}
          className="rounded-xl border border-slate-200 dark:border-slate-800 p-5 sm:p-6 max-w-4xl space-y-5"
        >
          <h3 className="text-base font-semibold">
            {org.name} — {lang === 'ar' ? 'الملف التجاري والوسائط' : 'Company Profile & Media'}
          </h3>
          {companyError && (
            <div role="alert" className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
              {companyError}
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <SingleImageUploader
              lang={lang}
              label={lang === 'ar' ? 'شعار الشركة (Logo)' : 'Company Logo / Avatar'}
              value={companyForm.logoUrl}
              aspectClass="w-16 h-16 rounded-xl"
              onChange={(logoUrl) => setCompanyForm((prev) => ({ ...prev, logoUrl }))}
            />
            <SingleImageUploader
              lang={lang}
              label={lang === 'ar' ? 'صورة غلاف الشركة (Banner)' : 'Company Cover Banner'}
              value={companyForm.coverImageUrl}
              aspectClass="w-24 h-16 rounded-xl"
              onChange={(coverImageUrl) => setCompanyForm((prev) => ({ ...prev, coverImageUrl }))}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <input
              type="text"
              value={companyForm.name}
              onChange={(e) => {
                setCompanyForm({ ...companyForm, name: e.target.value });
                if (companyError) setCompanyError('');
              }}
              placeholder={lang === 'ar' ? 'اسم الشركة' : 'Company Name'}
              className="rounded-lg border border-slate-200 dark:border-slate-700 px-3 py-2 text-sm"
            />
            <input
              type="email"
              value={companyForm.contactEmail}
              onChange={(e) => {
                setCompanyForm({ ...companyForm, contactEmail: e.target.value });
                if (companyError) setCompanyError('');
              }}
              placeholder={lang === 'ar' ? 'البريد التجاري' : 'Contact Email'}
              className="rounded-lg border border-slate-200 dark:border-slate-700 px-3 py-2 text-sm font-mono"
            />
            <input
              type="text"
              value={companyForm.city}
              onChange={(e) => setCompanyForm({ ...companyForm, city: e.target.value })}
              placeholder={lang === 'ar' ? 'المدينة' : 'City'}
              className="rounded-lg border border-slate-200 dark:border-slate-700 px-3 py-2 text-sm"
            />
            <input
              type="text"
              value={companyForm.country}
              onChange={(e) => setCompanyForm({ ...companyForm, country: e.target.value })}
              placeholder={lang === 'ar' ? 'الدولة' : 'Country'}
              className="rounded-lg border border-slate-200 dark:border-slate-700 px-3 py-2 text-sm"
            />
            <input
              type="text"
              value={companyForm.phone}
              onChange={(e) => setCompanyForm({ ...companyForm, phone: e.target.value })}
              placeholder={lang === 'ar' ? 'رقم الهاتف' : 'Phone'}
              className="rounded-lg border border-slate-200 dark:border-slate-700 px-3 py-2 text-sm font-mono"
            />
            <input
              type="url"
              value={companyForm.website}
              onChange={(e) => setCompanyForm({ ...companyForm, website: e.target.value })}
              placeholder={lang === 'ar' ? 'الموقع الإلكتروني (اختياري)' : 'Website URL (optional)'}
              className="rounded-lg border border-slate-200 dark:border-slate-700 px-3 py-2 text-sm font-mono"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <textarea
              rows={2}
              value={companyForm.descriptionAr}
              onChange={(e) => setCompanyForm({ ...companyForm, descriptionAr: e.target.value })}
              placeholder="وصف الشركة بالعربية"
              className="rounded-lg border border-slate-200 dark:border-slate-700 px-3 py-2 text-sm"
            />
            <textarea
              rows={2}
              value={companyForm.descriptionEn}
              onChange={(e) => setCompanyForm({ ...companyForm, descriptionEn: e.target.value })}
              placeholder="Company Description (English)"
              className="rounded-lg border border-slate-200 dark:border-slate-700 px-3 py-2 text-sm"
            />
          </div>

          <MediaUploader
            lang={lang}
            title={lang === 'ar' ? 'معرض صور وفيديوهات الشركة' : 'Company Showcase Photos & Videos'}
            subtitle={
              lang === 'ar'
                ? 'تظهر هذه الصور والفيديوهات في صفحة الشركة العامة وفي لوحة الإدارة.'
                : 'Appears directly on your public Provider Profile page and across marketplace accounts.'
            }
            items={companyForm.mediaGallery}
            coverImageUrl={companyForm.coverImageUrl}
            onSetCover={(url) => setCompanyForm((prev) => ({ ...prev, coverImageUrl: url }))}
            onChange={(mediaGallery) => setCompanyForm((prev) => ({ ...prev, mediaGallery }))}
          />

          <button
            type="submit"
            className="px-5 py-2.5 rounded-lg bg-slate-900 hover:bg-slate-800 dark:bg-white dark:text-slate-900 text-white text-xs font-semibold cursor-pointer"
          >
            {lang === 'ar' ? 'حفظ ملف الشركة والوسائط' : 'Save Company Profile & Media'}
          </button>
        </form>
      )}

      {tab === 'products' && (
        <div className="space-y-4">
          <div className="flex flex-wrap justify-between items-center gap-2">
            <h3 className="text-sm font-semibold">
              {lang === 'ar' ? 'إدارة المنتجات والخدمات' : 'Products & Services Catalog'}
            </h3>
            <button
              type="button"
              onClick={() => {
                resetProductForm();
                setTab('product-form');
              }}
              className="min-h-[38px] px-3.5 py-2 rounded-lg bg-[#F95738] text-white text-xs font-semibold cursor-pointer"
            >
              {lang === 'ar' ? '+ إضافة خدمة' : '+ Add Product'}
            </button>
          </div>

          {orgProducts.length === 0 ? (
            <div className="rounded-xl border border-slate-200 dark:border-slate-800 p-10 text-center space-y-3">
              <p className="text-sm text-slate-500">
                {lang === 'ar'
                  ? 'لم تقم الشركة بإضافة أي خدمات سياحية بعد.'
                  : 'Your company catalog has no tourism services yet.'}
              </p>
              <button
                type="button"
                onClick={() => {
                  resetProductForm();
                  setTab('product-form');
                }}
                className="px-4 py-2 rounded-lg bg-[#F95738] text-white text-xs font-semibold cursor-pointer"
              >
                {lang === 'ar' ? '+ إضافة أول خدمة' : '+ Add First Service'}
              </button>
            </div>
          ) : (
            <>
              <div className="md:hidden space-y-3">
                {orgProducts.map((p) => {
                  const mediaCount = (p.mediaGallery || []).length;
                  return (
                    <div
                      key={p.id}
                      className="rounded-xl border border-slate-200 dark:border-slate-800 p-4 space-y-2.5"
                    >
                      <div className="flex items-start justify-between gap-2.5">
                        <div className="flex items-start gap-2.5 min-w-0">
                          <img
                            src={p.imageUrl}
                            alt={p.title[lang]}
                            className="w-12 h-12 rounded-lg object-cover border border-slate-200 dark:border-slate-700 shrink-0"
                          />
                          <div className="min-w-0">
                            <div className="font-semibold text-sm">{p.title[lang]}</div>
                            <div className="text-xs text-slate-500 mt-0.5">
                              {CATEGORIES[p.category][lang]} · {PRODUCT_MODELS[p.productModel][lang]}
                              {mediaCount > 0 ? ` · ${mediaCount} media` : ''}
                            </div>
                          </div>
                        </div>
                        <div className="font-mono tabular-nums font-bold text-sm shrink-0">
                          {formatMoney(p.price, p.baseCurrency)}
                        </div>
                      </div>
                      <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-800">
                        <button
                          type="button"
                          onClick={() => handleTogglePublish(p)}
                          className={`text-xs font-medium cursor-pointer py-1 ${
                            p.published ? 'text-emerald-600' : 'text-slate-400'
                          }`}
                        >
                          {p.published ? 'Published' : 'Draft'}
                        </button>
                        <button
                          type="button"
                          onClick={() => startEditProduct(p)}
                          className="text-xs font-semibold text-blue-600 hover:underline cursor-pointer py-1"
                        >
                          Edit & Media
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="hidden md:block rounded-xl border border-slate-200 dark:border-slate-800 overflow-x-auto">
                <table className="w-full text-sm min-w-[560px]">
                  <thead className="bg-slate-50 dark:bg-slate-900/50 text-xs text-slate-500 border-b border-slate-200 dark:border-slate-800">
                    <tr>
                      <th className="px-4 py-3 text-start">Service</th>
                      <th className="px-4 py-3 text-start">Category / Model</th>
                      <th className="px-4 py-3 text-end">Price</th>
                      <th className="px-4 py-3 text-end">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                    {orgProducts.map((p) => {
                      const mediaCount = (p.mediaGallery || []).length;
                      const videoCount = (p.mediaGallery || []).filter((m) => m.type === 'video').length;
                      return (
                        <tr key={p.id}>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-3">
                              <img
                                src={p.imageUrl}
                                alt={p.title[lang]}
                                className="w-11 h-11 rounded-lg object-cover border border-slate-200 dark:border-slate-700 shrink-0"
                              />
                              <div className="min-w-0">
                                <div className="font-medium truncate">{p.title[lang]}</div>
                                {mediaCount > 0 && (
                                  <div className="text-[11px] text-slate-500">
                                    {mediaCount} {lang === 'ar' ? 'ملفات وسائط' : 'media item(s)'}
                                    {videoCount > 0 ? ` (${videoCount} video)` : ''}
                                  </div>
                                )}
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-3 text-xs text-slate-500">
                            {CATEGORIES[p.category][lang]} · {PRODUCT_MODELS[p.productModel][lang]}
                          </td>
                          <td className="px-4 py-3 text-end font-mono tabular-nums">
                            {formatMoney(p.price, p.baseCurrency)}
                          </td>
                          <td className="px-4 py-3 text-end space-x-3">
                            <button
                              type="button"
                              onClick={() => startEditProduct(p)}
                              className="text-xs text-blue-600 hover:underline cursor-pointer"
                            >
                              Edit & Media
                            </button>
                            <button
                              type="button"
                              onClick={() => handleTogglePublish(p)}
                              className={`text-xs cursor-pointer ${
                                p.published ? 'text-emerald-600' : 'text-slate-400'
                              }`}
                            >
                              {p.published ? 'Published' : 'Draft'}
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>
      )}

      {tab === 'product-form' && (
        <form
          noValidate
          onSubmit={(e) => {
            e.preventDefault();
            setProductError('');
            if (productForm.titleAr.trim().length < 2 && productForm.titleEn.trim().length < 2) {
              const msg =
                lang === 'ar'
                  ? 'يرجى إدخال عنوان الخدمة بالعربية أو الإنجليزية.'
                  : 'Please enter a service title (Arabic or English).';
              setProductError(msg);
              showToast(msg, 'error');
              return;
            }
            if (!Number.isFinite(productForm.price) || productForm.price <= 0) {
              const msg =
                lang === 'ar'
                  ? 'يجب أن يكون سعر البيع أكبر من صفر.'
                  : 'Selling price must be greater than zero.';
              setProductError(msg);
              showToast(msg, 'error');
              return;
            }
            if (
              !Number.isFinite(productForm.providerCost) ||
              productForm.providerCost < 0 ||
              productForm.providerCost > productForm.price
            ) {
              const msg =
                lang === 'ar'
                  ? 'تكلفة المزود يجب أن تكون موجبة ولا تتجاوز سعر البيع.'
                  : 'Provider cost must be non-negative and cannot exceed the selling price.';
              setProductError(msg);
              showToast(msg, 'error');
              return;
            }
            if (!Number.isFinite(productForm.maxCapacity) || productForm.maxCapacity < 1) {
              const msg =
                lang === 'ar'
                  ? 'الحد الأقصى للاستيعاب يجب أن يكون 1 على الأقل.'
                  : 'Max capacity must be at least 1.';
              setProductError(msg);
              showToast(msg, 'error');
              return;
            }

            const firstGalleryImage = productForm.mediaGallery.find((m) => m.type === 'image')?.url;

            saveProduct({
              id: editingId || undefined,
              category: productForm.category,
              productModel: productForm.productModel,
              title: {
                ar: productForm.titleAr.trim() || productForm.titleEn.trim(),
                en: productForm.titleEn.trim() || productForm.titleAr.trim(),
                it:
                  productForm.titleIt.trim() ||
                  productForm.titleEn.trim() ||
                  productForm.titleAr.trim(),
              },
              description:
                productForm.descriptionAr.trim() || productForm.descriptionEn.trim()
                  ? {
                      ar: productForm.descriptionAr.trim() || productForm.descriptionEn.trim(),
                      en: productForm.descriptionEn.trim() || productForm.descriptionAr.trim(),
                      it: productForm.descriptionEn.trim() || productForm.descriptionAr.trim(),
                    }
                  : undefined,
              destination: {
                ar: productForm.destinationEn.trim() || org.city,
                en: productForm.destinationEn.trim() || org.city,
                it: productForm.destinationEn.trim() || org.city,
              },
              baseCurrency: productForm.baseCurrency,
              price: productForm.price,
              providerCost: productForm.providerCost,
              maxCapacity: productForm.maxCapacity,
              instantBooking: productForm.instantBooking,
              imageUrl: productForm.imageUrl.trim() || firstGalleryImage || undefined,
              mediaGallery: productForm.mediaGallery,
              published: true,
            });
            resetProductForm();
            showToast(
              editingId
                ? lang === 'ar'
                  ? 'تم تحديث الخدمة والوسائط في السوق'
                  : 'Product & media updated in marketplace'
                : lang === 'ar'
                ? 'تم نشر الخدمة الجديدة والوسائط في السوق'
                : 'New service & media published to marketplace',
              'success'
            );
            setTab('products');
          }}
          className="rounded-xl border border-slate-200 dark:border-slate-800 p-5 sm:p-6 space-y-4"
        >
          <h3 className="text-base font-semibold">
            {editingId
              ? lang === 'ar'
                ? 'تعديل الخدمة والوسائط'
                : 'Edit Tourism Service & Media'
              : lang === 'ar'
              ? 'إضافة خدمة سياحية جديدة بالصور والفيديو'
              : 'Add New Tourism Service with Photos & Videos'}
          </h3>
          {productError && (
            <div role="alert" className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
              {productError}
            </div>
          )}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <select
              value={productForm.category}
              onChange={(e) =>
                setProductForm({ ...productForm, category: e.target.value as ServiceCategory })
              }
              className="rounded-lg border border-slate-200 dark:border-slate-700 px-3 py-2 text-sm"
            >
              {(Object.keys(CATEGORIES) as ServiceCategory[]).map((c) => (
                <option key={c} value={c}>
                  {CATEGORIES[c][lang]}
                </option>
              ))}
            </select>
            <select
              value={productForm.productModel}
              onChange={(e) =>
                setProductForm({ ...productForm, productModel: e.target.value as ProductModel })
              }
              className="rounded-lg border border-slate-200 dark:border-slate-700 px-3 py-2 text-sm"
            >
              {(Object.keys(PRODUCT_MODELS) as ProductModel[]).map((m) => (
                <option key={m} value={m}>
                  {PRODUCT_MODELS[m][lang]}
                </option>
              ))}
            </select>
            <select
              value={productForm.baseCurrency}
              onChange={(e) =>
                setProductForm({ ...productForm, baseCurrency: e.target.value as CurrencyCode })
              }
              className="rounded-lg border border-slate-200 dark:border-slate-700 px-3 py-2 text-sm font-mono"
            >
              <option value="EUR">EUR</option>
              <option value="USD">USD</option>
              <option value="EGP">EGP</option>
            </select>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <input
              type="text"
              value={productForm.titleAr}
              onChange={(e) => {
                setProductForm({ ...productForm, titleAr: e.target.value });
                if (productError) setProductError('');
              }}
              placeholder="Title (AR)"
              className="rounded-lg border border-slate-200 dark:border-slate-700 px-3 py-2 text-sm"
            />
            <input
              type="text"
              value={productForm.titleEn}
              onChange={(e) => {
                setProductForm({ ...productForm, titleEn: e.target.value });
                if (productError) setProductError('');
              }}
              placeholder="Title (EN)"
              className="rounded-lg border border-slate-200 dark:border-slate-700 px-3 py-2 text-sm"
            />
            <input
              type="text"
              value={productForm.titleIt}
              onChange={(e) => setProductForm({ ...productForm, titleIt: e.target.value })}
              placeholder="Title (IT)"
              className="rounded-lg border border-slate-200 dark:border-slate-700 px-3 py-2 text-sm"
            />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <textarea
              rows={2}
              value={productForm.descriptionAr}
              onChange={(e) => setProductForm({ ...productForm, descriptionAr: e.target.value })}
              placeholder="وصف الخدمة بالعربية (اختياري)"
              className="rounded-lg border border-slate-200 dark:border-slate-700 px-3 py-2 text-sm"
            />
            <textarea
              rows={2}
              value={productForm.descriptionEn}
              onChange={(e) => setProductForm({ ...productForm, descriptionEn: e.target.value })}
              placeholder="Service Description in English (optional)"
              className="rounded-lg border border-slate-200 dark:border-slate-700 px-3 py-2 text-sm"
            />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <input
              type="text"
              value={productForm.destinationEn}
              onChange={(e) => setProductForm({ ...productForm, destinationEn: e.target.value })}
              placeholder="Destination"
              className="rounded-lg border border-slate-200 dark:border-slate-700 px-3 py-2 text-sm"
            />
            <input
              type="number"
              value={productForm.price}
              onChange={(e) => {
                setProductForm({ ...productForm, price: Number(e.target.value) });
                if (productError) setProductError('');
              }}
              placeholder="Price"
              className="rounded-lg border border-slate-200 dark:border-slate-700 px-3 py-2 text-sm font-mono"
            />
            <input
              type="number"
              value={productForm.providerCost}
              onChange={(e) => {
                setProductForm({ ...productForm, providerCost: Number(e.target.value) });
                if (productError) setProductError('');
              }}
              placeholder="Provider Cost"
              className="rounded-lg border border-slate-200 dark:border-slate-700 px-3 py-2 text-sm font-mono"
            />
            <input
              type="number"
              value={productForm.maxCapacity}
              onChange={(e) =>
                setProductForm({ ...productForm, maxCapacity: Number(e.target.value) })
              }
              placeholder="Max Capacity"
              className="rounded-lg border border-slate-200 dark:border-slate-700 px-3 py-2 text-sm font-mono"
            />
          </div>

          <SingleImageUploader
            lang={lang}
            label={lang === 'ar' ? 'الصورة الرئيسية للخدمة (الغلاف)' : 'Main Cover Photo (Marketplace Card)'}
            value={productForm.imageUrl}
            aspectClass="w-24 h-16 rounded-lg"
            onChange={(imageUrl) => setProductForm((prev) => ({ ...prev, imageUrl }))}
          />

          <MediaUploader
            lang={lang}
            title={lang === 'ar' ? 'صور إضافية وفيديوهات الخدمة' : 'Service Photos & Videos Gallery'}
            subtitle={
              lang === 'ar'
                ? 'ارفع صورًا وفيديوهات متعددة للرحلة أو الفندق؛ ستظهر في صفحة التفاصيل وبطاقة السوق.'
                : 'Upload multiple photos and promotional videos; displayed on the Product Detail page and marketplace cards.'
            }
            items={productForm.mediaGallery}
            coverImageUrl={productForm.imageUrl}
            onSetCover={(url) => setProductForm((prev) => ({ ...prev, imageUrl: url }))}
            onChange={(mediaGallery) => setProductForm((prev) => ({ ...prev, mediaGallery }))}
          />

          <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
            <label className="inline-flex items-center gap-2 text-xs">
              <input
                type="checkbox"
                checked={productForm.instantBooking}
                onChange={(e) =>
                  setProductForm({ ...productForm, instantBooking: e.target.checked })
                }
              />
              <span>{t.instantConfirm}</span>
            </label>
            <button
              type="submit"
              className="min-h-[42px] px-5 py-2 rounded-lg bg-[#F95738] text-white text-xs font-semibold cursor-pointer"
            >
              {editingId ? 'Save Changes & Media' : 'Create & Publish'}
            </button>
          </div>
        </form>
      )}

      {tab === 'bookings' && (
        orgBookings.length === 0 ? (
          <div className="rounded-xl border border-slate-200 dark:border-slate-800 p-10 text-center text-sm text-slate-500">
            {lang === 'ar' ? 'لا توجد حجوزات واردة لهذه الشركة بعد.' : 'No incoming bookings for this company yet.'}
          </div>
        ) : (
          <>
            <div className="md:hidden space-y-3">
              {orgBookings.map((b) => (
                <div
                  key={b.id}
                  className="rounded-xl border border-slate-200 dark:border-slate-800 p-4 space-y-2.5"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <span className="font-mono text-[11px] text-slate-500">{b.referenceCode}</span>
                      <div className="font-semibold text-sm">{b.productTitle[lang]}</div>
                      <div className="text-xs text-slate-500">
                        {b.customerName} · {b.checkInDate}
                      </div>
                    </div>
                    <div className="font-mono tabular-nums font-bold text-sm shrink-0">
                      {formatMoney(b.totalOriginal, b.originalCurrency)}
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                    <BookingStatusBadge status={b.status} lang={lang} />
                    <div className="flex gap-2">
                      {b.status === 'Awaiting Provider Confirmation' && (
                        <>
                          <button
                            type="button"
                            onClick={() => {
                              updateBookingStatus(b.id, 'Confirmed');
                              showToast(
                                lang === 'ar'
                                  ? `تم تأكيد الحجز ${b.referenceCode}`
                                  : `Booking ${b.referenceCode} confirmed`,
                                'success'
                              );
                            }}
                            className="min-h-[36px] px-3 py-1 rounded bg-emerald-600 text-white text-xs cursor-pointer"
                          >
                            Confirm
                          </button>
                          <button
                            type="button"
                            onClick={() => setConfirmRejectBooking(b)}
                            className="min-h-[36px] px-3 py-1 rounded border border-red-200 text-red-600 text-xs cursor-pointer"
                          >
                            Reject
                          </button>
                        </>
                      )}
                      {b.status === 'Confirmed' && (
                        <button
                          type="button"
                          onClick={() => {
                            updateBookingStatus(b.id, 'Completed');
                            showToast(`Booking ${b.referenceCode} marked Completed`, 'info');
                          }}
                          className="min-h-[36px] px-3 py-1 rounded border border-slate-200 text-xs cursor-pointer"
                        >
                          Mark Completed
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="hidden md:block rounded-xl border border-slate-200 dark:border-slate-800 overflow-x-auto">
              <table className="w-full text-sm min-w-[580px]">
                <thead className="bg-slate-50 dark:bg-slate-900/50 text-xs text-slate-500 border-b border-slate-200 dark:border-slate-800">
                  <tr>
                    <th className="px-4 py-3 text-start">Ref</th>
                    <th className="px-4 py-3 text-start">Service & Traveler</th>
                    <th className="px-4 py-3 text-end">Total</th>
                    <th className="px-4 py-3 text-start">Status</th>
                    <th className="px-4 py-3 text-end">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                  {orgBookings.map((b) => (
                    <tr key={b.id}>
                      <td className="px-4 py-3 font-mono text-xs">{b.referenceCode}</td>
                      <td className="px-4 py-3">
                        <div className="font-medium">{b.productTitle[lang]}</div>
                        <div className="text-xs text-slate-500">
                          {b.customerName} · {b.checkInDate}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-end font-mono tabular-nums font-semibold">
                        {formatMoney(b.totalOriginal, b.originalCurrency)}
                      </td>
                      <td className="px-4 py-3">
                        <BookingStatusBadge status={b.status} lang={lang} />
                      </td>
                      <td className="px-4 py-3 text-end space-x-2">
                        {b.status === 'Awaiting Provider Confirmation' && (
                          <>
                            <button
                              type="button"
                              onClick={() => {
                                updateBookingStatus(b.id, 'Confirmed');
                                showToast(
                                  lang === 'ar'
                                    ? `تم تأكيد الحجز ${b.referenceCode}`
                                    : `Booking ${b.referenceCode} confirmed`,
                                  'success'
                                );
                              }}
                              className="px-2.5 py-1 rounded bg-emerald-600 text-white text-xs cursor-pointer"
                            >
                              Confirm
                            </button>
                            <button
                              type="button"
                              onClick={() => setConfirmRejectBooking(b)}
                              className="px-2.5 py-1 rounded border border-red-200 text-red-600 text-xs cursor-pointer"
                            >
                              Reject
                            </button>
                          </>
                        )}
                        {b.status === 'Confirmed' && (
                          <button
                            type="button"
                            onClick={() => {
                              updateBookingStatus(b.id, 'Completed');
                              showToast(`Booking ${b.referenceCode} marked Completed`, 'info');
                            }}
                            className="px-2.5 py-1 rounded border border-slate-200 text-xs cursor-pointer"
                          >
                            Mark Completed
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

      {tab === 'availability' && (
        orgProducts.length === 0 ? (
          <div className="rounded-xl border border-slate-200 dark:border-slate-800 p-10 text-center text-sm text-slate-500">
            {lang === 'ar'
              ? 'أضف خدمة أولًا لإدارة التواريخ والتسعير الموسمي.'
              : 'Add a product first to manage availability slots and seasonal pricing.'}
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h3 className="text-sm font-semibold">
                {lang === 'ar' ? 'إدارة التوافر والتسعير الموسمي' : 'Availability & Dynamic Pricing'}
              </h3>
              <select
                value={selectedSlotProductId}
                onChange={(e) => setSelectedSlotProductId(e.target.value)}
                className="w-full sm:w-auto max-w-full rounded-lg border border-slate-200 dark:border-slate-700 px-3 py-2 text-xs"
              >
                {orgProducts.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.title[lang]}
                  </option>
                ))}
              </select>
            </div>
            <div className="rounded-xl border border-slate-200 dark:border-slate-800 overflow-x-auto">
              <table className="w-full text-sm min-w-[460px]">
                <thead className="bg-slate-50 dark:bg-slate-900/50 text-xs text-slate-500 border-b border-slate-200 dark:border-slate-800">
                  <tr>
                    <th className="px-4 py-3 text-start">Date</th>
                    <th className="px-4 py-3 text-end">Remaining Units</th>
                    <th className="px-4 py-3 text-end">Price Override</th>
                    <th className="px-4 py-3 text-end">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                  {(
                    orgProducts.find((p) => p.id === selectedSlotProductId)?.availableDates || [
                      '2026-11-25',
                      '2026-12-01',
                    ]
                  ).map((d) => {
                    const slot = availabilitySlots.find(
                      (s) => s.productId === selectedSlotProductId && s.date === d
                    );
                    return (
                      <tr key={d}>
                        <td className="px-4 py-3 font-mono text-xs">{d}</td>
                        <td className="px-4 py-3 text-end">
                          <input
                            type="number"
                            min={0}
                            value={slot?.remainingUnits ?? 6}
                            onChange={(e) =>
                              updateAvailabilitySlot(selectedSlotProductId, d, {
                                remainingUnits: Math.max(0, Number(e.target.value)),
                              })
                            }
                            className="w-20 rounded border border-slate-200 dark:border-slate-700 px-2 py-1 text-xs font-mono text-end"
                          />
                        </td>
                        <td className="px-4 py-3 text-end">
                          <input
                            type="number"
                            min={1}
                            value={slot?.priceOverride ?? ''}
                            placeholder="Default"
                            onChange={(e) =>
                              updateAvailabilitySlot(selectedSlotProductId, d, {
                                priceOverride: e.target.value
                                  ? Math.max(1, Number(e.target.value))
                                  : undefined,
                              })
                            }
                            className="w-24 rounded border border-slate-200 dark:border-slate-700 px-2 py-1 text-xs font-mono text-end"
                          />
                        </td>
                        <td className="px-4 py-3 text-end">
                          <button
                            type="button"
                            onClick={() =>
                              updateAvailabilitySlot(selectedSlotProductId, d, {
                                available: !(slot?.available ?? true),
                              })
                            }
                            className={`text-xs font-medium cursor-pointer ${
                              slot?.available ?? true ? 'text-emerald-600' : 'text-red-600'
                            }`}
                          >
                            {slot?.available ?? true ? 'Open' : 'Blocked'}
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )
      )}

      {tab === 'requests' && (
        <div className="space-y-4">
          {travelRequests.length === 0 ? (
            <div className="rounded-xl border border-slate-200 dark:border-slate-800 p-10 text-center text-sm text-slate-500">
              {lang === 'ar' ? 'لا توجد طلبات سفر مفتوحة من العملاء حاليًا.' : 'No open customer trip requests right now.'}
            </div>
          ) : (
            travelRequests.map((req) => (
              <div
                key={req.id}
                className="rounded-xl border border-slate-200 dark:border-slate-800 p-5 flex flex-wrap items-center justify-between gap-4"
              >
                <div>
                  <h4 className="font-semibold">{req.destination}</h4>
                  <p className="text-xs text-slate-500 font-mono">
                    {req.customerName} · {req.travelDate} · {req.travelersCount} pax · Budget:{' '}
                    {formatMoney(req.budget, req.currency)}
                  </p>
                  <p className="text-xs text-slate-600 dark:text-slate-300 mt-1">{req.notes}</p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setQuoteError('');
                    setQuoteDraft({
                      requestId: req.id,
                      quotedPrice: req.budget,
                      validUntil: '2026-12-10',
                      summary: `Custom proposal for ${req.destination}`,
                    });
                  }}
                  className="px-4 py-2 rounded-lg bg-[#0052CC] text-white text-xs font-semibold cursor-pointer"
                >
                  {lang === 'ar' ? 'إرسال عرض سعر' : 'Send Quotation'}
                </button>
              </div>
            ))
          )}

          {quoteDraft && (
            <form
              noValidate
              onSubmit={(e) => {
                e.preventDefault();
                setQuoteError('');
                if (!Number.isFinite(quoteDraft.quotedPrice) || quoteDraft.quotedPrice <= 0) {
                  const msg =
                    lang === 'ar' ? 'يرجى إدخال قيمة عرض سعر صحيحة.' : 'Quoted price must be greater than zero.';
                  setQuoteError(msg);
                  showToast(msg, 'error');
                  return;
                }
                if (!quoteDraft.validUntil || quoteDraft.summary.trim().length < 5) {
                  const msg =
                    lang === 'ar'
                      ? 'يرجى تحديد تاريخ الصلاحية وملخص واضح للعرض.'
                      : 'Please specify validity date and a descriptive summary.';
                  setQuoteError(msg);
                  showToast(msg, 'error');
                  return;
                }
                createQuotation(quoteDraft.requestId, quoteDraft);
                setQuoteDraft(null);
                showToast(
                  lang === 'ar' ? 'تم إرسال عرض السعر إلى المسافر' : 'Quotation sent to customer',
                  'success'
                );
              }}
              className="rounded-xl border border-blue-200 dark:border-blue-900 bg-blue-50/40 dark:bg-blue-950/20 p-5 space-y-3"
            >
              <h4 className="text-sm font-semibold">New Quotation</h4>
              {quoteError && (
                <div role="alert" className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
                  {quoteError}
                </div>
              )}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <input
                  type="number"
                  value={quoteDraft.quotedPrice}
                  onChange={(e) =>
                    setQuoteDraft({ ...quoteDraft, quotedPrice: Number(e.target.value) })
                  }
                  className="rounded-lg border border-slate-200 bg-white dark:bg-slate-900 px-3 py-2 text-sm font-mono"
                />
                <input
                  type="date"
                  value={quoteDraft.validUntil}
                  onChange={(e) => setQuoteDraft({ ...quoteDraft, validUntil: e.target.value })}
                  className="rounded-lg border border-slate-200 bg-white dark:bg-slate-900 px-3 py-2 text-sm font-mono"
                />
              </div>
              <textarea
                rows={2}
                value={quoteDraft.summary}
                onChange={(e) => setQuoteDraft({ ...quoteDraft, summary: e.target.value })}
                className="w-full rounded-lg border border-slate-200 bg-white dark:bg-slate-900 px-3 py-2 text-sm"
              />
              <div className="flex gap-2">
                <button
                  type="submit"
                  className="min-h-[40px] px-4 py-2 rounded-lg bg-[#0052CC] text-white text-xs font-semibold cursor-pointer"
                >
                  Submit Quote
                </button>
                <button
                  type="button"
                  onClick={() => setQuoteDraft(null)}
                  className="min-h-[40px] px-4 py-2 rounded-lg border border-slate-200 text-xs cursor-pointer"
                >
                  Cancel
                </button>
              </div>
            </form>
          )}
        </div>
      )}

      {tab === 'staff' && (
        <div className="space-y-4">
          {staffError && (
            <div role="alert" className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
              {staffError}
            </div>
          )}
          <form
            noValidate
            onSubmit={(e) => {
              e.preventDefault();
              setStaffError('');
              if (staffForm.name.trim().length < 2) {
                const msg =
                  lang === 'ar' ? 'يرجى إدخال اسم الموظف.' : 'Please enter staff member name.';
                setStaffError(msg);
                showToast(msg, 'error');
                return;
              }
              if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(staffForm.email.trim())) {
                const msg =
                  lang === 'ar' ? 'يرجى إدخال بريد إلكتروني صحيح للموظف.' : 'Please enter a valid staff email.';
                setStaffError(msg);
                showToast(msg, 'error');
                return;
              }
              addStaffMember(org.id, {
                name: staffForm.name.trim(),
                email: staffForm.email.trim(),
                memberRole: staffForm.memberRole,
              });
              setStaffForm({ name: '', email: '', memberRole: 'agent' });
              showToast(lang === 'ar' ? 'تمت إضافة الموظف' : 'Staff member added', 'success');
            }}
            className="rounded-xl border border-slate-200 dark:border-slate-800 p-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3"
          >
            <input
              type="text"
              value={staffForm.name}
              onChange={(e) => {
                setStaffForm({ ...staffForm, name: e.target.value });
                if (staffError) setStaffError('');
              }}
              placeholder="Staff Name"
              className="rounded-lg border border-slate-200 dark:border-slate-700 px-3 py-2 text-sm"
            />
            <input
              type="email"
              value={staffForm.email}
              onChange={(e) => {
                setStaffForm({ ...staffForm, email: e.target.value });
                if (staffError) setStaffError('');
              }}
              placeholder="Email"
              className="rounded-lg border border-slate-200 dark:border-slate-700 px-3 py-2 text-sm"
            />
            <select
              value={staffForm.memberRole}
              onChange={(e) =>
                setStaffForm({ ...staffForm, memberRole: e.target.value as 'manager' | 'agent' })
              }
              className="rounded-lg border border-slate-200 dark:border-slate-700 px-3 py-2 text-sm"
            >
              <option value="manager">Manager</option>
              <option value="agent">Agent</option>
            </select>
            <button
              type="submit"
              className="min-h-[40px] px-4 py-2 rounded-lg bg-slate-900 text-white text-xs font-semibold cursor-pointer"
            >
              Add Staff
            </button>
          </form>

          <div className="rounded-xl border border-slate-200 dark:border-slate-800 overflow-x-auto">
            {orgStaff.length === 0 ? (
              <div className="p-8 text-center text-sm text-slate-500">
                {lang === 'ar' ? 'لا يوجد موظفون مضافون بعد.' : 'No staff members added yet.'}
              </div>
            ) : (
              <table className="w-full text-sm min-w-[520px]">
                <thead className="bg-slate-50 dark:bg-slate-900/50 text-xs text-slate-500 border-b border-slate-200 dark:border-slate-800">
                  <tr>
                    <th className="px-4 py-3 text-start">Name</th>
                    <th className="px-4 py-3 text-start">Email</th>
                    <th className="px-4 py-3 text-start">Role</th>
                    <th className="px-4 py-3 text-start">Permissions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                  {orgStaff.map((m) => (
                    <tr key={m.id}>
                      <td className="px-4 py-3 font-medium">{m.name}</td>
                      <td className="px-4 py-3 font-mono text-xs">{m.email}</td>
                      <td className="px-4 py-3 text-xs capitalize">{m.memberRole}</td>
                      <td className="px-4 py-3 font-mono text-xs text-slate-500">
                        {m.permissions.join(', ')}
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
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="rounded-xl border border-slate-200 dark:border-slate-800 p-5 space-y-4">
            <h3 className="text-sm font-semibold">
              {lang === 'ar' ? 'المبيعات حسب القطاع' : 'Sales by Category'}
            </h3>
            {(Object.keys(CATEGORIES) as ServiceCategory[]).slice(0, 5).map((cat) => {
              const sum = orgBookings
                .filter((b) => b.category === cat)
                .reduce((s, b) => s + b.totalEur, 0);
              const pct = totalEurSales > 0 ? Math.round((sum / totalEurSales) * 100) : 0;
              return (
                <div key={cat} className="space-y-1">
                  <div className="flex justify-between text-xs">
                    <span>{CATEGORIES[cat][lang]}</span>
                    <span className="font-mono tabular-nums">€{sum.toFixed(0)} ({pct}%)</span>
                  </div>
                  <div className="h-2 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                    <div className="h-full bg-[#0052CC]" style={{ width: `${pct}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
          <div className="rounded-xl border border-slate-200 dark:border-slate-800 p-5 space-y-3">
            <h3 className="text-sm font-semibold">
              {lang === 'ar' ? 'مؤشرات الأداء الشهري' : 'Monthly Performance'}
            </h3>
            <div className="flex justify-between text-sm py-2 border-b border-slate-100 dark:border-slate-800">
              <span>Confirmed Booking Rate</span>
              <span className="font-mono font-semibold">{confirmRate}%</span>
            </div>
            <div className="flex justify-between text-sm py-2 border-b border-slate-100 dark:border-slate-800">
              <span>Average Order Value</span>
              <span className="font-mono font-semibold">
                €{(orgBookings.length ? totalEurSales / orgBookings.length : 0).toFixed(2)}
              </span>
            </div>
            <div className="flex justify-between text-sm py-2">
              <span>Affiliate-Sourced Bookings</span>
              <span className="font-mono font-semibold">
                {orgBookings.filter((b) => Boolean(b.sellerId)).length}
              </span>
            </div>
          </div>
        </div>
      )}

      <ConfirmDialog
        open={Boolean(confirmRejectBooking)}
        title={lang === 'ar' ? 'رفض الحجز' : 'Reject Booking Request'}
        message={
          confirmRejectBooking
            ? lang === 'ar'
              ? `هل أنت متأكد من رفض الحجز ${confirmRejectBooking.referenceCode} للعميل ${confirmRejectBooking.customerName}؟`
              : `Are you sure you want to reject booking ${confirmRejectBooking.referenceCode} for ${confirmRejectBooking.customerName}?`
            : ''
        }
        confirmLabel={lang === 'ar' ? 'نعم، رفض الحجز' : 'Yes, Reject Booking'}
        cancelLabel={lang === 'ar' ? 'تراجع' : 'Cancel'}
        variant="danger"
        onConfirm={() => {
          if (confirmRejectBooking) {
            updateBookingStatus(confirmRejectBooking.id, 'Rejected');
            showToast(
              lang === 'ar'
                ? `تم رفض الحجز ${confirmRejectBooking.referenceCode}`
                : `Booking ${confirmRejectBooking.referenceCode} rejected`,
              'info'
            );
          }
          setConfirmRejectBooking(null);
        }}
        onCancel={() => setConfirmRejectBooking(null)}
      />

      <ConfirmDialog
        open={Boolean(confirmUnpublishProduct)}
        title={lang === 'ar' ? 'إخفاء الخدمة من السوق' : 'Unpublish Service'}
        message={
          confirmUnpublishProduct
            ? lang === 'ar'
              ? `سيتم تحويل "${confirmUnpublishProduct.title.ar}" إلى مسودة ولن تظهر للمسافرين في السوق.`
              : `This will move "${confirmUnpublishProduct.title.en}" to Draft and hide it from marketplace search.`
            : ''
        }
        confirmLabel={lang === 'ar' ? 'تحويل إلى مسودة' : 'Move to Draft'}
        cancelLabel={lang === 'ar' ? 'إلغاء' : 'Cancel'}
        variant="danger"
        onConfirm={() => {
          if (confirmUnpublishProduct) {
            toggleProductPublish(confirmUnpublishProduct.id);
            showToast(
              lang === 'ar' ? 'تم إخفاء الخدمة مؤقتًا' : 'Service moved to Draft',
              'info'
            );
          }
          setConfirmUnpublishProduct(null);
        }}
        onCancel={() => setConfirmUnpublishProduct(null)}
      />
    </div>
  );
}
