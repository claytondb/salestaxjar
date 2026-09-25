---
title: "Shopify Sales Tax: What Every Store Owner Needs to Know in 2026"
date: "2026-03-11"
lastReviewed: "2026-09-25"
excerpt: "Shopify Tax handles calculation at checkout and shows nexus insights for your Shopify sales — but filing costs extra, and it can't see your other sales channels. Here's the full picture every Shopify store owner needs."
author: "Sails Team"
category: "Integrations"
readTime: "9 min read"
keyword: "Shopify sales tax guide"
---

Shopify has come a long way on sales tax. The built-in Shopify Tax feature handles a lot automatically — but there's a significant gap between what Shopify does and what you actually need to be fully compliant.

This guide covers everything: what Shopify Tax does, what it doesn't do, and how to build a complete compliance picture for your store in 2026.

## What Shopify Tax Actually Does

Shopify Tax is Shopify's native tax calculation engine. When enabled, it automatically:

- Calculates the correct sales tax rate for each order based on the customer's location
- Applies state, county, and city-level rates
- Handles product-level taxability (some products are taxable, some aren't)
- Accounts for your tax registrations in each state

For the moment a customer checks out, Shopify Tax is genuinely excellent. It pulls live rate data, applies it correctly, and collects the right amount.

**What Shopify Tax costs:**
- Free for your first $100,000 in US sales (per calendar year for stores created before May 13, 2026; a one-time lifetime allowance for newer stores)
- After that, 0.35% per US transaction on Basic, Grow and Advanced (0.25% on Plus), capped at $0.99 per order (as of September 2026)

For most small sellers, Shopify Tax is effectively free and handles checkout calculation reliably.

## What Shopify Tax Does NOT Do

Here's the gap — and it's a big one.

### ⚠️ Shopify's nexus insights only see Shopify sales

Shopify's tax liability insights show where your Shopify sales may have crossed a state's economic nexus threshold. But they only count sales processed through Shopify — Shopify's own help center tells merchants to review sales that weren't processed by Shopify themselves.

**What is economic nexus?** Post-*Wayfair* (2018), every state can require you to collect sales tax if you exceed their threshold — typically $100,000 in sales per year in that state (some states also count 200 transactions). You don't need a physical presence. Just customers.

Shopify can't tell you: "Hey, you're approaching the Texas threshold and might need to register." You'd need to monitor this yourself — or use a tool built for it.

### ❌ Shopify Tax doesn't file your returns for free

Shopify Tax collects the tax. Its automated filing costs $75 per generated return on Basic, Grow and Advanced plans, or $50 on Plus (as of September 2026). Without it, you still have to file returns in every state where you're registered. That means:
- Logging into each state's tax portal (or using a third-party filer)
- Submitting your collected tax amounts
- Meeting each state's filing deadline (quarterly, monthly, or annually depending on your volume)

Miss a deadline and you'll face penalties and interest. File in the wrong period and you'll need to amend.

### ❌ Shopify Tax only covers your Shopify sales

If you sell anywhere else — Amazon, Etsy, eBay, your own WooCommerce site, at craft fairs — Shopify Tax has no visibility into those sales. But for nexus purposes, your sales in a state are added together — although some states exclude marketplace sales (like Amazon or Etsy) from your threshold.

A seller doing $60K on Shopify and $50K on Amazon might think they don't have nexus anywhere except their home state. But combined, they may have crossed a threshold in states that count marketplace sales. Shopify Tax can't catch that.

### ❌ Shopify Tax doesn't tell you what you owe

You can see collected tax in Shopify reports, but you still have to match those numbers to each state's filing calendar yourself. That gap is where sellers get in trouble.

## The Full Shopify Sales Tax Picture

Here's what a complete compliance setup looks like for a Shopify seller:

### Step 1: Register for a sales tax permit in your home state

Before you can legally collect sales tax, you need to register with your state's department of revenue. This is free in most states and takes 15-30 minutes online. Once registered, add your sales tax registration to Shopify Tax (Settings → Taxes → United States).

### Step 2: Enable Shopify Tax

In your Shopify admin, go to Settings → Taxes and Duties. Enable Shopify Tax. Add your registered states. Shopify will automatically collect tax on orders in those states.

### Step 3: Monitor your economic nexus exposure

This is the step most sellers miss. You need to know how much you're selling into each state — across all your platforms — and whether you're approaching any thresholds.

Most states use a $100,000 sales threshold; some also count 200 transactions, as South Dakota did at the time of *South Dakota v. Wayfair*. Some states are higher (Alabama and Mississippi use $250,000; California, New York and Texas use $500,000). A handful have no sales tax at all.

**Tools for monitoring:**
- **Manually**: Download your Shopify orders, sort by state, and calculate. Time-consuming and error-prone.
- **With a tool**: Use a nexus monitoring tool like [Sails](https://sails.tax) that imports your Shopify orders and checks your sales against every state's nexus rules.

### Step 4: Register in new states when you hit thresholds

When you exceed a state's threshold, you have a legal obligation to register and collect tax. Do this promptly — when you must start collecting varies by state (immediately, the first day of the next month, or the next calendar year in some states).

Registration is free (or low cost) in most states. You'll get a permit number that you add to Shopify Tax for that state.

### Step 5: File and remit on schedule

Most states require quarterly filing for small sellers. A few require monthly filing once your volume is high enough. Know your filing frequency for each state (verify it with the state) and set reminders — or use a tool that tracks deadlines for you.

When you file, you're remitting the tax you collected in that period. Your Shopify Tax reports will show you this by state.

## Common Shopify Tax Mistakes

**1. Only registering in your home state**
You need to register everywhere you have nexus — physical or economic. Shopify Tax will collect tax in those states once you're registered, but it won't tell you where else you should be registered.

**2. Ignoring sales from other platforms**
If you sell anywhere besides Shopify, those sales can count toward your nexus thresholds too (though some states exclude marketplace sales). Track your total sales volume across all channels.

**3. Forgetting marketplace sales**
Amazon, Etsy, and other marketplaces typically collect and remit tax for you (marketplace facilitator laws). But those sales still count toward your economic nexus totals in some states. The rules vary by state.

**4. Missing filing deadlines**
States charge penalties and interest for late filings (the amounts vary by state). In some states, repeat late filing can trigger an audit. Set calendar reminders — or use a tool that tracks deadlines and emails you reminders.

**5. Not tracking historical sales**
Economic nexus looks at the prior or current calendar year in most states; some use the prior 12 months or another period. If you're new to tracking, you need to look back at your historical sales data to see if you've already crossed thresholds you weren't aware of.

## Shopify Tax vs. Third-Party Tools

| | Shopify Tax | Sails |
|---|---|---|
| Tax calculation at checkout | ✅ Excellent | N/A |
| Economic nexus monitoring | Shopify sales only | ✅ All connected channels |
| Multi-platform tracking | ❌ | ✅ |
| Filing deadline reminders | ❌ | ✅ |
| Sales-by-state reports for filing | Tax reports | ✅ |
| Cost | Free for first $100K in US sales, then 0.35%/order (max $0.99) | Free plan; paid from $9/mo |

Shopify Tax and a nexus monitoring tool aren't competing products — they're complementary. Shopify Tax handles calculation at checkout (and does it well). A tool like Sails fills the gaps: nexus monitoring, multi-platform aggregation, and deadline tracking.

## What About Shopify Plus?

Shopify Plus stores get Shopify Tax at a lower rate (0.25% per transaction, capped at $0.99 per order and $5,000 a year for US fees, as of September 2026), and can also use third-party tax apps from the Shopify App Store.

Shopify Plus doesn't change the fundamental gap: you still need to track sales outside the Shopify ecosystem, and automated filing is still charged per return ($50 on Plus, as of September 2026).

## The Bottom Line

Shopify Tax is a solid tool for what it does: collecting the right amount of tax at checkout. But it's one piece of a larger compliance picture.

To be fully compliant as a Shopify seller in 2026, you need:
1. ✅ **Shopify Tax** — for accurate calculation at checkout
2. ✅ **Nexus monitoring** — to know when you need to register in new states
3. ✅ **Multi-platform tracking** — if you sell beyond Shopify
4. ✅ **Filing reminders** — so you don't miss a deadline
5. ✅ **Clear reporting** — to know what you owe and when

Shopify gives you #1. Everything else requires a separate tool or a lot of manual work.

---

*[Sails](https://sails.tax) fills the gap, with a free plan and paid plans from $9/month. Connect your Shopify store and get nexus monitoring across your channels, deadline reminders, and sales-by-state reports in one place. [Start free →](https://sails.tax/signup)*
