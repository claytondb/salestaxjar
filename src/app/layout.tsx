import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

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
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={inter.className}>{children}</body>
    </html>
  );
}
