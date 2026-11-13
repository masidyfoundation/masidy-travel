export type UserRole = 'customer' | 'provider' | 'seller' | 'admin';

export type Language = 'ar' | 'en' | 'it';

export type CurrencyCode = 'EUR' | 'USD' | 'EGP';

export type ServiceCategory =
  | 'flights'
  | 'hotels'
  | 'tours'
  | 'transport'
  | 'car_rentals'
  | 'cruises'
  | 'hajj_umrah'
  | 'visas_packages';

export type ProductModel = 'fixed' | 'availability' | 'request';

export type BookingStatus =
  | 'Draft'
  | 'Pending'
  | 'Awaiting Provider Confirmation'
  | 'Confirmed'
  | 'Rejected'
  | 'Cancelled'
  | 'Completed'
  | 'Refund Pending'
  | 'Refunded'
  | 'Partially Refunded';

export type QuotationStatus =
  | 'Open'
  | 'Quoted'
  | 'Accepted'
  | 'Rejected'
  | 'Expired'
  | 'Converted';

export interface LocalizedText {
  ar: string;
  en: string;
  it: string;
}

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  phone: string;
  nationality?: string;
  passportNo?: string;
  preferredLanguage?: Language;
  preferredCurrency?: CurrencyCode;
  status?: 'active' | 'suspended';
  organizationId?: string;
  sellerId?: string;
  createdAt: string;
}

export interface MediaItem {
  id: string;
  type: 'image' | 'video';
  url: string;
  name: string;
  caption?: string;
  createdAt: string;
}

export interface Organization {
  id: string;
  name: string;
  slug: string;
  country: string;
  city: string;
  contactEmail: string;
  phone: string;
  website?: string;
  languagesServed?: string[];
  logoUrl?: string;
  coverImageUrl?: string;
  mediaGallery?: MediaItem[];
  description: LocalizedText;
  verified: boolean;
  subscriptionPlan: 'free';
  createdAt: string;
}

export interface OrganizationMember {
  id: string;
  organizationId: string;
  userId?: string;
  name: string;
  email: string;
  memberRole: 'owner' | 'manager' | 'agent';
  permissions: string[];
  createdAt: string;
}

export interface SellerProfile {
  id: string;
  userId: string;
  displayName: string;
  bio: string;
  avatarUrl?: string;
  mediaGallery?: MediaItem[];
  referralCode: string;
  couponCode: string;
  totalClicks: number;
  totalConversions: number;
  pendingBalanceEur: number;
  settledBalanceEur: number;
  verified: boolean;
  status?: 'active' | 'paused';
  createdAt: string;
}

export interface AffiliateLink {
  id: string;
  sellerId: string;
  productId: string;
  productTitle?: LocalizedText;
  providerName?: string;
  code: string;
  couponCode?: string;
  url: string;
  clicks: number;
  conversions: number;
  earnedEur: number;
  active?: boolean;
  createdAt: string;
}

export interface Product {
  id: string;
  organizationId: string;
  providerName: string;
  category: ServiceCategory;
  productModel: ProductModel;
  title: LocalizedText;
  description: LocalizedText;
  destination: LocalizedText;
  country: string;
  baseCurrency: CurrencyCode;
  price: number;
  providerCost: number;
  instantBooking: boolean;
  published: boolean;
  featured?: boolean;
  rating: number;
  reviewCount: number;
  imageUrl: string;
  mediaGallery?: MediaItem[];
  durationLabel: LocalizedText;
  cancellationPolicy: LocalizedText;
  availableDates: string[];
  maxCapacity: number;
  specs: Record<string, string>;
  highlights?: string[];
  createdAt: string;
}

export interface AvailabilitySlot {
  id: string;
  productId: string;
  date: string;
  remainingUnits: number;
  priceOverride?: number;
  available: boolean;
}

export interface CommissionSnapshot {
  ruleId: string;
  ruleName: string;
  grossEur: number;
  providerCostEur: number;
  sellerCommissionEur: number;
  platformFeeEur: number;
  companyMarginEur: number;
}

export interface BookingStatusChange {
  status: BookingStatus;
  note: string;
  actorName: string;
  timestamp: string;
}

export interface TravelerDetail {
  fullName: string;
  passportNumber: string;
  nationality: string;
  email?: string;
}

