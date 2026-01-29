import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/context/AuthContext";
import { ThemeProvider } from "@/context/ThemeContext";
import CookieConsent from "@/components/CookieConsent";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Sails - Sales Tax Compliance Made Simple",
  description: "Automatically calculate, collect, and file sales tax for all 45+ US states. Stay compliant without the headache. Starting at $29/month.",
  keywords: "sales tax, tax compliance, e-commerce tax, shopify tax, amazon tax, etsy tax, sales tax calculator",
  openGraph: {
    title: "Sails - Sales Tax Compliance Made Simple",
    description: "Automatically calculate, collect, and file sales tax for all 45+ US states.",
    type: "website",
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="theme-default">
      <body className={inter.className}>
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
