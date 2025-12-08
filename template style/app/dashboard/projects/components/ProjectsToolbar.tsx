'use client';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuRadioGroup,
    DropdownMenuRadioItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
    Search,
    CheckSquare,
    Square,
    Trash2,
    LayoutGrid,
    List as ListIcon,
    Plus,
    Filter
} from 'lucide-react';
import { PROJECT_STATUSES } from '@/lib/dashboard-utils';

interface ProjectsToolbarProps {
    filters: {
        searchQuery: string;
        selectedType: string;
        selectedStatus: string;
    };
    updateFilters: (updates: Partial<any>) => void;
    clearFilters: () => void;
    hasActiveFilters: boolean;
    selectionMode: boolean;
    selectedCount: number;
    totalCount: number;
    toggleSelectionMode: () => void;
    handleDeleteSelected: () => void;
    selectAll: () => void;
    isAllSelected: boolean;
    viewMode: 'grid' | 'list';
    setViewMode: (mode: 'grid' | 'list') => void;
    onNewProject: () => void;
    loading: boolean;
}

export function ProjectsToolbar({
    filters,
    updateFilters,
    clearFilters,
    hasActiveFilters,
    selectionMode,
    selectedCount,
    totalCount,
    toggleSelectionMode,
    handleDeleteSelected,
    selectAll,
    isAllSelected,
    viewMode,
    setViewMode,
    onNewProject,
    loading
}: ProjectsToolbarProps) {
    return (
        <div className="border-b border-border/40 dark:border-b-white/10 backdrop-blur-xl supports-[backdrop-filter]:bg-background/20 shadow-sm sticky top-0 z-40">
            <div className="max-w-[1600px] mx-auto px-4 py-3">
                <div className="flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                        {!loading && (
                            <Badge
                                variant="outline"
                                className="bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200 font-medium"
                            >
                                {totalCount} {totalCount === 1 ? 'project' : 'projects'}
                            </Badge>
                        )}
                        <div className="relative flex-1 max-w-md">
                            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                            <Input
                                placeholder="Search projects..."
                                value={filters.searchQuery}
                                onChange={(e) => updateFilters({ searchQuery: e.target.value })}
                                className="pl-9 h-9 bg-background/50"
                            />
                        </div>
                        <div className="flex bg-muted/50 rounded-lg p-1">
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <Button
                                        variant={filters.selectedStatus !== 'all' ? 'secondary' : 'ghost'}
                                        size="icon"
                                        className="h-7 w-7"
                                    >
                                        <Filter className="w-4 h-4" />
                                    </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end" className="w-48">
                                    <DropdownMenuRadioGroup
                                        value={filters.selectedStatus}
                                        onValueChange={(value) => updateFilters({ selectedStatus: value })}
                                    >
                                        {PROJECT_STATUSES.map((status) => (
                                            <DropdownMenuRadioItem 
                                                key={status.value} 
                                                value={status.value}
                                                className="focus:bg-muted hover:bg-muted"
                                            >
                                                {status.label}
                                            </DropdownMenuRadioItem>
                                        ))}
                                    </DropdownMenuRadioGroup>
                                    {hasActiveFilters && (
                                        <>
                                            <div className="h-px bg-muted my-1" />
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                onClick={clearFilters}
                                                className="w-full justify-start h-8 text-xs"
                                            >
                                                Clear filters
                                            </Button>
                                        </>
                                    )}
                                </DropdownMenuContent>
                            </DropdownMenu>
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
                        <Button onClick={onNewProject} className="btn-ai-gradient h-9">
                            <Plus className="w-4 h-4 mr-2" />
                            New Project
                        </Button>
                    </div>

                    <div className="flex items-center gap-2 flex-shrink-0">
                        {selectionMode && selectedCount > 0 && (
                            <Button
                                variant="destructive"
                                size="sm"
                                onClick={handleDeleteSelected}
                                className="h-9"
                            >
                                <Trash2 className="w-4 h-4 mr-2" />
                                Delete ({selectedCount})
                            </Button>
                        )}

                        <Button
                            variant={selectionMode ? "secondary" : "ghost"}
                            size="sm"
                            onClick={toggleSelectionMode}
                            className="h-9"
                        >
                            {selectionMode ? (
                                <>
                                    <CheckSquare className="w-4 h-4 mr-2" />
                                    Done
                                </>
                            ) : (
                                <>
                                    <Square className="w-4 h-4 mr-2" />
                                    Select
                                </>
                            )}
                        </Button>
                    </div>
                </div>

                {selectionMode && (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground mt-3 pt-3 border-t border-border/40 animate-in fade-in slide-in-from-top-1">
                        <button
                            onClick={selectAll}
                            className="flex items-center gap-2 hover:text-foreground transition-colors"
                        >
                            {isAllSelected ? (
                                <CheckSquare className="w-4 h-4" />
                            ) : (
                                <Square className="w-4 h-4" />
                            )}
                            {isAllSelected ? 'Deselect All' : 'Select All'}
                        </button>
                        <span className="text-muted-foreground/40">|</span>
                        <span>{selectedCount} selected</span>
                    </div>
                )}
            </div>
        </div>
    );
}
