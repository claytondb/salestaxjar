# Sails - Task List

Last updated: 2026-01-29

## 🎯 Strategic Focus

**Target:** Very small e-commerce sellers with their own websites
**Platforms:** Shopify, WooCommerce, Squarespace, BigCommerce, Wix
**NOT pursuing:** Etsy, eBay, Amazon, Gumroad (marketplace facilitators)

**Pricing:**
- Free: $0 (50 orders/mo, 1 platform)
- Starter: $9/mo (500 orders/mo, 3 platforms)
- Growth: $29/mo (5,000 orders/mo, unlimited)
- Pro: $79/mo (future, with filing prep)

---

## ✅ Completed

- [x] Next.js app with Tailwind
- [x] Prisma schema + Neon database
- [x] Authentication (signup, login, sessions)
- [x] Email verification + password reset
- [x] Shopify OAuth integration
- [x] Amazon manual CSV import
- [x] API routes (business, nexus, filings, calculations, notifications)
- [x] Dashboard layout
- [x] Tax calculator
- [x] Nexus management
- [x] Settings page
- [x] Pricing page structure

---

## 🔥 Phase 1: Launch-Ready (Current Sprint)

### 1. Usage Tracking & Limits
**Priority:** HIGH - Enables free tier

- [ ] Add `orderCount` tracking per user per month
- [ ] Add `platformCount` per user
- [ ] Create usage check middleware
- [ ] Show usage in dashboard ("42 of 50 orders used")
- [ ] Soft limit warnings at 80%
- [ ] Hard limit enforcement at 100%

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

### 3. WooCommerce Integration
**Priority:** HIGH - Biggest pain point market

WooCommerce uses per-store REST API keys (no central OAuth):
- [ ] UI for entering store URL + API keys
- [ ] Key validation endpoint
- [ ] Order fetch via WooCommerce REST API
- [ ] Map orders to ImportedOrder model
- [ ] Sync status tracking

### 4. Squarespace Integration  
**Priority:** HIGH - No good tax tools exist

Squarespace has Commerce API:
- [ ] OAuth flow (or API key entry)
- [ ] Order/transaction fetch
- [ ] Map to ImportedOrder model

### 5. Rebrand to Sails
**Priority:** MEDIUM

- [ ] Update app name throughout
- [ ] New logo/branding
- [ ] Domain: sailstax.com? usesails.com?
- [ ] Update Vercel project name
- [ ] Update meta tags, OG images

---

## 📋 Phase 2: Expand & Polish

### 6. BigCommerce Integration
- [ ] OAuth flow
- [ ] Order sync

### 7. Wix Integration
- [ ] Wix Stores API integration
- [ ] Order sync

### 8. Improved Onboarding
- [ ] Welcome wizard for new signups
- [ ] Platform connection prompts
- [ ] "What do you sell?" product type selection
- [ ] State selection with nexus explanation

### 9. Nexus Threshold Tracking
- [ ] Track sales per state from imported orders
- [ ] Alert when approaching $100K or 200 transactions
- [ ] "You may have nexus in California" notifications
- [ ] Registration guidance per state

### 10. Reports & Exports
- [ ] Sales by state report
- [ ] Tax liability report
- [ ] CSV export
- [ ] Filing-ready summaries

---

## 📝 Phase 3: Filing Preparation (Future)

### 11. Filing Calendar
- [ ] Auto-generate filing deadlines per nexus state
- [ ] Reminder emails (7 days, 1 day before)
- [ ] "Mark as filed" with confirmation tracking

### 12. Filing Prep Reports
- [ ] State-specific report formats
- [ ] Pre-calculated totals matching state forms
- [ ] PDF generation with form field mapping
- [ ] Clear disclaimers ("review before submitting")

### 13. Filing Partnership (Optional)
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

## 🌐 Environment Variables Needed

```env
# Auth
AUTH_SECRET=<generate>

# Database (Vercel/Neon auto-sets)
DATABASE_URL=
DIRECT_URL=

# Email
RESEND_API_KEY=
FROM_EMAIL=Sails <hello@usesails.com>

# Stripe (new tiers)
STRIPE_SECRET_KEY=
STRIPE_PUBLISHABLE_KEY=
STRIPE_WEBHOOK_SECRET=
STRIPE_PRICE_STARTER=price_xxx
STRIPE_PRICE_GROWTH=price_xxx
STRIPE_PRICE_PRO=price_xxx

# Shopify (done)
SHOPIFY_API_KEY=
SHOPIFY_API_SECRET=

# WooCommerce - per-store keys stored in DB

# Squarespace
SQUARESPACE_CLIENT_ID=
SQUARESPACE_CLIENT_SECRET=

# BigCommerce
BIGCOMMERCE_CLIENT_ID=
BIGCOMMERCE_CLIENT_SECRET=

# Wix
WIX_CLIENT_ID=
WIX_CLIENT_SECRET=

# App
NEXT_PUBLIC_APP_URL=https://usesails.com
```

---

## 📊 Progress

| Area | Status |
|------|--------|
| Core Infrastructure | 90% |
| Auth | 100% |
| Database | 95% |
| Shopify | 80% |
| WooCommerce | 0% |
| Squarespace | 0% |
| BigCommerce | 0% |
| Wix | 0% |
| Billing/Stripe | 20% |
| Usage Limits | 0% |
| Filing Prep | 0% |

**Overall:** ~50% to MVP launch
