# SalesTaxJar - Remaining Tasks

Last updated: 2026-01-28

## ✅ Completed
- [x] Basic Next.js app with Tailwind
- [x] Prisma schema with all models
- [x] Neon database connected via Vercel Storage
- [x] Authentication system (signup, login, logout, sessions)
- [x] Email verification flow with Resend
- [x] Password reset flow
- [x] Shopify OAuth integration
- [x] Amazon manual CSV import
- [x] API routes for business, nexus, filings, calculations, notifications
- [x] Basic dashboard layout
- [x] Tax calculator page
- [x] Nexus management page
- [x] Settings page structure
- [x] Pricing page

---

## 🔄 In Progress / High Priority

### 1. Connect Frontend to Database APIs
**Status:** AuthContext still uses localStorage for most data
**Files:** `src/context/AuthContext.tsx`

**Steps:**
1. Update `refreshUser()` to fetch business profile from `/api/business`
2. Fetch nexus states from `/api/nexus` on login
3. Fetch filings from `/api/filings`
4. Fetch calculations from `/api/calculations`
5. Fetch notification prefs from `/api/notifications`
6. Fetch platform connections from `/api/platforms`
7. Update all `update*` methods to call corresponding API endpoints
8. Remove localStorage fallback for authenticated users

### 2. Stripe Billing Integration
**Status:** API routes exist but not connected to real Stripe
**Files:** `src/app/api/stripe/*.ts`, `.env.local`

**Steps:**
1. Create Stripe account & get API keys
2. Create products/prices in Stripe for Starter ($29), Growth ($79), Enterprise ($199)
3. Set environment variables:
   - `STRIPE_SECRET_KEY`
   - `STRIPE_PUBLISHABLE_KEY`
   - `STRIPE_WEBHOOK_SECRET`
4. Set up webhook endpoint in Stripe dashboard → `https://salestaxjar.vercel.app/api/stripe/webhook`
5. Test checkout flow
6. Test portal session (manage subscription)
7. Test webhook events (subscription.created, updated, deleted, payment_failed)

### 3. Email System Setup
**Status:** Code ready, needs Resend configuration
**Files:** `.env.local`, `src/lib/email.ts`

**Steps:**
1. Create Resend account at resend.com
2. Verify domain `salestaxjar.com` (or use test email for now)
3. Get API key
4. Set `RESEND_API_KEY` in Vercel environment variables
5. Set `FROM_EMAIL=SalesTaxJar <noreply@salestaxjar.com>`
6. Test welcome email on signup
7. Test password reset email
8. Test verification email

---

## 📋 Medium Priority

### 4. Tax Rate API Integration
**Status:** Calculator uses hardcoded rates
**Files:** `src/lib/tax-rates.ts`, `src/app/api/tax/*.ts`

**Options:**
- TaxJar API (requires subscription, most accurate)
- Avalara API (enterprise)
- Free tax rate lookup (less accurate)

**Steps:**
1. Decide on tax rate provider
2. Sign up and get API credentials
3. Implement rate lookup in `src/lib/tax-rates.ts`
4. Add `TAXJAR_API_KEY` or equivalent to env
5. Update `/api/tax/rates` to use real API
6. Cache rates in `TaxRateCache` table to reduce API calls

### 5. Orders Import from Platforms
**Status:** Shopify OAuth works, need order sync
**Files:** `src/app/api/integrations/shopify/*.ts`, `src/lib/platforms/shopify.ts`

**Steps:**
1. Implement `GET /api/integrations/shopify/orders` to fetch orders
2. Create sync job that runs periodically
3. Map Shopify orders to `ImportedOrder` model
4. Calculate tax from orders and populate `SalesSummary`
5. Add manual sync button in UI
6. Add last sync timestamp display

### 6. Filing Calendar & Reminders
**Status:** Filing model exists, auto-generation needed
**Files:** `src/app/api/filings/route.ts`, `src/app/filings/page.tsx`

