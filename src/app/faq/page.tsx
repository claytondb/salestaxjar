'use client';

import { useState } from 'react';
import Link from 'next/link';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { ChevronDown, ChevronUp, Search, ExternalLink } from 'lucide-react';

interface FAQItem {
  question: string;
  answer: string;
  category: string;
  relatedLink?: { text: string; href: string };
}

const faqs: FAQItem[] = [
  // Sales Tax Basics
  {
    question: "What is sales tax?",
    answer: "Sales tax is a consumption tax imposed by state and local governments on the sale of goods and certain services. It's typically calculated as a percentage of the purchase price and collected by the seller at the point of sale. The seller then remits the collected tax to the appropriate tax authorities.",
    category: "Basics"
  },
  {
    question: "Who is responsible for collecting sales tax?",
    answer: "The seller (you, the business owner) is responsible for collecting sales tax from customers at the point of sale. Once collected, you must remit those taxes to the appropriate state and local tax authorities, typically on a monthly, quarterly, or annual basis depending on your sales volume.",
    category: "Basics"
  },
  {
    question: "Which states don't have sales tax?",
    answer: "Five states have no state-level sales tax: Alaska, Delaware, Montana, New Hampshire, and Oregon. However, Alaska allows local jurisdictions to impose sales taxes, so some areas in Alaska do have local sales tax. Delaware and Montana also have some gross receipts taxes that function similarly to sales tax for certain transactions.",
    category: "Basics"
  },
  {
    question: "What's the difference between sales tax and use tax?",
    answer: "Sales tax is collected by the seller at the time of purchase, while use tax is owed by the buyer when they purchase taxable items without paying sales tax (such as buying from an out-of-state seller who doesn't collect tax). Use tax is meant to level the playing field between in-state and out-of-state sellers.",
    category: "Basics"
  },
  
  // Nexus
  {
    question: "What is sales tax nexus?",
    answer: "Nexus is the connection between your business and a state that creates an obligation to collect and remit sales tax. You can establish nexus through physical presence (office, warehouse, employees, inventory) or through economic activity (exceeding sales thresholds). Once you have nexus in a state, you must register, collect, and remit sales tax there.",
    category: "Nexus",
    relatedLink: { text: "Learn more about nexus", href: "/blog/what-is-sales-tax-nexus" }
  },
  {
    question: "What is economic nexus?",
    answer: "Economic nexus is established when your sales into a state exceed certain thresholds, even without physical presence. Most states use a threshold of $100,000 in sales OR 200 transactions per year. After the 2018 South Dakota v. Wayfair Supreme Court decision, states can require remote sellers to collect sales tax based on economic activity alone.",
    category: "Nexus"
  },
  {
    question: "How do I know if I have nexus in a state?",
    answer: "You have nexus if you have: physical presence (office, warehouse, employees, inventory, trade show attendance), exceeded economic thresholds (typically $100K sales or 200 transactions), affiliates or partners marketing your products, or click-through arrangements with in-state websites. Each state has its own rules, so it's important to check each state where you sell.",
    category: "Nexus"
  },
  {
    question: "What triggers marketplace nexus?",
    answer: "Marketplace nexus is created when you sell through a marketplace like Amazon, Etsy, or eBay. In most states, the marketplace facilitator is responsible for collecting and remitting sales tax on your behalf. However, you may still need to register in states where you have direct sales or other nexus-creating activities.",
    category: "Nexus"
  },
  
  // Rates & Calculations
  {
    question: "How do I calculate the correct sales tax rate?",
    answer: "Sales tax rates vary by location and can include state, county, city, and special district taxes. The total rate is the sum of all applicable rates. You need to determine the correct rate based on the delivery destination (origin-based states use the seller's location, destination-based states use the buyer's location). This is why automated sales tax software is so valuable.",
    category: "Rates",
    relatedLink: { text: "Try our calculator", href: "/calculator" }
  },
  {
    question: "What is origin-based vs. destination-based sourcing?",
    answer: "Origin-based sourcing means you charge sales tax based on your business location. Destination-based sourcing (used by most states) means you charge based on where the product is delivered. For online sellers, destination-based sourcing is more common, meaning you need to know the tax rate for each customer's location.",
    category: "Rates"
  },
  {
    question: "Are digital products taxable?",
    answer: "It depends on the state. Some states tax digital products like software, e-books, and streaming services, while others don't. The rules vary significantly—some states tax downloads but not streaming, others tax all digital goods. Always check the specific state's rules for digital product taxation.",
    category: "Rates",
    relatedLink: { text: "Digital products guide", href: "/blog/digital-products-sales-tax" }
  },
  {
    question: "Are services taxable?",
    answer: "Most states primarily tax tangible personal property (physical goods), but many also tax certain services. Commonly taxed services include repair services, landscaping, cleaning services, and some professional services. The taxability of services varies widely by state.",
    category: "Rates"
  },
  
  // Registration & Filing
  {
    question: "How do I register for a sales tax permit?",
    answer: "You register for a sales tax permit through each state's Department of Revenue website. Most states offer free online registration. You'll need your EIN or SSN, business information, and estimated sales volume. Never collect sales tax without a valid permit—it's illegal in most states.",
    category: "Registration"
  },
  {
    question: "How often do I need to file sales tax returns?",
    answer: "Filing frequency depends on your sales volume and the state's rules. High-volume sellers typically file monthly, medium-volume sellers quarterly, and low-volume sellers annually. Each state assigns your filing frequency when you register, and it may change as your sales grow.",
    category: "Registration"
  },
  {
    question: "What happens if I'm late filing or paying sales tax?",
    answer: "Late filing and payment typically result in penalties and interest. Penalties can range from a flat fee to a percentage of the tax owed (often 5-25%). Interest accrues on unpaid balances. Some states offer penalty abatement for first-time late filers or for reasonable cause. It's always better to file on time, even if you can't pay in full.",
    category: "Registration"
  },
  {
    question: "What records do I need to keep for sales tax?",
    answer: "You should keep records of all sales (taxable and exempt), sales tax collected, exemption certificates from exempt customers, invoices, receipts, and filed returns. Most states require you to keep these records for 3-7 years. Good record-keeping is essential for audits.",
    category: "Registration"
  },
  
  // Exemptions
  {
    question: "What is a resale certificate?",
    answer: "A resale certificate (also called a reseller's permit or exemption certificate) allows you to purchase inventory without paying sales tax because you'll collect tax when you sell the item to the final consumer. You provide this certificate to your suppliers. Note: You can only use it for items you intend to resell, not for business use items.",
    category: "Exemptions"
  },
  {
    question: "What items are commonly exempt from sales tax?",
    answer: "Common exemptions include: groceries (in many states), prescription drugs, medical equipment, clothing (in some states), items purchased for resale, and sales to non-profit organizations. Each state has its own list of exemptions, so always verify the specific state's rules.",
    category: "Exemptions"
  },
  {
    question: "How do I handle exempt sales?",
    answer: "When a customer claims an exemption, collect a completed exemption certificate from them. Keep these certificates on file (they don't expire in most states, but some require periodic renewal). Document the exempt sale in your records. If audited, you'll need to produce these certificates to support your exempt sales.",
    category: "Exemptions"
  },
  
  // E-commerce Specific
  {
    question: "Do I need to collect sales tax for online sales?",
    answer: "Yes, if you have nexus in the customer's state. After the 2018 Wayfair decision, states can require online sellers to collect sales tax based on economic nexus (typically $100K in sales or 200 transactions). If you exceed these thresholds in a state, you must register, collect, and remit sales tax there.",
    category: "E-commerce"
  },
  {
    question: "Does Shopify/WooCommerce/Etsy handle my sales tax?",
    answer: "Marketplaces like Etsy and Amazon collect and remit sales tax on your behalf in most states under marketplace facilitator laws. However, platforms like Shopify and WooCommerce are just e-commerce tools—you're responsible for collecting and remitting sales tax yourself, though they can help calculate rates.",
    category: "E-commerce",
    relatedLink: { text: "Shopify sales tax guide", href: "/blog/shopify-sales-tax-guide" }
  },
  {
    question: "What about international sales?",
    answer: "U.S. sales tax typically doesn't apply to exports (sales shipped outside the U.S.). However, your customers may owe import duties and VAT/GST in their country. You're generally not responsible for collecting foreign taxes unless you have a presence in that country. Some countries do require foreign sellers to register for VAT if they exceed certain thresholds.",
    category: "E-commerce"
  },
  {
    question: "How do I handle returns and refunds for sales tax?",
    answer: "When you issue a refund, you can typically take a credit for the sales tax you originally collected. You'll report this on your sales tax return as a deduction. Keep documentation of the refund transaction. If you've already remitted the tax, you can usually claim a credit on a future return.",
    category: "E-commerce"
  }
];

