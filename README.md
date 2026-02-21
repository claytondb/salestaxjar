# Sails ⛵

Sales tax made breezy. A modern tax calculation and compliance platform built for small online sellers.

Built with Next.js 16, Prisma 7, and PostgreSQL.

## Features

- 🧮 **Tax Calculator** - Calculate sales tax for all 50 US states with category-specific rates
- 🗺️ **Nexus Tracking** - Track your sales tax nexus across states
- 📊 **Dashboard** - Overview of your tax obligations and upcoming filings
- 📅 **Filing Reminders** - Automated email reminders for filing deadlines
- 💳 **Subscription Billing** - Stripe-powered subscription management
- 🔐 **Secure Auth** - Database-backed authentication with bcrypt and JWT
- 📧 **Email System** - Resend-powered transactional emails

## Tech Stack

- **Framework:** Next.js 16 (App Router, Turbopack)
- **Database:** PostgreSQL with Prisma 7
- **Auth:** bcrypt + JWT + HTTP-only cookies
- **Payments:** Stripe Subscriptions
- **Email:** Resend
- **Tax API:** TaxJar (optional, with local fallback)
- **Rate Limiting:** Upstash Redis (optional, with in-memory fallback)
- **Styling:** Tailwind CSS 4

## Getting Started

### Prerequisites

- Node.js 18+
- PostgreSQL database (local or cloud)
- npm or yarn

### Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/claytondb/sails.git
   cd sails
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Copy the environment example file:
   ```bash
   cp .env.example .env.local
   ```

4. Configure your environment variables (see [Environment Variables](#environment-variables) below)

5. Generate Prisma client:
   ```bash
   npx prisma generate
   ```

6. Run database migrations:
   ```bash
   npx prisma migrate deploy
   ```

7. Start the development server:
   ```bash
   npm run dev
   ```

8. Open [http://localhost:3000](http://localhost:3000)

## Environment Variables

### Required for Production

| Variable | Description |
|----------|-------------|
| `DATABASE_URL` | PostgreSQL connection URL (pooled for serverless) |
| `JWT_SECRET` | Secret key for JWT signing (generate with `openssl rand -base64 32`) |

### Optional Services

These services gracefully degrade if not configured:

| Variable | Description | Fallback |
|----------|-------------|----------|
| `STRIPE_SECRET_KEY` | Stripe secret API key | Demo billing mode |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | Stripe publishable key | - |
| `STRIPE_WEBHOOK_SECRET` | Stripe webhook signing secret | - |
| `STRIPE_STARTER_PRICE_ID` | Stripe Price ID for Starter plan | - |
| `STRIPE_GROWTH_PRICE_ID` | Stripe Price ID for Growth plan | - |
| `STRIPE_ENTERPRISE_PRICE_ID` | Stripe Price ID for Enterprise plan | - |
| `TAXJAR_API_KEY` | TaxJar API key | Local tax rates |
| `TAXJAR_API_URL` | TaxJar API URL (sandbox or production) | Production URL |
| `RESEND_API_KEY` | Resend API key for emails | Console logging |
| `FROM_EMAIL` | Email sender address | Default sender |
| `UPSTASH_REDIS_REST_URL` | Upstash Redis URL | In-memory rate limiting |
| `UPSTASH_REDIS_REST_TOKEN` | Upstash Redis token | - |
| `NEXT_PUBLIC_APP_URL` | Public URL of your app | http://localhost:3000 |

### Vercel Deployment

For Vercel deployment, set these environment variables in your project settings:

**Required:**
- `DATABASE_URL` - Use Vercel Postgres or any PostgreSQL provider
- `JWT_SECRET` - Generate a secure random string

**Recommended:**
- `STRIPE_SECRET_KEY` - For billing functionality
- `STRIPE_WEBHOOK_SECRET` - For subscription webhooks
- `RESEND_API_KEY` - For email functionality
- `NEXT_PUBLIC_APP_URL` - Your production domain

## Database Setup

### Option 1: Vercel Postgres

1. Create a Vercel Postgres database in your project dashboard
2. The `DATABASE_URL` will be automatically available

### Option 2: Other PostgreSQL Providers

1. Create a PostgreSQL database (Supabase, Neon, Railway, etc.)
2. Get the connection string and set as `DATABASE_URL`

### Running Migrations

```bash
# Development
npx prisma migrate dev

# Production
npx prisma migrate deploy
```

## API Routes

### Authentication

- `POST /api/auth/signup` - Create new account
- `POST /api/auth/login` - Sign in
- `POST /api/auth/logout` - Sign out
- `GET /api/auth/me` - Get current user

### Tax Calculation

- `POST /api/tax/calculate` - Calculate tax for a transaction
- `GET /api/tax/rates` - Get tax rates (all states or specific)

### Email

- `POST /api/email/send-verification` - Send verification email
- `POST /api/email/verify` - Verify email with token
- `POST /api/email/forgot-password` - Request password reset
- `POST /api/email/reset-password` - Reset password with token

### Stripe

- `POST /api/stripe/create-checkout-session` - Start subscription checkout
- `POST /api/stripe/create-portal-session` - Open billing portal
- `POST /api/stripe/webhook` - Handle Stripe events

## Development

```bash
# Start dev server
npm run dev

# Type check
npm run lint

# Build for production
npm run build

# Start production server
npm run start
```

## Prisma Commands

```bash
# Generate Prisma Client
npx prisma generate

# Create and apply migrations
npx prisma migrate dev

# Apply migrations (production)
npx prisma migrate deploy

# Open Prisma Studio
npx prisma studio

# Reset database
npx prisma migrate reset
```

## License

MIT License - see LICENSE file for details
# Test branch for Stripe test mode

