import React, { useState, useEffect } from 'react';
import Button from '../../../../../components/boxedInputFields/button';
import PersonnalizedInputField from '../../../../../components/boxedInputFields/personnalizedInputField';
import {
    FiSearch as Search,
    FiPlus as Plus,
    FiMessageCircle as MessageCircle,
    FiAlertCircle as Bug,
    FiZap as Lightbulb,
    FiHelpCircle as HelpCircle,
    FiShield as Shield,
    FiMessageSquare as MessageSquare,
    FiGlobe as Globe,
    FiUser as User,
    FiMenu as Menu,
    FiSliders as SlidersHorizontal,
} from 'react-icons/fi';

export type TopicCategory = 'feedback' | 'bug_report' | 'feature_request' | 'support' | 'question' | 'general';

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
    const [isSmall, setIsSmall] = useState(window.innerWidth < 768);
    
    React.useEffect(() => {
        const handleResize = () => setIsSmall(window.innerWidth < 768);
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    const renderFilters = (isFullWidth: boolean = false) => (
        <div className={`flex ${isFullWidth ? 'flex-col space-y-6' : 'items-center gap-4'}`}>
            {!isFullWidth && (
                <div className="flex gap-2 border-b border-border/40">
                    <button
                        onClick={() => setActiveTab('community')}
                        className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                            activeTab === 'community'
                                ? 'border-primary text-primary'
                                : 'border-transparent text-muted-foreground hover:text-foreground'
                        }`}
                    >
                        <div className="flex items-center gap-2">
                            <Globe className="w-4 h-4" />
                            Community
                        </div>
                    </button>
                    <button
                        onClick={() => setActiveTab('my-topics')}
                        className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                            activeTab === 'my-topics'
                                ? 'border-primary text-primary'
                                : 'border-transparent text-muted-foreground hover:text-foreground'
                        }`}
                    >
                        <div className="flex items-center gap-2">
                            <User className="w-4 h-4" />
                            Support
                        </div>
                    </button>
                </div>
            )}

            <div className={isFullWidth ? 'space-y-2' : ''}>
                {isFullWidth && <label className="text-sm font-medium text-muted-foreground ml-1">Category</label>}
                <select
                    value={selectedCategory}
                    onChange={(e) => setSelectedCategory(e.target.value)}
                    className="px-4 py-2 rounded-xl bg-background border border-white/10 text-foreground"
                >
                    <option value="all">All Categories</option>
                    {categories.map(cat => (
                        <option key={cat} value={cat}>
                            {categoryLabels[cat as TopicCategory] || cat}
                        </option>
                    ))}
                </select>
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
                                <Button
                                    variant="secondary"
                                    onClick={() => {
                                        window.dispatchEvent(new CustomEvent('openSidebar'));
                                    }}
                                    className="h-9 w-9"
                                >
                                    <Menu className="w-4 h-4" />
                                </Button>
                            </div>

                            <div className="absolute left-1/2 -translate-x-1/2">
                                <div className="flex gap-2 border-b border-border/40">
                                    <button
                                        onClick={() => setActiveTab('community')}
                                        className={`px-3 py-2 text-sm font-medium border-b-2 transition-colors ${
                                            activeTab === 'community'
                                                ? 'border-primary text-primary'
                                                : 'border-transparent text-muted-foreground hover:text-foreground'
                                        }`}
                                    >
                                        <div className="flex items-center gap-2">
                                            <Globe className="w-4 h-4" />
                                            Community
                                        </div>
                                    </button>
                                    <button
                                        onClick={() => setActiveTab('my-topics')}
                                        className={`px-3 py-2 text-sm font-medium border-b-2 transition-colors ${
                                            activeTab === 'my-topics'
                                                ? 'border-primary text-primary'
                                                : 'border-transparent text-muted-foreground hover:text-foreground'
                                        }`}
                                    >
                                        <div className="flex items-center gap-2">
                                            <User className="w-4 h-4" />
                                            Support
                                        </div>
                                    </button>
                                </div>
                            </div>

                            <div className="flex items-center gap-1.5 ml-auto">
                                <Button
                                    onClick={onCreateTopic}
                                    variant="secondary"
                                    className="h-9 w-9"
                                >
                                    <Plus className="w-4 h-4" />
                                </Button>
                            </div>
                        </>
                    ) : (
                        <>
                            <div className="flex items-center gap-4">
                                {renderFilters(false)}
                            </div>

                            <div className="relative flex-1 max-w-[460px] mx-auto group">
                                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4 transition-colors group-focus-within:text-white/70" />
                                <PersonnalizedInputField
                                    label=""
                                    placeholder="Search topics..."
                                    value={searchQuery}
                                    onChange={(e: any) => setSearchQuery(e.target.value)}
                                    name="searchTopics"
                                    required={false}
                                    marginBottom={undefined}
                                    marginLeft={undefined}
                                    marginRight={undefined}
                                    error={null}
                                    onErrorReset={() => {}}
                                    verification={undefined}
                                    clearFilter={undefined}
                                />
                            </div>

                            <div className="flex items-center gap-2">
                                <Button
                                    onClick={onCreateTopic}
                                    variant="primary"
                                    className="h-10 flex items-center gap-2 px-6"
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
