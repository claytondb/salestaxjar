# Amazon Seller Central Integration Setup

This guide walks you through setting up the Amazon Seller Central integration for Sails.

## Overview

Sails uses Amazon's **Selling Partner API (SP-API)** to connect with Amazon Seller Central accounts. This requires:
1. An Amazon Seller Central account
2. An Amazon Developer account
3. A registered SP-API application

## Prerequisites

- Amazon Seller Central account (Professional selling plan recommended)
- Amazon Developer account
- Access to your hosting environment variables (Vercel)

## Step 1: Create Amazon Developer Account

1. Go to [Amazon Developer Portal](https://developer.amazonservices.com/)
2. Sign in with your Amazon account or create one
3. Complete the developer registration

## Step 2: Register Your Application

1. In the Developer Portal, go to **Apps & Services** → **Developer Console**
2. Click **Add new app client**
3. Fill in the application details:
   - **Application name:** Sails
   - **API type:** SP-API (Selling Partner API)
   - **OAuth Login URI:** `https://usesails.com/api/platforms/amazon/callback`
   - **OAuth Redirect URI:** `https://usesails.com/api/platforms/amazon/callback`

## Step 3: Request API Permissions

You'll need to request the following roles for your application:
- **Product Listing** (optional, for product data)
- **Pricing** (optional, for pricing data)
- **Orders** (required, for order import)
- **Reports** (recommended, for bulk data)

Submit your application for review. Amazon typically approves within 1-3 business days.

## Step 4: Get Your Credentials

Once approved, go to your app's **LWA Credentials** section to find:
- **Client ID** (looks like: `amzn1.application-oa2-client.xxxxx`)
- **Client Secret** (a long string)

## Step 5: Configure Environment Variables

Add these to your Vercel project:

```bash
AMAZON_CLIENT_ID=amzn1.application-oa2-client.xxxxx
AMAZON_CLIENT_SECRET=your-client-secret-here
```

### In Vercel:
1. Go to your project → **Settings** → **Environment Variables**
2. Add `AMAZON_CLIENT_ID` with your Client ID
3. Add `AMAZON_CLIENT_SECRET` with your Client Secret
4. Set scope to **All environments** (Production, Preview, Development)
5. Click **Save**
6. **Redeploy** your application

## Step 6: Test the Integration

1. Go to Sails → **Settings** → **Platforms**
2. Amazon Seller Central should now show **Connect** button
3. Click **Connect** → You'll be redirected to Amazon
4. Authorize the application
5. You'll be redirected back to Sails with the connection active

## Troubleshooting

### "Application not authorized"
- Ensure your SP-API application is approved
- Check that the OAuth redirect URI matches exactly

### "Invalid client_id"
- Verify the Client ID is correct in environment variables
- Make sure there are no extra spaces or newlines

### "Redirect URI mismatch"
- The redirect URI must be exactly: `https://usesails.com/api/platforms/amazon/callback`
- Check for trailing slashes or protocol mismatches

### Token refresh failures
- Amazon access tokens expire after 1 hour
- The integration automatically refreshes using the refresh token
- If refresh fails, the user may need to reconnect

## API Reference

### Authentication Flow
1. User clicks Connect → redirects to Amazon OAuth
2. User authorizes → Amazon redirects back with code
3. Sails exchanges code for access + refresh tokens
4. Tokens are stored encrypted in database

### Supported Features
- **Order sync:** Imports orders from all marketplaces
- **Multi-marketplace:** US, CA, MX, etc.
- **FBA orders:** Includes Fulfilled by Amazon orders
- **Tax data:** Captures tax collected by Amazon

### Marketplaces
Default marketplace is US (ATVPDKIKX0DER). The integration can be extended to support:
- US: `ATVPDKIKX0DER`
- Canada: `A2EUQ1WTGCTBG2`
- Mexico: `A1AM78C64UM0Y8`
- UK: `A1F83G8C2ARO7P`
- Germany: `A1PA6795UKMFR9`
- France: `A13V1IB3VIYZZH`
- And more...

## Security Notes

- Client Secret is stored only in environment variables
- Access tokens are encrypted at rest
- Refresh tokens are used to maintain access without re-authorization
- Connections can be revoked from Amazon Seller Central at any time
