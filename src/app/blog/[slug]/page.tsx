import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getPostBySlug, getAllPostSlugs } from '@/lib/blog';
import Footer from '@/components/Footer';
import SailsLogo from '@/components/SailsLogo';
import ThemeToggle from '@/components/ThemeToggle';
import ShareButtons from '@/components/ShareButtons';
import { Calendar, Clock, ArrowLeft, User } from 'lucide-react';
import type { Metadata } from 'next';

interface Props {
  params: Promise<{ slug: string }>;
}

export async function generateStaticParams() {
  const slugs = getAllPostSlugs();
  return slugs.map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const post = await getPostBySlug(slug);
  
  if (!post) {
    return {
      title: 'Post Not Found | Sails',
    };
  }

  const ogImage = post.image ? `https://sails.tax${post.image}` : undefined;
  
  return {
    title: `${post.title} | Sails Blog`,
    description: post.excerpt,
    openGraph: {
      title: post.title,
      description: post.excerpt,
      type: 'article',
      publishedTime: post.date,
      authors: [post.author],
      url: `https://sails.tax/blog/${slug}`,
      ...(ogImage && { images: [{ url: ogImage, width: 1200, height: 630, alt: post.title }] }),
    },
    twitter: {
      card: 'summary_large_image',
      title: post.title,
      description: post.excerpt,
      ...(ogImage && { images: [ogImage] }),
    },
  };
}

export default async function BlogPostPage({ params }: Props) {
  const { slug } = await params;
  const post = await getPostBySlug(slug);

  if (!post) {
    notFound();
  }

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

      {/* Article */}
      <article className="py-12 px-4">
        <div className="max-w-3xl mx-auto">
          {/* Back link */}
          <Link 
            href="/blog"
            className="inline-flex items-center gap-2 text-theme-secondary hover:text-theme-accent transition mb-8"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Blog
          </Link>

          {/* Featured Image */}
          {post.image && (
            <div className="mb-8 rounded-xl overflow-hidden">
              <img 
                src={post.image} 
                alt={post.title}
                className="w-full h-auto object-cover"
              />
            </div>
          )}

          {/* Header */}
          <header className="mb-8">
            <span className="bg-accent-subtle text-theme-accent px-3 py-1 rounded-full text-sm font-medium">
              {post.category}
            </span>
            <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold text-theme-primary mt-4 mb-6">
              {post.title}
            </h1>
            <div className="flex flex-wrap items-center gap-4 text-theme-secondary mb-6">
              <span className="flex items-center gap-2">
                <User className="w-4 h-4" />
                {post.author}
              </span>
              <span className="flex items-center gap-2">
                <Calendar className="w-4 h-4" />
                {new Date(post.date).toLocaleDateString('en-US', {
                  month: 'long',
                  day: 'numeric',
                  year: 'numeric',
                })}
              </span>
              <span className="flex items-center gap-2">
                <Clock className="w-4 h-4" />
                {post.readTime}
              </span>
            </div>
            
            {/* Share Buttons */}
            <ShareButtons title={post.title} slug={slug} />
          </header>

          {/* Content */}
          <div 
            className="prose prose-lg max-w-none
              prose-headings:text-theme-primary prose-headings:font-semibold
              prose-p:text-theme-secondary prose-p:leading-relaxed
              prose-a:text-theme-accent prose-a:no-underline hover:prose-a:underline
              prose-strong:text-theme-primary
              prose-ul:text-theme-secondary prose-ol:text-theme-secondary
              prose-li:text-theme-secondary
              prose-blockquote:border-theme-accent prose-blockquote:text-theme-secondary
              prose-code:bg-theme-card prose-code:px-2 prose-code:py-1 prose-code:rounded prose-code:text-theme-accent
              prose-pre:bg-theme-card prose-pre:border prose-pre:border-theme-primary
              prose-table:text-theme-secondary
              prose-th:text-theme-primary
              prose-hr:border-theme-primary
            "
            dangerouslySetInnerHTML={{ __html: post.content || '' }}
          />

          {/* Share Buttons (Bottom) */}
          <div className="mt-10 pt-8 border-t border-theme-primary">
            <p className="text-theme-secondary text-sm mb-4">Found this helpful? Share it with others:</p>
            <ShareButtons title={post.title} slug={slug} />
          </div>

          {/* CTA */}
          <div className="mt-12 p-8 bg-theme-card border border-theme-primary rounded-xl text-center">
            <h3 className="text-2xl font-bold text-theme-primary mb-3">
              Ready to simplify your sales tax?
            </h3>
            <p className="text-theme-secondary mb-6">
              Join thousands of small sellers who trust Sails to handle the complexity.
            </p>
            <Link 
              href="/signup"
              className="btn-theme-primary px-6 py-3 rounded-lg font-medium inline-block"
            >
              Get Started Free
            </Link>
          </div>
        </div>
      </article>

      <Footer />
    </div>
  );
}
