'use client';

import { useState } from 'react';
import Header from '@/components/Header';
import Footer from '@/components/Footer';

interface FAQItem {
  question: string;
  answer: string;
}

const faqs: FAQItem[] = [
  {
    question: "What is sales tax nexus?",
    answer: "Nexus is the connection between your business and a state that requires you to collect and remit sales tax. You can establish nexus through physical presence (offices, employees, inventory) or economic activity (meeting sales or transaction thresholds). Most states have economic nexus thresholds around $100,000 in sales or 200 transactions."
  },
  {
    question: "How accurate are your tax rates?",
    answer: "We strive for high accuracy by sourcing rates from state departments of revenue and tax foundation data. However, our rates are estimates and should be verified with official sources before filing. Tax rates change frequently, and local taxes (city/county) may vary from our averages. Always consult official state tax authority websites for the most current rates."
  },
  {
    question: "Is Sails tax advice?",
    answer: "No. Sails is a tax calculation and compliance TOOL, not a tax advisory service. We are not CPAs, enrolled agents, or tax attorneys. Our tools help estimate sales tax, but you should consult qualified tax professionals for advice specific to your business situation."
  },
  {
    question: "How do I know if I need to collect sales tax?",
    answer: "If you have nexus in a state and sell taxable products or services, you likely need to collect sales tax. The rules vary by state. Key factors include: physical presence, economic nexus thresholds, marketplace facilitator laws, and the taxability of your products. We recommend consulting with a tax professional to determine your obligations."
  },
  {
    question: "What product categories have special tax treatment?",
    answer: "Many states have exemptions or reduced rates for certain categories: groceries (often exempt or reduced), clothing (exempt under certain amounts in NY, PA, NJ, MN), digital goods (varies widely), medical supplies (often exempt), and prepared food (usually taxable at full rate). Use our calculator to see category-specific rates by state."
  },
  {
    question: "Can I export my data?",
    answer: "Yes! Under GDPR and CCPA, you have the right to data portability. Go to Settings > Data & Privacy > Export Data to download all your information in JSON format. This includes your profile, calculations, nexus settings, and preferences."
  },
  {
    question: "How do I delete my account?",
    answer: "You can delete your account from Settings > Data & Privacy > Delete Account. This will permanently remove all your data within 30 days. Note that we may retain some data for legal compliance (e.g., tax records for 7 years as required by law)."
  },
  {
    question: "What integrations do you support?",
    answer: "We support Shopify, WooCommerce, Squarespace, BigCommerce, and Wix. These platforms require you to handle your own sales tax — unlike marketplaces (Etsy, Amazon, eBay) which collect and remit tax for you. Integration allows automatic import of transactions for tax calculation."
  },
  {
    question: "Do you file tax returns for me?",
    answer: "We prepare filing-ready reports and pre-fill the data you need, but you review and submit the returns yourself. This keeps you in control and ensures accuracy. We send deadline reminders so you never miss a filing date. Note: Sails provides tax calculation tools, not tax advice — consult a tax professional for specific guidance."
  },
  {
    question: "What if I get audited?",
    answer: "Enterprise plan subscribers receive audit support, including preparation assistance and representation coordination. For all users, we maintain detailed calculation logs that can help document your compliance efforts. Keep your own records as well - our data should supplement, not replace, your business records."
  }
];

