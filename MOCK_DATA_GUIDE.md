# Mock Data & Local Persistence Guide

This document details the initial demo dataset, reactive state mutations in `MarketplaceContext`, financial/affiliate consistency rules, and the versioned `localStorage` persistence layer.

---

## Seed Dataset (`src/data/mockMarketplace.ts`)

When no valid saved state exists in `localStorage`, the app hydrates from `createDefaultPersistedState()` using the following seeded collections:

| Exported Constant | Summary of Seed Records |
| --- | --- |
| `INITIAL_USERS` | 7 accounts across all 4 roles (`customer@masidy.com`, `omar@traveler.example`, `provider@masidy.com`, `nile@masidy.com`, `seller@masidy.com`, `sara@affiliates.example`, `admin@masidy.com`). |
| `INITIAL_ORGANIZATIONS` | 3 verified free-plan companies: `Mediterranean Horizons Travel` (`Rome`), `Nile & Haramain Voyages` (`Cairo`), and `Alpine & Gulf Mobility` (`Dubai`). |
| `INITIAL_ORG_MEMBERS` | Organization owners, managers, and agents with role-scoped permission arrays (`catalog:write`, `bookings:confirm`, `quotations:send`, `staff:manage`, `finance:read`). |
| `INITIAL_SELLERS` | 2 affiliate partners (`Marco Rossi` / `MARCO39`, `سارة السبيعي` / `SARA18`) with click/conversion counters and pending/settled EUR balances. |
| `INITIAL_PRODUCTS` | Multi-sector catalog covering all 8 `ServiceCategory` slugs and all 3 `ProductModel` types (`fixed`, `availability`, `request`), with trilingual (`ar`/`en`/`it`) copy and photography in `src/assets/images/`. |
| `INITIAL_AVAILABILITY_SLOTS` | Date-level remaining unit inventory and optional `priceOverride` entries linked to `productId`. |
| `INITIAL_AFFILIATE_LINKS` | Pre-seeded tracking links (`/?product=...&ref=...`) with clicks, conversions, and EUR earnings. |
| `INITIAL_COMMISSION_RULES` | Prioritized rules (`organization` > `category` > `global`) defining `platformPercent`, `sellerPercent`, and `fixedFeeEur`. |
| `INITIAL_BOOKINGS` | Pre-seeded sample bookings across statuses (`Confirmed`, `Awaiting Provider Confirmation`, `Completed`, etc.) with `commissionSnapshot` and `statusHistory`. |
| `INITIAL_TRAVEL_REQUESTS` & `INITIAL_QUOTATIONS` | Sample custom trip requests paired with competing provider quotations for comparison & conversion testing. |
| `INITIAL_LEDGER_ENTRIES` & `INITIAL_PAYOUTS` | Immutable financial ledger records and pending/settled partner payouts. |
| `INITIAL_REVIEWS`, `INITIAL_TICKETS`, `INITIAL_AUDIT_LOGS`, `INITIAL_NOTIFICATIONS`, `INITIAL_MESSAGES`, `INITIAL_PLATFORM_SETTINGS` | Supporting reviews, support tickets, audit trail entries, trilingual notifications, customer-provider chat threads, and global settings. |

---

## `localStorage` Persistence (`src/shared/storage.ts`)

### Storage Configuration
- **Key**: `masidy_marketplace_demo_state` (`STORAGE_KEY`)
- **Schema Version**: `1` (`STORAGE_VERSION`)
- **Persisted Envelope (`PersistedMarketplaceState`)**:
  - Metadata: `version`, `updatedAt`
  - User Preferences: `lang`, `currency`, `activeReferral`, `activeUserId`, `platformSettings`
  - Collections: `users`, `organizations`, `orgMembers`, `sellers`, `products`, `availabilitySlots`, `affiliateLinks`, `bookings`, `travelRequests`, `quotations`, `commissionRules`, `ledgerEntries`, `payouts`, `reviews`, `tickets`, `auditLogs`, `notifications`, `messages`, `favoriteIds`

### Lifecycle & Corruption Recovery
1. **Hydration (`loadPersistedState`)**:
   - Reads `window.localStorage.getItem(STORAGE_KEY)` once during `MarketplaceProvider` initialization.
   - Returns `{ status: 'empty', state }` if storage is missing or SSR/restricted.
   - Validates JSON structure, checks `parsed.version === STORAGE_VERSION`, validates `lang` and `currency` against allowed enums, and guards every array field with `safeArray()`.
   - If JSON parsing fails, the root payload is non-object, or `version !== STORAGE_VERSION`, `loadPersistedState()` clears the broken entry, falls back to `createDefaultPersistedState()`, and returns `{ status: 'corrupted', state }`.
   - When `status === 'corrupted'`, `MarketplaceProvider` displays an informational toast notifying the user that local demo state was safely restored to defaults.
