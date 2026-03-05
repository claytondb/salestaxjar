import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import fs from 'fs';
import path from 'path';

// Mock fs module
vi.mock('fs');
vi.mock('path', async () => {
  const actual = await vi.importActual('path');
  return {
    ...actual,
    join: vi.fn((...args: string[]) => args.join('/')),
  };
});

// Mock remark and related modules
vi.mock('remark', () => ({
  remark: vi.fn(() => ({
    use: vi.fn().mockReturnThis(),
    process: vi.fn().mockResolvedValue({ toString: () => '<p>Test content</p>' }),
  })),
}));
vi.mock('remark-html', () => ({ default: vi.fn() }));
vi.mock('remark-gfm', () => ({ default: vi.fn() }));

// Mock gray-matter
vi.mock('gray-matter', () => ({
  default: vi.fn((content: string) => {
    // Parse frontmatter from test content
    const frontmatterMatch = content.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
    if (frontmatterMatch) {
      const data: Record<string, string> = {};
      frontmatterMatch[1].split('\n').forEach(line => {
        const [key, ...valueParts] = line.split(':');
        if (key && valueParts.length) {
          data[key.trim()] = valueParts.join(':').trim().replace(/^["']|["']$/g, '');
        }
      });
      return { data, content: frontmatterMatch[2] };
    }
    return { data: {}, content };
  }),
}));

// Import after mocks
import { getAllPosts, getPostBySlug, getAllPostSlugs, BlogPost } from './blog';

describe('blog.ts', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('getAllPosts', () => {
    it('should return empty array when posts directory does not exist', () => {
      vi.mocked(fs.existsSync).mockReturnValue(false);

      const posts = getAllPosts();

      expect(posts).toEqual([]);
      expect(fs.existsSync).toHaveBeenCalled();
    });

    it('should return empty array when directory has no markdown files', () => {
      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(fs.readdirSync).mockReturnValue(['image.png', 'readme.txt'] as unknown as fs.Dirent[]);

      const posts = getAllPosts();

      expect(posts).toEqual([]);
    });

    it('should parse markdown files and return posts', () => {
      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(fs.readdirSync).mockReturnValue(['post-1.md', 'post-2.md'] as unknown as fs.Dirent[]);
      vi.mocked(fs.readFileSync).mockImplementation((filePath) => {
        if (String(filePath).includes('post-1')) {
          return `---
title: First Post
date: 2026-03-01
excerpt: This is the first post
author: Test Author
category: Tutorial
readTime: 5 min read
---
Content here`;
        }
        return `---
title: Second Post
date: 2026-02-15
excerpt: This is the second post
---
More content`;
      });

      const posts = getAllPosts();

      expect(posts).toHaveLength(2);
      expect(posts[0].title).toBe('First Post');
      expect(posts[0].slug).toBe('post-1');
      expect(posts[0].author).toBe('Test Author');
      expect(posts[0].category).toBe('Tutorial');
    });

    it('should sort posts by date (newest first)', () => {
      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(fs.readdirSync).mockReturnValue(['old-post.md', 'new-post.md'] as unknown as fs.Dirent[]);
      vi.mocked(fs.readFileSync).mockImplementation((filePath) => {
        if (String(filePath).includes('old-post')) {
          return `---
title: Old Post
date: 2026-01-01
---
Old content`;
        }
        return `---
title: New Post
date: 2026-03-01
---
New content`;
      });

      const posts = getAllPosts();

      expect(posts[0].title).toBe('New Post');
      expect(posts[1].title).toBe('Old Post');
    });

    it('should use default values for missing frontmatter', () => {
      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(fs.readdirSync).mockReturnValue(['minimal-post.md'] as unknown as fs.Dirent[]);
      vi.mocked(fs.readFileSync).mockReturnValue('Just content, no frontmatter');

      const posts = getAllPosts();

      expect(posts[0].slug).toBe('minimal-post');
      expect(posts[0].title).toBe('minimal-post'); // Falls back to slug
      expect(posts[0].author).toBe('Sails Team');
      expect(posts[0].category).toBe('General');
      expect(posts[0].readTime).toBe('5 min read');
      expect(posts[0].excerpt).toBe('');
    });

    it('should filter out non-markdown files', () => {
      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(fs.readdirSync).mockReturnValue([
        'post.md',
        'image.png',
        '.gitkeep',
        'draft.mdx',
      ] as unknown as fs.Dirent[]);
      vi.mocked(fs.readFileSync).mockReturnValue(`---
title: Only Post
date: 2026-03-01
---
Content`);

      const posts = getAllPosts();

      expect(posts).toHaveLength(1);
      expect(posts[0].slug).toBe('post');
    });
  });

  describe('getPostBySlug', () => {
    it('should return null when post does not exist', async () => {
      vi.mocked(fs.existsSync).mockReturnValue(false);

      const post = await getPostBySlug('nonexistent');

      expect(post).toBeNull();
    });

    it('should return post with HTML content', async () => {
      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(fs.readFileSync).mockReturnValue(`---
title: Test Post
date: 2026-03-01
excerpt: Test excerpt
author: Author Name
category: Guide
readTime: 10 min read
image: /images/test.png
---
# Heading

This is **bold** text.`);

      const post = await getPostBySlug('test-post');

      expect(post).not.toBeNull();
      expect(post!.title).toBe('Test Post');
      expect(post!.slug).toBe('test-post');
      expect(post!.excerpt).toBe('Test excerpt');
      expect(post!.author).toBe('Author Name');
      expect(post!.category).toBe('Guide');
      expect(post!.readTime).toBe('10 min read');
      expect(post!.image).toBe('/images/test.png');
      expect(post!.content).toBe('<p>Test content</p>');
    });

    it('should use default values for missing metadata', async () => {
      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(fs.readFileSync).mockReturnValue('Just markdown content');

      const post = await getPostBySlug('bare-post');

      expect(post!.title).toBe('bare-post');
      expect(post!.author).toBe('Sails Team');
      expect(post!.category).toBe('General');
      expect(post!.readTime).toBe('5 min read');
      expect(post!.image).toBeUndefined();
    });

    it('should handle errors gracefully', async () => {
      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(fs.readFileSync).mockImplementation(() => {
        throw new Error('Read error');
      });

      const post = await getPostBySlug('error-post');

      expect(post).toBeNull();
    });
  });

  describe('getAllPostSlugs', () => {
    it('should return empty array when directory does not exist', () => {
      vi.mocked(fs.existsSync).mockReturnValue(false);

      const slugs = getAllPostSlugs();

      expect(slugs).toEqual([]);
    });

    it('should return slugs without .md extension', () => {
      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(fs.readdirSync).mockReturnValue([
        'first-post.md',
        'second-post.md',
        'third-post.md',
      ] as unknown as fs.Dirent[]);

      const slugs = getAllPostSlugs();

      expect(slugs).toEqual(['first-post', 'second-post', 'third-post']);
    });

    it('should filter non-markdown files', () => {
      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(fs.readdirSync).mockReturnValue([
        'valid-post.md',
        'image.jpg',
        '.DS_Store',
        'README.txt',
      ] as unknown as fs.Dirent[]);

      const slugs = getAllPostSlugs();

      expect(slugs).toEqual(['valid-post']);
    });
  });

  describe('BlogPost interface', () => {
    it('should allow creating posts with required fields', () => {
      const post: BlogPost = {
        slug: 'test-slug',
        title: 'Test Title',
        date: '2026-03-01',
        excerpt: 'Test excerpt',
        author: 'Test Author',
        category: 'Test Category',
        readTime: '5 min read',
      };

      expect(post.slug).toBe('test-slug');
      expect(post.image).toBeUndefined();
      expect(post.content).toBeUndefined();
    });

    it('should allow optional image and content fields', () => {
      const post: BlogPost = {
        slug: 'complete-post',
        title: 'Complete Post',
        date: '2026-03-01',
        excerpt: 'Full excerpt',
        author: 'Full Author',
        category: 'Complete',
        readTime: '10 min read',
        image: '/images/featured.png',
        content: '<p>HTML content</p>',
      };

      expect(post.image).toBe('/images/featured.png');
      expect(post.content).toBe('<p>HTML content</p>');
    });
  });
});