export interface Booking {
  id: string;
  referenceCode: string;
  productId: string;
  productTitle: LocalizedText;
  category: ServiceCategory;
  organizationId: string;
  providerName: string;
  customerId: string;
  customerName: string;
  customerEmail: string;
  sellerId?: string;
  sellerName?: string;
  affiliateCode?: string;
  checkInDate: string;
  checkOutDate?: string;
  travelersCount: number;
  travelerNames: string[];
  travelers?: TravelerDetail[];
  specialNotes?: string;
  status: BookingStatus;
  instantBooking: boolean;
  originalCurrency: CurrencyCode;
  exchangeRateAtBooking: number;
  unitPriceOriginal: number;
  totalOriginal: number;
  totalEur: number;
  commissionSnapshot: CommissionSnapshot;
  statusHistory: BookingStatusChange[];
  createdAt: string;
}

export interface TravelRequest {
  id: string;
  customerId: string;
  customerName: string;
  destination: string;
  travelDate: string;
  travelersCount: number;
  budget: number;
  currency: CurrencyCode;
  accommodationType: string;
  requestedServices: ServiceCategory[];
  notes: string;
  status: 'Open' | 'Quoted' | 'Converted' | 'Closed';
  createdAt: string;
}

export interface QuotationItem {
  title: string;
  amount: number;
}

export interface Quotation {
  id: string;
  requestId: string;
  organizationId: string;
  providerName: string;
  quotedPrice: number;
  currency: CurrencyCode;
  validUntil: string;
  summary: string;
  accommodationTier?: string;
  includesTransfers?: boolean;
  cancellationSummary?: string;
  items: QuotationItem[];
  status: QuotationStatus;
  convertedBookingId?: string;
  createdAt: string;
}

export interface CommissionRule {
  id: string;
  name: string;
  scope: 'global' | 'category' | 'organization';
  category?: ServiceCategory;
  organizationId?: string;
  platformPercent: number;
  sellerPercent: number;
  fixedFeeEur: number;
  active: boolean;
}

export interface LedgerEntry {
  id: string;
  bookingId?: string;
  payoutId?: string;
  accountType: 'platform' | 'provider' | 'seller' | 'customer';
  entityId: string;
  entityName: string;
  entryType:
    | 'booking_revenue'
    | 'provider_payable'
    | 'seller_commission'
    | 'platform_fee'
    | 'refund'
    | 'payout_settlement';
  amountEur: number;
  originalCurrency: CurrencyCode;
  originalAmount: number;
  exchangeRate: number;
  description: string;
  createdAt: string;
  immutable: true;
}

export interface Payout {
  id: string;
  recipientType: 'provider' | 'seller';
  recipientId: string;
  recipientName: string;
  amountEur: number;
  method?: string;
  status: 'Pending' | 'Settled';
  createdAt: string;
  settledAt?: string;
}

export interface Review {
  id: string;
  productId: string;
  customerId: string;
  customerName: string;
  rating: number;
  comment: string;
  createdAt: string;
}

export interface SupportTicket {
  id: string;
  bookingId?: string;
  userId: string;
  userName: string;
  role: UserRole;
  subject: string;
  message: string;
  status: 'Open' | 'In Review' | 'Resolved';
  createdAt: string;
}

export interface AuditLog {
  id: string;
  actorId: string;
  actorName: string;
  actorRole: UserRole;
  action: string;
  entityType: string;
  entityId: string;
  details: string;
  createdAt: string;
}

export interface NotificationItem {
  id: string;
  userId: string;
  type: 'booking' | 'quotation' | 'payout' | 'system';
  title: LocalizedText;
  body: LocalizedText;
  read: boolean;
  createdAt: string;
}

export interface ChatMessage {
  id: string;
  threadId: string;
  senderId: string;
  senderName: string;
  senderRole: UserRole;
  recipientId: string;
  recipientName: string;
  subject: string;
  text: string;
  createdAt: string;
}

export interface PlatformSettings {
  platformName: string;
  defaultLanguage: Language;
  defaultCurrency: CurrencyCode;
  freeCompanyOnboarding: boolean;
  openSellerRegistration: boolean;
  defaultPlatformFeePercent: number;
  defaultSellerCommissionPercent: number;
  supportedLanguages: Language[];
  supportedCurrencies: CurrencyCode[];
}
