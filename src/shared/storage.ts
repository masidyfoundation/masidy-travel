import type {
  AffiliateLink,
  AuditLog,
  AvailabilitySlot,
  Booking,
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
  SupportTicket,
  TravelRequest,
  User,
} from './types.ts';
import {
  INITIAL_AFFILIATE_LINKS,
  INITIAL_AUDIT_LOGS,
  INITIAL_AVAILABILITY_SLOTS,
  INITIAL_BOOKINGS,
  INITIAL_COMMISSION_RULES,
  INITIAL_LEDGER_ENTRIES,
  INITIAL_MESSAGES,
  INITIAL_NOTIFICATIONS,
  INITIAL_ORGANIZATIONS,
  INITIAL_ORG_MEMBERS,
  INITIAL_PAYOUTS,
  INITIAL_PLATFORM_SETTINGS,
  INITIAL_PRODUCTS,
  INITIAL_QUOTATIONS,
  INITIAL_REVIEWS,
  INITIAL_SELLERS,
  INITIAL_TICKETS,
  INITIAL_TRAVEL_REQUESTS,
  INITIAL_USERS,
} from '../data/mockMarketplace.ts';

export const STORAGE_KEY = 'masidy_marketplace_demo_state';
export const STORAGE_VERSION = 1;

export interface PersistedMarketplaceState {
  version: number;
  updatedAt: string;
  lang: Language;
  currency: CurrencyCode;
  activeReferral: string;
  activeUserId: string | null;
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
}

export interface LoadStorageResult {
  status: 'ok' | 'empty' | 'corrupted';
  state: PersistedMarketplaceState;
}

const VALID_LANGS: Language[] = ['ar', 'en', 'it'];
const VALID_CURRENCIES: CurrencyCode[] = ['EUR', 'USD', 'EGP'];

/**
 * Ensures no real passport numbers, passwords, or payment details are persisted in localStorage.
 * Any user-entered passport/ID field is masked to a fictional demo placeholder token.
 */
export function sanitizePassportForStorage(raw?: string, fallbackTag = '001'): string {
  if (!raw || !raw.trim()) return '';
  if (raw.startsWith('DEMO-')) return raw;
  return `DEMO-DOC-${fallbackTag}`;
}

function sanitizeUsers(users: User[]): User[] {
  return users.map((u, idx) => {
    const clean = { ...u } as User & Record<string, unknown>;
    delete clean.password;
    delete clean.passwordHash;
    delete clean.paymentMethod;
    delete clean.cardNumber;
    if (clean.passportNo) {
      clean.passportNo = sanitizePassportForStorage(clean.passportNo, `USR${idx + 1}`);
    }
    return clean;
  });
}

function sanitizeBookings(bookings: Booking[]): Booking[] {
  return bookings.map((b) => ({
    ...b,
    travelers: b.travelers?.map((t, idx) => ({
      ...t,
      passportNumber: sanitizePassportForStorage(t.passportNumber, `TRV${idx + 1}`),
    })),
  }));
}

export function createDefaultPersistedState(): PersistedMarketplaceState {
  return {
    version: STORAGE_VERSION,
    updatedAt: new Date().toISOString(),
    lang: 'ar',
    currency: 'EUR',
    activeReferral: '',
    activeUserId: null,
    users: sanitizeUsers(INITIAL_USERS),
    organizations: INITIAL_ORGANIZATIONS,
    orgMembers: INITIAL_ORG_MEMBERS,
    sellers: INITIAL_SELLERS,
    products: INITIAL_PRODUCTS,
    availabilitySlots: INITIAL_AVAILABILITY_SLOTS,
    affiliateLinks: INITIAL_AFFILIATE_LINKS,
    bookings: sanitizeBookings(INITIAL_BOOKINGS),
    travelRequests: INITIAL_TRAVEL_REQUESTS,
    quotations: INITIAL_QUOTATIONS,
    commissionRules: INITIAL_COMMISSION_RULES,
    ledgerEntries: INITIAL_LEDGER_ENTRIES,
    payouts: INITIAL_PAYOUTS,
    reviews: INITIAL_REVIEWS,
    tickets: INITIAL_TICKETS,
    auditLogs: INITIAL_AUDIT_LOGS,
    notifications: INITIAL_NOTIFICATIONS,
    messages: INITIAL_MESSAGES,
    platformSettings: INITIAL_PLATFORM_SETTINGS,
    favoriteIds: ['prd_amalfi_suite'],
  };
}

function safeArray<T>(val: unknown, fallback: T[]): T[] {
  return Array.isArray(val) ? (val as T[]) : fallback;
}

function stripExpiredBlobMedia(items?: { url: string; [key: string]: unknown }[]) {
  if (!Array.isArray(items)) return undefined;
  return items.filter((item) => typeof item?.url === 'string' && !item.url.startsWith('blob:'));
}

function sanitizeMediaOnLoad<T extends { mediaGallery?: { url: string }[] }>(
  items: T[],
  urlKeys: (keyof T)[]
): T[] {
  return items.map((item) => {
    const next = { ...item };
    for (const key of urlKeys) {
      const val = next[key];
      if (typeof val === 'string' && val.startsWith('blob:')) {
        delete next[key];
      }
    }
    if (Array.isArray(next.mediaGallery)) {
      next.mediaGallery = stripExpiredBlobMedia(
        next.mediaGallery as { url: string; [key: string]: unknown }[]
      ) as T['mediaGallery'];
    }
    return next;
  });
}

