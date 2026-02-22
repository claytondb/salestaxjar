---
title: "WooCommerce Sales Tax: The Complete Setup Guide"
date: "2026-02-18"
excerpt: "Learn how to set up automatic sales tax calculation for your WooCommerce store using the free Sails plugin. Step-by-step instructions included."
author: "Sails Team"
category: "Integrations"
readTime: "4 min read"
---

If you run a WooCommerce store, handling sales tax correctly is crucial. The built-in WooCommerce tax features require manual rate entry, which gets complicated fast when you're selling to multiple states. Here's how to set up automatic, accurate sales tax calculation with the Sails plugin.

## Why Automate Sales Tax?

WooCommerce's default approach requires you to manually enter tax rates for every jurisdiction where you sell. That means:

- Looking up rates for each state, county, and city
- Manually updating rates whenever they change
- Hoping you didn't miss anything

With an automated solution, tax rates are calculated in real-time based on the customer's address. No manual entry, no outdated rates.

## Getting Started with Sails for WooCommerce

### Step 1: Create a Sails Account

First, [sign up for a free Sails account](/signup). You'll need this to get your API key.

### Step 2: Get Your API Key

1. Log into your Sails dashboard
2. Go to **Settings** > **API Keys**
3. Click **Generate New Key**
4. Copy the key. You'll need it in the next step.

### Step 3: Download the Plugin

Download the Sails Tax for WooCommerce plugin:

1. In your Sails dashboard, go to **Integrations** > **WooCommerce**
2. Click **Download Plugin**
3. Save the ZIP file to your computer

### Step 4: Install in WordPress

1. Log into your WordPress admin panel
2. Go to **Plugins** > **Add New** > **Upload Plugin**
3. Choose the ZIP file you downloaded
4. Click **Install Now**, then **Activate**

### Step 5: Configure the Plugin

1. Go to **WooCommerce** > **Settings** > **Sails Tax**
2. Enter your API key from Step 2
3. Set your **Store Address** (where your business is located)
4. Choose your **Tax Display** preferences
5. Click **Save Changes**

That's it! The plugin will now automatically calculate sales tax at checkout.

## How It Works

When a customer reaches checkout, the Sails plugin:

1. Captures the shipping address
2. Sends it to the Sails API
3. Receives the precise tax rate for that exact location
4. Applies the correct tax to the order

All of this happens in milliseconds. Customers won't notice any delay.

## Plugin Settings Explained

### API Key
Your unique key that connects your WooCommerce store to your Sails account.

### Store Address
The location of your business. This determines your origin-based tax calculations if applicable.

### Enable Logging
Turn this on if you need to troubleshoot. Logs are written to WooCommerce > Status > Logs.

### Fallback Behavior
If the Sails API is temporarily unavailable, the plugin can fall back to WooCommerce's built-in tax tables. We recommend keeping some basic rates configured as a safety net.

## Viewing Tax Details on Orders

The plugin adds a **Sails Tax** panel to your WooCommerce order screens showing:

- Tax rate applied
- Calculation confidence level
- Breakdown by jurisdiction

This helps with record-keeping and troubleshooting.

## Common Questions

### Does it work with all payment gateways?

Yes! The plugin calculates tax during the cart/checkout phase, before payment processing. It works with Stripe, PayPal, Square, and any other WooCommerce-compatible gateway.

### What about subscriptions?

The plugin works with WooCommerce Subscriptions. Tax is calculated for each renewal based on the customer's current address.

### Do I need the paid Sails plan?

The free Sails plan includes up to 100 tax calculations per month. For most small stores, this is plenty to get started. Upgrade when you need more.

### What if my site is slow?

The plugin caches tax calculations to minimize API calls. The same customer address won't trigger repeated API requests during a session.

## Troubleshooting

### Tax not showing at checkout

1. Make sure the plugin is activated
2. Verify your API key is correct in settings
3. Check that you've enabled taxes in WooCommerce > Settings > General

### Incorrect tax rates

1. Verify the customer's address is complete (including ZIP code)
2. Check your store address settings
3. Enable logging and review the API responses

### API errors in logs

Check your Sails dashboard to ensure your account is active and you haven't exceeded your plan limits.

## Next Steps

Once you've got the plugin running:

1. Run a test order to verify tax calculation
2. Check your WooCommerce reports to see tax collected
3. Connect your Sails dashboard to track nexus exposure

---

*Need help? Contact us at support@sails.tax or [check our documentation](/docs).*
