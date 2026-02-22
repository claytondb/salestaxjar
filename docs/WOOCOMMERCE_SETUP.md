# WooCommerce Integration Setup

This guide walks you through installing and configuring the **Sails Tax for WooCommerce** plugin.

## Overview

The Sails Tax plugin calculates accurate sales tax at checkout using your Sails Tax API key. It supports:

- **Real-time tax calculation** based on customer's shipping address
- **All 13,000+ US tax jurisdictions** (state, county, city, special districts)
- **Smart caching** for fast checkout performance
- **Product category support** (clothing, food, digital goods, etc.)

## Prerequisites

- WordPress 5.0+
- WooCommerce 5.0+
- PHP 7.4+
- A Sails Tax account (Starter plan or higher)

## Installation

### Step 1: Download the Plugin

Download the plugin from your Sails dashboard:
- Go to [Dashboard → Integrations → WooCommerce](https://sails.tax/dashboard/integrations/woocommerce)
- Click "Download Plugin (ZIP)"

### Step 2: Install in WordPress

1. Log in to your WordPress admin panel
2. Go to **Plugins → Add New → Upload Plugin**
3. Click "Choose File" and select the downloaded ZIP
4. Click "Install Now"
5. Click "Activate Plugin"

### Step 3: Get Your API Key

1. Go to [Settings → API Keys](https://sails.tax/settings#apikeys) in your Sails dashboard
2. Click "Create Key" and give it a name (e.g., "My WooCommerce Store")
3. **Copy the API key immediately** - you won't see it again!

### Step 4: Configure the Plugin

1. In WordPress, go to **WooCommerce → Settings → Sails Tax**
2. Enter your API key
3. Enter your business address (used as the "ship from" location)
4. Check "Enable Sails Tax"
5. Click "Save changes"

## Configuration Options

| Setting | Description |
|---------|-------------|
| **Enable Sails Tax** | Turn tax calculation on/off |
| **Sails API Base URL** | API endpoint (default: https://sails.tax) |
| **Sails API Key** | Your Sails Tax API key |
| **Show estimate note** | Display disclaimer when using estimated rates |
| **Enable Debug Logging** | Log API calls to WooCommerce logs |

**Note:** Tax rates are automatically cached for 5 minutes. You can clear the cache manually from the settings page.

## Product Categories (Coming Soon)

> **Note:** Product category support is planned for a future release. Currently, all products are treated as standard taxable goods.

Future support will include:
- Clothing (exempt/reduced in some states)
- Food (grocery vs. prepared)
- Digital goods
- Medical equipment/supplies

## How It Works

1. Customer enters shipping/billing address at checkout
2. Plugin calls Sails Tax API with:
   - Order subtotal + shipping total
   - Ship-to ZIP code and state (from shipping or billing address)
3. API returns the calculated tax with confidence level
4. Tax is displayed and added to the order total
5. Tax details are stored on the order for auditing

## Testing

### Test Mode

The plugin doesn't have a separate test mode - we recommend:

1. Create a test product with a $1.00 price
2. Go through checkout (you can cancel before payment)
3. Verify tax is calculated correctly

### Debug Logging

Enable debug mode to see API calls:

1. Go to **WooCommerce → Settings → Sails Tax**
2. Check "Enable Debug Mode"
3. View logs in **WooCommerce → Status → Logs**

## API Usage & Limits

Each tax calculation uses 1 API call (cached for 5 minutes). Your plan includes:

| Plan | Monthly Orders |
|------|----------------|
| Free | 50 |
| Starter ($9/mo) | 500 |
| Growth ($29/mo) | 5,000 |

View your usage at your [Sails Dashboard](https://sails.tax/dashboard).

## Troubleshooting

### "Invalid API Key" Error

- Verify your API key is correct (should start with `stax_`)
- Check the key hasn't been revoked in Settings → API Keys
- Ensure your subscription is active

### Tax Not Calculating

1. Check "Enable Sails Tax" is checked
2. Verify your business address is complete
3. Enable debug mode and check logs
4. Confirm the customer has a valid US shipping address

### Tax Showing as $0

This may be correct if:
- Shipping to a tax-free state (MT, NH, OR, DE, AK)
- Product is in an exempt category for that state
- Shipping address is incomplete

### Slow Checkout

1. Enable caching (recommended)
2. Increase cache duration
3. Check your server's connection to api.sails.tax

## Uninstalling

1. Go to **Plugins → Installed Plugins**
2. Deactivate "Sails Tax for WooCommerce"
3. Click "Delete"
4. Tax calculation will fall back to WooCommerce defaults

## Support

Having trouble? Contact us:
- Email: support@sails.tax
- Dashboard: [Contact Support](https://sails.tax/contact)

---

## For Developers

### Manual Integration

If you need custom integration, you can call our API directly:

```php
$response = wp_remote_post('https://sails.tax/api/v1/tax/calculate', [
    'headers' => [
        'Authorization' => 'Bearer stax_your_api_key',
        'Content-Type' => 'application/json',
    ],
    'body' => json_encode([
        'amount' => 100.00,
        'from_state' => 'CA',
        'from_zip' => '90210',
        'to_state' => 'CA',
        'to_zip' => '94102',
        'to_city' => 'San Francisco',
    ]),
]);

$data = json_decode(wp_remote_retrieve_body($response), true);
// $data['tax'] = 8.63
// $data['rate'] = 8.625
```

### Hooks & Filters

The plugin provides hooks for customization:

```php
// Modify tax category before calculation
add_filter('sails_tax_product_category', function($category, $product) {
    // Custom logic here
    return $category;
}, 10, 2);

// Action after tax calculated
add_action('sails_tax_calculated', function($tax_amount, $order_data) {
    // Log, notify, etc.
}, 10, 2);
```

### API Reference

See our full [API Documentation](https://sails.tax/docs/api) for:
- Endpoint reference
- Request/response examples
- Rate limiting details
- Error codes
