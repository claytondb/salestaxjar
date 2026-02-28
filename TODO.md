# Sails - Task List

Last updated: 2026-02-28

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

### 3. Squarespace UI Integration
**Priority:** MEDIUM (API done, needs UI)

Backend code exists at:
- `src/app/api/platforms/squarespace/connect/route.ts`
- `src/app/api/platforms/squarespace/sync/route.ts`
- `src/lib/platforms/squarespace.ts`

Remaining:
- [ ] Add to `getPlatformConfigurations()` in `src/lib/platforms/index.ts`
- [ ] Add Squarespace modal to `PlatformsManager.tsx`
- [ ] Test end-to-end with a Squarespace Commerce Advanced account

### 4. Rebrand to Sails
**Priority:** MEDIUM

- [x] Update app name throughout (package.json, README)
- [x] Update documentation (docs/SETUP.md, AMAZON_SETUP.md, SHOPIFY_SETUP.md)
- [x] Update export filenames and legal text
- [ ] New logo/branding
- [ ] Domain: sailstax.com? usesails.com? → Currently sails.tax
- [ ] Update Vercel project name
- [ ] Update meta tags, OG images
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

### 7. Nexus Threshold Tracking
- [ ] Track sales per state from imported orders
- [ ] Alert when approaching $100K or 200 transactions
- [ ] "You may have nexus in California" notifications
- [ ] Registration guidance per state

### 8. Reports & Exports
- [ ] Sales by state report
- [ ] Tax liability report
- [ ] CSV export
- [ ] Filing-ready summaries

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
- [ ] Email system setup (Resend)
- [ ] Tax rate API integration (or build own rate database)
- [ ] Unit tests for API routes
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
| Squarespace | 70% (API done, needs UI) |
| Wix | 0% (deprioritized) |
| Billing/Stripe | 20% |
| Usage Limits | 100% ✅ |
| SEO Content | 90% ✅ |
| Documentation | 85% |
| Filing Prep | 0% |

**Overall:** ~75% to MVP launch
