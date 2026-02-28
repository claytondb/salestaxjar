# Changelog

All notable changes to Sails (sails.tax).

## [Unreleased]

### Planned
- Stripe billing tiers (Free, Starter $9/mo, Growth $29/mo, Pro $79/mo)
- Squarespace end-to-end testing
- Cookie migration for rebrand

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
