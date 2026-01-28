import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/context/AuthContext";
import CookieConsent from "@/components/CookieConsent";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "SalesTaxJar - Sales Tax Compliance Made Simple",
  description: "Automatically calculate, collect, and file sales tax for all 45+ US states. Stay compliant without the headache. Starting at $29/month.",
  keywords: "sales tax, tax compliance, e-commerce tax, shopify tax, amazon tax, etsy tax, sales tax calculator",
  openGraph: {
    title: "SalesTaxJar - Sales Tax Compliance Made Simple",
    description: "Automatically calculate, collect, and file sales tax for all 45+ US states.",
    type: "website",
  },
  robots: {
    index: true,
    follow: true,
  },
};

// Script to prevent flash of wrong theme
const themeScript = `
  (function() {
    try {
      var theme = localStorage.getItem('theme');
      var root = document.documentElement;
      root.classList.add('no-transitions');
      
      if (theme === 'dark') {
        root.classList.add('dark');
      } else if (theme === 'light') {
        root.classList.remove('dark');
      } else {
        // System preference
        if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
          root.classList.add('dark');
        }
      }
      
      // Remove no-transitions after a brief moment
      setTimeout(function() {
        root.classList.remove('no-transitions');
      }, 100);
    } catch (e) {}
  })();
`;

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body className={inter.className}>
        <AuthProvider>
          {children}
          <CookieConsent />
        </AuthProvider>
      </body>
    </html>
  );
}
