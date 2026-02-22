# Shopify Integration Setup Guide

This guide walks you through setting up the Shopify integration for Sails.

## Prerequisites

- A Shopify Partner account (free at [partners.shopify.com](https://partners.shopify.com))
- Access to your Sails production/development environment
- A development store for testing (optional but recommended)

## Step 1: Create a Shopify Partner Account

1. Go to [partners.shopify.com](https://partners.shopify.com)
2. Click "Join now" and complete the registration
3. This is free and gives you access to create custom apps

## Step 2: Create a Custom App

1. Log in to your Shopify Partner Dashboard
2. Navigate to **Apps** in the left sidebar
3. Click **Create app**
4. Choose **Create app manually**
5. Enter the app details:
   - **App name**: Sails Integration (or your preferred name)
   - **App URL**: `https://your-domain.com` (your Sails deployment URL)

## Step 3: Configure OAuth Settings

1. In your app settings, go to **App setup**
2. Under **URLs**, configure:

   **App URL:**
   ```
   https://your-domain.com
   ```

   **Allowed redirection URL(s):**
   ```
   https://your-domain.com/api/platforms/shopify/callback
   https://your-domain.com/api/integrations/shopify/callback
   ```

   For local development, also add:
   ```
   http://localhost:3000/api/platforms/shopify/callback
   http://localhost:3000/api/integrations/shopify/callback
   ```

## Step 4: Set Required Scopes

Under **API access** → **Configure Admin API scopes**, enable these scopes:

| Scope | Purpose |
|-------|---------|
| `read_orders` | Access order history for tax calculations |
| `read_products` | Read product data for tax categorization |
| `read_customers` | Customer location data for nexus tracking |
| `read_locations` | Store location data for physical nexus |

These are read-only scopes - the app never modifies store data.

## Step 5: Get API Credentials

1. In your app settings, go to **API credentials**
2. Copy the following values:
   - **Client ID** (also called API Key)
   - **Client Secret**

## Step 6: Configure Environment Variables

Add these to your `.env.local` or production environment:

```env
# Shopify Integration
SHOPIFY_API_KEY=your-client-id-here
SHOPIFY_API_SECRET=your-client-secret-here

# Your app's public URL
NEXT_PUBLIC_APP_URL=https://your-domain.com
```

## Step 7: Test the Integration

### Local Development Testing

1. Create a development store in Shopify Partners
2. Start your local server: `npm run dev`
3. Log in to Sails
4. Go to Settings → Platforms → Shopify
5. Enter your development store name (e.g., `my-dev-store`)
6. Complete the OAuth flow

### Production Testing

1. Deploy your app with the environment variables set
2. The integration should now be available to all users
3. Users can connect their Shopify stores via Settings → Platforms

## API Endpoints

Once configured, the following endpoints are available:

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/integrations/shopify/connect?shop=store-name` | GET | Initiate OAuth flow |
| `/api/integrations/shopify/callback` | GET | OAuth callback (automatic) |
| `/api/integrations/shopify/disconnect` | POST | Disconnect a store |
| `/api/integrations/shopify/orders` | GET | Fetch orders from connected store |
| `/api/integrations/shopify/sync` | POST | Sync orders for tax calculation |

## Security Considerations

- **Token Storage**: Access tokens are stored encrypted in the database
- **State Parameter**: OAuth uses CSRF-protected state parameter
- **Cookie Security**: OAuth state is stored in HttpOnly, Secure cookies
- **Scopes**: Only read-only scopes are requested

## Troubleshooting

### "Shopify integration is not configured"

The `SHOPIFY_API_KEY` and `SHOPIFY_API_SECRET` environment variables are not set. Verify they're correctly configured in your environment.

### OAuth Redirect Error

Check that your redirect URLs in the Shopify Partner Dashboard exactly match your deployment URL, including the protocol (http vs https) and trailing slashes.

### "Invalid state" Error

The OAuth state cookie expired or was cleared. This can happen if:
- More than 10 minutes passed between initiating OAuth and completing it
- Cookies are blocked by the browser
- The user is in incognito/private mode with strict cookie settings

### Rate Limiting

Shopify has API rate limits. The integration respects these limits, but if you're syncing many orders, you may need to:
- Use date range filters to sync in batches
- Wait between large sync operations

## Webhook Support (Future)

For real-time order sync, you can configure webhooks in Shopify to push new orders to:

```
POST https://your-domain.com/api/webhooks/shopify/orders
```

Webhook support is planned for a future release.

## Support

If you encounter issues:
1. Check the troubleshooting section above
2. Review the browser console for errors
3. Check server logs for API errors
4. Contact support@usesails.com

---

Last updated: January 2025
