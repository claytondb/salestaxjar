import type { Metadata } from "next";
import { Inter, Caveat } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/context/AuthContext";
import { ThemeProvider } from "@/context/ThemeContext";
import CookieConsent from "@/components/CookieConsent";

const inter = Inter({ subsets: ["latin"] });
const caveat = Caveat({ 
  subsets: ["latin"],
  variable: '--font-handwritten',
  display: 'swap',
});

export const metadata: Metadata = {
  title: "Sails - Sales Tax Made Breezy",
  description: "Know where you owe sales tax, when it's due, and how much. Built for small online sellers. Free to start, then just $9/month.",
  keywords: "sales tax, tax compliance, e-commerce tax, shopify tax, woocommerce tax, etsy tax, sales tax calculator, nexus tracking, small business",
  openGraph: {
    title: "Sails - Sales Tax Made Breezy",
    description: "Automatically calculate, collect, and file sales tax for all 45+ US states.",
    type: "website",
  },
  robots: {
    index: true,
    follow: true,
  },
};

// JSON-LD structured data for SEO
const jsonLd = {
  '@context': 'https://schema.org',
  '@type': 'SoftwareApplication',
  name: 'Sails',
  applicationCategory: 'BusinessApplication',
  operatingSystem: 'Web',
  description: 'Sales tax compliance software for small online sellers. Track nexus, calculate taxes, and stay compliant.',
  url: 'https://sails.tax',
  offers: {
    '@type': 'AggregateOffer',
    lowPrice: '0',
    highPrice: '59',
    priceCurrency: 'USD',
    offerCount: '4',
  },
  aggregateRating: {
    '@type': 'AggregateRating',
    ratingValue: '4.8',
    ratingCount: '50',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="theme-nautical">
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      </head>
      <body className={`${inter.className} ${caveat.variable}`}>
        <ThemeProvider>
          <AuthProvider>
            {children}
            <CookieConsent />
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
