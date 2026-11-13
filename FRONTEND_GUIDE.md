# Frontend Architecture & Component Guide

This guide covers the MASIDY React frontend structure, client-side routing, pages, role dashboards, reusable components, internationalization, and responsive design system.

---

## Directory Layout

```text
src/
├── App.tsx                             # Root shell: 3-zone header, mobile drawer, toast banner, route switcher, footer
├── main.tsx                            # React root wrapped with <MarketplaceProvider>
├── index.css                           # Tailwind CSS v4 entry + typography & helper utilities
├── context/
│   └── MarketplaceContext.tsx          # Global reactive state, client routing, mutations & localStorage sync
├── data/
│   └── mockMarketplace.ts              # Initial multilingual demo entities across all 8 sectors & 4 roles
├── shared/
│   ├── types.ts                        # Domain TypeScript interfaces & status unions
│   ├── i18n.ts                         # AR / EN / IT UI dictionary, category labels, status labels
│   ├── currency.ts                     # EUR / USD / EGP exchange rates, convertAmount(), formatMoney()
│   └── storage.ts                      # Versioned localStorage load/save/clear + PII sanitization
├── components/
│   ├── BrandMark.tsx                   # SVG MASIDY mark & wordmark
│   ├── PageHeader.tsx                  # Breadcrumbs, page title, subtitle, and responsive action slot
│   ├── ProductCard.tsx                 # Reusable listing card (image, sector badge, favorite toggle, price, CTA)
│   ├── StatusBadge.tsx                 # Color-coded BookingStatusBadge across all 10 booking states
│   ├── ConfirmDialog.tsx               # Accessible confirmation modal (scroll lock, Esc/backdrop dismiss)
│   ├── AuthModal.tsx                   # Login / registration modal with validation & role-specific onboarding
│   ├── MarketplaceView.tsx             # Preserved editorial homepage (hero, category grid, live catalog, partner band)
│   ├── DiscoveryPages.tsx              # SearchResultsPage, CategoryListingPage, ProviderProfilePage, ProductDetailPage
│   ├── BookingAndQuotationPages.tsx    # BookingFlowPage, BookingConfirmationPage, QuotationsPage
│   └── dashboards/
│       ├── DashboardShell.tsx          # Responsive workspace wrapper (mobile role bar + lg+ 260px sidebar)
│       ├── CustomerDashboard.tsx       # Traveler portal (8 tabs)
│       ├── CompanyDashboard.tsx        # Tourism provider portal (9 tabs)
│       ├── SellerDashboard.tsx         # Affiliate marketer portal (8 tabs)
│       └── AdminDashboard.tsx          # Platform operations portal (10 tabs)
```

> **Legacy Unmounted Files**: Earlier prototyping files (`src/components/Workspaces.tsx`, `src/components/ProductDetailModal.tsx`, `src/components/TravelRequestModal.tsx`, and `src/lib/api.ts`) remain in the repository for reference but are **not imported** by `src/App.tsx`.

---

## Client Navigation (`AppRoute`)

Routing is managed in `MarketplaceContext` via `route` and `navigate(next: AppRoute)` without third-party router dependencies, ensuring smooth scroll-to-top and preserved page state when switching languages or currencies.

| Route `page` | Parameters | Rendered View |
| --- | --- | --- |
| `'home'` | — | `MarketplaceView` (homepage with live search, category tiles, featured catalog) |
| `'search'` | `query?`, `category?` | `SearchResultsPage` (multi-facet search, filters, sorting, skeleton state) |
| `'category'` | `category` | `CategoryListingPage` (dedicated landing page for each of the 8 sectors) |
| `'provider'` | `organizationId` | `ProviderProfilePage` (company profile, languages, verified status, published catalog) |
| `'product'` | `productId` | `ProductDetailPage` (gallery, specs, date slot selector, instant/approval indicator, reviews) |
| `'booking'` | `productId`, `date?`, `travelers?` | `BookingFlowPage` (multi-traveler details, slot pricing, affiliate code verification, summary) |
| `'booking-confirmation'` | `bookingId` | `BookingConfirmationPage` (reference code, locked FX snapshot, status badge, next steps) |
| `'quotations'` | `requestId?` | `QuotationsPage` (custom trip request form, incoming quotes list, side-by-side comparison table) |
| `'dashboard'` | `role?`, `tab?` | `DashboardShell` dispatching to the active or requested role workspace |

Deep-linking via URL query parameters is also supported on initial mount (`MarketplaceContext.tsx`):
- `?ref=CODE` stores `activeReferral` (uppercased) for booking attribution.
- `?product=PRODUCT_ID` opens `{ page: 'product', productId }` directly.

---

## Page & Component Inventory

### Core Shared Components
- **`App.tsx`**:
  - **Sticky 3-Zone Header**: Brand mark, 4 single-line desktop nav links (`Explore`, `Search & Sectors`, `Request Quote`, `Dashboard`), single auth/workspace CTA, and `md:hidden` hamburger trigger opening a full slide-over mobile drawer with navigation, auth actions, `ar`/`en`/`it` selector, `EUR`/`USD`/`EGP` selector, 8 sector shortcuts, and confirmed **Reset Demo Data**.
  - **Toast System**: Fixed-shape dismissible banner (`role="status"`, `aria-live="polite"`) supporting `'success'`, `'error'`, and `'info'` variants with auto-timeout cleanup.
  - **Footer**: Multi-column discovery, sector, and role dashboard links alongside desktop/tablet language switcher, currency switcher, and confirmed demo reset.
