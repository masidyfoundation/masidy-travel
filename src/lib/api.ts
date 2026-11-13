import type {
  Booking,
  BookingStatus,
  CommissionRule,
  CurrencyCode,
  Organization,
  Product,
  ProductModel,
  Quotation,
  SellerProfile,
  ServiceCategory,
  TravelRequest,
  User,
  UserRole,
} from '../shared/types.ts';

const TOKEN_KEY = 'masidy_auth_token';
const REF_KEY = 'masidy_affiliate_ref';

export function getStoredToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function setStoredToken(token: string | null): void {
  if (token) localStorage.setItem(TOKEN_KEY, token);
  else localStorage.removeItem(TOKEN_KEY);
}

export function getStoredReferral(): string {
  return localStorage.getItem(REF_KEY) || '';
}

export function setStoredReferral(code: string | null): void {
  if (code) localStorage.setItem(REF_KEY, code.toUpperCase());
  else localStorage.removeItem(REF_KEY);
}

async function apiFetch<T>(url: string, options: RequestInit = {}): Promise<T> {
  const token = getStoredToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string> | undefined),
  };
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }
  const res = await fetch(url, { ...options, headers });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.error || `Request failed (${res.status})`);
  }
  return data as T;
}

export const api = {
  getMe: () =>
    apiFetch<{ user: User | null; organization?: Organization; sellerProfile?: SellerProfile }>(
      '/api/auth/me'
    ),

  login: (email: string, password: string) =>
    apiFetch<{ token: string; user: User }>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    }),

  demoSwitch: (role: UserRole) =>
    apiFetch<{ token: string; user: User }>('/api/auth/demo-switch', {
      method: 'POST',
      body: JSON.stringify({ role }),
    }),

  register: (payload: {
    name: string;
    email: string;
    password: string;
    phone?: string;
    role: UserRole;
    companyName?: string;
    companyCity?: string;
    companyCountry?: string;
    sellerDisplayName?: string;
  }) =>
    apiFetch<{ token: string; user: User }>('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  searchMarketplace: (params: {
    q?: string;
    category?: string;
    productModel?: string;
    providerId?: string;
    currency?: CurrencyCode;
    maxPrice?: string;
    sort?: string;
  }) => {
    const search = new URLSearchParams();
    Object.entries(params).forEach(([k, v]) => {
      if (v) search.set(k, v);
    });
    return apiFetch<{ products: Product[]; organizations: Organization[]; total: number }>(
      `/api/marketplace/search?${search.toString()}`
    );
  },

  getProduct: (id: string, ref?: string) =>
    apiFetch<{ product: Product; organization?: Organization; reviews: any[] }>(
      `/api/marketplace/products/${id}${ref ? `?ref=${encodeURIComponent(ref)}` : ''}`
    ),

  trackReferral: (code: string, productId?: string) =>
    apiFetch<{ tracked: boolean; sellerName: string; referralCode: string }>(
      '/api/marketplace/track-referral',
      { method: 'POST', body: JSON.stringify({ code, productId }) }
    ),

  createBooking: (payload: {
    productId: string;
    checkInDate: string;
    travelersCount: number;
    travelerNames: string[];
    affiliateCode?: string;
    specialNotes?: string;
    currency: CurrencyCode;
  }) =>
    apiFetch<{ booking: Booking }>('/api/bookings', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  updateBookingStatus: (id: string, status: BookingStatus, note?: string) =>
    apiFetch<{ booking: Booking }>(`/api/bookings/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status, note }),
    }),

  toggleFavorite: (productId: string) =>
    apiFetch<{ saved: boolean }>(`/api/customer/favorites/${productId}`, {
      method: 'POST',
    }),

  getCustomerDashboard: () => apiFetch<any>('/api/customer/dashboard'),

  createTravelRequest: (payload: Partial<TravelRequest>) =>
    apiFetch<{ travelRequest: TravelRequest }>('/api/requests', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  createQuotation: (requestId: string, payload: Partial<Quotation>) =>
    apiFetch<{ quotation: Quotation }>(`/api/requests/${requestId}/quotations`, {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  respondToQuotation: (quotationId: string, action: 'accept' | 'reject') =>
    apiFetch<{ quotation: Quotation; booking?: Booking }>(
      `/api/quotations/${quotationId}/respond`,
      { method: 'PATCH', body: JSON.stringify({ action }) }
    ),

  getProviderDashboard: () => apiFetch<any>('/api/provider/dashboard'),

  createProviderProduct: (payload: {
    category: ServiceCategory;
    productModel: ProductModel;
    titleAr: string;
    titleEn: string;
    descriptionAr?: string;
    descriptionEn?: string;
    destinationAr?: string;
    destinationEn?: string;
    country?: string;
    baseCurrency: CurrencyCode;
    price: number;
    providerCost?: number;
    instantBooking: boolean;
    published: boolean;
    maxCapacity?: number;
  }) =>
    apiFetch<{ product: Product }>('/api/provider/products', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  updateProviderProduct: (id: string, payload: { published?: boolean; price?: number }) =>
    apiFetch<{ product: Product }>(`/api/provider/products/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    }),

  addProviderStaff: (payload: { name: string; email: string; memberRole: 'manager' | 'agent' }) =>
    apiFetch<any>('/api/provider/staff', { method: 'POST', body: JSON.stringify(payload) }),

  getSellerDashboard: () => apiFetch<any>('/api/seller/dashboard'),

  createAffiliateLink: (productId: string) =>
    apiFetch<any>('/api/seller/links', { method: 'POST', body: JSON.stringify({ productId }) }),

  createReview: (productId: string, rating: number, comment: string) =>
    apiFetch<any>('/api/reviews', {
      method: 'POST',
      body: JSON.stringify({ productId, rating, comment }),
    }),

  createTicket: (payload: { bookingId?: string; subject: string; message: string }) =>
    apiFetch<any>('/api/tickets', { method: 'POST', body: JSON.stringify(payload) }),

  getAdminDashboard: () => apiFetch<any>('/api/admin/dashboard'),

  toggleOrganizationVerify: (id: string) =>
    apiFetch<any>(`/api/admin/organizations/${id}/verify`, { method: 'PATCH' }),

  createCommissionRule: (payload: Partial<CommissionRule>) =>
    apiFetch<{ rule: CommissionRule }>('/api/admin/commission-rules', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  settlePayout: (id: string) =>
    apiFetch<any>(`/api/admin/payouts/${id}/settle`, { method: 'POST' }),

  updateTicketStatus: (id: string, status: 'Open' | 'In Review' | 'Resolved') =>
    apiFetch<any>(`/api/admin/tickets/${id}`, { method: 'PATCH', body: JSON.stringify({ status }) }),
};
