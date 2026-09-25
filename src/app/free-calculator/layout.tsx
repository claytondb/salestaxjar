import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Free Sales Tax Calculator — All 50 US States (2026)',
  description:
    'Calculate sales tax instantly for any US state. Free sales tax calculator with July 2026 rates — no sign-up required. Enter your sale amount and state to get tax amount, total, and effective rate.',
  keywords:
    'sales tax calculator, free sales tax calculator, sales tax by state, how to calculate sales tax, 2026 sales tax rates, US sales tax',
  openGraph: {
    title: 'Free Sales Tax Calculator — All 50 US States (2026)',
    description:
      'Instantly calculate sales tax for any US state. Free, no login required. State and average local rates as of July 2026.',
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
    title: 'Free Sales Tax Calculator — All 50 US States (2026)',
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
    'Free sales tax calculator for all 50 US states. No sign-up required. Uses combined state + average local rates as of July 2026.',
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
        text: 'It depends on nexus — your business presence in a state. Most states use a $100,000 sales threshold; a few set a higher amount, and some also count transactions.',
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
