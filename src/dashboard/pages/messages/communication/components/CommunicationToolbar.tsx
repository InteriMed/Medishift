'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
    Search,
    Plus,
    MessageCircle,
    Bug,
    Lightbulb,
    HelpCircle,
    Shield,
    MessageSquare,
    Globe,
    User,
    Menu,
    SlidersHorizontal,
} from 'lucide-react';
import { useResponsive } from '@/hooks/ui/use-responsive';
import { TopicCategory } from '@/lib/api/topics';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ClipizySelect } from '@/components/ui/clipizy-select';
import {
    Sheet,
    SheetContent,
    SheetHeader,
    SheetTitle,
    SheetTrigger,
} from '@/components/ui/sheet';

const categoryIcons: Record<TopicCategory, any> = {
    feedback: MessageCircle,
    bug_report: Bug,
    feature_request: Lightbulb,
    support: Shield,
    question: HelpCircle,
    general: MessageSquare,
};

const categoryLabels: Record<TopicCategory, string> = {
    feedback: 'Feedback',
    bug_report: 'Bug Report',
    feature_request: 'Feature Request',
    support: 'Support',
    question: 'Question',
    general: 'General',
};

interface CommunicationToolbarProps {
    searchQuery: string;
    setSearchQuery: (query: string) => void;
    selectedCategory: string;
    setSelectedCategory: (category: string) => void;
    categories: string[];
    activeTab: string;
    setActiveTab: (tab: string) => void;
    onCreateTopic: () => void;
}