function stripHeavyVideoDataUrls<T extends { mediaGallery?: { url: string; type?: string }[] }>(
  items: T[]
): T[] {
  return items.map((item) => {
    if (!Array.isArray(item.mediaGallery)) return item;
    return {
      ...item,
      mediaGallery: item.mediaGallery.filter(
        (m) => !(m.url.startsWith('data:video/') && m.url.length > 120_000)
      ),
    };
  });
}

export function loadPersistedState(): LoadStorageResult {
  const defaults = createDefaultPersistedState();
  if (typeof window === 'undefined' || !window.localStorage) {
    return { status: 'empty', state: defaults };
  }

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return { status: 'empty', state: defaults };
    }

    const parsed = JSON.parse(raw) as Partial<PersistedMarketplaceState> | null;
    if (!parsed || typeof parsed !== 'object') {
      window.localStorage.removeItem(STORAGE_KEY);
      return { status: 'corrupted', state: defaults };
    }

    // Version check & safe schema migration fallback
    if (typeof parsed.version !== 'number' || parsed.version !== STORAGE_VERSION) {
      window.localStorage.removeItem(STORAGE_KEY);
      return { status: 'corrupted', state: defaults };
    }

    const lang = VALID_LANGS.includes(parsed.lang as Language)
      ? (parsed.lang as Language)
      : defaults.lang;
    const currency = VALID_CURRENCIES.includes(parsed.currency as CurrencyCode)
      ? (parsed.currency as CurrencyCode)
      : defaults.currency;

    const users = sanitizeUsers(safeArray(parsed.users, defaults.users));
    const activeUserId =
      typeof parsed.activeUserId === 'string' && users.some((u) => u.id === parsed.activeUserId)
        ? parsed.activeUserId
        : null;

    const state: PersistedMarketplaceState = {
      version: STORAGE_VERSION,
      updatedAt: typeof parsed.updatedAt === 'string' ? parsed.updatedAt : defaults.updatedAt,
      lang,
      currency,
      activeReferral: typeof parsed.activeReferral === 'string' ? parsed.activeReferral : '',
      activeUserId,
      users: users.length > 0 ? users : defaults.users,
      organizations: sanitizeMediaOnLoad(
        safeArray(parsed.organizations, defaults.organizations),
        ['logoUrl', 'coverImageUrl']
      ),
      orgMembers: safeArray(parsed.orgMembers, defaults.orgMembers),
      sellers: sanitizeMediaOnLoad(safeArray(parsed.sellers, defaults.sellers), ['avatarUrl']),
      products: sanitizeMediaOnLoad(safeArray(parsed.products, defaults.products), ['imageUrl']).map(
        (p, idx) => ({
          ...p,
          imageUrl:
            p.imageUrl ||
            defaults.products[idx % defaults.products.length]?.imageUrl ||
            '/src/assets/images/hero_masidy_travel_1794591852990.jpg',
        })
      ),
      availabilitySlots: safeArray(parsed.availabilitySlots, defaults.availabilitySlots),
      affiliateLinks: safeArray(parsed.affiliateLinks, defaults.affiliateLinks),
      bookings: sanitizeBookings(safeArray(parsed.bookings, defaults.bookings)),
      travelRequests: safeArray(parsed.travelRequests, defaults.travelRequests),
      quotations: safeArray(parsed.quotations, defaults.quotations),
      commissionRules: safeArray(parsed.commissionRules, defaults.commissionRules),
      ledgerEntries: safeArray(parsed.ledgerEntries, defaults.ledgerEntries),
      payouts: safeArray(parsed.payouts, defaults.payouts),
      reviews: safeArray(parsed.reviews, defaults.reviews),
      tickets: safeArray(parsed.tickets, defaults.tickets),
      auditLogs: safeArray(parsed.auditLogs, defaults.auditLogs),
      notifications: safeArray(parsed.notifications, defaults.notifications),
      messages: safeArray(parsed.messages, defaults.messages),
      platformSettings:
        parsed.platformSettings && typeof parsed.platformSettings === 'object'
          ? { ...defaults.platformSettings, ...parsed.platformSettings }
          : defaults.platformSettings,
      favoriteIds: safeArray(parsed.favoriteIds, defaults.favoriteIds).filter(
        (id): id is string => typeof id === 'string'
      ),
    };

    return { status: 'ok', state };
  } catch {
    try {
      window.localStorage.removeItem(STORAGE_KEY);
    } catch {
      // Ignore storage access errors in restricted environments
    }
    return { status: 'corrupted', state: defaults };
  }
}

export function savePersistedState(state: Omit<PersistedMarketplaceState, 'version' | 'updatedAt'>): void {
  if (typeof window === 'undefined' || !window.localStorage) return;
  const payload: PersistedMarketplaceState = {
    ...state,
    version: STORAGE_VERSION,
    updatedAt: new Date().toISOString(),
    users: sanitizeUsers(state.users),
    bookings: sanitizeBookings(state.bookings),
  };
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
  } catch {
    // Retry without heavy inline video blobs so images, bookings, and metadata still persist cleanly
    try {
      const compactPayload: PersistedMarketplaceState = {
        ...payload,
        organizations: stripHeavyVideoDataUrls(payload.organizations),
        sellers: stripHeavyVideoDataUrls(payload.sellers),
        products: stripHeavyVideoDataUrls(payload.products),
      };
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(compactPayload));
    } catch {
      // Ignore storage quota / private browsing errors gracefully
    }
  }
}

export function clearPersistedState(): void {
  if (typeof window === 'undefined' || !window.localStorage) return;
  try {
    window.localStorage.removeItem(STORAGE_KEY);
  } catch {
    // Ignore storage access errors
  }
}
