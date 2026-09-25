'use client';

import { useState } from 'react';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { liveIntegrationNames, betaIntegrationNames } from '@/lib/capabilities';

interface FAQItem {
  question: string;
  answer: string;
}

const faqs: FAQItem[] = [
  {
    question: "What is sales tax nexus?",
    answer: "Nexus is the connection between your business and a state that requires you to collect and remit sales tax. You can establish nexus through physical presence (offices, employees, inventory) or economic activity (meeting sales or transaction thresholds). Most states set their economic nexus threshold at $100,000 in sales a year; some also count 200 transactions, and a few (like California, New York, Texas, Alabama and Mississippi) use higher amounts."
  },
  {
    question: "How accurate are your tax rates?",
    answer: "Our calculator uses each state's rate plus the average local rate published by the Tax Foundation (rates as of July 1, 2026). That makes it a good estimate, not an exact rate for a specific address — local rates vary by city, county and special district. Verify rates with official state sources before filing."
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
    answer: "Many states have exemptions or reduced rates for certain categories: groceries (often exempt or reduced), clothing (fully or partly exempt in states like PA, NJ, MN and NY), digital goods (varies widely), medical supplies (often exempt), and prepared food (usually taxable at full rate). Use our calculator to see category-specific rates by state."
  },
  {
    question: "Can I export my data?",
    answer: "Yes! Under GDPR and CCPA, you have the right to data portability. Go to Settings > Data & Privacy > Export All Data to download everything Sails stores about your account in JSON format — your profile, businesses, nexus states, filings, calculations, connected stores, imported orders and settings."
  },
  {
    question: "How do I delete my account?",
    answer: "You can delete your account from Settings > Data & Privacy > Delete Account. Your account and all its data are deleted right away and can't be recovered. Stripe keeps its own billing records as required by law."
  },
  {
    question: "What integrations do you support?",
    answer: `${liveIntegrationNames()} are live. ${betaIntegrationNames()} are in beta — they work, but please double-check the numbers they produce. Pro plans can also use our tax calculation API. Marketplaces like Amazon, Etsy and eBay collect tax for you, but many states still count those sales toward your own threshold, so include them.`
  },
  {
    question: "Do you file tax returns for me?",
    answer: "No. Sails shows your sales and tax collected by state and keeps your filing deadlines on one calendar, and you or your accountant file with each state. Sails provides tax tools, not tax advice — consult a tax professional for specific guidance."
  },
  {
    question: "What if I get audited?",
    answer: "Sails maintains detailed calculation logs that can help document your compliance efforts. You can export your calculation history and reports at any time. Keep your own records as well — our data should supplement, not replace, your business records. For audit-specific guidance, we recommend consulting with a qualified tax professional."
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
                    <option value="general" className="bg-theme-card">General Inquiry</option>
                    <option value="support" className="bg-theme-card">Technical Support</option>
                    <option value="billing" className="bg-theme-card">Billing Question</option>
                    <option value="sales" className="bg-theme-card">Sales / Enterprise</option>
                    <option value="feedback" className="bg-theme-card">Feedback / Feature Request</option>
                    <option value="privacy" className="bg-theme-card">Privacy / Data Request</option>
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
                    <a href="mailto:support@sails.tax" className="text-theme-accent hover:opacity-80">
                      support@sails.tax
                    </a>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-xl">💼</span>
                  <div>
                    <p className="font-medium">Enterprise Sales</p>
                    <a href="mailto:sales@sails.tax" className="text-theme-accent hover:opacity-80">
                      sales@sails.tax
                    </a>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-xl">🔒</span>
                  <div>
                    <p className="font-medium">Privacy Requests</p>
                    <a href="mailto:support@sails.tax" className="text-theme-accent hover:opacity-80">
                      support@sails.tax
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
