---
title: "How to Set Up Sales Tax on BigCommerce (Without Overpaying)"
date: "2026-03-11"
excerpt: "BigCommerce's native tax features won't cut it for multi-state compliance. Most merchants default to Avalara and overpay. Here's a better way."
author: "Sails Team"
category: "Integrations"
readTime: "5 min read"
---

BigCommerce is a solid platform. It handles large catalogs, high traffic, and complex storefronts better than most. But when it comes to sales tax, it has a real gap — one that's quietly costing a lot of BigCommerce merchants money.

Here's the situation, and what to actually do about it.

## The Problem with BigCommerce's Built-In Tax

BigCommerce offers two tax modes out of the box:

**Manual tax rates:** You enter rates by country, state, and ZIP code yourself. Fine if you're selling in one state and have a lot of time on your hands. A compliance nightmare if you're selling across multiple states.

**Automatic tax via Avalara:** BigCommerce has a built-in integration with Avalara's AvaTax. When you enable "Automatic Tax," you're connecting to Avalara.

That second option sounds convenient — and it is. The problem is what it costs.

## The Hidden Cost of BigCommerce's "Automatic Tax"

Avalara is the engine behind BigCommerce's automatic tax feature. To use it at any serious volume, you need an Avalara account — and Avalara's pricing isn't cheap.

For small and mid-size BigCommerce merchants, common scenarios:
- Avalara's entry-level plans start around **$3,000–$5,000/year**
- Mid-range plans often run **$10,000–$20,000/year**
- Per-transaction fees stack on top of base pricing

If your BigCommerce store is doing $200K–$500K in revenue, you could easily be spending 1–5% of your revenue just on tax calculation software. That's a real margin hit.

The merchants who feel this most are the ones who grew quickly, enabled Avalara because it was the default, and never questioned whether it was the right fit for their size.

## What BigCommerce Actually Needs (That It Doesn't Have Built In)

For sales tax to work correctly on a multi-state BigCommerce store, you need:

### Rooftop-Level Accuracy
Tax jurisdictions don't follow ZIP codes. A single ZIP code can span multiple tax districts with different rates. "Rooftop accuracy" means the calculation is based on the exact delivery address — down to the street level. This is what Avalara provides, and it's also what Sails provides.

### Real-Time Rate Updates
Tax rates change constantly. Cities add taxes, counties adjust rates, states pass new laws. A good tax integration pulls current rates at checkout, not from a cached table.

### Nexus Monitoring
The bigger your store, the more states you're likely selling into. After *South Dakota v. Wayfair* (2018), every state can require you to collect sales tax once you hit their economic nexus threshold — typically $100,000 in sales to customers in that state. You need to know when you're approaching those thresholds.

### Reasonable Pricing
This one seems obvious, but it's where a lot of BigCommerce merchants go wrong.

## Setting Up Sails for BigCommerce

Sails gives you the same rooftop-accurate, real-time tax calculation as Avalara — at a fraction of the price. Here's how to connect it:

### Step 1: Create Your Sails Account

Go to [sails.tax](https://sails.tax) and sign up for a free account. No credit card needed to get started.

### Step 2: Connect BigCommerce

1. In your Sails dashboard, go to **Integrations**
2. Select **BigCommerce**
3. Enter your BigCommerce store URL and API credentials
4. Authorize the connection

The integration uses BigCommerce's API to hook into your checkout flow. Tax gets calculated at the moment a customer enters their shipping address.

### Step 3: Configure Your Settings

- Set your **business address** (used for origin-based calculations where applicable)
- Choose your **tax display preferences** (tax included in price vs. added at checkout)
- Configure **nexus states** — the states where you're already registered to collect tax

### Step 4: Test It

Place a test order with addresses in a few different states. Verify the tax rates look correct. Sails' dashboard shows you each calculation so you can see exactly what rate was applied and why.

### Step 5: Monitor Your Nexus Dashboard

Once connected, Sails starts tracking your sales by state. Your dashboard shows how close you are to economic nexus thresholds in states where you're not yet registered. When you're approaching a threshold, Sails flags it.

## What This Costs vs. Avalara

Let's be concrete. Here's what you'd pay annually at different order volumes:

| Monthly Orders | Avalara (est.) | Sails |
|---------------|----------------|-------|
| 100 | ~$3,000–$5,000/yr | Free |
| 500 | ~$3,000–$5,000/yr | $108/yr (Starter) |
| 2,000 | ~$5,000–$10,000/yr | $348/yr (Pro) |
| 10,000 | ~$10,000–$20,000/yr | $708/yr (Business) |

The gap is significant at every volume. For a small-to-mid-size BigCommerce store, switching from Avalara to Sails typically saves **$3,000–$15,000/year**.

## Common BigCommerce Sales Tax Questions

### Do I have to collect sales tax in every state I ship to?

No — only in states where you have **nexus**. You automatically have nexus in your home state (physical nexus). As your sales grow, you'll cross economic nexus thresholds in other states. Sails tracks this for you.

### My BigCommerce store ships internationally. Does Sails handle that?

Sails is currently focused on US sales tax. For international VAT and GST compliance, you'd need a separate tool (Quaderno is a good option).

### What happens to my existing Avalara setup if I switch?

Your BigCommerce store will keep charging the rates Avalara calculated until you swap integrations. Once you switch to Sails, Sails handles the calculation going forward. You'll want to disable the Avalara connection in BigCommerce settings to avoid double-charging.

### Can I use Sails if I also sell on Shopify or WooCommerce?

Yes. If you run multiple storefronts, you can connect all of them to a single Sails account. Your nexus monitoring and reporting will consolidate across all channels.

## When BigCommerce + Avalara Does Make Sense

If you're doing $2M+ in annual revenue, selling complex taxable products across many industries, or need deep integration with an enterprise ERP system — Avalara might genuinely be the right tool. We're not here to tell you the most expensive option is always wrong.

But if you're a growing BigCommerce store trying to get compliant without bleeding margin, you don't need enterprise software. You need something built for your size.

## Ready to Make the Switch?

Setting up Sails takes about 15 minutes. You'll get real-time accuracy, nexus monitoring, and clean reporting — for a price that actually makes sense for your business.

**[Connect BigCommerce to Sails](https://sails.tax/signup)** — free to start, no contracts.
