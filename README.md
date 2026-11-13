# MASIDY Travel Marketplace

**MASIDY** is a multi-vendor B2C/B2B2C travel marketplace connecting travelers, tourism providers/companies, affiliate sellers/marketers, and platform operations within a unified multilingual (`ar` RTL, `en` LTR, `it` LTR) and multi-currency (`EUR`, `USD`, `EGP`) frontend application.

> **Current Stage**: Complete interactive frontend with client-side demo state & `localStorage` persistence (`masidy_marketplace_demo_state`, v1). Backend persistence, live payments, and external supplier APIs are not connected in this frontend build (see [BACKEND_INTEGRATION.md](./BACKEND_INTEGRATION.md) and [KNOWN_ISSUES.md](./KNOWN_ISSUES.md)).

---

## Key Capabilities

- **8 Travel Sectors**: Flights (`flights`), Hotels & Stays (`hotels`), Tours & Activities (`tours`), Transfers (`transport`), Car Rentals (`car_rentals`), Cruises & Ferries (`cruises`), Hajj & Umrah (`hajj_umrah`), and Travel Packages & Visas (`visas_packages`).
- **3 Commercial Pricing Models**:
  - `fixed` — Instant or scheduled fixed per-traveler/unit pricing.
  - `availability` — Date-slot inventory with per-date capacity (`remainingUnits`) and optional `priceOverride`.
  - `request` — Bespoke trip requests with multi-company competitive quotations and side-by-side comparison.
- **4 Dedicated Role Workspaces**:
  - **Customer**: Overview, profile, bookings, trip requests, quotations comparison, favorites, notifications, and messaging.
  - **Company / Provider**: Overview, organization profile, catalog CRUD, availability & pricing calendar, booking confirmations/rejections, quotation builder, staff permissions, and sales analytics (100% free partner onboarding).
  - **Seller / Affiliate**: Service discovery, referral/coupon link generation (`?product=...&ref=...`), click simulation, referred booking tracking, commission analytics, and payout requests.
  - **Platform Admin**: Platform overview, user/company/seller moderation, product publishing controls, commission rule engine, immutable financial ledger & payout settlement, reporting, and platform settings.
- **Multilingual & Multi-Currency**:
  - Instant switching between Arabic (`ar` with `dir="rtl"`), English (`en` with `dir="ltr"`), and Italian (`it` with `dir="ltr"`) while preserving the active page/route.
  - Live currency conversion (`EUR` base, `USD` `1.08`, `EGP` `53.5`) with locked FX snapshot at booking creation (`exchangeRateAtBooking`).
- **Responsive Mobile, Tablet & Desktop UX**:
  - Tested layout structure across mobile (`375px`/`390px`), tablet (`768px`), and desktop (`1024px+`), including slide-over mobile drawer navigation, compact dashboard switchers, and accessible confirmation dialogs.

---

## Tech Stack

| Layer | Technology |
| --- | --- |
| UI Framework | React 19 (`react`, `react-dom`) + TypeScript |
| Styling | Tailwind CSS v4 (`@tailwindcss/vite`) |
| Icons | `lucide-react` |
| Motion | `motion` |
| Build Tool | Vite 8 |
| Runtime Server | Express 4 + `tsx` serving port `3000` (`server.ts`) |
| State & Persistence | React Context (`MarketplaceContext`) + versioned `localStorage` |

---

## Prerequisites & Setup

- **Node.js**: v20+ (tested with `@types/node` v22)
- **npm**: v10+

```bash
# 1. Install dependencies
npm install

# 2. Start development server on http://localhost:3000
npm run dev

# 3. Type-check and build production bundle
npm run lint
npm run build

# 4. Run production server
npm start
```

### Package Scripts

| Script | Command | Purpose |
| --- | --- | --- |
| `dev` | `tsx server.ts` | Starts Express + Vite middleware dev server on port `3000`. |
| `build` | `vite build` | Builds static client bundle into `dist/`. |
| `start` | `node server.ts` | Runs server entry point. |
| `preview` | `vite preview` | Previews built Vite output. |
| `lint` | `tsc --noEmit` | Runs strict TypeScript type-checking. |
| `clean` | `rm -rf dist server.js` | Removes build artifacts. |

---

## Demo Accounts & Quick Role Switching

Open **Sign In** in the header (or use the **Quick Role Switch** in any dashboard sidebar/mobile bar):

| Role | Name | Email | Demo Password | Scope |
| --- | --- | --- | --- | --- |
| `customer` | ليلى المنصور | `customer@masidy.com` | any `>= 6` chars (e.g. `masidy123`) | Bookings, requests, quotes, favorites |
| `provider` | طارق العوضي | `provider@masidy.com` | any `>= 6` chars | `Mediterranean Horizons Travel` |
| `seller` | Marco Rossi | `seller@masidy.com` | any `>= 6` chars | Referral code `MARCO39`, coupon `MSDMARCO39` |
| `admin` | إدارة عمليات Masidy | `admin@masidy.com` | any `>= 6` chars | Full marketplace moderation & ledger |

> New accounts can also be registered in the Auth modal (customers, free-plan tourism companies, or affiliate sellers). Demo mutations persist locally in your browser and can be restored anytime via **Reset Demo Data** in the footer or mobile drawer.

---

## Project Documentation

- [FRONTEND_GUIDE.md](./FRONTEND_GUIDE.md) — Routing state machine, page inventory, reusable UI components, dashboards, i18n, and responsive patterns.
- [MOCK_DATA_GUIDE.md](./MOCK_DATA_GUIDE.md) — Seed entities, `MarketplaceContext` reactive mutations, `localStorage` persistence schema, sanitization, and recovery behavior.
- [BACKEND_INTEGRATION.md](./BACKEND_INTEGRATION.md) — Architecture and API contract guide for wiring real authentication, inventory, commissions, ledger, and notifications.
- [KNOWN_ISSUES.md](./KNOWN_ISSUES.md) — Current frontend-only limitations, existing scaffolded server routes, and technical handover notes.