export default function ContactPage() {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    subject: 'general',
    message: ''
  });
  const [submitted, setSubmitted] = useState(false);
  const [expandedFaq, setExpandedFaq] = useState<number | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // In production, this would send to a backend API
    console.log('Contact form submitted:', formData);
    setSubmitted(true);
    setTimeout(() => {
      setFormData({ name: '', email: '', subject: 'general', message: '' });
      setSubmitted(false);
    }, 5000);
  };

  return (
    <div className="min-h-screen bg-theme-gradient">
      <Header />
      
      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="text-center mb-12">
          <h1 className="text-3xl sm:text-4xl font-bold text-theme-primary mb-4">Contact & Support</h1>
          <p className="text-theme-muted max-w-2xl mx-auto">
            Have questions? We&apos;re here to help. Check our FAQ below or send us a message.
          </p>
        </div>

        <div className="grid lg:grid-cols-2 gap-8">
          {/* Contact Form */}
          <div className="card-theme rounded-2xl p-8">
            <h2 className="text-2xl font-semibold text-theme-primary mb-6">Send Us a Message</h2>
            
            {submitted ? (
              <div className="btn-theme-primary/20 border border-theme-accent/30 rounded-lg p-6 text-center">
                <div className="text-4xl mb-4">✉️</div>
                <h3 className="text-xl font-semibold text-theme-accent mb-2">Message Sent!</h3>
                <p className="text-theme-secondary">
                  Thank you for contacting us. We&apos;ll get back to you within 1-2 business days.
                </p>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-theme-secondary mb-2 font-medium">Your Name</label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-theme-primary focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    placeholder="John Doe"
                  />
                </div>

                <div>
                  <label className="block text-theme-secondary mb-2 font-medium">Email Address</label>
                  <input
                    type="email"
                    required
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-theme-primary focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    placeholder="john@example.com"
                  />
                </div>

                <div>
                  <label className="block text-theme-secondary mb-2 font-medium">Subject</label>
                  <select
                    value={formData.subject}
                    onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                    className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-theme-primary focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  >
                    <option value="general" className="bg-slate-800">General Inquiry</option>
                    <option value="support" className="bg-slate-800">Technical Support</option>
                    <option value="billing" className="bg-slate-800">Billing Question</option>
                    <option value="sales" className="bg-slate-800">Sales / Enterprise</option>
                    <option value="feedback" className="bg-slate-800">Feedback / Feature Request</option>
                    <option value="privacy" className="bg-slate-800">Privacy / Data Request</option>
                  </select>
                </div>

                <div>
                  <label className="block text-theme-secondary mb-2 font-medium">Message</label>
                  <textarea
                    required
                    rows={5}
                    value={formData.message}
                    onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                    className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-theme-primary focus:outline-none focus:ring-2 focus:ring-emerald-500 resize-none"
                    placeholder="How can we help you?"
                  />
                </div>

                <button
                  type="submit"
                  className="w-full btn-theme-primary  text-theme-primary py-3 rounded-lg font-semibold transition"
                >
                  Send Message
                </button>
              </form>
            )}

            {/* Direct Contact Info */}
            <div className="mt-8 pt-8 border-t border-theme-primary">
              <h3 className="text-lg font-medium text-theme-primary mb-4">Or reach us directly:</h3>
              <div className="space-y-3 text-theme-secondary">
                <div className="flex items-center gap-3">
                  <span className="text-xl">📧</span>
                  <div>
                    <p className="font-medium">General Support</p>
                    <a href="mailto:support@sails.tax" className="text-theme-accent hover:text-emerald-300">
                      support@sails.tax
                    </a>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-xl">💼</span>
                  <div>
                    <p className="font-medium">Enterprise Sales</p>
                    <a href="mailto:sales@sails.tax" className="text-theme-accent hover:text-emerald-300">
                      sales@sails.tax
                    </a>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-xl">🔒</span>
                  <div>
                    <p className="font-medium">Privacy Requests</p>
                    <a href="mailto:privacy@sails.tax" className="text-theme-accent hover:text-emerald-300">
                      privacy@sails.tax
                    </a>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* FAQ Section */}
          <div className="card-theme rounded-2xl p-8">
            <h2 className="text-2xl font-semibold text-theme-primary mb-6">Frequently Asked Questions</h2>
            
            <div className="space-y-3">
              {faqs.map((faq, index) => (
                <div key={index} className="border border-theme-primary rounded-lg overflow-hidden">
                  <button
                    onClick={() => setExpandedFaq(expandedFaq === index ? null : index)}
                    className="w-full px-4 py-3 text-left flex items-center justify-between hover:bg-white/5 transition"
                  >
                    <span className="font-medium text-theme-primary pr-4">{faq.question}</span>
                    <span className={`text-theme-accent transition-transform ${expandedFaq === index ? 'rotate-180' : ''}`}>
                      ▼
                    </span>
                  </button>
                  {expandedFaq === index && (
                    <div className="px-4 pb-4 text-theme-secondary text-sm leading-relaxed">
                      {faq.answer}
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Response Time Info */}
            <div className="mt-8 p-4 rounded-lg" style={{ backgroundColor: 'var(--info-bg)', border: '1px solid var(--info-border)' }}>
              <h3 className="font-medium mb-2" style={{ color: 'var(--info-text)' }}>📧 Email Response Times</h3>
              <ul className="text-sm text-theme-secondary space-y-1">
                <li>• <strong>Email:</strong> 1-2 business days</li>
                <li>• <strong>Pro:</strong> Within 24 hours</li>
                <li>• <strong>Business:</strong> Within 4 hours</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Tax Disclaimer */}
        <div className="mt-8 p-4 rounded-lg text-center" style={{ backgroundColor: 'var(--warning-bg)', border: '1px solid var(--warning-border)' }}>
          <p className="text-sm" style={{ color: 'var(--warning-text)' }}>
            <strong>Note:</strong> Our support team can help with product questions and technical issues. 
            For specific tax advice about your business, please consult a qualified tax professional (CPA or tax attorney).
          </p>
        </div>
      </main>

      <Footer />
    </div>
  );
}
