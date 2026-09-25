---
title: "How to Set Up Sales Tax on BigCommerce (Without Overpaying)"
date: "2026-03-11"
excerpt: "BigCommerce's native tax features won't cut it for multi-state compliance. Many merchants default to Avalara without checking whether it fits their size. Here's what to know."
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

Avalara is the engine behind BigCommerce's automatic tax feature. To use it at any serious volume, you need an Avalara account — and Avalara is built for larger businesses.

For small and mid-size BigCommerce merchants, cost matters. We don't have verified current Avalara pricing, so get a quote and check it against your size before you commit.

The merchants who feel this most are the ones who grew quickly, enabled Avalara because it was the default, and never questioned whether it was the right fit for their size.

## What BigCommerce Actually Needs (That It Doesn't Have Built In)

For sales tax to work correctly on a multi-state BigCommerce store, you need:

### Rooftop-Level Accuracy
Tax jurisdictions don't follow ZIP codes. A single ZIP code can span multiple tax districts with different rates. "Rooftop accuracy" means the calculation is based on the exact delivery address — down to the street level. This is what Avalara provides.

### Real-Time Rate Updates
Tax rates change constantly. Cities add taxes, counties adjust rates, states pass new laws. A good tax integration pulls current rates at checkout, not from a cached table.

### Nexus Monitoring
The bigger your store, the more states you're likely selling into. After *South Dakota v. Wayfair* (2018), every state can require you to collect sales tax once you hit their economic nexus threshold — typically $100,000 in sales to customers in that state. You need to know when you're approaching those thresholds.

### Reasonable Pricing
This one seems obvious, but it's where a lot of BigCommerce merchants go wrong.

## Setting Up Sails for BigCommerce

Sails' BigCommerce connection is in beta. It imports your BigCommerce orders and checks your sales against every state's nexus rules; keep your checkout tax calculation in place alongside it. Here's how to connect it:

### Step 1: Create Your Sails Account

Go to [sails.tax](https://sails.tax) and sign up for a free account. No credit card needed to get started.

### Step 2: Connect BigCommerce

1. In your Sails dashboard, go to **Integrations**
2. Select **BigCommerce**
3. Enter your BigCommerce store URL and API credentials
4. Authorize the connection

The integration uses BigCommerce's API to import your orders.

### Step 3: Configure Your Settings

- Set your **business address**
- Configure **nexus states** — the states where you're already registered to collect tax

### Step 4: Test It

Place a test order and check that it shows up in your Sails dashboard.

### Step 5: Monitor Your Nexus Dashboard

Once connected, Sails starts tracking your sales by state. Your dashboard shows how close you are to economic nexus thresholds in states where you're not yet registered. When you're approaching a threshold, Sails flags it.

## What This Costs vs. Avalara

Let's be concrete. Here's what you'd pay annually at different order volumes:

| Monthly Orders | Avalara | Sails |
|---------------|----------------|-------|
| 100 | Not verified | $108/yr (Starter) |
| 500 | Not verified | $108/yr (Starter) |
| 2,000 | Not verified | $348/yr (Pro) |
| 10,000 | Not verified | $948/yr (Enterprise) |

Get a quote from Avalara to compare. Keep in mind that Sails tracks nexus alongside your checkout tax calculation, so it isn't a like-for-like swap.

## Common BigCommerce Sales Tax Questions

### Do I have to collect sales tax in every state I ship to?

No — only in states where you have **nexus**. You automatically have nexus in your home state (physical nexus). As your sales grow, you'll cross economic nexus thresholds in other states. Sails tracks this for you.

### My BigCommerce store ships internationally. Does Sails handle that?

Sails is currently focused on US sales tax. For international VAT and GST compliance, you'd need a separate tool (Quaderno is a good option).

### What happens to my existing Avalara setup if I switch?

Nothing changes at checkout. Sails' BigCommerce connection imports your orders for nexus tracking and reporting, so keep Avalara (or whatever calculates tax at your checkout) turned on.

### Can I use Sails if I also sell on Shopify or WooCommerce?

Yes. If you run multiple storefronts, you can connect them to a single Sails account (the number of stores depends on your plan). Your nexus monitoring and reporting will consolidate across your connected stores.

## When BigCommerce + Avalara Does Make Sense

If you're doing $2M+ in annual revenue, selling complex taxable products across many industries, or need deep integration with an enterprise ERP system — Avalara might genuinely be the right tool. We're not here to tell you the enterprise option is always wrong.

But if you're a growing BigCommerce store trying to get compliant without bleeding margin, you don't need enterprise software. You need something built for your size.

## Ready to Make the Switch?

Setting up Sails takes about 15 minutes. You'll get nexus monitoring, deadline reminders, and clean reporting — for a price that actually makes sense for your business.

**[Connect BigCommerce to Sails](https://sails.tax/signup)** — free to start, no contracts.