2. **Automatic Sync (`savePersistedState`)**:
   - Any mutation to preferences, active session ID, or domain entities triggers a React `useEffect` saving the updated envelope to `localStorage`.
3. **Demo Reset (`resetDemoData`)**:
   - Triggered behind a `ConfirmDialog` in the footer or mobile drawer; calls `clearPersistedState()`, resets all React state slices to `createDefaultPersistedState()`, returns route to `'home'`, and displays a confirmation toast.

### Security & Privacy Sanitization Rules
**No real passwords, payment card details, or real passport numbers are ever stored in `localStorage`.**
- `AuthModal.tsx` handles password validation locally in component state during login/registration and never passes passwords into `MarketplaceContext` or `storage.ts`.
- `sanitizeUsers()` explicitly deletes any `password`, `passwordHash`, `paymentMethod`, or `cardNumber` keys before storage.
- `sanitizePassportForStorage()` rewrites any user-entered passport/ID field into a fictional `DEMO-DOC-...` placeholder token both when reading and when writing `users[].passportNo` and `bookings[].travelers[].passportNumber`. Seeded demo records likewise use `DEMO-DOC-01`.

---

## Cross-Page State Consistency Rules (`MarketplaceContext.tsx`)

All interactive flows update shared context state synchronously so every view stays consistent:

1. **Booking Creation (`createBooking`)**:
   - Resolves unit price from matching `AvailabilitySlot.priceOverride ?? product.price` and scales `providerCost` proportionally.
   - Decrements matching slot `remainingUnits` (`Math.max(0, remainingUnits - travelersCount)`).
   - Locks `exchangeRateAtBooking` and computes `CommissionSnapshot` via the most specific active `CommissionRule` (`organization` > `category` > `global`).
   - Credits active non-paused seller when `affiliateCode` or `activeReferral` matches `referralCode` or `couponCode`.
   - If `product.instantBooking` is true, creates booking as `'Confirmed'` and executes `applyBookingConfirmationEffects(booking)` immediately.
2. **Idempotent Financial & Affiliate Settlement (`applyBookingConfirmationEffects`)**:
   - Triggered on instant `Confirmed` bookings, provider/admin confirmation via `updateBookingStatus(id, 'Confirmed')`, and quotation acceptance via `respondToQuotation(id, 'accept')`.
   - Guards against duplicate ledger writes by checking existing `provider_payable` entries for `booking.id`.
   - Appends immutable `provider_payable`, `platform_fee`, and (if attributed) `seller_commission` entries to `ledgerEntries`.
   - Increments `sellers[].totalConversions`, `sellers[].pendingBalanceEur`, and the matching `affiliateLinks[]` record's `conversions` + `earnedEur`.
3. **Cancellation / Refund Reversal (`applyBookingRefundOrCancelEffects`)**:
   - Triggered when a booking transitions to `'Cancelled'`, `'Refunded'`, or `'Rejected'`.
   - Restores `travelersCount` back to matching `AvailabilitySlot.remainingUnits` and sets `available: true`.
   - If previously confirmed in ledger (and not yet refunded), appends a negative immutable `'refund'` ledger entry and deducts `sellerCommissionEur` from `sellers[].pendingBalanceEur` (clamped at `0`).
4. **Company Catalog & Profile Propagation**:
   - `saveProduct()` inserts or updates products immediately across homepage, search, sector pages, provider profile, and seller discovery.
   - `updateOrganizationProfile()` propagates `organization.name` edits across linked `products`, `bookings`, and `quotations`.
5. **Payouts & Notifications**:
   - `requestSellerPayout()` blocks requests if the seller is `'paused'`, has `pendingBalanceEur <= 0`, or already has a `'Pending'` payout.
   - `settlePayout()` transitions payout to `'Settled'`, transfers balance from `pendingBalanceEur` to `settledBalanceEur`, records a negative `payout_settlement` ledger entry, and dispatches a notification to the seller's user account.
   - Bookings, status transitions, custom trip requests, incoming quotations, and settled payouts automatically append trilingual `NotificationItem` records and `AuditLog` entries.
