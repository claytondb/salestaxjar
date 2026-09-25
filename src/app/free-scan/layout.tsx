import type { Metadata } from 'next';

const title = 'Free Sales Tax Nexus Check — See Which States You Owe';
const description =
  "Drop in your Shopify, Amazon, Etsy or WooCommerce order exports and see which states' economic nexus thresholds you've crossed. Runs in your browser — your files are never uploaded.";

export const metadata: Metadata = {
  title,
  description,
  keywords:
    'economic nexus check, sales tax nexus calculator, where do I owe sales tax, nexus threshold by state, marketplace sales nexus, Shopify sales tax nexus',
  openGraph: {
    title,
    description,
    type: 'website',
    url: 'https://sails.tax/free-scan',
  },
  twitter: {
    card: 'summary_large_image',
    title,
    description,
  },
  alternates: {
    canonical: 'https://sails.tax/free-scan',
  },
};

export default function FreeScanLayout({ children }: { children: React.ReactNode }) {
  return children;
}
