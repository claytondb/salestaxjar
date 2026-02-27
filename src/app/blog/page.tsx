import Link from 'next/link';
import { getAllPosts } from '@/lib/blog';
import Footer from '@/components/Footer';
import SailsLogo from '@/components/SailsLogo';
import ThemeToggle from '@/components/ThemeToggle';
import BlogContent from '@/components/BlogContent';
import { Newspaper } from 'lucide-react';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Blog | Sails - Sales Tax Tips for Small Sellers',
  description: 'Expert advice on sales tax compliance, nexus rules, filing deadlines, and tips to help small online sellers stay compliant and stress-free.',
  openGraph: {
    title: 'Sails Blog - Sales Tax Tips for Small Sellers',
    description: 'Expert advice on sales tax compliance, nexus rules, and filing deadlines.',
    type: 'website',
    url: 'https://sails.tax/blog',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Sails Blog - Sales Tax Tips for Small Sellers',
    description: 'Expert advice on sales tax compliance, nexus rules, and filing deadlines.',
  },
};

export default function BlogPage() {
  const posts = getAllPosts();

  return (
    <div className="min-h-screen bg-theme-gradient">
      {/* Header */}
      <header className="border-b border-theme-primary bg-transparent backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex justify-between items-center">
            <Link href="/" className="flex items-center gap-2">
              <SailsLogo className="w-10 h-10 text-theme-accent" />
              <span className="text-2xl font-bold text-theme-primary">Sails</span>
            </Link>
            <nav className="hidden md:flex gap-6 items-center">
              <Link href="/#features" className="text-theme-secondary hover:text-theme-primary transition">Features</Link>
              <Link href="/pricing" className="text-theme-secondary hover:text-theme-primary transition">Pricing</Link>
              <Link href="/blog" className="text-theme-accent font-medium">Blog</Link>
              <ThemeToggle />
            </nav>
            <div className="flex gap-3 items-center">
              <div className="md:hidden">
                <ThemeToggle />
              </div>
              <Link href="/login" className="text-theme-secondary hover:text-theme-primary transition">Log in</Link>
              <Link href="/signup" className="btn-theme-primary px-4 py-2 rounded-lg font-medium transition">
                Get Started Free
              </Link>
            </div>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="py-16 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 bg-accent-subtle text-theme-accent px-4 py-2 rounded-full text-sm font-medium mb-6">
            <Newspaper className="w-4 h-4" />
            Sales Tax Insights
          </div>
          <h1 className="text-4xl sm:text-5xl font-bold text-theme-primary mb-4">
            The Sails Blog
          </h1>
          <p className="text-xl text-theme-secondary max-w-2xl mx-auto">
            Practical guides, tips, and news to help small online sellers navigate sales tax without the headache.
          </p>
        </div>
      </section>

      {/* Blog Content (Client Component with Search, Filters, View Toggle) */}
      <BlogContent posts={posts} />

      <Footer />
    </div>
  );
}
