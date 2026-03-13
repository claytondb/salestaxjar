# Sails - Task List

Last updated: 2026-03-12 (1:00 AM)

## 🎯 Strategic Focus

**Target:** Very small e-commerce sellers with their own websites
**Platforms:** Shopify, WooCommerce, BigCommerce, Magento, PrestaShop, OpenCart, Ecwid
**NOT pursuing:** Etsy, eBay, Amazon, Gumroad (marketplace facilitators)
**Reconsidering:** Squarespace, Wix (have built-in tax but API code exists)

**Pricing:**
- Free: $0 (50 orders/mo, 1 platform)
- Starter: $9/mo (500 orders/mo, 3 platforms)
- Growth: $29/mo (5,000 orders/mo, unlimited)
- Pro: $79/mo (future, with filing prep)

---

## ✅ Completed

### Core Infrastructure
- [x] Next.js app with Tailwind
- [x] Prisma schema + Neon database
- [x] Authentication (signup, login, sessions)
- [x] Email verification + password reset
- [x] Dashboard layout
- [x] Tax calculator
- [x] Nexus management
- [x] Settings page
- [x] Pricing page structure
- [x] **Order limit enforcement** (2026-02-17) - Usage tracking across all sync routes
- [x] **API Documentation** - docs/API_REFERENCE.md + docs/WOOCOMMERCE_SETUP.md

### Platform Integrations (Backend Complete)
- [x] **Shopify** - OAuth + order sync + full UI
- [x] **Amazon** - Manual CSV import
- [x] **WooCommerce** - REST API keys + WordPress plugin + full UI
- [x] **BigCommerce** - API connect + sync routes + UI modal
- [x] **Magento/Adobe Commerce** - Access token + sync + UI modal
- [x] **PrestaShop** - Webservice API + sync + UI modal
- [x] **OpenCart** - Session API + sync + UI modal
- [x] **Ecwid** - Store ID + token + sync + UI modal
- [x] **Squarespace** - API routes exist (connect + sync + lib), needs UI modal

### SEO & Content (2026-02-27)
- [x] 22 blog posts covering major sales tax topics
- [x] FAQ page with 20+ searchable questions
- [x] Blog search, filters, grid/list toggle
- [x] Social share buttons on all posts
- [x] Featured images + OpenGraph meta tags

---

## 🔥 Phase 1: Launch-Ready (Current Sprint)

### 1. Usage Tracking & Limits ✅ DONE
**Priority:** HIGH - Enables free tier
All items completed 2026-02-17.

### 2. Stripe Billing - New Tiers
**Priority:** HIGH

- [ ] Create Stripe products:
  - Free: $0 (no Stripe needed)
  - Starter: $9/mo
  - Growth: $29/mo
  - Pro: $79/mo (placeholder)
- [ ] Update checkout flow
- [ ] Tier-based feature gating
- [ ] Upgrade prompts when hitting limits

### 3. Squarespace UI Integration ✅ DONE (2026-02-28)
**Priority:** MEDIUM

- [x] Add to `getPlatformConfigurations()` in `src/lib/platforms/index.ts`
- [x] Add Squarespace modal to `PlatformsManager.tsx`
- [ ] Test end-to-end with a Squarespace Commerce Advanced account

### 4. Rebrand to Sails
**Priority:** MEDIUM

- [x] Update app name throughout (package.json, README)
- [x] Update documentation (docs/SETUP.md, AMAZON_SETUP.md, SHOPIFY_SETUP.md)
- [x] Update export filenames and legal text
- [x] **Meta tags & OG images** (2026-03-01) - Dynamic OpenGraph/Twitter images, enhanced metadata
- [ ] New logo/branding
- [ ] Domain: sailstax.com? usesails.com? → Currently sails.tax
- [ ] Update Vercel project name
- [ ] Update cookie names (requires migration for existing users)

---

## 📋 Phase 2: Expand & Polish

### 5. Wix Integration
**Priority:** LOW (Wix has built-in Avalara)

- [ ] Evaluate if worth pursuing given built-in tax
- [ ] Wix Stores API integration if proceeding
- [ ] Order sync

