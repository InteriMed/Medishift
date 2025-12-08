"use client";

import { useState, useEffect, useMemo } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ChevronLeft, ChevronRight, RefreshCw, FileText, Plus, Database } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { BlogPost } from '@/types/domains/blog';

interface CalendarDay {
  date: Date;
  posts: BlogPost[];
  isCurrentMonth: boolean;
  isToday: boolean;
  isBackupDay?: boolean;
}

export default function PostsCalendarPage() {
  const router = useRouter();
  const [allPosts, setAllPosts] = useState<BlogPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentDate, setCurrentDate] = useState(() => {
    const date = new Date();
    date.setMonth(date.getMonth() + 1);
    return date;
  });

  const fetchPosts = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch('/api/v1/content/blog?status_filter=all&limit=1000', {
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error('Failed to fetch posts');
      }

      const result = await response.json();
      
      if (result.status === 'success' && result.data) {
        const fetchedPosts = result.data.posts || [];
        setAllPosts(fetchedPosts);
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

  const calendarDays = useMemo(() => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const startDate = new Date(firstDay);
    startDate.setDate(startDate.getDate() - startDate.getDay());
    
    const days: CalendarDay[] = [];
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    for (let i = 0; i < 42; i++) {
      const date = new Date(startDate);
      date.setDate(startDate.getDate() + i);
      
      const dayPosts = allPosts.filter(post => {
        if (!post.scheduledFor) return false;
        const postDate = new Date(post.scheduledFor);
        postDate.setHours(0, 0, 0, 0);
        return postDate.getTime() === date.getTime();
      });
      
      const isSunday = date.getDay() === 0;
      
      days.push({
        date: new Date(date),
        posts: dayPosts,
        isCurrentMonth: date.getMonth() === month,
        isToday: date.getTime() === today.getTime(),
        isBackupDay: isSunday,
      });
    }
    
    return days;
  }, [currentDate, allPosts]);

  const monthName = currentDate.toLocaleString('default', { month: 'long', year: 'numeric' });
  
  const scheduledPostsCount = useMemo(() => {
    return calendarDays.reduce((count, day) => count + day.posts.length, 0);
  }, [calendarDays]);
  const weekDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  const navigateMonth = (direction: 'prev' | 'next') => {
    setCurrentDate(prev => {
      const newDate = new Date(prev);
      if (direction === 'next') {
        newDate.setMonth(newDate.getMonth() + 1);
      } else {
        newDate.setMonth(newDate.getMonth() - 1);
      }
      return newDate;
    });
  };

  const handleDateClick = (date: Date, hasPosts: boolean) => {
    if (hasPosts) return;
    
    const dateStr = date.toISOString().slice(0, 16);
    router.push(`/admin/posts/create?scheduled=${encodeURIComponent(dateStr)}`);
  };

  if (loading) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-muted rounded w-1/3"></div>
          <div className="h-96 bg-muted rounded"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 text-center">
        <h1 className="text-2xl font-bold mb-4">Error Loading Calendar</h1>
        <p className="text-muted-foreground mb-4">{error}</p>
        <Button onClick={fetchPosts}>Try Again</Button>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Posts Calendar</h1>
          <p className="text-muted-foreground">Blog posts planned for the next month</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => navigateMonth('prev')}>
            <ChevronLeft className="w-4 h-4 mr-2" />
            Previous Month
          </Button>
          <Button variant="outline" size="sm" onClick={() => navigateMonth('next')}>
            Next Month
            <ChevronRight className="w-4 h-4 ml-2" />
          </Button>
          <Button variant="outline" size="sm" onClick={fetchPosts}>
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </Button>
        </div>
      </div>

      <Card>
        <CardContent className="p-6">
          <div className="mb-6 flex items-center justify-between">
            <h2 className="text-2xl font-semibold">{monthName}</h2>
            <Badge variant="secondary">
              {scheduledPostsCount} scheduled {scheduledPostsCount === 1 ? 'post' : 'posts'}
            </Badge>
          </div>

          <div className="grid grid-cols-7 gap-2">
            {weekDays.map(day => (
              <div key={day} className="text-center font-semibold text-sm text-muted-foreground py-2">
                {day}
              </div>
            ))}
            
            {calendarDays.map((day, index) => (
              <div
                key={index}
                onClick={() => handleDateClick(day.date, day.posts.length > 0)}
                className={`
                  min-h-[100px] border rounded-lg p-2 group
                  ${day.isCurrentMonth ? 'bg-background' : 'bg-muted/30'}
                  ${day.isToday ? 'ring-2 ring-primary' : ''}
                  ${day.posts.length > 0 ? 'border-primary/50' : 'cursor-pointer hover:border-primary/50 hover:bg-muted/50 transition-colors'}
                `}
              >
                <div className="flex items-center justify-between mb-1">
                  <div className={`
                    text-sm font-medium
                    ${day.isCurrentMonth ? 'text-foreground' : 'text-muted-foreground'}
                    ${day.isToday ? 'text-primary font-bold' : ''}
                  `}>
                    {day.date.getDate()}
                  </div>
                  {day.posts.length === 0 && day.isCurrentMonth && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-5 w-5 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDateClick(day.date, false);
                      }}
                    >
                      <Plus className="w-3 h-3" />
                    </Button>
                  )}
                </div>
                <div className="space-y-1">
                  {day.isBackupDay && (
                    <div className="text-xs p-1 bg-blue-500/10 hover:bg-blue-500/20 rounded truncate">
                      <Database className="w-3 h-3 inline mr-1 text-blue-600" />
                      <span className="truncate text-blue-600">Weekly Backup</span>
                    </div>
                  )}
                  {day.posts.slice(0, 3).map(post => (
                    <Link
                      key={post.id}
                      href={`/admin/posts/edit/${post.slug}`}
                      className="block"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <div className="text-xs p-1 bg-primary/10 hover:bg-primary/20 rounded truncate cursor-pointer">
                        <FileText className="w-3 h-3 inline mr-1" />
                        <span className="truncate">{post.title}</span>
                      </div>
                    </Link>
                  ))}
                  {day.posts.length > 3 && (
                    <div className="text-xs text-muted-foreground p-1">
                      +{day.posts.length - 3} more
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