**Steps:**
1. Auto-generate filings when nexus state added
2. Mark overdue filings automatically
3. Send reminder emails X days before due
4. Add cron job or Vercel cron for reminders
5. Improve filings UI with calendar view
6. Add "Mark as Filed" flow with confirmation number

### 7. Reports & Analytics
**Status:** Basic stats in dashboard, need detailed reports

**Steps:**
1. Create `/api/reports/summary` endpoint
2. Add sales by state report
3. Add tax liability by period report
4. Add platform comparison chart
5. Export to CSV functionality
6. Add date range picker to reports

---

## 📝 Lower Priority / Nice to Have

### 8. Additional Platform Integrations
- [ ] Etsy OAuth integration
- [ ] WooCommerce integration
- [ ] BigCommerce integration
- [ ] eBay integration
- [ ] Square integration

### 9. Advanced Features
- [ ] Economic nexus threshold tracking
- [ ] Multi-business support
- [ ] Team/user management
- [ ] Audit log
- [ ] API keys for developers
- [ ] Custom tax rules per product category

### 10. UI/UX Improvements
- [ ] Onboarding wizard for new users
- [ ] Interactive nexus map
- [ ] Dashboard data visualization improvements
- [ ] Mobile-responsive fixes
- [ ] Loading skeletons throughout app
- [ ] Better error messages and empty states

### 11. Testing & Documentation
- [ ] Unit tests for API routes
- [ ] E2E tests with Playwright
- [ ] API documentation
- [ ] User documentation/help center

---

## 🔧 Configuration Needed

### Environment Variables (Production)
```
# Auth
AUTH_SECRET=<generate with openssl rand -base64 32>

# Database (auto-set by Vercel/Neon)
DATABASE_URL=<pooled connection>
DIRECT_URL=<direct connection>

# Email
RESEND_API_KEY=<from resend.com>
FROM_EMAIL=SalesTaxJar <noreply@salestaxjar.com>

# Stripe
STRIPE_SECRET_KEY=sk_live_...
STRIPE_PUBLISHABLE_KEY=pk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...

# Shopify (already configured)
SHOPIFY_API_KEY=0b6b5deabdea044617a93ee6589cfda2
SHOPIFY_API_SECRET=shpss_...

# Tax API (choose one)
TAXJAR_API_KEY=<optional>

# App
NEXT_PUBLIC_APP_URL=https://salestaxjar.vercel.app
```

---

## 📊 Progress Summary

| Category | Progress |
|----------|----------|
| Core Infrastructure | 90% |
| Authentication | 100% |
| Database & APIs | 95% |
| Frontend Integration | 40% |
| Billing (Stripe) | 20% |
| Email | 80% |
| Platform Integrations | 50% |
| Tax Calculations | 30% |
| Reports | 10% |
| Testing | 0% |

**Overall Estimate:** ~70% complete

---

## Recent Session Progress (2026-01-28 12:58-13:xx)

1. ✅ **Created Database API Routes**
   - `/api/business` - CRUD
   - `/api/nexus` - with bulk update
   - `/api/filings` - with status management
   - `/api/calculations` - with bulk save
   - `/api/calculations/summary` - stats/analytics
   - `/api/notifications` - preferences

2. ✅ **Migrated AuthContext to APIs**
   - Removed localStorage dependency
   - All data now fetched/saved via API
   - Added `refreshData()` function

3. ✅ **Auto-generate Filings**
   - When nexus states are updated, quarterly filings are auto-created
   - Prevents duplicate filings for same period

4. ✅ **Type Updates**
   - Added `id` to BusinessProfile
   - Renamed `reason` → `nexusType` in NexusState

---

## Next Session Priorities
1. Set up Stripe with real credentials
2. Set up Resend for emails
3. Test full user flow: signup → verify → add business → configure nexus → connect Shopify
4. Add dashboard analytics using `/api/calculations/summary`
