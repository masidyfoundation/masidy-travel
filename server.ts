import express, { type Request, type Response, type NextFunction } from 'express';
import path from 'node:path';
import fs from 'node:fs';
import { createServer as createViteServer } from 'vite';
import {
  createId,
  getDb,
  hashPassword,
  saveDb,
  verifyPassword,
  type UserRecord,
} from './server/db/store.ts';
import {
  appendAuditLog,
  calculateCommissionSnapshot,
  recordConfirmedBookingLedger,
  recordRefundLedger,
} from './server/modules/commissions.ts';
import { defaultProviderAdapter } from './server/adapters/providers.ts';
import type {
  AffiliateLink,
  Booking,
  BookingStatus,
  CommissionRule,
  CurrencyCode,
  Organization,
  OrganizationMember,
  Product,
  ProductModel,
  Quotation,
  SellerProfile,
  ServiceCategory,
  TravelRequest,
  User,
  UserRole,
} from './src/shared/types.ts';
import { convertAmount } from './src/shared/currency.ts';

interface AuthenticatedRequest extends Request {
  authUser?: UserRecord;
}

function sanitizeUser(user: UserRecord): User {
  const { passwordHash: _ignored, ...safeUser } = user;
  return safeUser;
}

function authMiddleware(req: AuthenticatedRequest, _res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  const token = header?.startsWith('Bearer ') ? header.slice(7).trim() : undefined;
  if (!token) {
    return next();
  }
  const db = getDb();
  const session = db.sessions.find((s) => s.token === token);
  if (!session) {
    return next();
  }
  const user = db.users.find((u) => u.id === session.userId);
  if (user) {
    req.authUser = user;
  }
  next();
}

