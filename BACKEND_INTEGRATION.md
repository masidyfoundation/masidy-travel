# Backend Integration Guide

This guide describes how to migrate **MASIDY Travel Marketplace** from its current client-side `MarketplaceContext` + `localStorage` state to a production backend API and persistent database.

> **Existing Server Scaffold Note**: The repository already contains an Express server entrypoint (`server.ts`) alongside early server modules (`server/db/store.ts`, `server/modules/commissions.ts`, `server/adapters/providers.ts`) and an unused client helper (`src/lib/api.ts`). Currently, `src/main.tsx` and `src/context/MarketplaceContext.tsx` operate strictly in frontend-only mode against `src/shared/storage.ts`. Those `server/*` files provide a structural starting point for API route contracts, commission math, and RBAC middleware.

---

## Integration Architecture

Replace the synchronous state mutations in `src/context/MarketplaceContext.tsx` with async API calls (keeping optimistic/loading/error toast handling in UI components) backed by a relational or document database.

```text
React Views & Dashboards
        │
        ▼
MarketplaceContext (Async Data Layer + Client Cache)
        │  HTTPS + Bearer Token / HttpOnly Cookie
        ▼
Express / API Gateway (RBAC + Validation + Rate Limiting)
   ├── Auth & Sessions Service
   ├── Catalog & Availability Inventory Service
   ├── Booking, FX Snapshot & Commission Engine
   ├── Custom Requests & Quotations Service
   ├── Affiliate Tracking & Payouts Service
   └── Immutable Double-Entry Financial Ledger
```

---

## Domain API Contracts

### 1. Authentication & Role-Based Access Control (RBAC)
- `POST /api/auth/register` — Creates user (`customer`, `provider`, `seller`). When `role === 'provider'`, atomically creates `Organization` (`subscriptionPlan: 'free'`) and `owner` `OrganizationMember`. When `role === 'seller'`, provisions `SellerProfile` with unique `referralCode` & `couponCode`.
- `POST /api/auth/login` — Verifies hashed password (`scrypt`/`argon2`/`bcrypt`), rejects `status === 'suspended'` accounts (`403`), issues short-lived JWT or HttpOnly session cookie.
- `POST /api/auth/logout` — Invalidates session token.
- `GET /api/auth/me` — Returns sanitized `User` (never `passwordHash`), linked `Organization`, and `SellerProfile`.

**Enforcement Rules**:
- Providers can only mutate products, slots, bookings, and staff belonging to `req.authUser.organizationId`.
- Customers can only cancel/request refunds for their own `customerId` bookings and accept/decline quotations on their own `TravelRequest` records.
- Admin routes (`users`, `companies`, `sellers`, `commissionRules`, `settlePayout`, `platformSettings`) require `role === 'admin'`.

### 2. Marketplace Discovery & Catalog
- `GET /api/marketplace/search` — Query params: `q`, `category`, `productModel`, `providerId`, `currency`, `minPrice`, `maxPrice`, `minRating`, `sort`. Filters `published === true` products and converts prices server-side or returns canonical `baseCurrency` + live FX rates.
- `GET /api/marketplace/products/:id` — Returns product details, organization summary, `AvailabilitySlot[]` (`remainingUnits > 0`), and `Review[]`. Optionally records attributed referral click if `?ref=` is present.
- `GET /api/marketplace/providers/:id` — Returns organization profile and published services.
- `POST /api/products/:id/reviews` — Authenticated travelers submit validated ratings/comments and recalculate `rating` + `reviewCount` transactionally.

### 3. Availability Inventory & Booking Engine
- `POST /api/bookings`:
  - **Input**: `{ productId, checkInDate, checkOutDate?, travelersCount, travelers[], affiliateCode?, specialNotes?, currency }`
  - **Server Transaction**:
    1. Lock `AvailabilitySlot` row (`FOR UPDATE` in SQL) or check `maxCapacity`. Reject (`409 Conflict`) if `available === false` or `remainingUnits < travelersCount`.
    2. Compute authoritative unit price from `slot.priceOverride ?? product.price` — never trust client-submitted totals.
    3. Fetch authoritative FX rate (`exchangeRateAtBooking`) and compute `CommissionSnapshot` using priority: active `organization` rule -> `category` rule -> `global` rule.
    4. Validate `affiliateCode` against active (`status !== 'paused'`) sellers.
    5. Determine initial status (`Confirmed` if `product.instantBooking`, else `Awaiting Provider Confirmation`).
    6. Decrement `remainingUnits`; if `Confirmed`, write immutable `provider_payable`, `platform_fee`, and `seller_commission` ledger entries plus increment seller/link conversions inside the **same DB transaction**.
