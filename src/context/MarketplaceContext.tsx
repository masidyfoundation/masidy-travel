import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import type {
  AffiliateLink,
  AuditLog,
  AvailabilitySlot,
  Booking,
  BookingStatus,
  ChatMessage,
  CommissionRule,
  CurrencyCode,
  Language,
  LedgerEntry,
  NotificationItem,
  Organization,
  OrganizationMember,
  Payout,
  PlatformSettings,
  Product,
  Quotation,
  Review,
  SellerProfile,
  ServiceCategory,
  SupportTicket,
  TravelerDetail,
  TravelRequest,
  User,
  UserRole,
} from '../shared/types.ts';
import { CURRENCY_RATES_FROM_EUR, convertAmount } from '../shared/currency.ts';
import {
  clearPersistedState,
  createDefaultPersistedState,
  loadPersistedState,
  savePersistedState,
} from '../shared/storage.ts';

export type AppRoute =
  | { page: 'home' }
  | { page: 'search'; query?: string; category?: string }
  | { page: 'category'; category: ServiceCategory }
  | { page: 'provider'; organizationId: string }
  | { page: 'product'; productId: string }
  | { page: 'booking'; productId: string; date?: string; travelers?: number }
  | { page: 'booking-confirmation'; bookingId: string }
  | { page: 'quotations'; requestId?: string }
  | { page: 'dashboard'; role?: UserRole; tab?: string };

export type ToastType = 'success' | 'error' | 'info';

export interface ToastMessage {
  message: string;
  type: ToastType;
}

interface MarketplaceContextValue {
  route: AppRoute;
  navigate: (next: AppRoute) => void;
  lang: Language;
  setLang: (l: Language) => void;
  currency: CurrencyCode;
  setCurrency: (c: CurrencyCode) => void;
  activeUser: User | null;
  setActiveUser: (u: User | null) => void;
  switchDemoRole: (role: UserRole) => User;
  registerMockUser: (payload: {
    name: string;
    email: string;
    phone?: string;
    role: UserRole;
    companyName?: string;
    companyCity?: string;
    companyCountry?: string;
    sellerDisplayName?: string;
  }) => User;
  loginMockUser: (email: string) => User | null;
  logout: () => void;
  resetDemoData: () => void;

  // Entities
  users: User[];
  organizations: Organization[];
  orgMembers: OrganizationMember[];
  sellers: SellerProfile[];
  products: Product[];
  availabilitySlots: AvailabilitySlot[];
  affiliateLinks: AffiliateLink[];
  bookings: Booking[];
  travelRequests: TravelRequest[];
  quotations: Quotation[];
  commissionRules: CommissionRule[];
  ledgerEntries: LedgerEntry[];
  payouts: Payout[];
  reviews: Review[];
  tickets: SupportTicket[];
  auditLogs: AuditLog[];
  notifications: NotificationItem[];
  messages: ChatMessage[];
  platformSettings: PlatformSettings;
  favoriteIds: string[];
  activeReferral: string;
  setActiveReferral: (code: string) => void;
  toast: ToastMessage | null;
  showToast: (msg: string, type?: ToastType) => void;
  dismissToast: () => void;

  // Interactive Frontend Mutations (Mock State)
  toggleFavorite: (productId: string) => void;
  createBooking: (payload: {
    productId: string;
    checkInDate: string;
    checkOutDate?: string;
    travelersCount: number;
    travelers: TravelerDetail[];
    affiliateCode?: string;
    specialNotes?: string;
    currency: CurrencyCode;
  }) => Booking;
  updateBookingStatus: (bookingId: string, status: BookingStatus, note?: string) => void;
  createTravelRequest: (payload: Partial<TravelRequest>) => TravelRequest;
  createQuotation: (requestId: string, payload: Partial<Quotation>) => Quotation;
  respondToQuotation: (quotationId: string, action: 'accept' | 'reject') => Booking | null;
  addReview: (productId: string, rating: number, comment: string) => void;
  saveProduct: (product: Partial<Product> & { id?: string }) => Product;
  toggleProductPublish: (productId: string) => void;
  updateAvailabilitySlot: (
    productId: string,
    date: string,
    patch: { remainingUnits?: number; priceOverride?: number; available?: boolean }
  ) => void;
  updateOrganizationProfile: (orgId: string, patch: Partial<Organization>) => void;
  updateSellerProfile: (sellerId: string, patch: Partial<SellerProfile>) => void;
  addStaffMember: (
    orgId: string,
    payload: { name: string; email: string; memberRole: 'manager' | 'agent' }
  ) => void;
  generateAffiliateLink: (productId: string) => AffiliateLink | null;
  simulateAffiliateClick: (linkId: string) => void;
  markNotificationRead: (id: string) => void;
  markAllNotificationsRead: (userId: string) => void;
  sendMessage: (payload: {
    recipientId: string;
    recipientName: string;
    subject: string;
    text: string;
  }) => void;
  updateCustomerProfile: (patch: Partial<User>) => void;
  toggleUserStatus: (userId: string) => void;
  toggleOrganizationVerify: (orgId: string) => void;
  toggleSellerStatus: (sellerId: string) => void;
  addCommissionRule: (rule: Omit<CommissionRule, 'id' | 'active'>) => void;
  settlePayout: (payoutId: string) => void;
  requestSellerPayout: () => boolean;
  updateTicketStatus: (ticketId: string, status: 'Open' | 'In Review' | 'Resolved') => void;
  updatePlatformSettings: (patch: Partial<PlatformSettings>) => void;
}

const MarketplaceContext = createContext<MarketplaceContextValue | null>(null);

function uid(prefix: string): string {
  return `${prefix}_${Math.random().toString(36).slice(2, 9)}`;
}