### 6. Improved Onboarding
- [ ] Welcome wizard for new signups
- [ ] Platform connection prompts
- [ ] "What do you sell?" product type selection
- [ ] State selection with nexus explanation

### 7. Nexus Threshold Tracking ✅ MOSTLY DONE
**Status:** Core system implemented, needs user testing

- [x] Track sales per state from imported orders (`src/lib/sales-aggregation.ts`)
- [x] Alert when approaching $100K or 200 transactions (`src/lib/nexus-alerts.ts`)
- [x] 51 state thresholds with measurement periods (`src/lib/nexus-thresholds.ts`)
- [x] Beautiful dashboard showing exposure by state (`src/components/NexusExposure.tsx`)
- [x] Email alerts for threshold crossings (`src/lib/email-alerts.ts`)
- [x] API routes for exposure data + alerts (`/api/nexus/exposure`, `/api/nexus/alerts`)
- [x] Notification preferences (enable/disable nexus alerts)
- [x] **Registration guidance links per state** (2026-03-02) - Direct links to official state portals

### 8. Reports & Exports ✅ MOSTLY DONE (2026-03-01)
- [x] Sales by state report (`/dashboard/reports`)
- [x] CSV export (summary + detailed orders)
- [ ] Tax liability report (nice-to-have)
- [ ] Filing-ready summaries (future)

---

## 📝 Phase 3: Filing Preparation (Future)

### 9. Filing Calendar
- [ ] Auto-generate filing deadlines per nexus state
- [ ] Reminder emails (7 days, 1 day before)
- [ ] "Mark as filed" with confirmation tracking

### 10. Filing Prep Reports
- [ ] State-specific report formats
- [ ] Pre-calculated totals matching state forms
- [ ] PDF generation with form field mapping
- [ ] Clear disclaimers ("review before submitting")

### 11. Filing Partnership (Optional)
- [ ] Partner with licensed filing service
- [ ] "One-click file" sends data to partner
- [ ] Revenue share model

---

## 🔧 Technical Debt / Ongoing

- [ ] Connect frontend to all database APIs (AuthContext cleanup)
- [x] Email system setup (Resend) — templates built, just needs `RESEND_API_KEY` env var
- [ ] Tax rate API integration (or build own rate database)
- [x] **Unit testing framework** (2026-03-11) - Vitest setup, now 1472 passing tests:
  - nexus-thresholds.ts (18 tests)
  - state-registration-urls.ts (9 tests)
  - plans.ts (65 tests) - comprehensive billing/tier logic coverage
  - sales-aggregation.ts (17 tests) - getMonthRange date calculations
  - nexus-alerts.ts (21 tests) - alert levels, message generation
  - usage.ts (13 tests) - usage tracking and limits
  - security.ts (50 tests) - password hashing, validation, rate limiting, encryption
  - email-alerts.ts (40 tests) - currency formatting, alert config, email templates
  - apikeys.ts (35 tests) - key generation, hashing, validation, revocation
  - ratelimit.ts (25 tests) - in-memory fallback, rate limit isolation, window resets
  - auth.ts (64 tests) - password hashing, JWT, session management
  - taxjar.ts (36 tests) - tax calculation, state rates, category modifiers
  - platforms/index.ts (18 tests) - platform configuration, supported integrations
  - platforms/shopify.ts (22 tests) - OAuth URL generation, type validation, data handling
  - platforms/woocommerce.ts (37 tests) - URL normalization, order mapping, type validation
  - platforms/bigcommerce.ts (43 tests) - credential types, order mapping, status mapping, edge cases
  - platforms/ecwid.ts (49 tests) - credential types, order mapping, status mapping, tax breakdown, edge cases
  - platforms/magento.ts (52 tests) - credential types, order mapping, status transitions, tax breakdown, URL normalization
  - platforms/prestashop.ts (53 tests) - credential types, order mapping, all 12 status states, entity fetches, tax calculations
  - platforms/opencart.ts (74 tests) - credential types, order mapping, all 16 status states, tax calculations, line items
  - platforms/squarespace.ts (56 tests) - credential types, order mapping, fulfillment status, line items, tax breakdown
  - platforms/amazon.ts (40 tests) - SP-API OAuth, token exchange, order fetching, type validation
  - platforms/etsy.ts (44 tests) - PKCE OAuth flow, receipts, transactions, type validation
  - stripe.ts (37 tests) - plan configuration, tier logic, upgrade detection
  - blog.ts (15 tests) - blog post loading, parsing, slug generation
  - data/taxRates.ts (40 tests) - state tax rates data validation, calculations, lookup functions
  - email.ts (29 tests) - URL construction, date formatting, currency formatting, urgency levels
  - env.ts (20 tests) - environment configuration, service availability, validateEnv
  
  **Platform Integration Test Coverage: 10/10 platforms complete! ✅**
  - Shopify ✅ | WooCommerce ✅ | BigCommerce ✅ | Ecwid ✅
  - Magento ✅ | PrestaShop ✅ | OpenCart ✅ | Squarespace ✅
  - Amazon ✅ | Etsy ✅
  
  **API Route Tests (2026-03-11):**
  - api/rates/route.ts (42 tests) - all states, single state lookup, no-tax filter, highest filter, edge cases
  - api/calculate/route.ts (44 tests) - tax calculations, validation, state-specific logic
  - api/auth/login/route.ts (24 tests) - login flow, rate limiting, validation, error handling
  - api/auth/signup/route.ts (31 tests) - registration flow, validation, beta users, error handling
  - api/auth/logout/route.ts (26 tests) - logout flow, session invalidation, error handling, security
  - api/auth/me/route.ts (27 tests) - current user endpoint, subscription data, beta user status
  - api/auth/delete-account/route.ts (26 tests) - account deletion, Stripe cleanup, data cascade
  
