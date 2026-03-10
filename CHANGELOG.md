# Changelog

All notable changes to Sails (sails.tax).

## [Unreleased]

### Planned
- Stripe billing tiers (Free, Starter $9/mo, Growth $29/mo, Pro $79/mo)
- Squarespace end-to-end testing
- Cookie migration for rebrand

---

## [0.9.5] - 2026-03-10

### Added
- **Login API route tests** (24 tests) - Comprehensive coverage for /api/auth/login:
  - Successful login flow with session creation and cookies
  - Rate limiting enforcement and wait time calculation
  - Email validation before database lookup
  - User not found handling
  - Password verification with attempts remaining
  - Error handling (database errors, session errors, invalid JSON)
  - Security tests (rate limit before processing, validation before DB)
  - Edge cases (whitespace, unicode passwords, long passwords)

### Fixed
- **ESLint warnings cleanup** - Fixed 7 remaining warnings:
  - Removed unused `data` variables in test files
  - Added `coverage/**` to ESLint ignore list

### Changed
- Test count increased from 1108 to 1132

---

## [0.9.4] - 2026-03-10

### Added
- **API route tests for /api/rates** (42 tests) - Comprehensive coverage for:
  - All states listing with count validation (51 jurisdictions)
  - Single state lookups (CA, TX, DC, etc.) with data validation
  - No-tax states filter (DE, MT, NH, OR)
  - Highest tax states filter with sorting verification
  - State-specific rate validation (rates, local tax, combined)
  - Edge cases (invalid codes, empty params, whitespace handling)
  - Response format consistency checks

### Changed
- Test count increased from 1066 to 1108
- Updated TODO.md with latest test coverage stats

---

## [0.9.3] - 2026-03-10

### Added
- **Amazon platform tests** (40 tests) - Comprehensive coverage for SP-API integration, OAuth flow, order fetching
- **Etsy platform tests** (44 tests) - Comprehensive coverage for Open API v3, PKCE OAuth, receipts and transactions

### Changed
- Test count increased from 938 to 1066

---

## [0.9.2] - 2026-03-10

### Fixed
- **Blog featured images optimization** - Replaced `<img>` with Next.js `<Image>` component for better LCP and bandwidth efficiency
- Resolved ESLint @next/next/no-img-element warning

---

## [0.9.1] - 2026-03-09

### Added
- **Unit tests for env.ts** (20 tests) - Tests for environment configuration, service availability checks, and validateEnv

### Fixed
- **ESLint warnings cleanup** - Reduced warnings from 74 to ~30:
  - Updated eslint.config.mjs to allow underscore-prefixed unused vars
  - Removed unused imports (useRouter, Eye, EyeOff, Upload, Pool)
  - Fixed unused variable warnings with underscore prefix
  - Removed dead code (unused neonPool, encoder.encode)
  - Changed @ts-ignore to @ts-expect-error
  - Added utility JS files to eslint ignore list

### Changed
- Test count increased from 918 to 938

---

## [0.9.0] - 2026-02-28

### Added
- **Squarespace UI Integration** - Connection modal and platform config for Squarespace Commerce
- **Nexus Tracking Docs** - Updated TODO with accurate status (~90% complete)

### Fixed
- Email system documentation (85% complete)

---

## [0.8.0] - 2026-02-27

### Added
- **22 SEO Blog Posts** covering major sales tax topics:
  - Economic nexus thresholds by state (complete 2026 guide)
  - Marketplace guides (Amazon, eBay, Walmart, Etsy, TikTok Shop)
  - Platform guides (Shopify, WooCommerce, BigCommerce, Squarespace, Wix, Gumroad, Patreon)
  - Business guides (dropshipping, print-on-demand, digital products, home business)
  - Tax fundamentals (resale certificates, sales tax registration, common mistakes)
- **FAQ Page** with 20+ searchable sales tax questions
- **Blog Enhancements**:
  - Search bar (filters by title/excerpt/category)
  - Category filter buttons with counts
  - Grid/List view toggle
  - Social share buttons (X, Facebook, LinkedIn, Email, Copy Link)
  - Featured images with OpenGraph meta tags
- **GFM Support** for markdown tables in blog posts

### Fixed
- Blog filter button accessibility (better contrast)
- Sitemap build error from missing date field

---

## [0.7.0] - 2026-02-17

### Added
- **Order Limit Enforcement** across all platform sync routes
- **Usage Tracking** with progress bar and upgrade prompts (PlanUsage component)
- **API Documentation** (docs/API_REFERENCE.md, docs/WOOCOMMERCE_SETUP.md)

### Changed
- Restructured tiers: all platforms on Starter, gated by order limits

---

## [0.6.0] - 2026-02-15

### Added
- **Nexus Automation** - Threshold tracking, exposure dashboard, alerts & email notifications
- **Plan-based Tier Gating** for features
- **Improved Webhook Handling**

### Changed
- Rewrote pricing to match actual features

---

## [0.5.0] - 2026-02-14

### Added
- **Beta Program** - /beta landing page, beta user management
- Auto-grant Pro on beta signup
- Beta survey card with reminder functionality
- isBetaUser flag to distinguish beta users from paid Pro

### Changed
- Beta cap at 25 users with waitlist signup
- Disabled upgrade button for beta users (already have lifetime Pro)

---

## [0.4.0] - 2026-02-12

### Added
- **WooCommerce Integration**
  - WordPress plugin with block checkout support (v1.1.0)
  - Plugin download page
  - REST API keys connection flow
- **Ecwid Integration** - Store ID + token connection
- **OpenCart Integration** - Session API connection
- **PrestaShop Integration** - Webservice API connection
- **Magento/Adobe Commerce Integration** - Access token connection

### Changed
- Removed Squarespace and Wix from active platforms (have built-in tax)
- Added them back as API-ready (hidden until UI complete)

---

## [0.3.0] - 2026-02-10

### Added
- **Rebrand to Sails** - Package, README, documentation updates
- New sailboat logo and favicon
- Version number in footer

### Fixed
- Billing UX: clearer cancellation status
- Stripe checkout flow issues
- useSearchParams Suspense boundary

---

## [0.2.0] - 2026-02-08

### Added
- **BigCommerce Integration** - API connect + order sync
- **Nexus Management** - Set nexus states and track economic thresholds
- **Settings Page** - Account, billing, security settings
- **Pricing Page** structure

### Fixed
- Account deletion API
- Billing period end date display

---

## [0.1.0] - 2026-02-01

### Added
- **Initial Release**
- Next.js app with Tailwind CSS
- Prisma schema + Neon PostgreSQL database
- Authentication (signup, login, sessions)
- Email verification + password reset
- Dashboard layout
- Tax calculator
- Shopify OAuth + order sync

---

*Sails helps small e-commerce sellers manage sales tax compliance.*