export function MarketplaceProvider({ children }: { children: ReactNode }) {
  const initialLoadRef = useRef<ReturnType<typeof loadPersistedState> | null>(null);
  if (!initialLoadRef.current) {
    initialLoadRef.current = loadPersistedState();
  }
  const initialState = initialLoadRef.current.state;
  const storageWasCorrupted = initialLoadRef.current.status === 'corrupted';

  const [route, setRoute] = useState<AppRoute>({ page: 'home' });
  const [lang, setLang] = useState<Language>(initialState.lang);
  const [currency, setCurrency] = useState<CurrencyCode>(initialState.currency);

  const [users, setUsers] = useState<User[]>(initialState.users);
  const [activeUser, setActiveUser] = useState<User | null>(() => {
    if (!initialState.activeUserId) return null;
    return initialState.users.find((u) => u.id === initialState.activeUserId) || null;
  });
  const [organizations, setOrganizations] = useState<Organization[]>(initialState.organizations);
  const [orgMembers, setOrgMembers] = useState<OrganizationMember[]>(initialState.orgMembers);
  const [sellers, setSellers] = useState<SellerProfile[]>(initialState.sellers);
  const [products, setProducts] = useState<Product[]>(initialState.products);
  const [availabilitySlots, setAvailabilitySlots] = useState<AvailabilitySlot[]>(
    initialState.availabilitySlots
  );
  const [affiliateLinks, setAffiliateLinks] = useState<AffiliateLink[]>(
    initialState.affiliateLinks
  );
  const [bookings, setBookings] = useState<Booking[]>(initialState.bookings);
  const [travelRequests, setTravelRequests] = useState<TravelRequest[]>(
    initialState.travelRequests
  );
  const [quotations, setQuotations] = useState<Quotation[]>(initialState.quotations);
  const [commissionRules, setCommissionRules] = useState<CommissionRule[]>(
    initialState.commissionRules
  );
  const [ledgerEntries, setLedgerEntries] = useState<LedgerEntry[]>(initialState.ledgerEntries);
  const [payouts, setPayouts] = useState<Payout[]>(initialState.payouts);
  const [reviews, setReviews] = useState<Review[]>(initialState.reviews);
  const [tickets, setTickets] = useState<SupportTicket[]>(initialState.tickets);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>(initialState.auditLogs);
  const [notifications, setNotifications] = useState<NotificationItem[]>(
    initialState.notifications
  );
  const [messages, setMessages] = useState<ChatMessage[]>(initialState.messages);
  const [platformSettings, setPlatformSettings] = useState<PlatformSettings>(
    initialState.platformSettings
  );
  const [favoriteIds, setFavoriteIds] = useState<string[]>(initialState.favoriteIds);
  const [activeReferral, setActiveReferral] = useState<string>(initialState.activeReferral);
  const [toast, setToast] = useState<ToastMessage | null>(null);
  const toastTimerRef = useRef<number | null>(null);

  useEffect(() => {
    document.documentElement.lang = lang;
    document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr';
  }, [lang]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const refParam = params.get('ref');
    const prodParam = params.get('product');
    if (refParam) setActiveReferral(refParam.toUpperCase());
    if (prodParam) setRoute({ page: 'product', productId: prodParam });

    if (storageWasCorrupted) {
      showToast(
        initialState.lang === 'ar'
          ? 'تمت استعادة البيانات التجريبية الافتراضية بعد تعذر قراءة التخزين المحلي.'
          : 'Local demo state could not be read and was safely restored to defaults.',
        'info'
      );
    }

    return () => {
      if (toastTimerRef.current) {
        window.clearTimeout(toastTimerRef.current);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Persist sanitized demo state across browser refreshes
  useEffect(() => {
    savePersistedState({
      lang,
      currency,
      activeReferral,
      activeUserId: activeUser?.id || null,
      users,
      organizations,
      orgMembers,
      sellers,
      products,
      availabilitySlots,
      affiliateLinks,
      bookings,
      travelRequests,
      quotations,
      commissionRules,
      ledgerEntries,
      payouts,
      reviews,
      tickets,
      auditLogs,
      notifications,
      messages,
      platformSettings,
      favoriteIds,
    });
  }, [
    lang,
    currency,
    activeReferral,
    activeUser,
    users,
    organizations,
    orgMembers,
    sellers,
    products,
    availabilitySlots,
    affiliateLinks,
    bookings,
    travelRequests,
    quotations,
    commissionRules,
    ledgerEntries,
    payouts,
    reviews,
    tickets,
    auditLogs,
    notifications,
    messages,
    platformSettings,
    favoriteIds,
  ]);

  function showToast(msg: string, type: ToastType = 'success') {
    if (toastTimerRef.current) {
      window.clearTimeout(toastTimerRef.current);
    }
    setToast({ message: msg, type });
    toastTimerRef.current = window.setTimeout(() => {
      setToast(null);
      toastTimerRef.current = null;
    }, 4500);
  }

  function dismissToast() {
    if (toastTimerRef.current) {
      window.clearTimeout(toastTimerRef.current);
      toastTimerRef.current = null;
    }
    setToast(null);
  }

  function navigate(next: AppRoute) {
    setRoute(next);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function resetDemoData() {
    clearPersistedState();
    const defaults = createDefaultPersistedState();
    setLang(defaults.lang);
    setCurrency(defaults.currency);
    setActiveReferral('');
    setActiveUser(null);
    setUsers(defaults.users);
    setOrganizations(defaults.organizations);
    setOrgMembers(defaults.orgMembers);
    setSellers(defaults.sellers);
    setProducts(defaults.products);
    setAvailabilitySlots(defaults.availabilitySlots);
    setAffiliateLinks(defaults.affiliateLinks);
    setBookings(defaults.bookings);
    setTravelRequests(defaults.travelRequests);
    setQuotations(defaults.quotations);
    setCommissionRules(defaults.commissionRules);
    setLedgerEntries(defaults.ledgerEntries);
    setPayouts(defaults.payouts);
    setReviews(defaults.reviews);
    setTickets(defaults.tickets);
    setAuditLogs(defaults.auditLogs);
    setNotifications(defaults.notifications);
    setMessages(defaults.messages);
    setPlatformSettings(defaults.platformSettings);
    setFavoriteIds(defaults.favoriteIds);
    setRoute({ page: 'home' });
    showToast(
      defaults.lang === 'ar'
        ? 'تمت إعادة ضبط البيانات التجريبية بنجاح'
        : 'Demo marketplace data has been reset',
      'info'
    );
  }

  function pushAudit(action: string, entityType: string, entityId: string, details: string) {
    const actor = activeUser || users[0];
    setAuditLogs((prev) => [
      {
        id: uid('aud'),
        actorId: actor.id,
        actorName: actor.name,
        actorRole: actor.role,
        action,
        entityType,
        entityId,
        details,
        createdAt: new Date().toISOString(),
      },
      ...prev,
    ]);
  }

  function pushNotification(payload: {
    userId: string;
    type: NotificationItem['type'];
    title: NotificationItem['title'];
    body: NotificationItem['body'];
  }) {
    setNotifications((prev) => [
      {
        id: uid('not'),
        userId: payload.userId,
        type: payload.type,
        title: payload.title,
        body: payload.body,
        read: false,
        createdAt: new Date().toISOString(),
      },
      ...prev,
    ]);
  }

  function switchDemoRole(role: UserRole): User {
    const found =
      users.find((u) => u.role === role && u.status !== 'suspended') ||
      users.find((u) => u.role === role) ||
      users[0];
    setActiveUser(found);
    return found;
  }

  function loginMockUser(email: string): User | null {
    const found = users.find((u) => u.email.toLowerCase() === email.trim().toLowerCase());
    if (!found) return null;
    if (found.status === 'suspended') {
      return found;
    }
    setActiveUser(found);
    return found;
  }

  function registerMockUser(payload: {
    name: string;
    email: string;
    phone?: string;
    role: UserRole;
    companyName?: string;
    companyCity?: string;
    companyCountry?: string;
    sellerDisplayName?: string;
  }): User {
    const now = new Date().toISOString();
    let organizationId: string | undefined;
    let sellerId: string | undefined;
    const userId = uid('usr');

    if (payload.role === 'provider') {
      organizationId = uid('org');
      const orgName = (payload.companyName || `${payload.name} Travel`).trim();
      setOrganizations((prev) => [
        {
          id: organizationId!,
          name: orgName,
          slug: orgName.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
          country: payload.companyCountry || 'Egypt',
          city: payload.companyCity || 'Cairo',
          contactEmail: payload.email,
          phone: payload.phone || '+20 100 000 0000',
          description: {
            ar: `شركة سياحة مسجلة مجانًا على منصة Masidy — ${orgName}`,
            en: `Free-tier registered tourism provider on Masidy — ${orgName}`,
            it: `Operatore turistico registrato gratis su Masidy — ${orgName}`,
          },
          verified: false,
          subscriptionPlan: 'free',
          createdAt: now,
        },
        ...prev,
      ]);
      setOrgMembers((prev) => [
        ...prev,
        {
          id: uid('mem'),
          organizationId: organizationId!,
          userId,
          name: payload.name,
          email: payload.email,
          memberRole: 'owner',
          permissions: [
            'catalog:write',
            'bookings:confirm',
            'quotations:send',
            'staff:manage',
            'finance:read',
          ],
          createdAt: now,
        },
      ]);
    }

    if (payload.role === 'seller') {
      sellerId = uid('seller');
      const ref = `${
        payload.name
          .replace(/[^a-zA-Z0-9]/g, '')
          .toUpperCase()
          .slice(0, 5) || 'MSD'
      }${Math.floor(10 + Math.random() * 89)}`;
      setSellers((prev) => [
        {
          id: sellerId!,
          userId,
          displayName: payload.sellerDisplayName || payload.name,
          bio: 'Independent Masidy travel affiliate partner.',
          referralCode: ref,
          couponCode: `MSD${ref}`,
          totalClicks: 0,
          totalConversions: 0,
          pendingBalanceEur: 0,
          settledBalanceEur: 0,
          verified: true,
          status: 'active',
          createdAt: now,
        },
        ...prev,
      ]);
    }

    const newUser: User = {
      id: userId,
      name: payload.name,
      email: payload.email,
      role: payload.role,
      phone: payload.phone || '',
      organizationId,
      sellerId,
      status: 'active',
      createdAt: now,
    };
    setUsers((prev) => [newUser, ...prev]);
    setActiveUser(newUser);
    pushAudit('USER_REGISTERED', 'user', userId, `Registered ${payload.role}: ${payload.email}`);
    return newUser;
  }

  function logout() {
    setActiveUser(null);
    setRoute({ page: 'home' });
    showToast(lang === 'ar' ? 'تم تسجيل الخروج بنجاح' : 'Signed out successfully', 'info');
  }

  function toggleFavorite(productId: string) {
    const exists = favoriteIds.includes(productId);
    setFavoriteIds((prev) =>
      exists ? prev.filter((id) => id !== productId) : [...prev, productId]
    );
    showToast(
      exists
        ? lang === 'ar'
          ? 'تمت إزالة الخدمة من المفضلة'
          : 'Removed from favorites'
        : lang === 'ar'
        ? 'تم حفظ الخدمة في المفضلة'
        : 'Saved to favorites',
      'info'
    );
  }

  function computeSnapshot(
    grossOriginal: number,
    costOriginal: number,
    cur: CurrencyCode,
    category: ServiceCategory,
    organizationId: string,
    hasSeller: boolean
  ) {
    const rate = CURRENCY_RATES_FROM_EUR[cur];
    const grossEur = Number((grossOriginal / rate).toFixed(2));
    const providerCostEur = Number((costOriginal / rate).toFixed(2));
    const rule =
      commissionRules.find(
        (r) => r.active && r.scope === 'organization' && r.organizationId === organizationId
      ) ||
      commissionRules.find((r) => r.active && r.scope === 'category' && r.category === category) ||
      commissionRules.find((r) => r.active && r.scope === 'global') ||
      commissionRules[0];

    const platformFeeEur = Number(
      ((grossEur * rule.platformPercent) / 100 + rule.fixedFeeEur).toFixed(2)
    );
    const sellerCommissionEur = hasSeller
      ? Number(((grossEur * rule.sellerPercent) / 100).toFixed(2))
      : 0;
    const companyMarginEur = Number(
      (grossEur - providerCostEur - platformFeeEur - sellerCommissionEur).toFixed(2)
    );

    return {
      rate,
      grossEur,
      snapshot: {
        ruleId: rule.id,
        ruleName: rule.name,
        grossEur,
        providerCostEur,
        sellerCommissionEur,
        platformFeeEur,
        companyMarginEur,
      },
    };
  }

  /**
   * Idempotently applies financial ledger entries, seller conversions/balance,
   * and affiliate link analytics when a booking reaches Confirmed state.
   */
  function applyBookingConfirmationEffects(booking: Booking) {
    const alreadyRecorded = ledgerEntries.some(
      (e) => e.bookingId === booking.id && e.entryType === 'provider_payable'
    );
    if (alreadyRecorded) return;

    const snap = booking.commissionSnapshot;
    const providerShare = Number((snap.providerCostEur + snap.companyMarginEur).toFixed(2));
    const now = new Date().toISOString();

    const newEntries: LedgerEntry[] = [
      {
        id: uid('led'),
        bookingId: booking.id,
        accountType: 'provider',
        entityId: booking.organizationId,
        entityName: booking.providerName,
        entryType: 'provider_payable',
        amountEur: providerShare,
        originalCurrency: booking.originalCurrency,
        originalAmount: Number((providerShare * booking.exchangeRateAtBooking).toFixed(2)),
        exchangeRate: booking.exchangeRateAtBooking,
        description: `Provider share for ${booking.referenceCode}`,
        createdAt: now,
        immutable: true,
      },
      {
        id: uid('led'),
        bookingId: booking.id,
        accountType: 'platform',
        entityId: 'masidy_platform',
        entityName: 'MASIDY Platform Revenue',
        entryType: 'platform_fee',
        amountEur: snap.platformFeeEur,
        originalCurrency: booking.originalCurrency,
        originalAmount: Number((snap.platformFeeEur * booking.exchangeRateAtBooking).toFixed(2)),
        exchangeRate: booking.exchangeRateAtBooking,
        description: `Platform fee for ${booking.referenceCode}`,
        createdAt: now,
        immutable: true,
      },
    ];

    if (booking.sellerId && snap.sellerCommissionEur > 0) {
      newEntries.push({
        id: uid('led'),
        bookingId: booking.id,
        accountType: 'seller',
        entityId: booking.sellerId,
        entityName: booking.sellerName || 'Affiliate Seller',
        entryType: 'seller_commission',
        amountEur: snap.sellerCommissionEur,
        originalCurrency: booking.originalCurrency,
        originalAmount: Number(
          (snap.sellerCommissionEur * booking.exchangeRateAtBooking).toFixed(2)
        ),
        exchangeRate: booking.exchangeRateAtBooking,
        description: `Affiliate commission for ${booking.referenceCode}`,
        createdAt: now,
        immutable: true,
      });

      setSellers((prev) =>
        prev.map((s) =>
          s.id === booking.sellerId
            ? {
                ...s,
                totalConversions: s.totalConversions + 1,
                pendingBalanceEur: Number(
                  (s.pendingBalanceEur + snap.sellerCommissionEur).toFixed(2)
                ),
              }
            : s
        )
      );

      setAffiliateLinks((prev) => {
        const exactMatchIdx = prev.findIndex(
          (l) => l.sellerId === booking.sellerId && l.productId === booking.productId
        );
        const fallbackIdx =
          exactMatchIdx >= 0
            ? exactMatchIdx
            : prev.findIndex((l) => l.sellerId === booking.sellerId);
        if (fallbackIdx < 0) return prev;
        return prev.map((l, idx) =>
          idx === fallbackIdx
            ? {
                ...l,
                conversions: l.conversions + 1,
                earnedEur: Number((l.earnedEur + snap.sellerCommissionEur).toFixed(2)),
              }
            : l
        );
      });
    }

    setLedgerEntries((prev) => [...newEntries, ...prev]);
  }

  function applyBookingRefundOrCancelEffects(booking: Booking) {
    // Restore availability units if a slot exists
    setAvailabilitySlots((prev) =>
      prev.map((s) =>
        s.productId === booking.productId && s.date === booking.checkInDate
          ? {
              ...s,
              remainingUnits: s.remainingUnits + booking.travelersCount,
              available: true,
            }
          : s
      )
    );

    const wasConfirmedInLedger = ledgerEntries.some(
      (e) => e.bookingId === booking.id && e.entryType === 'provider_payable'
    );
    const alreadyRefundedInLedger = ledgerEntries.some(
      (e) => e.bookingId === booking.id && e.entryType === 'refund'
    );

    if (!wasConfirmedInLedger || alreadyRefundedInLedger) return;

    const now = new Date().toISOString();
    setLedgerEntries((prev) => [
      {
        id: uid('led'),
        bookingId: booking.id,
        accountType: 'customer',
        entityId: booking.customerId,
        entityName: booking.customerName,
        entryType: 'refund',
        amountEur: -booking.totalEur,
        originalCurrency: booking.originalCurrency,
        originalAmount: -booking.totalOriginal,
        exchangeRate: booking.exchangeRateAtBooking,
        description: `Cancellation / refund reversal for ${booking.referenceCode}`,
        createdAt: now,
        immutable: true,
      },
      ...prev,
    ]);

    if (booking.sellerId && booking.commissionSnapshot.sellerCommissionEur > 0) {
      setSellers((prev) =>
        prev.map((s) =>
          s.id === booking.sellerId
            ? {
                ...s,
                pendingBalanceEur: Math.max(
                  0,
                  Number(
                    (s.pendingBalanceEur - booking.commissionSnapshot.sellerCommissionEur).toFixed(2)
                  )
                ),
              }
            : s
        )
      );
    }
  }

  function createBooking(payload: {
    productId: string;
    checkInDate: string;
    checkOutDate?: string;
    travelersCount: number;
    travelers: TravelerDetail[];
    affiliateCode?: string;
    specialNotes?: string;
    currency: CurrencyCode;
  }): Booking {
    const product = products.find((p) => p.id === payload.productId) || products[0];
    const customer = activeUser || users[0];
    const matchedSlot = availabilitySlots.find(
      (s) => s.productId === product.id && s.date === payload.checkInDate
    );
    const baseUnitPrice = matchedSlot?.priceOverride ?? product.price;
    const costRatio = product.price > 0 ? product.providerCost / product.price : 0.72;
    const baseUnitCost = Number((baseUnitPrice * costRatio).toFixed(2));

    const unitOriginal = convertAmount(baseUnitPrice, product.baseCurrency, payload.currency);
    const totalOriginal = Number((unitOriginal * payload.travelersCount).toFixed(2));
    const unitCost = convertAmount(baseUnitCost, product.baseCurrency, payload.currency);
    const totalCost = Number((unitCost * payload.travelersCount).toFixed(2));

    const codeNorm = (payload.affiliateCode || activeReferral || '').trim().toUpperCase();
    const matchedSeller = codeNorm
      ? sellers.find(
          (s) =>
            s.status !== 'paused' &&
            (s.referralCode.toUpperCase() === codeNorm || s.couponCode.toUpperCase() === codeNorm)
        )
      : undefined;

    const { rate, grossEur, snapshot } = computeSnapshot(
      totalOriginal,
      totalCost,
      payload.currency,
      product.category,
      product.organizationId,
      Boolean(matchedSeller)
    );

    const status: BookingStatus = product.instantBooking
      ? 'Confirmed'
      : 'Awaiting Provider Confirmation';

    const now = new Date().toISOString();
    const booking: Booking = {
      id: uid('bkg'),
      referenceCode: `MSD-2611-${Math.floor(200 + Math.random() * 799)}`,
      productId: product.id,
      productTitle: product.title,
      category: product.category,
      organizationId: product.organizationId,
      providerName: product.providerName,
      customerId: customer.id,
      customerName: payload.travelers[0]?.fullName || customer.name,
      customerEmail: payload.travelers[0]?.email || customer.email,
      sellerId: matchedSeller?.id,
      sellerName: matchedSeller?.displayName,
      affiliateCode: matchedSeller?.referralCode,
      checkInDate: payload.checkInDate,
      checkOutDate: payload.checkOutDate,
      travelersCount: payload.travelersCount,
      travelerNames: payload.travelers.map((t) => t.fullName).filter(Boolean),
      travelers: payload.travelers,
      specialNotes: payload.specialNotes,
      status,
      instantBooking: product.instantBooking,
      originalCurrency: payload.currency,
      exchangeRateAtBooking: rate,
      unitPriceOriginal: unitOriginal,
      totalOriginal,
      totalEur: grossEur,
      commissionSnapshot: snapshot,
      statusHistory: [
        {
          status,
          note: product.instantBooking
            ? 'Instant booking confirmed (mock checkout)'
            : `Submitted and awaiting confirmation from ${product.providerName}`,
          actorName: customer.name,
          timestamp: now,
        },
      ],
      createdAt: now,
    };

    setBookings((prev) => [booking, ...prev]);

    if (matchedSlot) {
      setAvailabilitySlots((prev) =>
        prev.map((s) =>
          s.id === matchedSlot.id
            ? {
                ...s,
                remainingUnits: Math.max(0, s.remainingUnits - payload.travelersCount),
              }
            : s
        )
      );
    }

    if (status === 'Confirmed') {
      applyBookingConfirmationEffects(booking);
    }

    pushNotification({
      userId: customer.id,
      type: 'booking',
      title: {
        ar: `حجز جديد ${booking.referenceCode}`,
        en: `Booking ${booking.referenceCode} Recorded`,
        it: `Prenotazione ${booking.referenceCode} Registrata`,
      },
      body: {
        ar: `${product.title.ar} — الحالة: ${status === 'Confirmed' ? 'مؤكد فورًا' : 'بانتظار موافقة الشركة'}`,
        en: `${product.title.en} — Status: ${status}`,
        it: `${product.title.it} — Stato: ${status}`,
      },
    });

    pushAudit('BOOKING_CREATED', 'booking', booking.id, `${booking.referenceCode} (${status})`);
    return booking;
  }

  function updateBookingStatus(bookingId: string, status: BookingStatus, note?: string) {
    const existing = bookings.find((b) => b.id === bookingId);
    if (!existing || existing.status === status) return;

    const actor = activeUser || users[0];
    const now = new Date().toISOString();

    if (status === 'Confirmed') {
      applyBookingConfirmationEffects(existing);
    } else if (status === 'Cancelled' || status === 'Refunded' || status === 'Rejected') {
      applyBookingRefundOrCancelEffects(existing);
    }

    setBookings((prev) =>
      prev.map((b) =>
        b.id === bookingId
          ? {
              ...b,
              status,
              statusHistory: [
                ...b.statusHistory,
                {
                  status,
                  note: note || `Status updated to ${status}`,
                  actorName: actor.name,
                  timestamp: now,
                },
              ],
            }
          : b
      )
    );

    pushNotification({
      userId: existing.customerId,
      type: 'booking',
      title: {
        ar: `تحديث حالة الحجز ${existing.referenceCode}`,
        en: `Booking ${existing.referenceCode} Updated`,
        it: `Aggiornamento Prenotazione ${existing.referenceCode}`,
      },
      body: {
        ar: `تم تحديث حالة حجز ${existing.productTitle.ar} إلى ${status}.`,
        en: `${existing.productTitle.en} is now ${status}.`,
        it: `${existing.productTitle.it} ora è ${status}.`,
      },
    });

    pushAudit('BOOKING_STATUS_UPDATED', 'booking', bookingId, `Changed to ${status}`);
  }

  function createTravelRequest(payload: Partial<TravelRequest>): TravelRequest {
    const customer = activeUser || users[0];
    const req: TravelRequest = {
      id: uid('req'),
      customerId: customer.id,
      customerName: customer.name,
      destination: payload.destination || 'Rome, Italy',
      travelDate: payload.travelDate || '2026-12-20',
      travelersCount: Number(payload.travelersCount || 2),
      budget: Number(payload.budget || 2000),
      currency: payload.currency || currency,
      accommodationType: payload.accommodationType || '4-5 Star Boutique Hotel',
      requestedServices: payload.requestedServices?.length
        ? payload.requestedServices
        : ['flights', 'hotels', 'transport'],
      notes: payload.notes || '',
      status: 'Open',
      createdAt: new Date().toISOString(),
    };
    setTravelRequests((prev) => [req, ...prev]);
    pushNotification({
      userId: customer.id,
      type: 'quotation',
      title: {
        ar: `تم استلام طلب الرحلة إلى ${req.destination}`,
        en: `Trip Request Received: ${req.destination}`,
        it: `Richiesta Viaggio Ricevuta: ${req.destination}`,
      },
      body: {
        ar: 'طلبك متاح الآن لشركات السياحة المعتمدة لتقديم عروض أسعار مخصصة.',
        en: 'Your request is open to verified tourism providers for custom quotations.',
        it: 'La richiesta è aperta alle agenzie verificate per ricevere preventivi.',
      },
    });
    pushAudit('TRAVEL_REQUEST_CREATED', 'travel_request', req.id, req.destination);
    return req;
  }

  function createQuotation(requestId: string, payload: Partial<Quotation>): Quotation {
    const org =
      organizations.find((o) => o.id === activeUser?.organizationId) || organizations[0];
    const req = travelRequests.find((r) => r.id === requestId);
    const quo: Quotation = {
      id: uid('quo'),
      requestId,
      organizationId: org.id,
      providerName: org.name,
      quotedPrice: Number(payload.quotedPrice || 1850),
      currency: payload.currency || req?.currency || currency,
      validUntil: payload.validUntil || '2026-12-10',
      accommodationTier: payload.accommodationTier || '5-Star Hotel',
      includesTransfers: payload.includesTransfers ?? true,
      cancellationSummary:
        payload.cancellationSummary || 'Free cancellation up to 7 days prior',
      summary: payload.summary || 'Custom tailored travel quotation.',
      items: payload.items?.length
        ? payload.items
        : [{ title: 'Complete Package Proposal', amount: Number(payload.quotedPrice || 1850) }],
      status: 'Quoted',
      createdAt: new Date().toISOString(),
    };
    setQuotations((prev) => [quo, ...prev]);
    setTravelRequests((prev) =>
      prev.map((r) => (r.id === requestId ? { ...r, status: 'Quoted' } : r))
    );
    if (req) {
      pushNotification({
        userId: req.customerId,
        type: 'quotation',
        title: {
          ar: `عرض سعر جديد من ${org.name}`,
          en: `New Quotation from ${org.name}`,
          it: `Nuovo Preventivo da ${org.name}`,
        },
        body: {
          ar: `قدمت ${org.name} عرضًا لوجهتك ${req.destination} بقيمة ${quo.quotedPrice} ${quo.currency}.`,
          en: `${org.name} quoted ${quo.quotedPrice} ${quo.currency} for ${req.destination}.`,
          it: `${org.name} ha inviato un preventivo di ${quo.quotedPrice} ${quo.currency} per ${req.destination}.`,
        },
      });
    }
    pushAudit(
      'QUOTATION_SENT',
      'quotation',
      quo.id,
      `${org.name} quoted ${quo.quotedPrice} ${quo.currency}`
    );
    return quo;
  }

  function respondToQuotation(quotationId: string, action: 'accept' | 'reject'): Booking | null {
    const quo = quotations.find((q) => q.id === quotationId);
    if (!quo) return null;
    if (action === 'reject') {
      setQuotations((prev) =>
        prev.map((q) => (q.id === quotationId ? { ...q, status: 'Rejected' } : q))
      );
      showToast(
        lang === 'ar' ? 'تم رفض عرض السعر' : 'Quotation declined',
        'info'
      );
      return null;
    }

    const req = travelRequests.find((r) => r.id === quo.requestId);
    const customer = activeUser || users[0];
    const { rate, grossEur, snapshot } = computeSnapshot(
      quo.quotedPrice,
      Number((quo.quotedPrice * 0.72).toFixed(2)),
      quo.currency,
      'visas_packages',
      quo.organizationId,
      false
    );
    const now = new Date().toISOString();
    const booking: Booking = {
      id: uid('bkg'),
      referenceCode: `MSD-QUO-${Math.floor(100 + Math.random() * 899)}`,
      productId: 'custom_quotation',
      productTitle: {
        ar: `عرض سعر معتمد: ${req?.destination || 'رحلة مخصصة'}`,
        en: `Accepted Quotation: ${req?.destination || 'Custom Trip'}`,
        it: `Preventivo Accettato: ${req?.destination || 'Viaggio Su Misura'}`,
      },
      category: 'visas_packages',
      organizationId: quo.organizationId,
      providerName: quo.providerName,
      customerId: req?.customerId || customer.id,
      customerName: req?.customerName || customer.name,
      customerEmail: customer.email,
      checkInDate: req?.travelDate || '2026-12-18',
      travelersCount: req?.travelersCount || 2,
      travelerNames: [req?.customerName || customer.name],
      specialNotes: quo.summary,
      status: 'Confirmed',
      instantBooking: false,
      originalCurrency: quo.currency,
      exchangeRateAtBooking: rate,
      unitPriceOriginal: quo.quotedPrice,
      totalOriginal: quo.quotedPrice,
      totalEur: grossEur,
      commissionSnapshot: snapshot,
      statusHistory: [
        {
          status: 'Confirmed',
          note: `Converted from quotation ${quo.id}`,
          actorName: customer.name,
          timestamp: now,
        },
      ],
      createdAt: now,
    };

    setBookings((prev) => [booking, ...prev]);
    applyBookingConfirmationEffects(booking);

    setQuotations((prev) =>
      prev.map((q) =>
        q.id === quotationId ? { ...q, status: 'Converted', convertedBookingId: booking.id } : q
      )
    );
    if (req) {
      setTravelRequests((prev) =>
        prev.map((r) => (r.id === req.id ? { ...r, status: 'Converted' } : r))
      );
    }
    pushNotification({
      userId: booking.customerId,
      type: 'booking',
      title: {
        ar: `تم تحويل العرض إلى حجز مؤكد ${booking.referenceCode}`,
        en: `Quotation Converted (${booking.referenceCode})`,
        it: `Preventivo Convertito (${booking.referenceCode})`,
      },
      body: {
        ar: `تم تأكيد عرض السعر المقدم من ${quo.providerName}.`,
        en: `Your quotation from ${quo.providerName} is now a confirmed booking.`,
        it: `Il tuo preventivo di ${quo.providerName} è ora una prenotazione confermata.`,
      },
    });
    pushAudit('QUOTATION_CONVERTED', 'booking', booking.id, booking.referenceCode);
    return booking;
  }

  function addReview(productId: string, rating: number, comment: string) {
    const user = activeUser || users[0];
    setReviews((prev) => [
      {
        id: uid('rev'),
        productId,
        customerId: user.id,
        customerName: user.name,
        rating,
        comment,
        createdAt: new Date().toISOString(),
      },
      ...prev,
    ]);
    setProducts((prev) =>
      prev.map((p) => {
        if (p.id !== productId) return p;
        const nextCount = p.reviewCount + 1;
        const nextRating = Number(((p.rating * p.reviewCount + rating) / nextCount).toFixed(1));
        return { ...p, reviewCount: nextCount, rating: nextRating };
      })
    );
  }

  function saveProduct(input: Partial<Product> & { id?: string }): Product {
    const org = organizations.find((o) => o.id === activeUser?.organizationId) || organizations[0];
    const categoryImages: Record<ServiceCategory, string> = {
      flights: '/src/assets/images/service_flights_aviation_1794591853771.jpg',
      hotels: '/src/assets/images/service_hotels_resort_1794591853761.jpg',
      tours: '/src/assets/images/service_tours_heritage_1794591854051.jpg',
      transport: '/src/assets/images/service_transport_chauffeur_1794591854886.jpg',
      car_rentals: '/src/assets/images/service_transport_chauffeur_1794591854886.jpg',
      cruises: '/src/assets/images/hero_masidy_travel_1794591852990.jpg',
      hajj_umrah: '/src/assets/images/service_spiritual_architecture_1794591855140.jpg',
      visas_packages: '/src/assets/images/service_tours_heritage_1794591854051.jpg',
    };

    const firstGalleryImage = input.mediaGallery?.find((m) => m.type === 'image')?.url;

    if (input.id) {
      const existing = products.find((p) => p.id === input.id);
      if (existing) {
        const nextImage =
          input.imageUrl || firstGalleryImage || existing.imageUrl || categoryImages[existing.category];
        const updated: Product = {
          ...existing,
          ...input,
          imageUrl: nextImage,
          providerName: org.name,
        };
        setProducts((prev) => prev.map((p) => (p.id === input.id ? updated : p)));
        pushAudit('PRODUCT_UPDATED', 'product', input.id, updated.title.en);
        return updated;
      }
    }

    const cat = input.category || 'tours';
    const created: Product = {
      id: uid('prd'),
      organizationId: org.id,
      providerName: org.name,
      category: cat,
      productModel: input.productModel || 'fixed',
      title: input.title || { ar: 'خدمة جديدة', en: 'New Service', it: 'Nuovo Servizio' },
      description: input.description || {
        ar: 'خدمة سياحية مضافة من بوابة الشركة.',
        en: 'Tourism service listed from Company Dashboard.',
        it: 'Servizio turistico aggiunto dal pannello azienda.',
      },
      destination: input.destination || { ar: org.city, en: org.city, it: org.city },
      country: input.country || org.country,
      baseCurrency: input.baseCurrency || 'EUR',
      price: Number(input.price || 150),
      providerCost: Number(input.providerCost || 105),
      instantBooking: Boolean(input.instantBooking),
      published: input.published !== false,
      rating: 5.0,
      reviewCount: 0,
      imageUrl: input.imageUrl || firstGalleryImage || categoryImages[cat],
      mediaGallery: input.mediaGallery,
      durationLabel: input.durationLabel || {
        ar: 'لكل حجز',
        en: 'Per Booking',
        it: 'Per Prenotazione',
      },
      cancellationPolicy: input.cancellationPolicy || {
        ar: 'إلغاء مجاني قبل 48 ساعة.',
        en: 'Free cancellation up to 48 hours prior.',
        it: 'Cancellazione gratuita fino a 48 ore prima.',
      },
      availableDates: input.availableDates || ['2026-11-24', '2026-12-01', '2026-12-10'],
      maxCapacity: Number(input.maxCapacity || 12),
      specs: input.specs || { operator: org.name },
      highlights: input.highlights,
      createdAt: new Date().toISOString(),
    };
    setProducts((prev) => [created, ...prev]);
    pushAudit('PRODUCT_CREATED', 'product', created.id, created.title.en);
    return created;
  }

  function toggleProductPublish(productId: string) {
    setProducts((prev) =>
      prev.map((p) => (p.id === productId ? { ...p, published: !p.published } : p))
    );
  }

  function updateAvailabilitySlot(
    productId: string,
    date: string,
    patch: { remainingUnits?: number; priceOverride?: number; available?: boolean }
  ) {
    setAvailabilitySlots((prev) => {
      const idx = prev.findIndex((s) => s.productId === productId && s.date === date);
      if (idx >= 0) {
        return prev.map((s, i) => (i === idx ? { ...s, ...patch } : s));
      }
      return [
        ...prev,
        {
          id: uid('slot'),
          productId,
          date,
          remainingUnits: patch.remainingUnits ?? 8,
          priceOverride: patch.priceOverride,
          available: patch.available ?? true,
        },
      ];
    });
  }

  function updateOrganizationProfile(orgId: string, patch: Partial<Organization>) {
    setOrganizations((prev) => prev.map((o) => (o.id === orgId ? { ...o, ...patch } : o)));
    if (patch.name && patch.name.trim()) {
      const nextName = patch.name.trim();
      setProducts((prev) =>
        prev.map((p) => (p.organizationId === orgId ? { ...p, providerName: nextName } : p))
      );
      setBookings((prev) =>
        prev.map((b) => (b.organizationId === orgId ? { ...b, providerName: nextName } : b))
      );
      setQuotations((prev) =>
        prev.map((q) => (q.organizationId === orgId ? { ...q, providerName: nextName } : q))
      );
    }
  }

  function updateSellerProfile(sellerId: string, patch: Partial<SellerProfile>) {
    setSellers((prev) => prev.map((s) => (s.id === sellerId ? { ...s, ...patch } : s)));
    if (patch.displayName && patch.displayName.trim()) {
      const nextName = patch.displayName.trim();
      setBookings((prev) =>
        prev.map((b) => (b.sellerId === sellerId ? { ...b, sellerName: nextName } : b))
      );
    }
    pushAudit('SELLER_PROFILE_UPDATED', 'seller', sellerId, patch.displayName || 'Updated media/profile');
  }

  function addStaffMember(
    orgId: string,
    payload: { name: string; email: string; memberRole: 'manager' | 'agent' }
  ) {
    setOrgMembers((prev) => [
      ...prev,
      {
        id: uid('mem'),
        organizationId: orgId,
        name: payload.name,
        email: payload.email,
        memberRole: payload.memberRole,
        permissions:
          payload.memberRole === 'manager'
            ? ['catalog:write', 'bookings:confirm', 'quotations:send']
            : ['bookings:confirm'],
        createdAt: new Date().toISOString(),
      },
    ]);
  }

  function generateAffiliateLink(productId: string): AffiliateLink | null {
    const seller = sellers.find((s) => s.id === activeUser?.sellerId) || sellers[0];
    const prod = products.find((p) => p.id === productId);
    if (!seller || !prod) return null;
    const existing = affiliateLinks.find(
      (l) => l.sellerId === seller.id && l.productId === productId
    );
    if (existing) return existing;
    const created: AffiliateLink = {
      id: uid('aff'),
      sellerId: seller.id,
      productId: prod.id,
      productTitle: prod.title,
      providerName: prod.providerName,
      code: seller.referralCode,
      couponCode: seller.couponCode,
      url: `/?product=${prod.id}&ref=${seller.referralCode}`,
      clicks: 0,
      conversions: 0,
      earnedEur: 0,
      active: true,
      createdAt: new Date().toISOString(),
    };
    setAffiliateLinks((prev) => [created, ...prev]);
    return created;
  }

  function simulateAffiliateClick(linkId: string) {
    const link = affiliateLinks.find((l) => l.id === linkId);
    if (!link) return;
    setAffiliateLinks((prev) =>
      prev.map((l) => (l.id === linkId ? { ...l, clicks: l.clicks + 1 } : l))
    );
    setSellers((prev) =>
      prev.map((s) => (s.id === link.sellerId ? { ...s, totalClicks: s.totalClicks + 1 } : s))
    );
    setActiveReferral(link.code);
  }

  function markNotificationRead(id: string) {
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)));
  }

  function markAllNotificationsRead(userId: string) {
    setNotifications((prev) =>
      prev.map((n) => (n.userId === userId ? { ...n, read: true } : n))
    );
  }

  function sendMessage(payload: {
    recipientId: string;
    recipientName: string;
    subject: string;
    text: string;
  }) {
    const sender = activeUser || users[0];
    setMessages((prev) => [
      ...prev,
      {
        id: uid('msg'),
        threadId: 'thd_amalfi',
        senderId: sender.id,
        senderName: sender.name,
        senderRole: sender.role,
        recipientId: payload.recipientId,
        recipientName: payload.recipientName,
        subject: payload.subject,
        text: payload.text,
        createdAt: new Date().toISOString(),
      },
    ]);
  }

  function updateCustomerProfile(patch: Partial<User>) {
    if (!activeUser) return;
    const updated = { ...activeUser, ...patch };
    setActiveUser(updated);
    setUsers((prev) => prev.map((u) => (u.id === activeUser.id ? updated : u)));
  }

  function toggleUserStatus(userId: string) {
    setUsers((prev) =>
      prev.map((u) =>
        u.id === userId ? { ...u, status: u.status === 'suspended' ? 'active' : 'suspended' } : u
      )
    );
  }

  function toggleOrganizationVerify(orgId: string) {
    setOrganizations((prev) =>
      prev.map((o) => (o.id === orgId ? { ...o, verified: !o.verified } : o))
    );
  }

  function toggleSellerStatus(sellerId: string) {
    setSellers((prev) =>
      prev.map((s) =>
        s.id === sellerId ? { ...s, status: s.status === 'paused' ? 'active' : 'paused' } : s
      )
    );
  }

  function addCommissionRule(rule: Omit<CommissionRule, 'id' | 'active'>) {
    setCommissionRules((prev) => [{ ...rule, id: uid('rule'), active: true }, ...prev]);
  }

  function settlePayout(payoutId: string) {
    const payout = payouts.find((p) => p.id === payoutId);
    if (!payout || payout.status === 'Settled') return;
    const now = new Date().toISOString();
    setPayouts((prev) =>
      prev.map((p) => (p.id === payoutId ? { ...p, status: 'Settled', settledAt: now } : p))
    );
    if (payout.recipientType === 'seller') {
      setSellers((prev) =>
        prev.map((s) =>
          s.id === payout.recipientId
            ? {
                ...s,
                pendingBalanceEur: Math.max(
                  0,
                  Number((s.pendingBalanceEur - payout.amountEur).toFixed(2))
                ),
                settledBalanceEur: Number((s.settledBalanceEur + payout.amountEur).toFixed(2)),
              }
            : s
        )
      );
      const sellerUser = users.find((u) => u.sellerId === payout.recipientId);
      if (sellerUser) {
        pushNotification({
          userId: sellerUser.id,
          type: 'payout',
          title: {
            ar: `تمت تسوية الدفعة ${payout.id}`,
            en: `Payout ${payout.id} Settled`,
            it: `Pagamento ${payout.id} Liquidato`,
          },
          body: {
            ar: `تم تحويل €${payout.amountEur.toFixed(2)} بنجاح.`,
            en: `€${payout.amountEur.toFixed(2)} has been settled to your account.`,
            it: `€${payout.amountEur.toFixed(2)} liquidati sul tuo conto.`,
          },
        });
      }
    }
    setLedgerEntries((prev) => [
      {
        id: uid('led'),
        payoutId,
        accountType: payout.recipientType,
        entityId: payout.recipientId,
        entityName: payout.recipientName,
        entryType: 'payout_settlement',
        amountEur: -payout.amountEur,
        originalCurrency: 'EUR',
        originalAmount: -payout.amountEur,
        exchangeRate: 1,
        description: `Payout ${payoutId} settled`,
        createdAt: now,
        immutable: true,
      },
      ...prev,
    ]);
    pushAudit('PAYOUT_SETTLED', 'payout', payoutId, `€${payout.amountEur}`);
  }

  function requestSellerPayout(): boolean {
    const seller = sellers.find((s) => s.id === activeUser?.sellerId) || sellers[0];
    if (!seller) {
      showToast(
        lang === 'ar' ? 'تعذر العثور على ملف المسوق' : 'Seller profile not found',
        'error'
      );
      return false;
    }
    if (seller.status === 'paused') {
      showToast(
        lang === 'ar'
          ? 'حساب المسوق موقوف مؤقتًا ولا يمكن طلب سحب حاليًا'
          : 'Affiliate account is paused; payouts are temporarily unavailable',
        'error'
      );
      return false;
    }
    if (seller.pendingBalanceEur <= 0) {
      showToast(
        lang === 'ar'
          ? 'لا يوجد رصيد معلق قابل للسحب حاليًا'
          : 'No pending commission balance available to withdraw',
        'error'
      );
      return false;
    }
    const alreadyPending = payouts.some(
      (p) => p.recipientType === 'seller' && p.recipientId === seller.id && p.status === 'Pending'
    );
    if (alreadyPending) {
      showToast(
        lang === 'ar'
          ? 'يوجد طلب سحب قيد المراجعة بالفعل لهذا الحساب'
          : 'A pending payout request is already awaiting settlement',
        'error'
      );
      return false;
    }
    setPayouts((prev) => [
      {
        id: uid('pay'),
        recipientType: 'seller',
        recipientId: seller.id,
        recipientName: seller.displayName,
        amountEur: seller.pendingBalanceEur,
        method: 'SEPA Bank Transfer',
        status: 'Pending',
        createdAt: new Date().toISOString(),
      },
      ...prev,
    ]);
    showToast(
      lang === 'ar' ? 'تم إرسال طلب سحب المستحقات بنجاح' : 'Payout withdrawal requested',
      'success'
    );
    return true;
  }

  function updateTicketStatus(ticketId: string, status: 'Open' | 'In Review' | 'Resolved') {
    setTickets((prev) => prev.map((t) => (t.id === ticketId ? { ...t, status } : t)));
  }

  function updatePlatformSettings(patch: Partial<PlatformSettings>) {
    setPlatformSettings((prev) => ({ ...prev, ...patch }));
  }

  return (
    <MarketplaceContext.Provider
      value={{
        route,
        navigate,
        lang,
        setLang,
        currency,
        setCurrency,
        activeUser,
        setActiveUser,
        switchDemoRole,
        registerMockUser,
        loginMockUser,
        logout,
        resetDemoData,
        users,
        organizations,
        orgMembers,
        sellers,
        products,
        availabilitySlots,
        affiliateLinks,
        bookings,
        travelRequests,
        quotations,
        commissionRules,
        ledgerEntries,
        payouts,
        reviews,
        tickets,
        auditLogs,
        notifications,
        messages,
        platformSettings,
        favoriteIds,
        activeReferral,
        setActiveReferral,
        toast,
        showToast,
        dismissToast,
        toggleFavorite,
        createBooking,
        updateBookingStatus,
        createTravelRequest,
        createQuotation,
        respondToQuotation,
        addReview,
        saveProduct,
        toggleProductPublish,
        updateAvailabilitySlot,
        updateOrganizationProfile,
        updateSellerProfile,
        addStaffMember,
        generateAffiliateLink,
        simulateAffiliateClick,
        markNotificationRead,
        markAllNotificationsRead,
        sendMessage,
        updateCustomerProfile,
        toggleUserStatus,
        toggleOrganizationVerify,
        toggleSellerStatus,
        addCommissionRule,
        settlePayout,
        requestSellerPayout,
        updateTicketStatus,
        updatePlatformSettings,
      }}
    >
      {children}
    </MarketplaceContext.Provider>
  );
}

export function useMarketplace() {
  const ctx = useContext(MarketplaceContext);
  if (!ctx) throw new Error('useMarketplace must be used inside MarketplaceProvider');
  return ctx;
}
