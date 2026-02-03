'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { 
  Download, 
  CheckCircle, 
  ArrowLeft, 
  Key, 
  Settings, 
  ShoppingCart,
  ExternalLink,
  Copy,
  Check
} from 'lucide-react';

export default function WooCommerceIntegrationPage() {
  const { user, isLoading } = useAuth();
  const router = useRouter();
  const [copied, setCopied] = useState(false);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-theme-gradient flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-theme-accent"></div>
      </div>
    );
  }

  if (!user) {
    router.push('/login?redirect=/dashboard/integrations/woocommerce');
    return null;
  }

  const handleDownload = () => {
    // Direct download from static file
    window.location.href = '/downloads/sails-tax-for-woocommerce.zip';
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const steps = [
    {
      number: 1,
      title: 'Download the Plugin',
      description: 'Click the download button below to get the Sails Tax for WooCommerce plugin.',
      action: (
        <button
          onClick={handleDownload}
          className="btn-theme-primary px-6 py-3 rounded-lg font-medium flex items-center gap-2"
        >
          <Download className="w-5 h-5" />
          Download Plugin (ZIP)
        </button>
      ),
    },
    {
      number: 2,
      title: 'Install in WordPress',
      description: 'In your WordPress admin, go to Plugins → Add New → Upload Plugin, then upload the ZIP file.',
      icon: <Settings className="w-6 h-6" />,
    },
    {
      number: 3,
      title: 'Get Your API Key',
      description: 'Go to Settings → API Keys in your Sails dashboard to create an API key.',
      action: (
        <a
          href="/settings#apikeys"
          className="text-theme-accent hover:opacity-80 flex items-center gap-1"
        >
          Go to API Keys <ExternalLink className="w-4 h-4" />
        </a>
      ),
    },
    {
      number: 4,
      title: 'Configure the Plugin',
      description: 'In WooCommerce → Settings → Sails Tax, enter your API key and business address.',
      icon: <Key className="w-6 h-6" />,
    },
    {
      number: 5,
      title: 'Enable Tax Calculation',
      description: 'Check "Enable Sails Tax" and save. Tax will now calculate automatically at checkout!',
      icon: <CheckCircle className="w-6 h-6" />,
    },
  ];

  return (
    <div className="min-h-screen bg-theme-gradient">
      <Header />
      
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Back Link */}
        <a
          href="/dashboard/integrations"
          className="inline-flex items-center gap-2 text-theme-muted hover:text-theme-primary mb-6"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Integrations
        </a>

        {/* Header */}
        <div className="bg-theme-secondary/30 backdrop-blur rounded-xl border border-theme-primary p-6 mb-8">
          <div className="flex items-center gap-4 mb-4">
            <div className="w-16 h-16 bg-[#96588a] rounded-xl flex items-center justify-center">
              <ShoppingCart className="w-8 h-8 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-theme-primary">WooCommerce Tax Plugin</h1>
              <p className="text-theme-muted">Automatic sales tax calculation at checkout</p>
            </div>
          </div>
          <p className="text-theme-secondary">
            Install our official WooCommerce plugin to automatically calculate and apply accurate 
            sales tax at checkout. Works with all 13,000+ US tax jurisdictions including state, 
            county, city, and special district rates.
          </p>
        </div>

        {/* Features */}
        <div className="grid md:grid-cols-3 gap-4 mb-8">
          <div className="bg-theme-secondary/30 backdrop-blur rounded-xl border border-theme-primary p-4">
            <h3 className="font-semibold text-theme-primary mb-2">Real-Time Rates</h3>
            <p className="text-sm text-theme-muted">Accurate rates calculated instantly based on customer&apos;s address</p>
          </div>
          <div className="bg-theme-secondary/30 backdrop-blur rounded-xl border border-theme-primary p-4">
            <h3 className="font-semibold text-theme-primary mb-2">Smart Caching</h3>
            <p className="text-sm text-theme-muted">Fast checkout with intelligent rate caching</p>
          </div>
          <div className="bg-theme-secondary/30 backdrop-blur rounded-xl border border-theme-primary p-4">
            <h3 className="font-semibold text-theme-primary mb-2">Easy Setup</h3>
            <p className="text-sm text-theme-muted">Connect in under 5 minutes with just an API key</p>
          </div>
        </div>

        {/* Setup Steps */}
        <div className="bg-theme-secondary/30 backdrop-blur rounded-xl border border-theme-primary p-6 mb-8">
          <h2 className="text-xl font-semibold text-theme-primary mb-6">Setup Instructions</h2>
          
          <div className="space-y-6">
            {steps.map((step, index) => (
              <div key={step.number} className="flex gap-4">
                <div className="flex-shrink-0 w-8 h-8 bg-theme-accent/20 rounded-full flex items-center justify-center">
                  <span className="text-theme-accent font-semibold">{step.number}</span>
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-theme-primary mb-1">{step.title}</h3>
                  <p className="text-theme-muted text-sm mb-2">{step.description}</p>
                  {step.action && <div className="mt-2">{step.action}</div>}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Code Example */}
        <div className="bg-theme-secondary/30 backdrop-blur rounded-xl border border-theme-primary p-6 mb-8">
          <h2 className="text-xl font-semibold text-theme-primary mb-4">API Reference</h2>
          <p className="text-theme-muted text-sm mb-4">
            The plugin uses our Tax Calculation API. Here&apos;s how it works:
          </p>
          
          <div className="bg-black/30 rounded-lg p-4 font-mono text-sm overflow-x-auto">
            <div className="flex justify-between items-center mb-2">
              <span className="text-theme-muted text-xs">POST /api/v1/tax/calculate</span>
              <button
                onClick={() => copyToClipboard(`curl -X POST https://sails.tax/api/v1/tax/calculate \\
  -H "Authorization: Bearer stax_your_api_key" \\
  -H "Content-Type: application/json" \\
  -d '{"amount": 100, "to_state": "CA", "to_zip": "90210"}'`)}
                className="text-theme-muted hover:text-theme-primary"
              >
                {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
              </button>
            </div>
            <pre className="text-green-400">
{`curl -X POST https://sails.tax/api/v1/tax/calculate \\
  -H "Authorization: Bearer stax_your_api_key" \\
  -H "Content-Type: application/json" \\
  -d '{"amount": 100, "to_state": "CA", "to_zip": "90210"}'`}
            </pre>
          </div>
        </div>

        {/* Support */}
        <div className="card-theme rounded-xl p-6 text-center">
          <h3 className="font-semibold text-theme-primary mb-2">Need Help?</h3>
          <p className="text-theme-muted text-sm mb-4">
            Having trouble with the integration? Our support team is here to help.
          </p>
          <a
            href="mailto:support@sails.tax"
            className="text-theme-accent hover:opacity-80 font-medium"
          >
            Contact Support →
          </a>
        </div>
      </main>

      <Footer />
    </div>
  );
}