- [x] **Email API route tests** (2026-03-12) - forgot-password, reset-password, send-verification, verify (68 tests)
- [x] **Stripe checkout session tests** (2026-03-12) - create-checkout-session route (23 tests)
- [x] **Additional Stripe API route tests** (2026-03-12) - webhook, cancel-subscription, update-subscription, create-portal-session (65 tests)
- [x] **TypeScript test errors fixed** (2026-03-12) - All test mock objects updated to match current Prisma/auth types; zero TS errors, all 1387 tests passing
- [x] **Nexus, Usage, API Keys route tests** (2026-03-12) - nexus GET/POST/PUT (35 tests), usage GET (28 tests), keys GET/POST (22 tests) — 1472 total
- [x] **Notifications and Calculations route tests** (2026-03-13) - notifications GET/PUT (20 tests), calculations GET/POST/DELETE (50 tests) — 1542 total
- [x] **Reports and Nexus Exposure/Alerts route tests** (2026-03-13) - reports/sales-by-state GET (29 tests), reports/export GET (35 tests), nexus/alerts GET+PUT (22 tests), nexus/exposure GET (16 tests) — 1642 total
- [x] **Business, Keys/[id], Calculations Summary, Filings route tests** (2026-03-13) - business CRUD (48 tests), keys/[id] DELETE+PATCH (25 tests), calculations/summary GET (30 tests), filings GET/POST/PUT (30 tests) — 1775 total
- [ ] Error handling improvements
- [ ] Mobile responsive fixes

---

## 📊 Progress

| Area | Status |
|------|--------|
| Core Infrastructure | 95% |
| Auth | 100% |
| Database | 95% |
| Shopify | 100% ✅ |
| WooCommerce | 100% ✅ |
| BigCommerce | 95% (UI done, needs testing) |
| Magento | 95% (UI done, needs testing) |
| PrestaShop | 95% (UI done, needs testing) |
| OpenCart | 95% (UI done, needs testing) |
| Ecwid | 95% (UI done, needs testing) |
| Squarespace | 95% (UI done, needs testing) |
| Wix | 0% (deprioritized) |
| Billing/Stripe | 70% (needs real Stripe products) |
| Usage Limits | 100% ✅ |
| SEO Content | 90% ✅ |
| Documentation | 90% |
| Nexus Tracking | 90% ✅ |
| Email System | 85% (templates done, needs Resend key) |
| Filing Prep | 0% |

**Overall:** ~84% to MVP launch
