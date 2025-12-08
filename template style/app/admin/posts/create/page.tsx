"use client";

import { useState, useCallback, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Save, Eye, Calendar, Clock, X, Image as ImageIcon, Upload } from 'lucide-react';
import Link from 'next/link';
import { BlogEditor } from '@/components/admin/BlogEditor';
import { ContentBlock } from '@/types';

const categories = [
  'Tutorials',
  'Technology',
  'Tips & Tricks',
  'News',
  'Case Studies'
];

const tags = [
  'AI',
  'Music Video',
  'Tutorial',
  'Technology',
  'Tips',
  'Creative',
  'Production',
  'Beginner',
  'Advanced',
  'Case Study'
];

export default function CreatePostPage() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    title: '',
    excerpt: '',
    content: '',
    contentLayout: [] as ContentBlock[],
    category: '',
    tags: [] as string[],
    featuredImage: '',
    featuredImageS3Key: '',
    status: 'draft' as 'draft' | 'published' | 'scheduled',
    scheduledFor: '',
    publishNow: true
  });

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const scheduled = params.get('scheduled');
    if (scheduled) {
      setFormData(prev => ({
        ...prev,
        scheduledFor: scheduled,
        publishNow: false,
        status: 'scheduled'
      }));
    }
  }, []);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [showPreview, setShowPreview] = useState(false);

  const handleInputChange = useCallback((field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  }, []);

  const handleCategoryChange = useCallback((value: string) => {
    handleInputChange('category', value);
  }, [handleInputChange]);

  const handleContentChange = useCallback((content: string) => {
    setFormData(prev => ({ ...prev, content }));
  }, []);

  const handleLayoutChange = useCallback((layout: ContentBlock[]) => {
    setFormData(prev => ({ ...prev, contentLayout: layout }));
  }, []);

  const handleTagToggle = (tag: string) => {
    setFormData(prev => ({
      ...prev,
      tags: prev.tags.includes(tag)
        ? prev.tags.filter(t => t !== tag)
        : [...prev.tags, tag]
    }));
  };

  const handlePublishModeChange = (mode: 'now' | 'schedule') => {
    setFormData(prev => ({
      ...prev,
      publishNow: mode === 'now',
      status: mode === 'now' ? 'published' : 'scheduled'
    }));
  };

  const handleImageUpload = useCallback(async (file: File) => {
    setIsUploadingImage(true);
    try {
      const uploadFormData = new FormData();
      uploadFormData.append('file', file);

      const response = await fetch('/api/v1/content/blog/upload-image', {
        method: 'POST',
        body: uploadFormData,
        credentials: 'include'
      });

      if (!response.ok) {
        throw new Error('Failed to upload image');
      }

      const result = await response.json();
      if (result.status === "success" && result.data) {
        return {
          url: result.data.url,
          s3_key: result.data.s3_key
        };
      }
      throw new Error('Invalid response format');
    } catch (error) {
      console.error('Error uploading image:', error);
      throw error;
    } finally {
      setIsUploadingImage(false);
    }
  }, []);

  const handleFeaturedImageUpload = async (file: File) => {
    try {
      const result = await handleImageUpload(file);
      setFormData(prev => ({
        ...prev,
        featuredImage: result.url,
        featuredImageS3Key: result.s3_key
      }));
    } catch (error) {
      alert('Failed to upload image');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const now = new Date();
      const scheduledFor = formData.publishNow ? undefined : formData.scheduledFor;
      const publishedAt = formData.publishNow ? now.toISOString() : scheduledFor || now.toISOString();

      const submitFormData = new FormData();
      submitFormData.append('title', formData.title);
      submitFormData.append('excerpt', formData.excerpt);
      submitFormData.append('content', formData.content);
      submitFormData.append('category', formData.category);
      submitFormData.append('tags', JSON.stringify(formData.tags));
      submitFormData.append('status', formData.publishNow ? 'published' : 'scheduled');
      if (formData.contentLayout.length > 0) {
        submitFormData.append('content_layout', JSON.stringify(formData.contentLayout));
      }
      if (formData.featuredImageS3Key) {
        submitFormData.append('featured_image_s3_key', formData.featuredImageS3Key);
      }
      if (publishedAt) {
        submitFormData.append('published_at', publishedAt);
      }
      if (scheduledFor) {
        submitFormData.append('scheduled_for', scheduledFor);
      }

      const response = await fetch('/api/v1/content/blog', {
        method: 'POST',
        body: submitFormData,
        credentials: 'include'
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to create blog post');
      }

      router.push('/admin/posts');
    } catch (error) {
      console.error('Error creating blog post:', error);
      alert(error instanceof Error ? error.message : 'Failed to create blog post');
    } finally {
      setIsSubmitting(false);
    }
  };

  const getMinDateTime = () => {
    const now = new Date();
    now.setMinutes(now.getMinutes() + 1); // At least 1 minute in the future
    return now.toISOString().slice(0, 16);
  };

  return (
    <div className="min-h-screen bg-background">
      {/* HEADER */}
      <div className="sticky top-0 z-20 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b">
        <div className="max-w-5xl mx-auto px-6 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Button variant="ghost" size="sm" asChild>
                <Link href="/admin/posts">
                  <ArrowLeft className="w-4 h-4" />
                </Link>
              </Button>
              <h1 className="text-lg font-semibold">New Post</h1>
            </div>
            <div className="flex items-center gap-2">
              <Button 
                type="button" 
                variant="outline" 
                size="sm"
                onClick={() => setShowPreview(!showPreview)}
              >
                <Eye className="w-4 h-4 mr-2" />
                {showPreview ? 'Edit' : 'Preview'}
              </Button>
              <Button 
                type="submit" 
                form="blog-form"
                disabled={isSubmitting}
                size="sm"
              >
                <Save className="w-4 h-4 mr-2" />
                {isSubmitting ? 'Publishing...' : formData.publishNow ? 'Publish' : 'Save Draft'}
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* SETTINGS BAR */}
      <div className="sticky top-[57px] z-10 bg-muted/30 border-b">
        <div className="max-w-5xl mx-auto px-6 py-2.5">
          <div className="flex items-center gap-6 flex-wrap">
            <div className="flex items-center gap-1.5">
              {tags.slice(0, 6).map((tag) => (
                <Badge
                  key={tag}
                  variant={formData.tags.includes(tag) ? "default" : "outline"}
                  className="cursor-pointer hover:bg-primary/10 transition-colors text-xs h-7 px-2.5"
                  onClick={() => handleTagToggle(tag)}
                >
                  {tag}
                </Badge>
              ))}
            </div>

            <div className="h-5 w-px bg-border" />

            <div className="flex items-center gap-2">
              <div className="flex items-center gap-2">
                <input
                  type="radio"
                  id="publish-now"
                  name="publish-mode"
                  checked={formData.publishNow}
                  onChange={() => handlePublishModeChange('now')}
                  className="w-3.5 h-3.5 text-primary"
                />
                <Label htmlFor="publish-now" className="text-sm flex items-center gap-1 cursor-pointer">
                  <Clock className="w-3 h-3" />
                  Now
                </Label>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="radio"
                  id="schedule"
                  name="publish-mode"
                  checked={!formData.publishNow}
                  onChange={() => handlePublishModeChange('schedule')}
                  className="w-3.5 h-3.5 text-primary"
                />
                <Label htmlFor="schedule" className="text-sm flex items-center gap-1 cursor-pointer">
                  <Calendar className="w-3 h-3" />
                  Schedule
                </Label>
              </div>
            </div>

            {!formData.publishNow && (
              <>
                <div className="h-5 w-px bg-border" />
                <div className="flex items-center gap-2">
                  <Input
                    id="scheduledFor"
                    type="datetime-local"
                    value={formData.scheduledFor}
                    onChange={(e) => handleInputChange('scheduledFor', e.target.value)}
                    min={getMinDateTime()}
                    required={!formData.publishNow}
                    className="h-8 text-sm w-[180px]"
                  />
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      <form id="blog-form" onSubmit={handleSubmit} className="max-w-5xl mx-auto px-6 py-8">
        <div className="space-y-8">
          <div className="space-y-4 bg-card border border-border rounded-lg p-6">
            <input
              type="text"
              value={formData.title}
              onChange={(e) => handleInputChange('title', e.target.value)}
              placeholder="Post title..."
              className="w-full text-4xl font-bold bg-transparent border-none outline-none placeholder:text-muted-foreground/50 focus:ring-0 p-0 text-foreground"
              required
            />
            <textarea
              value={formData.excerpt}
              onChange={(e) => handleInputChange('excerpt', e.target.value)}
              placeholder="Brief description of the post..."
              rows={2}
              className="w-full text-lg text-muted-foreground bg-transparent border-none outline-none placeholder:text-muted-foreground/50 focus:ring-0 resize-none p-0"
              required
            />

          </div>

          <div className="bg-card border border-border rounded-lg p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-3">
                <Label className="text-sm font-medium text-foreground">Featured Image</Label>
                {!formData.featuredImage ? (
                  <div className="border-2 border-dashed border-border rounded-lg p-6 hover:border-primary/50 transition-colors">
                    <input
                      id="featuredImage"
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          handleFeaturedImageUpload(file);
                        }
                      }}
                      disabled={isUploadingImage}
                    />
                    <label htmlFor="featuredImage" className="cursor-pointer flex flex-col items-center justify-center gap-3">
                      <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center">
                        <ImageIcon className="w-6 h-6 text-muted-foreground" />
                      </div>
                      <div className="text-center">
                        <p className="text-sm font-medium text-foreground mb-1">
                          {isUploadingImage ? 'Uploading...' : 'Upload Featured Image'}
                        </p>
                        <p className="text-xs text-muted-foreground">Click to browse or drag and drop</p>
                      </div>
                    </label>
                  </div>
                ) : (
                  <div className="relative group">
                    <img
                      src={formData.featuredImage}
                      alt="Featured"
                      className="w-full h-48 object-cover rounded-lg border border-border"
                    />
                    <Button
                      type="button"
                      variant="destructive"
                      size="sm"
                      className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity"
                      onClick={() => setFormData(prev => ({ ...prev, featuredImage: '', featuredImageS3Key: '' }))}
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                )}
              </div>

              <div className="space-y-3">
                <Label className="text-sm font-medium text-foreground">Category</Label>
                <Select 
                  value={formData.category || undefined} 
                  onValueChange={handleCategoryChange}
                >
                  <SelectTrigger className="w-full h-10">
                    <SelectValue placeholder="Select a category" />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map((category) => (
                      <SelectItem key={category} value={category}>
                        {category}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                
                <div className="space-y-2">
                  <Label className="text-sm font-medium text-foreground">Tags</Label>
                  <div className="flex flex-wrap gap-2">
                    {tags.map((tag) => (
                      <Badge
                        key={tag}
                        variant={formData.tags.includes(tag) ? "default" : "outline"}
                        className="cursor-pointer hover:bg-primary/10 transition-colors text-xs h-8 px-3 py-1"
                        onClick={() => handleTagToggle(tag)}
                      >
                        {tag}
                      </Badge>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <h3 className="text-lg font-semibold text-foreground">Content</h3>
            <p className="text-sm text-muted-foreground">
              Drag blocks to reorder • Drop images into text areas • Add subtitles, columns (2 or 3), and tables • Each column can contain text or images
            </p>
          </div>

          <BlogEditor
            content={formData.content}
            contentLayout={formData.contentLayout}
            onContentChange={handleContentChange}
            onLayoutChange={handleLayoutChange}
            onImageUpload={handleImageUpload}
            showPreview={showPreview}
          />
        </div>
      </form>
    </div>
  );
}
