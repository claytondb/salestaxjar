'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import { Calendar, Clock, ArrowRight, Search, Grid3X3, List, X } from 'lucide-react';

interface BlogPost {
  slug: string;
  title: string;
  date: string;
  excerpt: string;
  author: string;
  category: string;
  readTime: string;
}

interface BlogContentProps {
  posts: BlogPost[];
}

export default function BlogContent({ posts }: BlogContentProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  // Get unique categories
  const categories = useMemo(() => {
    const cats = [...new Set(posts.map(post => post.category))];
    return cats.sort();
  }, [posts]);

  // Filter posts based on search and category
  const filteredPosts = useMemo(() => {
    return posts.filter(post => {
      const matchesSearch = searchQuery === '' || 
        post.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        post.excerpt.toLowerCase().includes(searchQuery.toLowerCase()) ||
        post.category.toLowerCase().includes(searchQuery.toLowerCase());
      
      const matchesCategory = selectedCategory === null || post.category === selectedCategory;
      
      return matchesSearch && matchesCategory;
    });
  }, [posts, searchQuery, selectedCategory]);

  return (
    <>
      {/* Search and Controls */}
      <section className="py-6 px-4">
        <div className="max-w-6xl mx-auto">
          {/* Search Bar */}
          <div className="relative mb-6">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-theme-secondary" />
            <input
              type="text"
              placeholder="Search articles..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-12 pr-10 py-3 bg-theme-card border border-theme-primary rounded-xl text-theme-primary placeholder:text-theme-muted focus:border-theme-accent focus:outline-none focus:ring-2 focus:ring-accent-bg transition"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-theme-secondary hover:text-theme-primary transition"
              >
                <X className="w-5 h-5" />
              </button>
            )}
          </div>

          {/* Filters and View Toggle */}
          <div className="flex flex-wrap items-center justify-between gap-4">
            {/* Category Filters */}
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => setSelectedCategory(null)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
                  selectedCategory === null
                    ? 'bg-[var(--accent-primary-hover)] text-white shadow-md'
                    : 'bg-theme-card border border-theme-primary text-theme-secondary hover:border-theme-accent hover:text-theme-accent'
                }`}
              >
                All ({posts.length})
              </button>
              {categories.map(category => {
                const count = posts.filter(p => p.category === category).length;
                return (
                  <button
                    key={category}
                    onClick={() => setSelectedCategory(category)}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
                      selectedCategory === category
                        ? 'bg-[var(--accent-primary-hover)] text-white shadow-md'
                        : 'bg-theme-card border border-theme-primary text-theme-secondary hover:border-theme-accent hover:text-theme-accent'
                    }`}
                  >
                    {category} ({count})
                  </button>
                );
              })}
            </div>

            {/* View Toggle */}
            <div className="flex items-center gap-1 bg-theme-card border border-theme-primary rounded-lg p-1">
              <button
                onClick={() => setViewMode('grid')}
                className={`p-2 rounded transition ${
                  viewMode === 'grid'
                    ? 'bg-[var(--accent-primary-hover)] text-white shadow-sm'
                    : 'text-theme-secondary hover:text-theme-accent hover:bg-[var(--bg-card-hover)]'
                }`}
                title="Grid view"
              >
                <Grid3X3 className="w-5 h-5" />
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`p-2 rounded transition ${
                  viewMode === 'list'
                    ? 'bg-[var(--accent-primary-hover)] text-white shadow-sm'
                    : 'text-theme-secondary hover:text-theme-accent hover:bg-[var(--bg-card-hover)]'
                }`}
                title="List view"
              >
                <List className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Results count */}
          {(searchQuery || selectedCategory) && (
            <p className="mt-4 text-theme-secondary text-sm">
              Showing {filteredPosts.length} of {posts.length} articles
              {selectedCategory && <span> in <strong>{selectedCategory}</strong></span>}
              {searchQuery && <span> matching "<strong>{searchQuery}</strong>"</span>}
            </p>
          )}
        </div>
      </section>

      {/* Posts */}
      <section className="py-4 px-4 pb-20">
        <div className="max-w-6xl mx-auto">
          {filteredPosts.length === 0 ? (
            <div className="text-center py-16">
              <p className="text-theme-secondary text-lg mb-4">No articles found.</p>
              <button
                onClick={() => {
                  setSearchQuery('');
                  setSelectedCategory(null);
                }}
                className="text-theme-accent hover:underline"
              >
                Clear filters
              </button>
            </div>
          ) : viewMode === 'grid' ? (
            /* Grid View */
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredPosts.map((post) => (
                <Link
                  key={post.slug}
                  href={`/blog/${post.slug}`}
                  className="group bg-theme-card border border-theme-primary rounded-xl overflow-hidden hover:shadow-lg hover:border-theme-accent transition-all"
                >
                  <article className="p-6 h-full flex flex-col">
                    <div className="flex items-center gap-3 text-sm text-theme-secondary mb-3">
                      <span className="bg-accent-subtle text-theme-accent px-2 py-1 rounded text-xs font-medium">
                        {post.category}
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {post.readTime}
                      </span>
                    </div>
                    <h2 className="text-xl font-semibold text-theme-primary mb-3 line-clamp-2 group-hover:text-theme-accent transition">
                      {post.title}
                    </h2>
                    <p className="text-theme-secondary mb-4 line-clamp-3 flex-grow">
                      {post.excerpt}
                    </p>
                    <div className="flex items-center justify-between mt-auto pt-4 border-t border-theme-primary">
                      <span className="flex items-center gap-1 text-sm text-theme-secondary">
                        <Calendar className="w-3 h-3" />
                        {new Date(post.date).toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric',
                        })}
                      </span>
                      <span className="text-theme-accent font-medium text-sm flex items-center gap-1 group-hover:gap-2 transition-all">
                        Read more <ArrowRight className="w-4 h-4" />
                      </span>
                    </div>
                  </article>
                </Link>
              ))}
            </div>
          ) : (
            /* List View */
            <div className="space-y-4">
              {filteredPosts.map((post) => (
                <Link
                  key={post.slug}
                  href={`/blog/${post.slug}`}
                  className="group block bg-theme-card border border-theme-primary rounded-xl overflow-hidden hover:shadow-lg hover:border-theme-accent transition-all"
                >
                  <article className="p-6 flex flex-col sm:flex-row gap-4">
                    <div className="flex-grow">
                      <div className="flex items-center gap-3 text-sm text-theme-secondary mb-2">
                        <span className="bg-accent-subtle text-theme-accent px-2 py-1 rounded text-xs font-medium">
                          {post.category}
                        </span>
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          {new Date(post.date).toLocaleDateString('en-US', {
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric',
                          })}
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {post.readTime}
                        </span>
                      </div>
                      <h2 className="text-xl font-semibold text-theme-primary mb-2 group-hover:text-theme-accent transition">
                        {post.title}
                      </h2>
                      <p className="text-theme-secondary line-clamp-2">
                        {post.excerpt}
                      </p>
                    </div>
                    <div className="flex items-center sm:pl-4 sm:border-l sm:border-theme-primary">
                      <span className="text-theme-accent font-medium text-sm flex items-center gap-1 group-hover:gap-2 transition-all whitespace-nowrap">
                        Read <ArrowRight className="w-4 h-4" />
                      </span>
                    </div>
                  </article>
                </Link>
              ))}
            </div>
          )}
        </div>
      </section>
    </>
  );
}
