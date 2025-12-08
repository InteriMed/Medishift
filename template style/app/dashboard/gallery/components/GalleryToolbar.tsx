'use client';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import {
    Image as ImageIcon,
    Video,
    Music,
    Search,
    LayoutGrid,
    List as ListIcon,
    RefreshCw,
} from 'lucide-react';

interface GalleryToolbarProps {
    searchQuery: string;
    setSearchQuery: (query: string) => void;
    selectedType: string;
    setSelectedType: (type: string) => void;
    viewMode: 'grid' | 'list';
    setViewMode: (mode: 'grid' | 'list') => void;
    loading: boolean;
    onRefresh: () => void;
    totalCount: number;
    typeCounts: {
        all: number;
        image: number;
        video: number;
        audio: number;
    };
}

export function GalleryToolbar({
    searchQuery,
    setSearchQuery,
    selectedType,
    setSelectedType,
    viewMode,
    setViewMode,
    loading,
    onRefresh,
    totalCount,
    typeCounts,
}: GalleryToolbarProps) {
    return (
        <div className="border-b border-border/40 dark:border-b-white/10 backdrop-blur-xl supports-[backdrop-filter]:bg-background/20 shadow-sm sticky top-0 z-40">
            <div className="max-w-[1600px] mx-auto px-4 py-3 space-y-3">
                {/* Top Row: Title/Stats and Primary Actions */}
                <div className="flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                        <h1 className="text-xl font-semibold">Gallery</h1>
                        {!loading && (
                            <Badge variant="outline" className="text-muted-foreground">
                                {totalCount} {totalCount === 1 ? 'file' : 'files'}
                            </Badge>
                        )}
                    </div>

                    <div className="flex items-center gap-2">
                        <Button
                            onClick={onRefresh}
                            disabled={loading}
                            variant="ghost"
                            size="sm"
                            className="h-9"
                        >
                            <RefreshCw
                                className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`}
                            />
                            Refresh
                        </Button>

                        <div className="h-6 w-px bg-border/50 mx-1" />

                        <div className="flex bg-muted/50 rounded-lg p-1">
                            <Button
                                variant={viewMode === 'grid' ? 'secondary' : 'ghost'}
                                size="icon"
                                className="h-7 w-7"
                                onClick={() => setViewMode('grid')}
                            >
                                <LayoutGrid className="w-4 h-4" />
                            </Button>
                            <Button
                                variant={viewMode === 'list' ? 'secondary' : 'ghost'}
                                size="icon"
                                className="h-7 w-7"
                                onClick={() => setViewMode('list')}
                            >
                                <ListIcon className="w-4 h-4" />
                            </Button>
                        </div>
                    </div>
                </div>

                {/* Bottom Row: Filters and Search */}
                <div className="flex flex-col sm:flex-row gap-3 items-center">
                    <div className="relative flex-1 w-full">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                        <Input
                            placeholder="Search files or projects..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="pl-9 h-9 bg-background/50"
                        />
                    </div>

                    <div className="flex items-center gap-2 w-full sm:w-auto overflow-x-auto pb-1 sm:pb-0 no-scrollbar">
                        <Select value={selectedType} onValueChange={setSelectedType}>
                            <SelectTrigger className="w-[180px] h-9 bg-background/50">
                                <SelectValue placeholder="Filter by type" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All Types ({typeCounts.all})</SelectItem>
                                <SelectItem value="image">
                                    <div className="flex items-center gap-2">
                                        <ImageIcon className="w-4 h-4" />
                                        Images ({typeCounts.image})
                                    </div>
                                </SelectItem>
                                <SelectItem value="video">
                                    <div className="flex items-center gap-2">
                                        <Video className="w-4 h-4" />
                                        Videos ({typeCounts.video})
                                    </div>
                                </SelectItem>
                                <SelectItem value="audio">
                                    <div className="flex items-center gap-2">
                                        <Music className="w-4 h-4" />
                                        Audio ({typeCounts.audio})
                                    </div>
                                </SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                </div>
            </div>
        </div>
    );
}
