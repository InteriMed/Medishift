import React, { useState, useRef, useEffect } from 'react';
import {
    FiSearch,
    FiPlus,
    FiMessageCircle,
    FiHelpCircle,
    FiShield,
    FiGlobe,
    FiUser,
    FiMenu,
    FiSliders,
    FiX
} from 'react-icons/fi';
import { useMobileView } from '../../../../hooks/useMobileView';
import { cn } from '../../../../../utils/cn';
import '../../../../../components/BoxedInputFields/styles/boxedInputFields.css';

const categoryLabels = {
    feedback: 'Feedback',
    bug_report: 'Bug Report',
    feature_request: 'Feature Request',
    support: 'Support',
    question: 'Question',
    general: 'General',
};

const categoryIcons = {
    feedback: FiMessageCircle,
    bug_report: FiHelpCircle, // Closest match in feather icons
    feature_request: FiHelpCircle,
    support: FiShield,
    question: FiHelpCircle,
    general: FiMessageCircle,
};

export const CommunicationToolbar = ({
    searchQuery,
    setSearchQuery,
    selectedCategory,
    setSelectedCategory,
    categories,
    activeTab,
    setActiveTab,
    onCreateTopic,
    viewMode,
    setViewMode,
    canAccessThreads
}) => {
    const isMobile = useMobileView();
    const [showFiltersOverlay, setShowFiltersOverlay] = useState(false);
    const filterDropdownRef = useRef(null);

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (filterDropdownRef.current && !filterDropdownRef.current.contains(event.target)) {
                setShowFiltersOverlay(false);
            }
        };

        if (showFiltersOverlay) {
            document.addEventListener('mousedown', handleClickOutside);
        }

        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [showFiltersOverlay]);

    return (
        <div className="flex flex-col gap-4 p-4 border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-10">
            {/* Top Row: Tabs & Actions */}
            <div className="flex items-center justify-between gap-4">
                {/* Mobile: Hamburger/Menu trigger could go here if needed, but sidebar handles it */}

                {/* Tabs */}
                <div className="flex bg-muted/20 p-1 rounded-xl">
                    <button
                        onClick={() => setActiveTab('community')}
                        className={cn(
                            "flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all",
                            activeTab === 'community'
                                ? "bg-primary text-primary-foreground shadow-sm"
                                : "text-muted-foreground hover:text-foreground hover:bg-muted/40"
                        )}
                    >
                        <FiGlobe className="w-4 h-4" />
                        {!isMobile && <span>Community</span>}
                    </button>
                    <button
                        onClick={() => setActiveTab('my-topics')}
                        className={cn(
                            "flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all",
                            activeTab === 'my-topics'
                                ? "bg-primary text-primary-foreground shadow-sm"
                                : "text-muted-foreground hover:text-foreground hover:bg-muted/40"
                        )}
                    >
                        <FiUser className="w-4 h-4" />
                        {!isMobile && <span>Support</span>}
                    </button>
                </div>

                {/* Action Buttons */}
                <div className="flex items-center gap-2">
                    <button
                        onClick={onCreateTopic}
                        className="bg-primary text-primary-foreground hover:bg-primary/90 rounded-xl px-4 py-2 text-sm font-medium flex items-center gap-2 transition-colors shadow-sm"
                        style={{ height: 'var(--boxed-inputfield-height)' }}
                    >
                        <FiPlus className="w-4 h-4" />
                        <span className="hidden sm:inline">New Topic</span>
                    </button>
                </div>
            </div>

            {/* Bottom Row: Search & Filters */}
            <div className="flex items-center gap-3">
                {/* Search */}
                <div className="relative flex-1 group">
                    <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
                    <input
                        type="text"
                        placeholder="Search topics..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full pl-9 pr-4 rounded-xl border border-input bg-background/50 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                        style={{
                            height: 'var(--boxed-inputfield-height)',
                            fontFamily: 'var(--font-family-text)'
                        }}
                    />
                </div>

                {/* Filter Dropdown */}
                <div className="relative" ref={filterDropdownRef}>
                    <button
                        onClick={() => setShowFiltersOverlay(!showFiltersOverlay)}
                        className={cn(
                            "p-2 rounded-xl border border-input transition-colors flex items-center gap-2",
                            selectedCategory !== 'all' || showFiltersOverlay
                                ? "bg-primary/10 border-primary/20 text-primary"
                                : "bg-background/50 text-muted-foreground hover:bg-muted"
                        )}
                        style={{ height: 'var(--boxed-inputfield-height)' }}
                        title="Filter by Category"
                    >
                        <FiSliders className="w-4 h-4" />
                        <span className="hidden sm:inline text-sm font-medium">
                            {selectedCategory !== 'all' ? categoryLabels[selectedCategory] : 'Filter'}
                        </span>
                    </button>

                    {showFiltersOverlay && (
                        <div className="absolute right-0 top-full mt-2 w-56 rounded-xl border border-border bg-popover shadow-lg p-1.5 z-50 animate-in fade-in zoom-in-95 duration-200">
                            <div className="text-xs font-semibold text-muted-foreground px-2 py-1.5 mb-1">
                                Categories
                            </div>
                            <button
                                onClick={() => { setSelectedCategory('all'); setShowFiltersOverlay(false); }}
                                className={cn(
                                    "w-full text-left px-2 py-1.5 rounded-lg text-sm transition-colors flex items-center gap-2",
                                    selectedCategory === 'all'
                                        ? "bg-primary/10 text-primary font-medium"
                                        : "text-foreground hover:bg-muted"
                                )}
                            >
                                <span>All Categories</span>
                            </button>
                            {categories.map((cat) => {
                                const Icon = categoryIcons[cat] || FiMessageCircle;
                                return (
                                    <button
                                        key={cat}
                                        onClick={() => { setSelectedCategory(cat); setShowFiltersOverlay(false); }}
                                        className={cn(
                                            "w-full text-left px-2 py-1.5 rounded-lg text-sm transition-colors flex items-center gap-2",
                                            selectedCategory === cat
                                                ? "bg-primary/10 text-primary font-medium"
                                                : "text-foreground hover:bg-muted"
                                        )}
                                    >
                                        <Icon className="w-3.5 h-3.5 opacity-70" />
                                        <span>{categoryLabels[cat] || cat}</span>
                                    </button>
                                );
                            })}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};
