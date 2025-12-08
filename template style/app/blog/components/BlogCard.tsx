"use client";

import { BlogPost } from '@/types';
import Link from 'next/link';
import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

interface BlogCardProps {
  post: BlogPost;
  buttonColor?: 'green' | 'orange' | 'yellow' | 'blue';
}

const colorClasses = {
  green: 'bg-green-200 hover:bg-green-300 text-green-900',
  orange: 'bg-orange-200 hover:bg-orange-300 text-orange-900',
  yellow: 'bg-yellow-200 hover:bg-yellow-300 text-yellow-900',
  blue: 'bg-blue-200 hover:bg-blue-300 text-blue-900'
};

export function BlogCard({ post, buttonColor = 'green' }: BlogCardProps) {
  return (
    <Card className="group hover:shadow-lg transition-all duration-300 border-border/50 bg-card h-full flex flex-col">
      <CardHeader className="flex-1">
        <h3 className="font-semibold text-lg mb-3 group-hover:text-primary transition-colors leading-tight">
          <Link href={`/blog/${post.slug}`} className="hover:underline">
            {post.title}
          </Link>
        </h3>
        <p className="text-muted-foreground leading-relaxed text-sm">
          {post.excerpt}
        </p>
      </CardHeader>

      <CardFooter className="pt-0 pb-6">
        <Link href={`/blog/${post.slug}`} className="w-full">
          <Button className={`w-full ${colorClasses[buttonColor]} font-medium`}>
            Read more
          </Button>
        </Link>
      </CardFooter>
    </Card>
  );
}