- `PATCH /api/bookings/:id/status`:
  - Validates role-allowed transitions (`Confirmed`, `Rejected`, `Completed`, `Cancelled`, `Refund Pending`, `Refunded`, `Partially Refunded`).
  - Appends to `statusHistory`, updates inventory on cancellation/rejection/refund, and triggers idempotent ledger confirmation or reversal entries.

### 4. Custom Trip Requests & Quotations
- `POST /api/requests` — Customer creates `TravelRequest`.
- `POST /api/requests/:id/quotations` — Verified provider submits `Quotation` with line items (`QuotationItem[]`), `validUntil`, and inclusions. Updates request status to `'Quoted'` and notifies customer.
- `PATCH /api/quotations/:id/respond` — Customer rejects (`status: 'Rejected'`) or accepts (`status: 'Converted'`), atomically creating a `Confirmed` `Booking` + ledger entries in one transaction.

### 5. Company Workspace (`/api/provider/*`)
- `PATCH /api/provider/organization` — Updates `Organization` profile (propagated via foreign key join rather than denormalized strings in SQL).
- `POST /api/provider/products` & `PATCH /api/provider/products/:id` — Validates `price > 0` and `providerCost <= price`.
- `PUT /api/provider/products/:id/slots` — Upserts `AvailabilitySlot` date inventory and `priceOverride`.
- `POST /api/provider/staff` — Invites `OrganizationMember` with scoped permissions (`catalog:write`, `bookings:confirm`, `quotations:send`, `staff:manage`, `finance:read`).

### 6. Affiliate Tracking, Ledger & Payouts
- `POST /api/seller/links` — Creates or retrieves product-specific `AffiliateLink`.
- `POST /api/marketplace/track-referral` — Deduplicates click attribution (e.g., IP/session window) and sets signed attribution cookie.
- `POST /api/seller/payouts` — Verifies seller is `'active'`, `pendingBalanceEur > 0`, and no existing `'Pending'` payout exists before creating a `Payout` request.
- `POST /api/admin/payouts/:id/settle` — Admin settles payout (integrating Stripe Connect / Wise / SEPA transfer), moves seller `pendingBalanceEur -> settledBalanceEur`, writes negative `payout_settlement` ledger row, and emits notification + audit log.

### 7. Notifications, Messaging & Favorites
- `GET/POST /api/customer/favorites/:productId` — Persists favorites per `userId` in database.
- `GET/PATCH /api/notifications` & `/api/notifications/mark-all-read` — Persisted alerts synced via polling, SSE, or WebSockets.
- `GET/POST /api/messages` — Threaded customer-provider messaging keyed by `threadId` (`bookingId` or `requestId`).

---

## Recommended Database Schema & Security Checklist

- **Database**: PostgreSQL (or Firestore) storing `users`, `organizations`, `organization_members`, `seller_profiles`, `products`, `availability_slots`, `affiliate_links`, `bookings`, `booking_status_history`, `travel_requests`, `quotations`, `commission_rules`, `ledger_entries` (append-only, `UPDATE`/`DELETE` restricted), `payouts`, `reviews`, `support_tickets`, `notifications`, `messages`, and `audit_logs`.
- **Sensitive Data Migration**:
  - Replace client-side `DEMO-DOC-*` placeholders with encrypted server-side traveler document storage or PCI/GDPR-compliant tokenization.
  - Never send `passwordHash` or internal `providerCost` to public/customer endpoints (`providerCost` should only be exposed to the owning organization and platform admins).
- **Client Cutover Strategy**:
  1. Keep `MarketplaceContextValue` interface stable so all UI components (`MarketplaceView`, `DiscoveryPages`, `BookingAndQuotationPages`, and dashboards) require minimal refactoring.
  2. Replace synchronous state getters/setters in `MarketplaceContext.tsx` with `fetch('/api/...')` calls and React state hydration on login/mount.
  3. Restrict `localStorage` strictly to UI preferences (`lang`, `currency`) and non-sensitive draft filters once backend persistence is live.
