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
  description: "Automatically calculate, collect, and file sales tax for all 45+ US states. Stay compliant without the headache. Starting at $29/month.",
  keywords: "sales tax, tax compliance, e-commerce tax, shopify tax, amazon tax, etsy tax, sales tax calculator",
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

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="theme-nautical">
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
