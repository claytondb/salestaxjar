# Sails Strategy

*Renamed from SalesTaxJar to Sails*

## Target Market

**Primary:** Very small e-commerce sellers who sell through their own website (not marketplace facilitators)

**Why them:**
- Marketplaces (Etsy, eBay, Amazon, Gumroad) already handle tax collection & remittance
- Own-website sellers have NO help — they're on their own
- Existing tools (TaxJar $19+, Avalara expensive) price out tiny sellers

## Target Platforms

**Priority 1 (Focus):**
1. **Shopify** - Huge market, collects but doesn't file/remit
2. **WooCommerce** - Tax setup is a nightmare, biggest DIY pain
3. **Squarespace** - Manual tax entry only, tedious

**Priority 2:**
4. **BigCommerce** - Requires third-party apps
5. **Wix** - Growing e-commerce presence, limited tax tools

**Not pursuing (marketplace facilitators handle tax):**
- Etsy
- eBay  
- Amazon
- Gumroad

## Pricing Strategy

### Free Tier
- **$0/month**
- Up to 50 orders/month
- 1 platform connection
- Basic tax calculator
- Nexus threshold tracking (view only)
- Email support

### Starter Tier
- **$9/month** (undercut TaxJar's $19)
- Up to 500 orders/month
- 3 platform connections
- Automated tax calculation
- Nexus alerts when approaching thresholds
- Basic reports (sales by state)
- Filing reminders

### Growth Tier
- **$29/month**
- Up to 5,000 orders/month
- Unlimited platform connections
- Advanced reports & analytics
- Economic nexus tracking
- State registration guidance
- Priority support

### Pro Tier (Future - with Filing)
- **$79/month**
- Everything in Growth
- Automated filing preparation
- Remittance assistance
- Audit support documentation

## Feature Roadmap

### Phase 1: Core Value (Current)
- [x] Tax calculator
- [x] Nexus state management
- [x] Shopify integration
- [ ] WooCommerce integration
- [ ] Squarespace integration
- [ ] Free tier implementation
- [ ] Usage-based limits

### Phase 2: Expand Platforms
- [ ] BigCommerce integration
- [ ] Wix integration
- [ ] Order sync from all platforms
- [ ] Unified dashboard

### Phase 3: Filing Preparation
- [ ] Generate filing-ready reports
- [ ] State-specific filing instructions
- [ ] Pre-filled form data (PDF export)
- [ ] Filing calendar with reminders

### Phase 4: Filing & Remittance (Careful)
- [ ] Partner with licensed filing service
- [ ] OR: File on behalf as authorized agent
- [ ] Remittance escrow/pass-through

---

## Filing & Remittance: Legal Considerations

### The Liability Concern

Filing tax returns and remitting payments on behalf of customers creates legal exposure:

1. **Errors = Your Problem** - If you file incorrectly, customer gets audited, you may be liable
2. **Missed Deadlines** - Late filings = penalties, customer blames you
3. **Money Handling** - Holding/remitting funds requires compliance (money transmitter laws vary by state)
4. **Professional Licensing** - Some states require CPA/tax preparer licenses to file returns

### Risk Mitigation Options

**Option A: Filing Preparation Only (Safest)**
- Generate reports and pre-filled forms
- Customer reviews and submits themselves
- Clear disclaimer: "Not tax advice, consult a professional"
- **Liability:** Minimal — you're a tool, not a filer

**Option B: Partner with Licensed Service**
- Partner with a CPA firm or filing service (e.g., TaxHero, Taxwire)
- They handle actual filing, you provide the data
- Revenue share model
- **Liability:** Shifted to partner

**Option C: Become Authorized Filing Agent**
- Register as tax preparer in each state (complex)
- Get E&O insurance (errors & omissions)
- Strict SLAs and audit trails
- **Liability:** High, but insurable

**Option D: Merchant of Record Model**
- You become the seller of record (like Paddle, Gumroad)
- You collect, file, and remit — customer never touches it
- Completely different business model
- **Liability:** Highest, but cleanest for customer

### Recommendation

**Start with Option A** (filing preparation) — it's valuable and safe. 

Then explore **Option B** (partnership) to offer "one-click filing" without taking on liability directly.

Key language for terms of service:
- "Filing assistance tools provided for convenience only"
- "User is responsible for reviewing and submitting all tax filings"
- "Sails is not a tax advisor and does not provide tax advice"
- "Consult a qualified tax professional for specific advice"

---

## Competitive Positioning

| Feature | Sails | TaxJar | Avalara |
|---------|-------|--------|---------|
| Free tier | ✅ | ❌ | ❌ |
| Starting price | $9/mo | $19/mo | $50+/mo |
| Shopify | ✅ | ✅ | ✅ |
| WooCommerce | ✅ | ✅ | ✅ |
| Squarespace | ✅ | ❌ | ❌ |
| Nexus tracking | ✅ | Pro only | ✅ |
| Filing prep | ✅ (planned) | ✅ | ✅ |
| Small seller focus | ✅ | ❌ | ❌ |

**Key differentiator:** Built for the smallest sellers that others ignore.

---

## Marketing Angles

1. **"Finally, sales tax for the little guy"**
2. **"Free until you need more"**
3. **"Shopify collects. We help you file."**
4. **"WooCommerce tax that actually works"**
5. **"Your Squarespace store deserves better tax tools"**

## Next Steps

1. Implement usage tracking (orders/month per user)
2. Add Free tier with limits
3. Update Stripe to new pricing tiers
4. Build WooCommerce integration (REST API keys)
5. Build Squarespace integration
6. Landing pages targeting each platform