export function CommunicationToolbar({
    searchQuery,
    setSearchQuery,
    selectedCategory,
    setSelectedCategory,
    categories,
    activeTab,
    setActiveTab,
    onCreateTopic,
}: CommunicationToolbarProps) {
    const { width, isSmall } = useResponsive();
    const [searchDialogOpen, setSearchDialogOpen] = useState(false);
    const [filtersSheetOpen, setFiltersSheetOpen] = useState(false);

    const renderFilters = (isFullWidth: boolean = false) => (
        <div className={`flex ${isFullWidth ? 'flex-col space-y-6' : 'items-center gap-4'}`}>
            {!isFullWidth && (
                <Tabs value={activeTab} onValueChange={setActiveTab}>
                    <TabsList className="grid grid-cols-2">
                        <TabsTrigger value="community" className="flex items-center gap-2">
                            <Globe className="w-4 h-4" />
                            Community
                        </TabsTrigger>
                        <TabsTrigger value="my-topics" className="flex items-center gap-2">
                            <User className="w-4 h-4" />
                            Support
                        </TabsTrigger>
                    </TabsList>
                </Tabs>
            )}

            <div className={isFullWidth ? 'space-y-2' : ''}>
                {isFullWidth && <label className="text-sm font-medium text-muted-foreground ml-1">Category</label>}
                <ClipizySelect
                    value={selectedCategory}
                    onValueChange={setSelectedCategory}
                    placeholder="Category"
                    triggerClassName={isFullWidth ? "w-full !bg-background border-dashed border-white/20" : "w-[200px]"}
                    options={[
                        { value: 'all', label: 'All Categories' },
                        ...categories.map(cat => ({
                            value: cat,
                            label: categoryLabels[cat as TopicCategory] || cat,
                            icon: categoryIcons[cat as TopicCategory]
                        }))
                    ]}
                />
            </div>
        </div>
    );

    return (
        <div className="bg-background sticky top-0 z-40 border-none transition-all duration-300">
            <div className="max-w-[1600px] mx-auto px-4 py-3">
                <div className="flex items-center justify-between gap-4 relative">
                    {isSmall ? (
                        <>
                            <div className="flex items-center gap-2">
                                {width < 768 && (
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        onClick={() => {
                                            window.dispatchEvent(new CustomEvent('openSidebar'));
                                        }}
                                        className="h-9 w-9 hover:bg-secondary/50"
                                    >
                                        <Menu className="w-4 h-4" />
                                    </Button>
                                )}
                            </div>

                            {/* Centered Tabs on mobile */}
                            <div className="absolute left-1/2 -translate-x-1/2">
                                <Tabs value={activeTab} onValueChange={setActiveTab} className="scale-90 sm:scale-100">
                                    <TabsList className="bg-secondary/30">
                                        <TabsTrigger value="community" className="px-3 gap-2">
                                            <Globe className="w-4 h-4" />
                                            Community
                                        </TabsTrigger>
                                        <TabsTrigger value="my-topics" className="px-3 gap-2">
                                            <User className="w-4 h-4" />
                                            Support
                                        </TabsTrigger>
                                    </TabsList>
                                </Tabs>
                            </div>

                            <div className="flex items-center gap-1.5 ml-auto">
                                <Button
                                    onClick={onCreateTopic}
                                    variant="ghost"
                                    size="icon"
                                    className="h-9 w-9 hover:bg-secondary/50"
                                >
                                    <Plus className="w-4 h-4" />
                                </Button>

                                <Sheet open={filtersSheetOpen} onOpenChange={setFiltersSheetOpen}>
                                    <SheetTrigger asChild>
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            className="h-9 w-9 hover:bg-secondary/50"
                                        >
                                            <SlidersHorizontal className="w-4 h-4" />
                                        </Button>
                                    </SheetTrigger>
                                    <SheetContent side="left" className="w-[300px] border-none bg-background/95 backdrop-blur-md">
                                        <SheetHeader className="mb-6">
                                            <SheetTitle>Parameters</SheetTitle>
                                        </SheetHeader>
                                        <div className="mt-4">
                                            {renderFilters(true)}
                                        </div>
                                    </SheetContent>
                                </Sheet>

                                <Sheet open={searchDialogOpen} onOpenChange={setSearchDialogOpen}>
                                    <SheetTrigger asChild>
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            className="h-9 w-9 hover:bg-secondary/50"
                                        >
                                            <Search className="w-4 h-4" />
                                        </Button>
                                    </SheetTrigger>
                                    <SheetContent side="top" className="h-auto border-none bg-background/95 backdrop-blur-md">
                                        <SheetHeader>
                                            <SheetTitle>Search Topics</SheetTitle>
                                        </SheetHeader>
                                        <div className="mt-4 pb-4">
                                            <div className="relative group">
                                                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4 transition-colors group-focus-within:text-primary" />
                                                <Input
                                                    placeholder="Search..."
                                                    value={searchQuery}
                                                    onChange={(e) => setSearchQuery(e.target.value)}
                                                    className="pl-10 h-11 bg-secondary/50 border-white/5 focus:border-primary/50 focus-visible:ring-0 focus-visible:ring-offset-0 transition-all rounded-xl"
                                                    autoFocus
                                                />
                                            </div>
                                        </div>
                                    </SheetContent>
                                </Sheet>
                            </div>
                        </>
                    ) : (
                        <>
                            <div className="flex items-center gap-4">
                                {renderFilters(false)}
                            </div>

                            <div className="relative flex-1 max-w-[460px] mx-auto group">
                                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4 transition-colors group-focus-within:text-white/70" />
                                <Input
                                    placeholder="Search topics..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className="pl-10 h-10 bg-secondary/40 border-white/5 hover:border-white/10 focus:border-white/20 focus:bg-secondary/60 focus-visible:ring-0 focus-visible:ring-offset-0 transition-all duration-300 rounded-xl placeholder:text-muted-foreground/40"
                                />
                            </div>

                            <div className="flex items-center gap-2">
                                <Button
                                    onClick={onCreateTopic}
                                    className="btn-tertiary-gradient h-10 flex items-center gap-2 text-white px-6 shadow-lg hover:shadow-primary/20 transition-all"
                                >
                                    <Plus className="w-4 h-4" />
                                    New Topic
                                </Button>
                            </div>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
}
