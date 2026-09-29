import { MetadataRoute } from 'next';
import { getAllPosts } from '@/lib/blog';
import { STATE_GUIDES } from '@/lib/state-guides';
import { NEXUS_RULES_REVIEWED_ON } from '@/lib/nexus-thresholds';

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = 'https://sails.tax';
  
  // Get all blog posts for sitemap
  const posts = getAllPosts();
  const blogUrls = posts.map((post) => {
    // Safely parse date, fallback to current date if invalid
    let lastModified: Date;
    try {
      const parsed = new Date(post.date);
      lastModified = isNaN(parsed.getTime()) ? new Date() : parsed;
    } catch {
      lastModified = new Date();
    }
    
    return {
      url: `${baseUrl}/blog/${post.slug}`,
      lastModified,
      changeFrequency: 'monthly' as const,
      priority: 0.7,
    };
  });

  return [
    {
      url: baseUrl,
      lastModified: new Date(),
      changeFrequency: 'weekly',
      priority: 1,
    },
    {
      url: `${baseUrl}/pricing`,
      lastModified: new Date(),
      changeFrequency: 'weekly',
      priority: 0.9,
    },
    {
      url: `${baseUrl}/blog`,
      lastModified: new Date(),
      changeFrequency: 'weekly',
      priority: 0.8,
    },
    ...blogUrls,
    {
      url: `${baseUrl}/calculator`,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.8,
    },
    {
      url: `${baseUrl}/free-scan`,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.9,
    },
    {
      url: `${baseUrl}/sales-tax`,
      lastModified: new Date(NEXUS_RULES_REVIEWED_ON),
      changeFrequency: 'monthly',
      priority: 0.8,
    },
    ...STATE_GUIDES.map((guide) => ({
      url: `${baseUrl}/sales-tax/${guide.slug}`,
      lastModified: new Date(NEXUS_RULES_REVIEWED_ON),
      changeFrequency: 'monthly' as const,
      priority: 0.7,
    })),
    {
      url: `${baseUrl}/free-calculator`,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.9,
    },
    {
      url: `${baseUrl}/faq`,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.8,
    },
    {
      url: `${baseUrl}/contact`,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.5,
    },
    {
      url: `${baseUrl}/privacy`,
      lastModified: new Date(),
      changeFrequency: 'yearly',
      priority: 0.3,
    },
    {
      url: `${baseUrl}/terms`,
      lastModified: new Date(),
      changeFrequency: 'yearly',
      priority: 0.3,
    },
    {
      url: `${baseUrl}/security`,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.4,
    },
    {
      url: `${baseUrl}/cookies`,
      lastModified: new Date(),
      changeFrequency: 'yearly',
      priority: 0.2,
    },
    {
      url: `${baseUrl}/signup`,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.7,
    },
    {
      url: `${baseUrl}/login`,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.5,
    },
  ];
}
