---
title: "Shopify Sales Tax: Complete Guide for Store Owners"
date: "2026-02-24"
excerpt: "Everything you need to know about Shopify sales tax, from basic setup to handling multi-state nexus. Learn how to automate tax collection and stay compliant."
author: "Sails Team"
category: "Integrations"
readTime: "5 min read"
---

Running a Shopify store means dealing with sales tax, whether you like it or not. The good news: Shopify has built-in tax features that handle most of the heavy lifting. The tricky part is understanding when and where you need to collect.

## Does Your Shopify Store Need to Collect Sales Tax?

You need to collect sales tax if you have **nexus** in a state. Nexus means a significant connection to that state, either through:

- **Physical presence**: An office, warehouse, employee, or inventory in the state
- **Economic nexus**: Exceeding a state's sales threshold (typically $100,000 in sales or 200 transactions per year)

Most small Shopify sellers start with nexus only in their home state. As you grow, you'll likely trigger economic nexus in other states.

## Shopify's Built-In Tax Features

Shopify includes automatic tax calculation. Here's what it does:

- Calculates tax rates based on customer location
- Applies product-specific tax rules (some items are exempt)
- Handles destination-based vs. origin-based states correctly
- Keeps rates updated automatically

### Enabling Automatic Tax Calculation

1. Go to **Settings** > **Taxes and duties**
2. Click on your country (United States)
3. Enable **Calculate taxes automatically**
4. Set your shipping origin address

Shopify will now calculate sales tax at checkout for all states where you've enabled collection.

## Setting Up Tax Collection by State

You should only collect sales tax in states where you have nexus. Here's how to enable collection:

1. Go to **Settings** > **Taxes and duties** > **United States**
2. Click **Collect sales tax** next to each state where you have nexus
3. Enter your tax registration number if required

Don't enable collection in states where you don't have nexus. Collecting tax in states where you're not registered creates complications.

## Understanding Shopify Tax Rates

Shopify maintains a database of tax rates, but here's what you should know:

### Destination-Based vs. Origin-Based

- **Destination-based** (most states): Tax rate is based on where the customer receives the product
- **Origin-based** (Arizona, Illinois, Missouri, and others): Tax rate is based on your location

Shopify handles this automatically, but make sure your store address is correct.

### Product Tax Codes

Some products are taxed differently. In Shopify:

1. Edit a product
2. Scroll to **Pricing**
3. Check **Charge tax on this product**
4. Set a product tax code if needed (for clothing, food, etc.)

Common exempt categories include:
- Groceries (in many states)
- Clothing (in PA, NJ, and others)
- Digital products (varies by state)

## When to Use a Third-Party Tax Solution

Shopify's built-in tax works well for simple setups. Consider a specialized solution like Sails when:

- You sell across many states and need precise jurisdiction-level rates
- You need tax reports formatted for state filings
- You want to track economic nexus thresholds automatically
- You need better audit documentation

### Connecting Sails to Shopify

1. Install the Sails app from the Shopify App Store
2. Connect your Sails account
3. The app syncs your orders automatically
4. View nexus exposure and filing reports in your Sails dashboard

The app doesn't replace Shopify's tax calculation. Instead, it imports your order data for reporting and nexus tracking.

## Filing Sales Tax Returns

Collecting tax is only half the job. You also need to **remit** it to each state. Filing requirements vary:

- **Monthly**: High-volume sellers (over $1,000/month in tax)
- **Quarterly**: Medium-volume sellers
- **Annually**: Low-volume sellers

Check each state's Department of Revenue website for your filing schedule after you register.

### What to Include in Your Filings

State returns typically ask for:
- Total sales in the state
- Taxable sales
- Exempt sales
- Tax collected
- Tax due

Sails generates filing-ready reports that match what most state forms require.

## Common Shopify Sales Tax Mistakes

### Mistake 1: Collecting Before Registering

Never collect sales tax until you're registered with the state. Collecting without registration is illegal and creates headaches when you try to register later.

### Mistake 2: Ignoring Economic Nexus

Many Shopify sellers don't realize they've triggered nexus in new states. If you're selling across the US, track your sales by state and register when you approach thresholds.

### Mistake 3: Not Accounting for Local Taxes

Some states have significant local taxes (city, county, district). A Colorado sale might have state tax, county tax, city tax, and special district tax. Make sure your setup captures all of them.

### Mistake 4: Forgetting to File

Even if you collected zero tax in a state, you usually still need to file a return. Missing filings lead to penalties and interest.

## Shopify Sales Tax Reports

Shopify provides basic tax reports under **Analytics** > **Reports** > **Finance**. You'll find:

- Taxes collected by state
- Taxes collected by location (if you have multiple locations)

For more detailed reports, export your orders and use a tool like Sails to generate state-specific filing summaries.

## Getting Help

Sales tax is complex, and the rules change constantly. If you're unsure about your obligations:

- Consult a tax professional for advice specific to your situation
- Use the state Department of Revenue websites for official guidance
- Tools like Sails help automate compliance, but they don't replace professional advice

---

*Have questions about Shopify sales tax? [Sign up for Sails](/signup) to track your nexus exposure and simplify reporting.*