- **`ConfirmDialog.tsx`**: Replaces native browser dialogs (`window.confirm` / `window.alert` are never used) with an accessible modal (`role="dialog"`, `aria-modal="true"`, Escape & backdrop dismiss, body scroll lock) for destructive actions across the app.
- **`StatusBadge.tsx`**: Renders `BookingStatusBadge` for all 10 `BookingStatus` values (`Draft`, `Pending`, `Awaiting Provider Confirmation`, `Confirmed`, `Rejected`, `Cancelled`, `Completed`, `Refund Pending`, `Refunded`, `Partially Refunded`).
- **`ProductCard.tsx`**: Displays product photography, sector/model metadata, provider link, rating, converted price via `formatMoney()`, synchronized favorite toggle, and booking CTA.

### Marketplace & Checkout Pages
- **`DiscoveryPages.tsx`**:
  - `SearchResultsPage`: Keyword filter, sector chips, pricing model filter, provider filter, max-budget slider/input, instant-booking toggle, sort selector, short skeleton loading feedback on filter transitions (`isFiltering`), and zero-results empty state with Reset Filters + Request Custom Trip CTAs.
  - `CategoryListingPage`: Sector-specific header, sub-filtering, and sorting across any of the 8 `ServiceCategory` values.
  - `ProviderProfilePage`: Company overview, verification badge, languages served, contact links, and published catalog with empty-catalog fallback.
  - `ProductDetailPage`: Interactive date & availability slot picker (`remainingUnits`, `priceOverride`, sold-out guard), traveler count clamp, cancellation policy, review submission form with validation (`>= 5` chars), and related services grid.
- **`BookingAndQuotationPages.tsx`**:
  - `BookingFlowPage`: Validates dates (`checkOutDate >= checkInDate`), checks availability slot capacity, collects per-traveler name/nationality/fictional demo passport ID, validates affiliate referral/coupon codes in real time, and snapshots `exchangeRateAtBooking`.
  - `BookingConfirmationPage`: Displays booking reference (`MSD-...`), `BookingStatusBadge`, traveler roster, pricing breakdown, and navigation to Customer Dashboard.
  - `QuotationsPage`: Custom trip request form (destination, travel date, travelers, budget, currency, requested services checklist) + side-by-side comparison matrix for incoming provider quotations with accept (converts to `Confirmed` booking) or confirmed decline (`ConfirmDialog`).

---

## Role Dashboards (`src/components/dashboards/`)

`DashboardShell.tsx` adapts cleanly across breakpoints:
- **Mobile / Tablet (`< lg`)**: Compact header card + horizontally scrollable / 4-column role switcher + quick marketplace links.
- **Desktop (`lg+`)**: 260px sidebar with active profile, Quick Role Switch grid, discovery shortcuts, and language/currency toggles.

| Dashboard | Tabs (`tab` IDs) | Key Capabilities |
| --- | --- | --- |
| `CustomerDashboard` | `overview`, `profile`, `bookings`, `requests`, `quotations`, `favorites`, `notifications`, `messages` | Filter bookings, confirm cancellations/refund requests, accept/decline quotes, sync favorites, mark notifications read, send provider messages, edit profile |
| `CompanyDashboard` | `overview`, `profile`, `products`, `product-form`, `bookings`, `availability`, `requests`, `staff`, `analytics` | Edit company profile (propagates name across products/bookings/quotes), create/edit/publish services, manage per-date inventory & price overrides, confirm/reject bookings, submit custom quotes, invite staff, track dynamic confirmation rate |
| `SellerDashboard` | `overview`, `discover`, `links`, `performance`, `bookings`, `commissions`, `payouts`, `analytics` | Generate product referral links, copy URLs safely, simulate tracked clicks, monitor referred conversions, inspect active commission rules, request SEPA payouts (blocked when paused/zero balance/pending payout exists) |
| `AdminDashboard` | `overview`, `users`, `companies`, `sellers`, `products`, `bookings`, `commissions`, `finance`, `reports`, `settings` | Moderate/suspend users, verify companies, pause/resume sellers, moderate listings, inspect all bookings, create commission rules, settle payouts (writes immutable ledger entries & notifies seller), configure global settings |

---

## Internationalization & Currency

- **Languages (`src/shared/i18n.ts`)**: `ar` (sets `document.documentElement.dir = 'rtl'`), `en` (`ltr`), and `it` (`ltr`). All localized domain fields use `LocalizedText` (`{ ar, en, it }`).
- **Currencies (`src/shared/currency.ts`)**:
  - Base exchange rates relative to `EUR`: `EUR: 1`, `USD: 1.08`, `EGP: 53.5`.
  - `convertAmount(amount, from, to)` converts consistently across product cards, filters, checkout summaries, and dashboards.
  - `formatMoney(amount, currency)` formats `EUR` (`€1,200.00`), `USD` (`$1,296.00`), and `EGP` (`64,200 EGP`).
- **State Preservation**: Switching language or currency in the footer, mobile drawer, or workspace sidebar updates `MarketplaceContext` without resetting `route`.

---

## Responsive Design Breakpoints

All views and tables follow Tailwind mobile-first breakpoints (`375px`/`390px` mobile, `768px` tablet `sm`/`md`, `1024px+` desktop `lg`/`xl`):
- Grids step progressively (`grid-cols-1 sm:grid-cols-2 lg:grid-cols-3` or `xl:grid-cols-4`).
- Navigation drawers lock background scroll (`document.body.style.overflow = 'hidden'`), close on Escape/backdrop click/destination click, and respect RTL/LTR via logical CSS utilities (`inset-y-0 end-0`, `border-s`, `text-start`).
- Dashboard tab bars and data tables remain operable without page-level horizontal overflow via `overflow-x-auto` wrappers and responsive summary cards.
