'use client';

import { useState, useEffect, useCallback } from 'react';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { RefreshCw, Image, Video, Type, Loader2, Trash2 } from 'lucide-react';
import { useToast } from '@/hooks/ui/use-toast';
import Link from 'next/link';

interface GalleryItem {
  id: string;
  type: string;
  url: string;
  prompt: string | null;
  model: string | null;
  metadata: any;
  created_at: string;
}

export default function TestGalleryPage() {
  const { toast } = useToast();
  const [selectedType, setSelectedType] = useState<string>('all');
  const [items, setItems] = useState<GalleryItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [total, setTotal] = useState(0);

  const loadGallery = useCallback(async () => {
    try {
      setLoading(true);
      const typeParam = selectedType === 'all' ? '' : selectedType;
      const response = await fetch(
        `/api/admin/test/gallery?type=${typeParam}&limit=100`
      );
      if (!response.ok) {
        throw new Error('Failed to load gallery');
      }
      const data = await response.json();
      if (data.success) {
        setItems(data.items || []);
        setTotal(data.total || 0);
      } else {
        throw new Error('Failed to load gallery');
      }
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to load gallery',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }, [selectedType, toast]);

  useEffect(() => {
    loadGallery();
  }, [loadGallery]);

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this item?')) {
      return;
    }

    try {
      const response = await fetch(`/api/admin/test/gallery/${id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to delete item');
      }

      toast({
        title: 'Success',
        description: 'Item deleted successfully',
      });

      loadGallery();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to delete item',
        variant: 'destructive',
      });
    }
  };

  const filteredItems =
    selectedType === 'all'
      ? items
      : items.filter(item => item.type === selectedType);

  return (
    <div className="container mx-auto p-6 max-w-7xl">
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground mb-2 flex items-center gap-2">
              <Image className="w-8 h-8" />
              Test Gallery
            </h1>
            <p className="text-muted-foreground">
              View all generated test content
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Link href="/admin/test">
              <Button variant="outline">Back to Testing</Button>
            </Link>
            <Button
              onClick={loadGallery}
              disabled={loading}
              variant="outline"
              size="sm"
            >
              <RefreshCw
                className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`}
              />
              Refresh
            </Button>
          </div>
        </div>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Gallery Items</CardTitle>
              <CardDescription>{total} total items</CardDescription>
            </div>
            <Select value={selectedType} onValueChange={setSelectedType}>
              <SelectTrigger className="w-[180px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="text">Text</SelectItem>
                <SelectItem value="image">Image</SelectItem>
                <SelectItem value="video">Video</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
              <span className="ml-2 text-muted-foreground">
                Loading gallery...
              </span>
            </div>
          ) : filteredItems.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              No items found in gallery
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredItems.map(item => (
                <Card key={item.id} className="overflow-hidden">
                  <CardContent className="p-0">
                    {item.type === 'image' && (
                      <div className="relative w-full h-48">
                        <Image
                          src={item.url}
                          alt={item.prompt || 'Generated image'}
                          fill
                          className="object-cover"
                          unoptimized
                        />
                        <Button
                          variant="destructive"
                          size="icon"
                          className="absolute top-2 right-2"
                          onClick={() => handleDelete(item.id)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    )}
                    {item.type === 'video' && (
                      <div className="relative">
                        <video
                          src={item.url}
                          className="w-full h-48 object-cover"
                          controls
                        />
                        <Button
                          variant="destructive"
                          size="icon"
                          className="absolute top-2 right-2"
                          onClick={() => handleDelete(item.id)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    )}
                    {item.type === 'text' && (
                      <div className="p-4 bg-muted min-h-[192px]">
                        <div className="flex items-start justify-between mb-2">
                          <Type className="w-5 h-5 text-muted-foreground" />
                          <Button
                            variant="destructive"
                            size="icon"
                            onClick={() => handleDelete(item.id)}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                        <p className="text-sm line-clamp-6">
                          {item.prompt || 'Generated text'}
                        </p>
                      </div>
                    )}
                    <div className="p-4">
                      <div className="text-xs text-muted-foreground mb-2">
                        {item.model && <div>Model: {item.model}</div>}
                        {item.created_at && (
                          <div>
                            {new Date(item.created_at).toLocaleString()}
                          </div>
                        )}
                      </div>
                      {item.prompt && (
                        <p className="text-sm line-clamp-2 text-muted-foreground">
                          {item.prompt}
                        </p>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
