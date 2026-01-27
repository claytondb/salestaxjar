# SalesTaxJar Setup Documentation

This document covers the setup required for external services: Stripe (payments) and Resend (email).

---

## 🔐 Stripe Setup (Payment Processing)

### What's Already Done in Code
- ✅ Stripe SDK integrated (`src/lib/stripe.ts`)
- ✅ Checkout session creation for subscriptions
- ✅ Billing portal session for managing subscriptions
- ✅ Webhook endpoint at `/api/stripe/webhook`
- ✅ Plan change (upgrade/downgrade) with proration

### What You Need to Do in Stripe Dashboard

#### 1. API Keys
1. Go to [Stripe Dashboard > Developers > API Keys](https://dashboard.stripe.com/apikeys)
2. Copy your **Secret Key** → `STRIPE_SECRET_KEY`
3. Copy your **Publishable Key** → `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`

#### 2. Create Products & Prices (Already Done)
The price IDs are already set up in David's Stripe account:

**Test Mode:**
```
STRIPE_STARTER_PRICE_ID="price_1SuKYvG6BWpSwmrtI7lZPGjt"
STRIPE_GROWTH_PRICE_ID="price_1SuKZXG6BWpSwmrtkIDhGopH"
STRIPE_ENTERPRISE_PRICE_ID="price_1SuKa9G6BWpSwmrteWcbzkoE"
```

**Live Mode:**
```
STRIPE_STARTER_PRICE_ID="price_1SuKPJG6BWpSwmrtRU6VGlRZ"
STRIPE_GROWTH_PRICE_ID="price_1SuKQAG6BWpSwmrt4MTjvgOb"
STRIPE_ENTERPRISE_PRICE_ID="price_1SuKQzG6BWpSwmrt9kUmZhzJ"
```

#### 3. Set Up Webhook (IMPORTANT!)

1. Go to [Stripe Dashboard > Developers > Webhooks](https://dashboard.stripe.com/webhooks)
2. Click **"Add endpoint"**
3. Set the endpoint URL:
   - For production: `https://salestaxjar.com/api/stripe/webhook`
   - For local development: Use [Stripe CLI](https://stripe.com/docs/stripe-cli) or ngrok
4. Select these events to listen for:
   - `checkout.session.completed` - When a user completes checkout
   - `customer.subscription.created` - When a new subscription is created
   - `customer.subscription.updated` - When subscription changes (plan change, renewal)
   - `customer.subscription.deleted` - When subscription is canceled
   - `invoice.payment_succeeded` - When payment goes through
   - `invoice.payment_failed` - When payment fails (triggers email)
5. Click **"Add endpoint"**
6. Copy the **Signing secret** (starts with `whsec_`) → `STRIPE_WEBHOOK_SECRET`

#### 4. Configure Customer Portal (Optional but Recommended)

1. Go to [Stripe Dashboard > Settings > Billing > Customer Portal](https://dashboard.stripe.com/settings/billing/portal)
2. Enable the customer portal
3. Configure what customers can do:
   - ✅ Update payment methods
   - ✅ View invoice history
   - ✅ Cancel subscription
   - ✅ Switch plans (optional)
4. Set the redirect URL: `https://salestaxjar.com/settings`

### Local Development with Stripe

For testing webhooks locally:

```bash
# Install Stripe CLI
brew install stripe/stripe-cli/stripe

# Login to Stripe
stripe login

# Forward webhooks to your local server
stripe listen --forward-to localhost:3000/api/stripe/webhook

# The CLI will give you a webhook secret to use locally
```

---

## 📧 Resend Setup (Email Service)

### What's Already Done in Code
- ✅ Resend SDK integrated (`src/lib/email.ts`)
- ✅ Email templates for:
  - Welcome/verification email
  - Password reset
  - Filing deadline reminders
  - Payment failed notification
  - Monthly tax summary
- ✅ Email logging to database
- ✅ Graceful fallback (logs to console if Resend not configured)

### What You Need to Do in Resend Dashboard

#### 1. Get API Key
1. Go to [Resend Dashboard > API Keys](https://resend.com/api-keys)
2. Create a new API key
3. Copy it → `RESEND_API_KEY`

#### 2. Verify Your Domain (Required for Production)
1. Go to [Resend Dashboard > Domains](https://resend.com/domains)
2. Click **"Add Domain"**
3. Enter your domain: `salestaxjar.com`
4. Add the DNS records Resend provides:
   - **MX record** (for receiving bounces)
   - **TXT record** (SPF)
   - **CNAME record** (DKIM)
5. Wait for verification (usually 5-30 minutes)
6. Set your FROM_EMAIL: `FROM_EMAIL="SalesTaxJar <noreply@salestaxjar.com>"`

**Note:** Until domain is verified, you can only send to your own email address. 

#### 3. For Development/Testing
- Resend allows sending to your own verified email without domain setup
- Alternatively, leave `RESEND_API_KEY` unset and emails will log to console

### Email Templates

All templates are in `src/lib/email.ts`. They include:

| Function | Purpose | Triggered By |
|----------|---------|--------------|
| `sendWelcomeEmail` | Verify email + welcome | User signup |
| `sendPasswordResetEmail` | Password reset link | Forgot password |
| `sendFilingReminderEmail` | Filing deadline alert | Scheduled job (not yet implemented) |
| `sendPaymentFailedEmail` | Payment failed notice | Stripe webhook |
| `sendMonthlySummaryEmail` | Monthly recap | Scheduled job (not yet implemented) |

---

## 🔧 Environment Variables Checklist

For production, make sure these are set:

```bash
# Required
DATABASE_URL="..."
DIRECT_URL="..."
JWT_SECRET="..."
NEXT_PUBLIC_APP_URL="https://salestaxjar.com"

# Stripe (required for billing)
STRIPE_SECRET_KEY="sk_live_..."
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY="pk_live_..."
STRIPE_WEBHOOK_SECRET="whsec_..."
STRIPE_STARTER_PRICE_ID="price_..."
STRIPE_GROWTH_PRICE_ID="price_..."
STRIPE_ENTERPRISE_PRICE_ID="price_..."

# Resend (required for emails)
RESEND_API_KEY="re_..."
FROM_EMAIL="SalesTaxJar <noreply@salestaxjar.com>"

# Optional
TAXJAR_API_KEY="..."
UPSTASH_REDIS_REST_URL="..."
UPSTASH_REDIS_REST_TOKEN="..."
```

---

## 🚀 Deployment Checklist

Before going live:

- [ ] Set all environment variables in Vercel/hosting
- [ ] Switch Stripe to **Live Mode** keys
- [ ] Verify domain in Resend
- [ ] Test webhook endpoint works
- [ ] Test checkout flow end-to-end
- [ ] Test password reset email
- [ ] Configure Stripe Customer Portal
- [ ] Set up monitoring/alerts for webhook failures

---

## 🔍 Integration Points Review

### Current Status

| Feature | Status | Notes |
|---------|--------|-------|
| User authentication | ✅ Working | JWT-based, email verification |
| Tax calculation | ✅ Working | Local rates, TaxJar API optional |
| Stripe checkout | ✅ Working | Needs webhook configured |
| Stripe portal | ✅ Working | For subscription management |
| Plan changes | ✅ Working | Upgrade/downgrade with proration |
| Email sending | ✅ Working | Needs Resend configured |
| Nexus tracking | ✅ Working | Dashboard feature |
| Platform integrations | 🔜 Coming | Shopify, Amazon, etc. |
| Auto-filing | 🔜 Coming | Future feature |

### Recommendations

1. **Webhook monitoring**: Set up alerts if webhooks fail. Stripe retries for 3 days, but you want to know immediately.

2. **Email deliverability**: Check Resend's analytics for bounce rates. If you see issues, double-check DNS records.

3. **Rate limiting**: Currently using in-memory fallback. For production at scale, configure Upstash Redis.

4. **Database backups**: Ensure Vercel Postgres (or your DB) has regular backups enabled.