function requireRole(...roles: UserRole[]) {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    if (!req.authUser) {
      return res.status(401).json({ error: 'Authentication required' });
    }
    if (!roles.includes(req.authUser.role)) {
      return res.status(403).json({ error: 'Insufficient permissions for this role' });
    }
    next();
  };
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: '2mb' }));
  app.use(authMiddleware);

  // Simple in-memory API rate limiter per IP
  const requestCounts = new Map<string, { count: number; resetAt: number }>();
  app.use('/api', (req, res, next) => {
    const ip = req.ip || 'local';
    const now = Date.now();
    const record = requestCounts.get(ip);
    if (!record || now > record.resetAt) {
      requestCounts.set(ip, { count: 1, resetAt: now + 60_000 });
      return next();
    }
    record.count += 1;
    if (record.count > 300) {
      return res.status(429).json({ error: 'Rate limit exceeded' });
    }
    next();
  });

  // ---------------------------------------------------------------------------
  // 1. IDENTITY & AUTHENTICATION
  // ---------------------------------------------------------------------------
  app.get('/api/auth/me', (req: AuthenticatedRequest, res) => {
    if (!req.authUser) {
      return res.json({ user: null });
    }
    const db = getDb();
    const organization = req.authUser.organizationId
      ? db.organizations.find((o) => o.id === req.authUser?.organizationId)
      : undefined;
    const sellerProfile = req.authUser.sellerId
      ? db.sellerProfiles.find((s) => s.id === req.authUser?.sellerId)
      : undefined;

    res.json({
      user: sanitizeUser(req.authUser),
      organization,
      sellerProfile,
    });
  });

  app.post('/api/auth/login', (req, res) => {
    const { email, password } = req.body as { email?: string; password?: string };
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }
    const db = getDb();
    const user = db.users.find((u) => u.email.toLowerCase() === email.trim().toLowerCase());
    if (!user || !verifyPassword(password, user.passwordHash)) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const token = createId('tok');
    db.sessions.push({ token, userId: user.id, createdAt: new Date().toISOString() });
    saveDb(db);

    res.json({
      token,
      user: sanitizeUser(user),
    });
  });

  app.post('/api/auth/demo-switch', (req, res) => {
    const { role } = req.body as { role?: UserRole };
    if (!role) return res.status(400).json({ error: 'Role is required' });
    const db = getDb();
    const user = db.users.find((u) => u.role === role);
    if (!user) return res.status(404).json({ error: 'Demo user not found' });

    const token = createId('tok');
    db.sessions.push({ token, userId: user.id, createdAt: new Date().toISOString() });
    saveDb(db);
    res.json({ token, user: sanitizeUser(user) });
  });

  app.post('/api/auth/register', (req, res) => {
    const {
      name,
      email,
      password,
      phone,
      role,
      companyName,
      companyCity,
      companyCountry,
      sellerDisplayName,
    } = req.body as {
      name?: string;
      email?: string;
      password?: string;
      phone?: string;
      role?: UserRole;
      companyName?: string;
      companyCity?: string;
      companyCountry?: string;
      sellerDisplayName?: string;
    };

    if (!name || !email || !password || !role) {
      return res.status(400).json({ error: 'Name, email, password, and role are required' });
    }
    if (!['customer', 'provider', 'seller'].includes(role)) {
      return res.status(400).json({ error: 'Self-registration is available for customer, provider, or seller roles' });
    }

    const db = getDb();
    const exists = db.users.some((u) => u.email.toLowerCase() === email.trim().toLowerCase());
    if (exists) {
      return res.status(409).json({ error: 'An account with this email already exists' });
    }

    const now = new Date().toISOString();
    const userId = createId('usr');
    let organizationId: string | undefined;
    let sellerId: string | undefined;

    if (role === 'provider') {
      const orgName = (companyName || `${name} Travel`).trim();
      organizationId = createId('org');
      const org: Organization = {
        id: organizationId,
        name: orgName,
        slug: orgName.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
        country: companyCountry || 'International',
        city: companyCity || 'Cairo',
        contactEmail: email.trim().toLowerCase(),
        phone: phone || '+20 100 000 0000',
        description: {
          ar: `مزود خدمات سياحية مسجل مجانًا على منصة Masidy — ${orgName}`,
          en: `Registered tourism provider on Masidy (Free Partner Plan) — ${orgName}`,
          it: `Fornitore turistico registrato gratuitamente su Masidy — ${orgName}`,
        },
        verified: false,
        subscriptionPlan: 'free',
        createdAt: now,
      };
      db.organizations.unshift(org);

      const ownerMember: OrganizationMember = {
        id: createId('mem'),
        organizationId,
        userId,
        name: name.trim(),
        email: email.trim().toLowerCase(),
        memberRole: 'owner',
        permissions: ['catalog:write', 'bookings:confirm', 'quotations:send', 'staff:manage', 'finance:read'],
        createdAt: now,
      };
      db.organizationMembers.push(ownerMember);
    }

    if (role === 'seller') {
      sellerId = createId('seller');
      const rawCode = (sellerDisplayName || name)
        .toUpperCase()
        .replace(/[^A-Z0-9]/g, '')
        .slice(0, 6) || 'SELLER';
      const refCode = `${rawCode}${Math.floor(10 + Math.random() * 89)}`;
      const profile: SellerProfile = {
        id: sellerId,
        userId,
        displayName: (sellerDisplayName || name).trim(),
        bio: 'Independent travel affiliate partner on Masidy Marketplace.',
        referralCode: refCode,
        couponCode: `MSD${refCode}`,
        totalClicks: 0,
        totalConversions: 0,
        pendingBalanceEur: 0,
        settledBalanceEur: 0,
        verified: true,
        createdAt: now,
      };
      db.sellerProfiles.unshift(profile);
    }

    const newUser: UserRecord = {
      id: userId,
      name: name.trim(),
      email: email.trim().toLowerCase(),
      role,
      phone: phone || '',
      organizationId,
      sellerId,
      passwordHash: hashPassword(password),
      createdAt: now,
    };

    db.users.push(newUser);
    const token = createId('tok');
    db.sessions.push({ token, userId, createdAt: now });
    appendAuditLog(
      db,
      { id: userId, name: newUser.name, role },
      'USER_REGISTERED',
      'user',
      userId,
      `New ${role} account registered (${email})`
    );
    saveDb(db);

    res.status(201).json({ token, user: sanitizeUser(newUser) });
  });

  // ---------------------------------------------------------------------------
  // 2. UNIFIED MARKETPLACE SEARCH & DISCOVERY
  // ---------------------------------------------------------------------------
  app.get('/api/marketplace/search', (req, res) => {
    const db = getDb();
    const q = String(req.query.q || '').trim().toLowerCase();
    const category = String(req.query.category || 'all');
    const productModel = String(req.query.productModel || 'all');
    const providerId = String(req.query.providerId || 'all');
    const currency = (String(req.query.currency || 'EUR') as CurrencyCode) || 'EUR';
    const minPrice = req.query.minPrice ? Number(req.query.minPrice) : undefined;
    const maxPrice = req.query.maxPrice ? Number(req.query.maxPrice) : undefined;
    const minRating = req.query.minRating ? Number(req.query.minRating) : undefined;
    const sort = String(req.query.sort || 'rating');

    let results = db.products.filter((p) => p.published);

    if (category !== 'all') {
      results = results.filter((p) => p.category === category);
    }
    if (productModel !== 'all') {
      results = results.filter((p) => p.productModel === productModel);
    }
    if (providerId !== 'all') {
      results = results.filter((p) => p.organizationId === providerId);
    }
    if (q) {
      results = results.filter((p) => {
        const haystack = [
          p.title.ar,
          p.title.en,
          p.title.it,
          p.destination.ar,
          p.destination.en,
          p.destination.it,
          p.country,
          p.providerName,
          p.category,
        ]
          .join(' ')
          .toLowerCase();
        return haystack.includes(q);
      });
    }
    if (minRating !== undefined && !Number.isNaN(minRating)) {
      results = results.filter((p) => p.rating >= minRating);
    }
    if (minPrice !== undefined && !Number.isNaN(minPrice)) {
      results = results.filter(
        (p) => convertAmount(p.price, p.baseCurrency, currency) >= minPrice
      );
    }
    if (maxPrice !== undefined && !Number.isNaN(maxPrice)) {
      results = results.filter(
        (p) => convertAmount(p.price, p.baseCurrency, currency) <= maxPrice
      );
    }

    if (sort === 'price_asc') {
      results.sort(
        (a, b) =>
          convertAmount(a.price, a.baseCurrency, 'EUR') -
          convertAmount(b.price, b.baseCurrency, 'EUR')
      );
    } else if (sort === 'price_desc') {
      results.sort(
        (a, b) =>
          convertAmount(b.price, b.baseCurrency, 'EUR') -
          convertAmount(a.price, a.baseCurrency, 'EUR')
      );
    } else {
      results.sort((a, b) => b.rating - a.rating);
    }

    res.json({
      products: results,
      organizations: db.organizations,
      total: results.length,
    });
  });

  app.get('/api/marketplace/products/:id', (req, res) => {
    const db = getDb();
    const product = db.products.find((p) => p.id === req.params.id && p.published);
    if (!product) {
      return res.status(404).json({ error: 'Service not found' });
    }

    // Track affiliate click if ?ref= is provided
    const refCode = String(req.query.ref || '').trim().toUpperCase();
    if (refCode) {
      const seller = db.sellerProfiles.find(
        (s) => s.referralCode.toUpperCase() === refCode || s.couponCode.toUpperCase() === refCode
      );
      if (seller) {
        seller.totalClicks += 1;
        const link = db.affiliateLinks.find(
          (l) => l.sellerId === seller.id && l.productId === product.id
        );
        if (link) {
          link.clicks += 1;
        }
        saveDb(db);
      }
    }

    const organization = db.organizations.find((o) => o.id === product.organizationId);
    const reviews = db.reviews.filter((r) => r.productId === product.id);
    res.json({ product, organization, reviews });
  });

  app.get('/api/marketplace/providers/:id', (req, res) => {
    const db = getDb();
    const organization = db.organizations.find((o) => o.id === req.params.id);
    if (!organization) return res.status(404).json({ error: 'Provider not found' });
    const products = db.products.filter(
      (p) => p.organizationId === organization.id && p.published
    );
    res.json({ organization, products });
  });

  app.get('/api/marketplace/sellers/:code', (req, res) => {
    const db = getDb();
    const code = req.params.code.toUpperCase();
    const seller = db.sellerProfiles.find(
      (s) => s.referralCode.toUpperCase() === code || s.couponCode.toUpperCase() === code
    );
    if (!seller) return res.status(404).json({ error: 'Seller not found' });
    const links = db.affiliateLinks.filter((l) => l.sellerId === seller.id);
    const productIds = new Set(links.map((l) => l.productId));
    const featuredProducts = db.products.filter((p) => p.published && productIds.has(p.id));
    res.json({ seller, links, featuredProducts });
  });

  // Track affiliate click explicitly when visiting a link in app
  app.post('/api/marketplace/track-referral', (req, res) => {
    const { code, productId } = req.body as { code?: string; productId?: string };
    if (!code) return res.status(400).json({ error: 'Referral code required' });
    const db = getDb();
    const normalized = code.trim().toUpperCase();
    const seller = db.sellerProfiles.find(
      (s) => s.referralCode.toUpperCase() === normalized || s.couponCode.toUpperCase() === normalized
    );
    if (!seller) return res.status(404).json({ error: 'Referral code not found' });

    seller.totalClicks += 1;
    if (productId) {
      const link = db.affiliateLinks.find(
        (l) => l.sellerId === seller.id && l.productId === productId
      );
      if (link) link.clicks += 1;
    }
    saveDb(db);
    res.json({ tracked: true, sellerName: seller.displayName, referralCode: seller.referralCode });
  });

  // ---------------------------------------------------------------------------
  // 3. UNIFIED BOOKING ENGINE
  // ---------------------------------------------------------------------------
  app.post('/api/bookings', (req: AuthenticatedRequest, res) => {
    if (!req.authUser) {
      return res.status(401).json({ error: 'Please sign in as a customer to submit a booking' });
    }
    const {
      productId,
      checkInDate,
      checkOutDate,
      travelersCount,
      travelerNames,
      affiliateCode,
      specialNotes,
      currency,
    } = req.body as {
      productId?: string;
      checkInDate?: string;
      checkOutDate?: string;
      travelersCount?: number;
      travelerNames?: string[];
      affiliateCode?: string;
      specialNotes?: string;
      currency?: CurrencyCode;
    };

    if (!productId || !checkInDate || !travelersCount || travelersCount < 1) {
      return res.status(400).json({ error: 'Product, travel date, and traveler count are required' });
    }

    const db = getDb();
    const product = db.products.find((p) => p.id === productId && p.published);
    if (!product) return res.status(404).json({ error: 'Service not found or unpublished' });

    // Check unified provider adapter availability & verified price
    const quote = defaultProviderAdapter.checkAvailabilityAndPrice(
      product,
      checkInDate,
      travelersCount
    );
    if (!quote.available) {
      return res.status(409).json({
        error: `Requested capacity (${travelersCount}) exceeds available inventory (${product.maxCapacity})`,
      });
    }

    const bookingCurrency: CurrencyCode = currency || product.baseCurrency;
    const unitPriceOriginal = convertAmount(
      quote.verifiedUnitPrice,
      product.baseCurrency,
      bookingCurrency
    );
    const totalOriginal = Number((unitPriceOriginal * travelersCount).toFixed(2));
    const unitCostOriginal = convertAmount(
      product.providerCost,
      product.baseCurrency,
      bookingCurrency
    );
    const totalCostOriginal = Number((unitCostOriginal * travelersCount).toFixed(2));

    let seller: SellerProfile | undefined;
    if (affiliateCode && affiliateCode.trim()) {
      const normalizedCode = affiliateCode.trim().toUpperCase();
      seller = db.sellerProfiles.find(
        (s) =>
          s.referralCode.toUpperCase() === normalizedCode ||
          s.couponCode.toUpperCase() === normalizedCode
      );
    }

    const { exchangeRateAtBooking, grossEur, snapshot } = calculateCommissionSnapshot(db, {
      grossOriginal: totalOriginal,
      providerCostOriginal: totalCostOriginal,
      currency: bookingCurrency,
      category: product.category,
      organizationId: product.organizationId,
      hasSeller: Boolean(seller),
    });

    const now = new Date().toISOString();
    const initialStatus: BookingStatus = product.instantBooking
      ? 'Confirmed'
      : 'Awaiting Provider Confirmation';

    const refNum = Math.floor(100 + Math.random() * 899);
    const booking: Booking = {
      id: createId('bkg'),
      referenceCode: `MSD-2611-${refNum}`,
      productId: product.id,
      productTitle: product.title,
      category: product.category,
      organizationId: product.organizationId,
      providerName: product.providerName,
      customerId: req.authUser.id,
      customerName: req.authUser.name,
      customerEmail: req.authUser.email,
      sellerId: seller?.id,
      sellerName: seller?.displayName,
      affiliateCode: seller?.referralCode,
      checkInDate,
      checkOutDate,
      travelersCount,
      travelerNames:
        travelerNames && travelerNames.length > 0 ? travelerNames : [req.authUser.name],
      specialNotes,
      status: initialStatus,
      instantBooking: product.instantBooking,
      originalCurrency: bookingCurrency,
      exchangeRateAtBooking,
      unitPriceOriginal,
      totalOriginal,
      totalEur: grossEur,
      commissionSnapshot: snapshot,
      statusHistory: [
        {
          status: initialStatus,
          note: product.instantBooking
            ? `Instant confirmation verified via ${quote.adapterName} (${quote.externalHoldReference})`
            : `Submitted and awaiting confirmation from ${product.providerName}`,
          actorName: req.authUser.name,
          timestamp: now,
        },
      ],
      createdAt: now,
    };

    db.bookings.unshift(booking);

    if (initialStatus === 'Confirmed') {
      recordConfirmedBookingLedger(db, booking);
    }

    appendAuditLog(
      db,
      { id: req.authUser.id, name: req.authUser.name, role: req.authUser.role },
      'BOOKING_CREATED',
      'booking',
      booking.id,
      `Created booking ${booking.referenceCode} (${initialStatus}) — ${totalOriginal} ${bookingCurrency}`
    );

    saveDb(db);
    res.status(201).json({ booking });
  });

  app.patch('/api/bookings/:id/status', (req: AuthenticatedRequest, res) => {
    if (!req.authUser) return res.status(401).json({ error: 'Authentication required' });
    const { status, note } = req.body as { status?: BookingStatus; note?: string };
    if (!status) return res.status(400).json({ error: 'Target status is required' });

    const db = getDb();
    const booking = db.bookings.find((b) => b.id === req.params.id);
    if (!booking) return res.status(404).json({ error: 'Booking not found' });

    // Strict RBAC & company data isolation
    if (req.authUser.role === 'provider') {
      if (booking.organizationId !== req.authUser.organizationId) {
        return res.status(403).json({ error: 'Cannot modify bookings of another organization' });
      }
      if (!['Confirmed', 'Rejected', 'Completed', 'Refunded', 'Partially Refunded'].includes(status)) {
        return res.status(400).json({ error: 'Invalid provider transition' });
      }
    } else if (req.authUser.role === 'customer') {
      if (booking.customerId !== req.authUser.id) {
        return res.status(403).json({ error: 'Cannot modify another customer booking' });
      }
      if (!['Cancelled', 'Refund Pending'].includes(status)) {
        return res.status(400).json({ error: 'Customers may only cancel or request refund' });
      }
    } else if (req.authUser.role !== 'admin') {
      return res.status(403).json({ error: 'Permission denied' });
    }

    const previousStatus = booking.status;
    booking.status = status;
    booking.statusHistory.push({
      status,
      note: note || `Status changed from ${previousStatus} to ${status}`,
      actorName: req.authUser.name,
      timestamp: new Date().toISOString(),
    });

    // Trigger independent Commission & Ledger Engine when Confirmed
    if (status === 'Confirmed' && previousStatus !== 'Confirmed') {
      recordConfirmedBookingLedger(db, booking);
    }

    // Trigger Refund Ledger when Refunded or Partially Refunded
    if (status === 'Refunded' && previousStatus !== 'Refunded') {
      recordRefundLedger(db, booking, 1);
    } else if (status === 'Partially Refunded' && previousStatus !== 'Partially Refunded') {
      recordRefundLedger(db, booking, 0.5);
    }

    appendAuditLog(
      db,
      { id: req.authUser.id, name: req.authUser.name, role: req.authUser.role },
      'BOOKING_STATUS_UPDATED',
      'booking',
      booking.id,
      `${booking.referenceCode}: ${previousStatus} -> ${status}`
    );

    saveDb(db);
    res.json({ booking });
  });

  // ---------------------------------------------------------------------------
  // 4. CUSTOMER WORKSPACE, FAVORITES, REQUESTS & QUOTATIONS
  // ---------------------------------------------------------------------------
  app.get(
    '/api/customer/dashboard',
    requireRole('customer', 'admin'),
    (req: AuthenticatedRequest, res) => {
      const db = getDb();
      const userId = req.authUser!.id;
      const bookings = db.bookings.filter((b) => b.customerId === userId);
      const favoriteIds = db.favorites
        .filter((f) => f.userId === userId)
        .map((f) => f.productId);
      const favoriteProducts = db.products.filter((p) => favoriteIds.includes(p.id));
      const travelRequests = db.travelRequests.filter((r) => r.customerId === userId);
      const requestIds = new Set(travelRequests.map((r) => r.id));
      const quotations = db.quotations.filter((q) => requestIds.has(q.requestId));
      const tickets = db.supportTickets.filter((t) => t.userId === userId);

      res.json({
        bookings,
        favoriteIds,
        favoriteProducts,
        travelRequests,
        quotations,
        tickets,
      });
    }
  );

  app.post('/api/customer/favorites/:productId', (req: AuthenticatedRequest, res) => {
    if (!req.authUser) return res.status(401).json({ error: 'Authentication required' });
    const db = getDb();
    const userId = req.authUser.id;
    const { productId } = req.params;
    const idx = db.favorites.findIndex(
      (f) => f.userId === userId && f.productId === productId
    );
    let saved = false;
    if (idx >= 0) {
      db.favorites.splice(idx, 1);
      saved = false;
    } else {
      db.favorites.push({ userId, productId });
      saved = true;
    }
    saveDb(db);
    res.json({ saved });
  });

  app.post('/api/requests', (req: AuthenticatedRequest, res) => {
    if (!req.authUser) return res.status(401).json({ error: 'Please sign in to submit a request' });
    const {
      destination,
      travelDate,
      travelersCount,
      budget,
      currency,
      accommodationType,
      requestedServices,
      notes,
    } = req.body as Partial<TravelRequest>;

    if (!destination || !travelDate || !travelersCount || !budget) {
      return res.status(400).json({ error: 'Destination, date, travelers, and budget are required' });
    }

    const db = getDb();
    const request: TravelRequest = {
      id: createId('req'),
      customerId: req.authUser.id,
      customerName: req.authUser.name,
      destination,
      travelDate,
      travelersCount: Number(travelersCount),
      budget: Number(budget),
      currency: (currency as CurrencyCode) || 'EUR',
      accommodationType: accommodationType || '4-5 Star Hotel',
      requestedServices:
        requestedServices && requestedServices.length > 0 ? requestedServices : ['hotels', 'tours'],
      notes: notes || '',
      status: 'Open',
      createdAt: new Date().toISOString(),
    };

    db.travelRequests.unshift(request);
    appendAuditLog(
      db,
      { id: req.authUser.id, name: req.authUser.name, role: req.authUser.role },
      'TRAVEL_REQUEST_CREATED',
      'travel_request',
      request.id,
      `Destination: ${destination}, Budget: ${budget} ${request.currency}`
    );
    saveDb(db);
    res.status(201).json({ travelRequest: request });
  });

  app.post(
    '/api/requests/:id/quotations',
    requireRole('provider', 'admin'),
    (req: AuthenticatedRequest, res) => {
      const db = getDb();
      const travelRequest = db.travelRequests.find((r) => r.id === req.params.id);
      if (!travelRequest) return res.status(404).json({ error: 'Travel request not found' });

      const org = db.organizations.find((o) => o.id === req.authUser!.organizationId);
      if (!org && req.authUser!.role !== 'admin') {
        return res.status(403).json({ error: 'Organization profile required' });
      }

      const { quotedPrice, currency, validUntil, summary, items } = req.body as Partial<Quotation>;
      if (!quotedPrice || !validUntil || !summary) {
        return res.status(400).json({ error: 'Quoted price, expiry date, and summary are required' });
      }

      const quotation: Quotation = {
        id: createId('quo'),
        requestId: travelRequest.id,
        organizationId: org ? org.id : 'org_med_horizons',
        providerName: org ? org.name : 'MASIDY Partner Agency',
        quotedPrice: Number(quotedPrice),
        currency: (currency as CurrencyCode) || travelRequest.currency,
        validUntil,
        summary,
        items:
          items && items.length > 0
            ? items
            : [{ title: `Custom Package for ${travelRequest.destination}`, amount: Number(quotedPrice) }],
        status: 'Quoted',
        createdAt: new Date().toISOString(),
      };

      travelRequest.status = 'Quoted';
      db.quotations.unshift(quotation);
      saveDb(db);
      res.status(201).json({ quotation });
    }
  );

  app.patch('/api/quotations/:id/respond', (req: AuthenticatedRequest, res) => {
    if (!req.authUser) return res.status(401).json({ error: 'Authentication required' });
    const { action } = req.body as { action?: 'accept' | 'reject' };
    if (!action) return res.status(400).json({ error: 'Action (accept/reject) is required' });

    const db = getDb();
    const quotation = db.quotations.find((q) => q.id === req.params.id);
    if (!quotation) return res.status(404).json({ error: 'Quotation not found' });

    const travelRequest = db.travelRequests.find((r) => r.id === quotation.requestId);
    if (!travelRequest || (travelRequest.customerId !== req.authUser.id && req.authUser.role !== 'admin')) {
      return res.status(403).json({ error: 'Only the requesting customer can respond to this quotation' });
    }

    if (action === 'reject') {
      quotation.status = 'Rejected';
      saveDb(db);
      return res.json({ quotation });
    }

    // Convert Accepted Quotation directly into a Confirmed Booking!
    quotation.status = 'Converted';
    travelRequest.status = 'Converted';

    const estimatedCost = Number((quotation.quotedPrice * 0.72).toFixed(2));
    const { exchangeRateAtBooking, grossEur, snapshot } = calculateCommissionSnapshot(db, {
      grossOriginal: quotation.quotedPrice,
      providerCostOriginal: estimatedCost,
      currency: quotation.currency,
      category: 'visas_packages',
      organizationId: quotation.organizationId,
      hasSeller: false,
    });

    const now = new Date().toISOString();
    const booking: Booking = {
      id: createId('bkg'),
      referenceCode: `MSD-QUO-${Math.floor(100 + Math.random() * 899)}`,
      productId: 'custom_quotation',
      productTitle: {
        ar: `عرض سعر معتمد: ${travelRequest.destination}`,
        en: `Accepted Quotation: ${travelRequest.destination}`,
        it: `Preventivo Accettato: ${travelRequest.destination}`,
      },
      category: 'visas_packages',
      organizationId: quotation.organizationId,
      providerName: quotation.providerName,
      customerId: travelRequest.customerId,
      customerName: travelRequest.customerName,
      customerEmail: req.authUser.email,
      checkInDate: travelRequest.travelDate,
      travelersCount: travelRequest.travelersCount,
      travelerNames: [travelRequest.customerName],
      specialNotes: quotation.summary,
      status: 'Confirmed',
      instantBooking: false,
      originalCurrency: quotation.currency,
      exchangeRateAtBooking,
      unitPriceOriginal: quotation.quotedPrice,
      totalOriginal: quotation.quotedPrice,
      totalEur: grossEur,
      commissionSnapshot: snapshot,
      statusHistory: [
        {
          status: 'Confirmed',
          note: `Converted from accepted quotation ${quotation.id}`,
          actorName: req.authUser.name,
          timestamp: now,
        },
      ],
      createdAt: now,
    };

    quotation.convertedBookingId = booking.id;
    db.bookings.unshift(booking);
    recordConfirmedBookingLedger(db, booking);
    appendAuditLog(
      db,
      { id: req.authUser.id, name: req.authUser.name, role: req.authUser.role },
      'QUOTATION_CONVERTED',
      'booking',
      booking.id,
      `Quotation ${quotation.id} converted to confirmed booking ${booking.referenceCode}`
    );
    saveDb(db);
    res.json({ quotation, booking });
  });

  // ---------------------------------------------------------------------------
  // 5. PROVIDER COMPANY WORKSPACE (ISOLATED BY ORGANIZATION ID)
  // ---------------------------------------------------------------------------
  app.get(
    '/api/provider/dashboard',
    requireRole('provider', 'admin'),
    (req: AuthenticatedRequest, res) => {
      const db = getDb();
      const orgId = req.authUser!.organizationId;
      if (!orgId) return res.status(400).json({ error: 'No organization linked to user' });

      const organization = db.organizations.find((o) => o.id === orgId);
      const products = db.products.filter((p) => p.organizationId === orgId);
      const bookings = db.bookings.filter((b) => b.organizationId === orgId);
      const staff = db.organizationMembers.filter((m) => m.organizationId === orgId);
      const ledger = db.ledgerEntries.filter(
        (l) => l.accountType === 'provider' && l.entityId === orgId
      );
      const payouts = db.payouts.filter(
        (p) => p.recipientType === 'provider' && p.recipientId === orgId
      );
      const openRequests = db.travelRequests.filter((r) => r.status === 'Open' || r.status === 'Quoted');
      const myQuotations = db.quotations.filter((q) => q.organizationId === orgId);

      // Extract unique customers who booked with this provider
      const customersMap = new Map<string, { id: string; name: string; email: string; bookingsCount: number }>();
      for (const b of bookings) {
        const existing = customersMap.get(b.customerId);
        if (existing) {
          existing.bookingsCount += 1;
        } else {
          customersMap.set(b.customerId, {
            id: b.customerId,
            name: b.customerName,
            email: b.customerEmail,
            bookingsCount: 1,
          });
        }
      }

      res.json({
        organization,
        products,
        bookings,
        staff,
        customers: Array.from(customersMap.values()),
        ledger,
        payouts,
        openRequests,
        myQuotations,
      });
    }
  );

  app.post(
    '/api/provider/products',
    requireRole('provider', 'admin'),
    (req: AuthenticatedRequest, res) => {
      const db = getDb();
      const orgId = req.authUser!.organizationId;
      const org = db.organizations.find((o) => o.id === orgId);
      if (!org) return res.status(404).json({ error: 'Organization not found' });

      const {
        category,
        productModel,
        titleAr,
        titleEn,
        titleIt,
        descriptionAr,
        descriptionEn,
        destinationAr,
        destinationEn,
        country,
        baseCurrency,
        price,
        providerCost,
        instantBooking,
        published,
        maxCapacity,
      } = req.body as {
        category?: ServiceCategory;
        productModel?: ProductModel;
        titleAr?: string;
        titleEn?: string;
        titleIt?: string;
        descriptionAr?: string;
        descriptionEn?: string;
        destinationAr?: string;
        destinationEn?: string;
        country?: string;
        baseCurrency?: CurrencyCode;
        price?: number;
        providerCost?: number;
        instantBooking?: boolean;
        published?: boolean;
        maxCapacity?: number;
      };

      if (!category || !productModel || !(titleEn || titleAr) || !price) {
        return res.status(400).json({ error: 'Category, model, title, and price are required' });
      }

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

      const mainTitle = titleEn || titleAr || 'New Travel Service';
      const newProduct: Product = {
        id: createId('prd'),
        organizationId: org.id,
        providerName: org.name,
        category,
        productModel,
        title: {
          ar: titleAr || mainTitle,
          en: titleEn || titleAr || mainTitle,
          it: titleIt || titleEn || mainTitle,
        },
        description: {
          ar: descriptionAr || descriptionEn || 'خدمة سياحية مضافة عبر بوابة الشركات على Masidy.',
          en: descriptionEn || descriptionAr || 'Verified tourism service listed via Masidy Partner Portal.',
          it: descriptionEn || descriptionAr || 'Servizio turistico verificato su Masidy.',
        },
        destination: {
          ar: destinationAr || destinationEn || org.city,
          en: destinationEn || destinationAr || org.city,
          it: destinationEn || destinationAr || org.city,
        },
        country: country || org.country,
        baseCurrency: baseCurrency || 'EUR',
        price: Number(price),
        providerCost: providerCost ? Number(providerCost) : Number((Number(price) * 0.72).toFixed(2)),
        instantBooking: Boolean(instantBooking),
        published: published !== false,
        rating: 5.0,
        reviewCount: 0,
        imageUrl: categoryImages[category],
        durationLabel: { ar: 'حسب الخدمة', en: 'Per Booking', it: 'Per Prenotazione' },
        cancellationPolicy: {
          ar: 'إلغاء مرن قبل 48 ساعة من الموعد.',
          en: 'Flexible cancellation up to 48 hours prior.',
          it: 'Cancellazione flessibile fino a 48 ore prima.',
        },
        availableDates: ['2026-11-22', '2026-11-29', '2026-12-06', '2026-12-14'],
        maxCapacity: maxCapacity ? Number(maxCapacity) : 12,
        specs: { listedBy: org.name, model: productModel },
        createdAt: new Date().toISOString(),
      };

      db.products.unshift(newProduct);
      appendAuditLog(
        db,
        { id: req.authUser!.id, name: req.authUser!.name, role: req.authUser!.role },
        'PRODUCT_CREATED',
        'product',
        newProduct.id,
        `${org.name} created ${newProduct.title.en} (${newProduct.price} ${newProduct.baseCurrency})`
      );
      saveDb(db);
      res.status(201).json({ product: newProduct });
    }
  );

  app.patch(
    '/api/provider/products/:id',
    requireRole('provider', 'admin'),
    (req: AuthenticatedRequest, res) => {
      const db = getDb();
      const product = db.products.find((p) => p.id === req.params.id);
      if (!product) return res.status(404).json({ error: 'Product not found' });
      if (req.authUser!.role === 'provider' && product.organizationId !== req.authUser!.organizationId) {
        return res.status(403).json({ error: 'Cannot edit products belonging to another company' });
      }

      const { published, price, maxCapacity } = req.body as {
        published?: boolean;
        price?: number;
        maxCapacity?: number;
      };
      if (published !== undefined) product.published = published;
      if (price !== undefined && price > 0) product.price = Number(price);
      if (maxCapacity !== undefined && maxCapacity > 0) product.maxCapacity = Number(maxCapacity);

      saveDb(db);
      res.json({ product });
    }
  );

  app.post(
    '/api/provider/staff',
    requireRole('provider', 'admin'),
    (req: AuthenticatedRequest, res) => {
      const { name, email, memberRole } = req.body as {
        name?: string;
        email?: string;
        memberRole?: 'manager' | 'agent';
      };
      if (!name || !email) return res.status(400).json({ error: 'Staff name and email are required' });

      const db = getDb();
      const member: OrganizationMember = {
        id: createId('mem'),
        organizationId: req.authUser!.organizationId!,
        name: name.trim(),
        email: email.trim().toLowerCase(),
        memberRole: memberRole || 'agent',
        permissions:
          memberRole === 'manager'
            ? ['catalog:write', 'bookings:confirm', 'quotations:send']
            : ['bookings:confirm'],
        createdAt: new Date().toISOString(),
      };
      db.organizationMembers.push(member);
      saveDb(db);
      res.status(201).json({ member });
    }
  );

  // ---------------------------------------------------------------------------
  // 6. SELLER / AFFILIATE WORKSPACE
  // ---------------------------------------------------------------------------
  app.get(
    '/api/seller/dashboard',
    requireRole('seller', 'admin'),
    (req: AuthenticatedRequest, res) => {
      const db = getDb();
      const sellerId = req.authUser!.sellerId;
      const seller = sellerId
        ? db.sellerProfiles.find((s) => s.id === sellerId)
        : db.sellerProfiles[0];
      if (!seller) return res.status(404).json({ error: 'Seller profile not found' });

      const availableProducts = db.products.filter((p) => p.published);
      const links = db.affiliateLinks.filter((l) => l.sellerId === seller.id);
      const bookings = db.bookings.filter((b) => b.sellerId === seller.id);
      const ledger = db.ledgerEntries.filter(
        (l) => l.accountType === 'seller' && l.entityId === seller.id
      );
      const payouts = db.payouts.filter(
        (p) => p.recipientType === 'seller' && p.recipientId === seller.id
      );

      res.json({
        seller,
        availableProducts,
        links,
        bookings,
        ledger,
        payouts,
      });
    }
  );

  app.post(
    '/api/seller/links',
    requireRole('seller', 'admin'),
    (req: AuthenticatedRequest, res) => {
      const { productId } = req.body as { productId?: string };
      if (!productId) return res.status(400).json({ error: 'Product ID is required' });

      const db = getDb();
      const seller = db.sellerProfiles.find((s) => s.id === req.authUser!.sellerId);
      if (!seller) return res.status(404).json({ error: 'Seller profile not found' });

      const product = db.products.find((p) => p.id === productId && p.published);
      if (!product) return res.status(404).json({ error: 'Published product not found' });

      const existing = db.affiliateLinks.find(
        (l) => l.sellerId === seller.id && l.productId === product.id
      );
      if (existing) {
        return res.json({ link: existing });
      }

      const newLink: AffiliateLink = {
        id: createId('aff'),
        sellerId: seller.id,
        productId: product.id,
        productTitle: product.title,
        providerName: product.providerName,
        code: seller.referralCode,
        couponCode: seller.couponCode,
        url: `/?product=${product.id}&ref=${seller.referralCode}`,
        clicks: 0,
        conversions: 0,
        earnedEur: 0,
        createdAt: new Date().toISOString(),
      };

      db.affiliateLinks.unshift(newLink);
      appendAuditLog(
        db,
        { id: req.authUser!.id, name: req.authUser!.name, role: req.authUser!.role },
        'AFFILIATE_LINK_CREATED',
        'affiliate_link',
        newLink.id,
        `${seller.displayName} created marketing link for ${product.title.en}`
      );
      saveDb(db);
      res.status(201).json({ link: newLink });
    }
  );

  // ---------------------------------------------------------------------------
  // 7. REVIEWS & SUPPORT TICKETS
  // ---------------------------------------------------------------------------
  app.post('/api/reviews', (req: AuthenticatedRequest, res) => {
    if (!req.authUser) return res.status(401).json({ error: 'Sign in required' });
    const { productId, rating, comment } = req.body as {
      productId?: string;
      rating?: number;
      comment?: string;
    };
    if (!productId || !rating || !comment) {
      return res.status(400).json({ error: 'Product, rating, and comment are required' });
    }
    const db = getDb();
    const product = db.products.find((p) => p.id === productId);
    if (!product) return res.status(404).json({ error: 'Service not found' });

    const review = {
      id: createId('rev'),
      productId,
      customerId: req.authUser.id,
      customerName: req.authUser.name,
      rating: Math.min(5, Math.max(1, Number(rating))),
      comment: comment.trim(),
      createdAt: new Date().toISOString(),
    };
    db.reviews.unshift(review);

    const allReviews = db.reviews.filter((r) => r.productId === productId);
    const avg = allReviews.reduce((sum, r) => sum + r.rating, 0) / allReviews.length;
    product.rating = Number(avg.toFixed(1));
    product.reviewCount = allReviews.length;
    saveDb(db);
    res.status(201).json({ review });
  });

  app.post('/api/tickets', (req: AuthenticatedRequest, res) => {
    if (!req.authUser) return res.status(401).json({ error: 'Sign in required' });
    const { bookingId, subject, message } = req.body as {
      bookingId?: string;
      subject?: string;
      message?: string;
    };
    if (!subject || !message) {
      return res.status(400).json({ error: 'Subject and message are required' });
    }
    const db = getDb();
    const ticket = {
      id: createId('tkt'),
      bookingId,
      userId: req.authUser.id,
      userName: req.authUser.name,
      role: req.authUser.role,
      subject: subject.trim(),
      message: message.trim(),
      status: 'Open' as const,
      createdAt: new Date().toISOString(),
    };
    db.supportTickets.unshift(ticket);
    saveDb(db);
    res.status(201).json({ ticket });
  });

  // ---------------------------------------------------------------------------
  // 8. SUPER ADMIN PLATFORM OPERATIONS
  // ---------------------------------------------------------------------------
  app.get('/api/admin/dashboard', requireRole('admin'), (_req, res) => {
    const db = getDb();
    res.json({
      organizations: db.organizations,
      sellers: db.sellerProfiles,
      customers: db.users.filter((u) => u.role === 'customer').map(sanitizeUser),
      products: db.products,
      bookings: db.bookings,
      commissionRules: db.commissionRules,
      ledgerEntries: db.ledgerEntries,
      payouts: db.payouts,
      supportTickets: db.supportTickets,
      auditLogs: db.auditLogs,
    });
  });

  app.patch(
    '/api/admin/organizations/:id/verify',
    requireRole('admin'),
    (req: AuthenticatedRequest, res) => {
      const db = getDb();
      const org = db.organizations.find((o) => o.id === req.params.id);
      if (!org) return res.status(404).json({ error: 'Organization not found' });
      org.verified = !org.verified;
      appendAuditLog(
        db,
        { id: req.authUser!.id, name: req.authUser!.name, role: 'admin' },
        'ORGANIZATION_VERIFICATION_TOGGLED',
        'organization',
        org.id,
        `${org.name} verified = ${org.verified}`
      );
      saveDb(db);
      res.json({ organization: org });
    }
  );

  app.post(
    '/api/admin/commission-rules',
    requireRole('admin'),
    (req: AuthenticatedRequest, res) => {
      const { name, scope, category, organizationId, platformPercent, sellerPercent, fixedFeeEur } =
        req.body as Partial<CommissionRule>;
      if (!name || !scope || platformPercent === undefined || sellerPercent === undefined) {
        return res.status(400).json({ error: 'Rule name, scope, and percentages are required' });
      }
      const db = getDb();
      const rule: CommissionRule = {
        id: createId('rule'),
        name,
        scope,
        category,
        organizationId,
        platformPercent: Number(platformPercent),
        sellerPercent: Number(sellerPercent),
        fixedFeeEur: Number(fixedFeeEur || 0),
        active: true,
      };
      db.commissionRules.unshift(rule);
      appendAuditLog(
        db,
        { id: req.authUser!.id, name: req.authUser!.name, role: 'admin' },
        'COMMISSION_RULE_CREATED',
        'commission_rule',
        rule.id,
        `Rule "${rule.name}" (${rule.scope}): Platform ${rule.platformPercent}%, Seller ${rule.sellerPercent}%`
      );
      saveDb(db);
      res.status(201).json({ rule });
    }
  );

  app.post(
    '/api/admin/payouts/:id/settle',
    requireRole('admin'),
    (req: AuthenticatedRequest, res) => {
      const db = getDb();
      const payout = db.payouts.find((p) => p.id === req.params.id);
      if (!payout) return res.status(404).json({ error: 'Payout not found' });
      if (payout.status === 'Settled') {
        return res.status(400).json({ error: 'Payout already settled' });
      }

      const now = new Date().toISOString();
      payout.status = 'Settled';
      payout.settledAt = now;

      if (payout.recipientType === 'seller') {
        const seller = db.sellerProfiles.find((s) => s.id === payout.recipientId);
        if (seller) {
          seller.pendingBalanceEur = Math.max(
            0,
            Number((seller.pendingBalanceEur - payout.amountEur).toFixed(2))
          );
          seller.settledBalanceEur = Number(
            (seller.settledBalanceEur + payout.amountEur).toFixed(2)
          );
        }
      }

      db.ledgerEntries.unshift({
        id: createId('led'),
        payoutId: payout.id,
        accountType: payout.recipientType,
        entityId: payout.recipientId,
        entityName: payout.recipientName,
        entryType: 'payout_settlement',
        amountEur: -payout.amountEur,
        originalCurrency: 'EUR',
        originalAmount: -payout.amountEur,
        exchangeRate: 1,
        description: `Payout ${payout.id} settled to ${payout.recipientName}`,
        createdAt: now,
        immutable: true,
      });

      appendAuditLog(
        db,
        { id: req.authUser!.id, name: req.authUser!.name, role: 'admin' },
        'PAYOUT_SETTLED',
        'payout',
        payout.id,
        `Settled €${payout.amountEur} to ${payout.recipientName}`
      );

      saveDb(db);
      res.json({ payout });
    }
  );

  app.patch('/api/admin/tickets/:id', requireRole('admin'), (req: AuthenticatedRequest, res) => {
    const { status } = req.body as { status?: 'Open' | 'In Review' | 'Resolved' };
    if (!status) return res.status(400).json({ error: 'Status required' });
    const db = getDb();
    const ticket = db.supportTickets.find((t) => t.id === req.params.id);
    if (!ticket) return res.status(404).json({ error: 'Ticket not found' });
    ticket.status = status;
    saveDb(db);
    res.json({ ticket });
  });

  // ---------------------------------------------------------------------------
  // VITE MIDDLEWARE (DEV) OR STATIC SERVING (PROD)
  // ---------------------------------------------------------------------------
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(process.cwd(), 'dist');
    if (fs.existsSync(distPath)) {
      app.use(express.static(distPath));
      app.get('*', (_req, res) => {
        res.sendFile(path.join(distPath, 'index.html'));
      });
    }
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`MASIDY Travel Marketplace listening on http://localhost:${PORT}`);
  });
}

startServer();
