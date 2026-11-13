# Known Limitations & Handover Notes

This document records the intentional scope boundaries and known technical debt of the current **MASIDY Travel Marketplace** frontend build prior to backend integration.

---

## 1. Frontend-Only Scope & Simulated Flows

- **Mock Authentication (`AuthModal.tsx` & `MarketplaceContext.tsx`)**:
  - Signing in checks only whether the email exists in the `users` list and validates password length (`>= 6` chars) locally. Passwords are not hashed or verified against a server, and Quick Role Switch lets reviewers inspect any role (`customer`, `provider`, `seller`, `admin`) without credentials.
- **No Real Payment Processing**:
  - `BookingFlowPage` simulates booking checkout and immediately creates `'Confirmed'` (for `instantBooking: true`) or `'Awaiting Provider Confirmation'` records without charging cards, issuing 3DS challenges, or integrating Stripe/PayPal/SEPA gateways.
  - Admin payout settlement (`settlePayout`) updates in-app balances and ledger records without executing real bank transfers.
- **Single-Browser `localStorage` Persistence**:
  - State persists across refreshes inside one browser profile under `masidy_marketplace_demo_state` (`STORAGE_VERSION = 1`). Changes do not sync across devices, tabs in real time, or different browsers.
  - Clearing browser site data or clicking **Reset Demo Data** restores `src/data/mockMarketplace.ts` defaults.
- **Fictional PII Placeholders**:
  - Per security guidelines, real passport numbers, passwords, and card details are never stored. User-entered passport fields are sanitized into `DEMO-DOC-...` tokens by `sanitizePassportForStorage()` in `src/shared/storage.ts`.

---

## 2. Client-Side Routing & Deep-Linking Caveats

- Client routing is stored in React state (`AppRoute` in `MarketplaceContext.tsx`) rather than `window.history.pushState` / URL path segments.
  - **Impact**: Browser Back/Forward buttons do not step between internal views, and refreshing the page returns to `{ page: 'home' }` (unless `?product=<id>` is in the URL query string), while preserving all persisted data, active user session, language, currency, and referral code.
- Referral attribution (`?ref=CODE`) is read on initial mount into `activeReferral` state and can also be triggered in `SellerDashboard` via **Simulate Click**; there is no server-side anti-fraud click deduplication.

---

## 3. Financial & Currency Approximations

- **Static Demo FX Rates (`src/shared/currency.ts`)**:
  - Exchange rates (`EUR = 1`, `USD = 1.08`, `EGP = 53.5`) are static constants rather than live ECB/FX feeds.
- **Quotation Conversion Margin Heuristic**:
  - When a customer accepts a custom quotation (`respondToQuotation(id, 'accept')`), `providerCost` is estimated at `72%` of `quotedPrice` because quotations currently capture customer-facing line items (`QuotationItem[]`) without a separate internal provider cost breakdown field.

---

## 4. UI & Codebase Technical Debt

- **Wide Financial & Admin Tables on Mobile**:
  - Primary booking cards, product grids, forms, and dashboard navigation adapt responsively at `375px`/`390px`/`768px`/`1024px+`, while dense multi-column admin/company tables (e.g., immutable ledger entries and comparison matrices) rely on `overflow-x-auto` horizontal scroll containers on narrow screens.
- **Unused Earlier Scaffold Files in Repository**:
  - The workspace contains unmounted files from an earlier full-stack scaffold (`server.ts`, `server/`, `src/lib/api.ts`, `src/components/Workspaces.tsx`, `src/components/ProductDetailModal.tsx`, `src/components/TravelRequestModal.tsx`).
  - `server.ts` still boots Vite middleware on port `3000` for serving the SPA, while its `/api/*` endpoints and `server/*` modules are **not invoked** by the active React frontend (`src/main.tsx` -> `MarketplaceProvider`). They should either be upgraded and wired during backend integration or pruned if using an external backend service.
- **No Automated Unit/E2E Test Suite**:
  - Verification relies on TypeScript compilation (`npm run lint`), Vite production bundling (`npm run build`), and manual/browser verification rather than Jest/Vitest/Playwright suites.