const categories = ["All", "Basics", "Nexus", "Rates", "Registration", "Exemptions", "E-commerce"];

export default function FAQPage() {
  const [openIndex, setOpenIndex] = useState<number | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');

  const filteredFaqs = faqs.filter(faq => {
    const matchesSearch = faq.question.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         faq.answer.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory === 'All' || faq.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const toggleFAQ = (index: number) => {
    setOpenIndex(openIndex === index ? null : index);
  };

  return (
    <div className="min-h-screen bg-theme-gradient">
      <Header />
      
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-theme-primary mb-4">
            Sales Tax FAQ
          </h1>
          <p className="text-lg text-theme-secondary max-w-2xl mx-auto">
            Find answers to the most common sales tax questions for small businesses and online sellers.
          </p>
        </div>

        {/* Search and Filter */}
        <div className="mb-8 space-y-4">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-theme-muted w-5 h-5" />
            <input
              type="text"
              placeholder="Search questions..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-12 pr-4 py-3 bg-white/10 border border-white/20 rounded-xl text-theme-primary placeholder:text-theme-muted focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          {/* Category Filter */}
          <div className="flex flex-wrap gap-2">
            {categories.map(category => (
              <button
                key={category}
                onClick={() => setSelectedCategory(category)}
                className={`px-4 py-2 rounded-full text-sm font-medium transition ${
                  selectedCategory === category
                    ? 'btn-theme-primary text-white'
                    : 'bg-white/10 text-theme-secondary hover:bg-white/20'
                }`}
              >
                {category}
              </button>
            ))}
          </div>
        </div>

        {/* FAQ List */}
        <div className="space-y-3">
          {filteredFaqs.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-theme-muted">No questions found matching your search.</p>
            </div>
          ) : (
            filteredFaqs.map((faq, index) => {
              const isOpen = openIndex === index;
              return (
                <div
                  key={index}
                  className="card-theme rounded-xl border border-theme-primary overflow-hidden"
                >
                  <button
                    onClick={() => toggleFAQ(index)}
                    className="w-full px-6 py-4 flex items-center justify-between text-left hover:bg-white/5 transition"
                  >
                    <div className="flex-1 pr-4">
                      <span className="text-xs font-medium text-theme-accent uppercase tracking-wide">
                        {faq.category}
                      </span>
                      <h3 className="text-theme-primary font-medium mt-1">
                        {faq.question}
                      </h3>
                    </div>
                    {isOpen ? (
                      <ChevronUp className="w-5 h-5 text-theme-muted flex-shrink-0" />
                    ) : (
                      <ChevronDown className="w-5 h-5 text-theme-muted flex-shrink-0" />
                    )}
                  </button>
                  
                  {isOpen && (
                    <div className="px-6 pb-4">
                      <div className="pt-2 border-t border-theme-primary">
                        <p className="text-theme-secondary mt-3 leading-relaxed">
                          {faq.answer}
                        </p>
                        {faq.relatedLink && (
                          <Link
                            href={faq.relatedLink.href}
                            className="inline-flex items-center gap-1 mt-4 text-theme-accent hover:underline text-sm"
                          >
                            {faq.relatedLink.text}
                            <ExternalLink className="w-3 h-3" />
                          </Link>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* CTA Section */}
        <div className="mt-12 text-center p-8 rounded-2xl" style={{ backgroundColor: 'var(--bg-card)' }}>
          <h2 className="text-2xl font-bold text-theme-primary mb-3">
            Still have questions?
          </h2>
          <p className="text-theme-secondary mb-6">
            Our team is here to help you navigate sales tax compliance.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/contact"
              className="btn-theme-primary px-6 py-3 rounded-xl font-medium transition"
            >
              Contact Us
            </Link>
            <Link
              href="/blog"
              className="bg-white/10 hover:bg-white/20 text-theme-primary px-6 py-3 rounded-xl font-medium transition"
            >
              Read Our Blog
            </Link>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
