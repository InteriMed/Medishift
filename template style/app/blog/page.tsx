"use client";

import { useState, useEffect } from 'react';
import { BlogPost, BlogCategory, BlogTag, BlogStats } from '@/types';
import { BlogList } from '@/app/blog/components/BlogList';
import { Card, CardContent } from '@/components/ui/card';
import { FileText } from 'lucide-react';

interface BlogResponse {
  posts: BlogPost[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
  stats: BlogStats;
}

export default function BlogPage() {
  const [data, setData] = useState<BlogResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState({
    search: '',
    category: '',
    tag: ''
  });

  const fetchPosts = async (page = 1, searchParams = {}) => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page: page.toString(),
        limit: '9',
        ...searchParams
      });

      const response = await fetch(`/api/v1/content/blog?${params}`);
      if (!response.ok) {
        throw new Error('Failed to fetch blog posts');
      }

      const result = await response.json();
      if (result.status === "success" && result.data) {
        setData(result.data);
      } else {
        throw new Error('Invalid response format');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPosts();
  }, []);

  const handlePageChange = (page: number) => {
    fetchPosts(page, filters);
  };

  const handleFilterChange = (newFilters: {
    search?: string;
    category?: string;
    tag?: string;
  }) => {
    const updatedFilters = {
      search: newFilters.search ?? filters.search,
      category: newFilters.category ?? filters.category,
      tag: newFilters.tag ?? filters.tag
    };
    setFilters(updatedFilters);
    fetchPosts(1, updatedFilters);
  };

  if (loading) {
    return (
      <div className="bg-background">
        <div className="max-w-7xl mx-auto px-4 py-8">
          <div className="animate-pulse space-y-8">
            <div className="h-8 bg-muted rounded w-1/3"></div>
            <div className="flex flex-col lg:flex-row gap-8">
              <div className="flex-1 max-w-4xl mx-auto lg:mx-0 space-y-6">
                <div className="h-10 bg-muted rounded"></div>
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                  {Array.from({ length: 6 }).map((_, i) => (
                    <div key={i} className="h-64 bg-muted rounded"></div>
                  ))}
                </div>
              </div>
              <div className="lg:w-80 space-y-6">
                {Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="h-48 bg-muted rounded"></div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-background flex items-center justify-center min-h-[50vh]">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6">
            <div className="text-center">
              <div className="text-destructive mb-4">
                <FileText className="w-12 h-12 mx-auto" />
              </div>
              <h3 className="text-lg font-semibold mb-2">Error Loading Blog</h3>
              <p className="text-muted-foreground mb-4">{error}</p>
              <button
                onClick={() => fetchPosts()}
                className="text-primary hover:underline"
              >
                Try again
              </button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!data || !data.stats) {
    return null;
  }

  return (
    <div className="bg-background min-h-screen">
      <div className="max-w-7xl mx-auto px-4 py-8 pb-16">
        <BlogList
          posts={data.posts || []}
          categories={data.stats.categories || []}
          tags={data.stats.tags || []}
          pagination={data.pagination}
          onPageChange={handlePageChange}
          onFilterChange={handleFilterChange}
        />
      </div>
    </div>
  );
}
