import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Free Sales Tax Calculator — All 50 US States (2025)',
  description:
    'Calculate sales tax instantly for any US state. Free sales tax calculator with 2025 rates — no sign-up required. Enter your sale amount and state to get tax amount, total, and effective rate.',
  keywords:
    'sales tax calculator, free sales tax calculator, sales tax by state, how to calculate sales tax, 2025 sales tax rates, US sales tax',
  openGraph: {
    title: 'Free Sales Tax Calculator — All 50 US States (2025)',
    description:
      'Instantly calculate sales tax for any US state. Free, no login required. 2025 rates updated from official state sources.',
    type: 'website',
    url: 'https://sails.tax/free-calculator',
    images: [
      {
        url: '/og-image.png',
        width: 1200,
        height: 630,
        alt: 'Sails Free Sales Tax Calculator',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Free Sales Tax Calculator — All 50 US States (2025)',
    description:
      'Instantly calculate sales tax for any US state. No sign-up needed.',
    images: ['/og-image.png'],
  },
  alternates: {
    canonical: 'https://sails.tax/free-calculator',
  },
};

// JSON-LD structured data: WebApplication + FAQPage schemas
const jsonLdWebApp = {
  '@context': 'https://schema.org',
  '@type': 'WebApplication',
  name: 'Sails Free Sales Tax Calculator',
  url: 'https://sails.tax/free-calculator',
  applicationCategory: 'FinanceApplication',
  operatingSystem: 'Web',
  description:
    'Free sales tax calculator for all 50 US states. No sign-up required. Uses 2025 combined state + local rates.',
  offers: {
    '@type': 'Offer',
    price: '0',
    priceCurrency: 'USD',
  },
  provider: {
    '@type': 'Organization',
    name: 'Sails',
    url: 'https://sails.tax',
  },
};

const jsonLdFaq = {
  '@context': 'https://schema.org',
  '@type': 'FAQPage',
  mainEntity: [
    {
      '@type': 'Question',
      name: 'How do I calculate sales tax?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'Multiply the sale price by the sales tax rate. For example, $100 × 8.5% = $8.50 in tax, making your total $108.50.',
      },
    },
    {
      '@type': 'Question',
      name: 'Which states have no sales tax?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'Five states have no state sales tax: Alaska, Delaware, Montana, New Hampshire, and Oregon.',
      },
    },
    {
      '@type': 'Question',
      name: 'What is the highest sales tax state?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'Louisiana, Tennessee, and Arkansas typically have the highest combined sales tax rates in the US, often above 9%.',
      },
    },
    {
      '@type': 'Question',
      name: 'Do I need to collect sales tax on all my sales?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'It depends on nexus — your business presence in a state. Most states use economic nexus thresholds ($100K in sales or 200 transactions per year).',
      },
    },
  ],
};

export default function FreeCalculatorLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLdWebApp) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLdFaq) }}
      />
      {children}
    </>
  );
}
