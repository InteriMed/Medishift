import React, { useState, useRef, useEffect } from 'react';
import {
    FiSearch,
    FiPlus,
    FiMessageCircle,
    FiHelpCircle,
    FiShield,
    FiSliders,
} from 'react-icons/fi';
import { useMobileView } from '../../../hooks/useMobileView';
import { cn } from '../../../../utils/cn';
import '../../../../components/boxedInputFields/styles/boxedInputFields.css';

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
    bug_report: FiHelpCircle,
    feature_request: FiHelpCircle,
    support: FiShield,
    question: FiHelpCircle,
    general: FiMessageCircle,
};

export const SupportToolbar = ({
    searchQuery,
    setSearchQuery,
    selectedCategory,
    setSelectedCategory,
    categories,
    onCreateTopic,
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
        <div className="max-w-[1400px] mx-auto w-full p-6">
            <div className="bg-card rounded-xl border border-border hover:shadow-md transition-shadow w-full">
                <div className="flex items-center justify-between mb-4 px-6 pt-6">
                    <h3 className="text-base font-semibold text-foreground">
                        Support Topics
                    </h3>
                </div>
                <div className="pt-3 border-t border-border mb-4 px-6">
                    <p className="text-sm text-muted-foreground">
                        Browse and search for topics in the support community.
                    </p>
                </div>
                <div className="flex flex-wrap items-center gap-3 w-full px-6 pb-6">
                    <div className="relative flex-1 min-w-[200px]">
                        <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none z-10" />
                        <input
                            type="text"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder="Search topics..."
                            className="w-full pl-9 pr-8 rounded-xl border-2 border-input bg-background text-sm placeholder:text-muted-foreground focus:outline-none focus:border-primary focus:ring-0 focus:shadow-[0_0_0_4px_rgba(79,70,229,0.1)] transition-all hover:border-muted-foreground/30 hover:bg-muted/30"
                            style={{
                                height: 'var(--boxed-inputfield-height)',
                                fontWeight: '500',
                                fontFamily: 'var(--font-family-text, Roboto, sans-serif)',
                                color: 'var(--boxed-inputfield-color-text)'
                            }}
                        />
                    </div>

                    <div className="relative shrink-0" ref={filterDropdownRef}>
                        <button
                            onClick={() => setShowFiltersOverlay(!showFiltersOverlay)}
                            className={cn(
                                "px-4 rounded-xl border-2 transition-all flex items-center gap-2 shrink-0",
                                selectedCategory !== 'all' || showFiltersOverlay
                                    ? "bg-primary/10 border-primary/20 text-primary"
                                    : "bg-background border-input text-muted-foreground hover:text-foreground hover:border-muted-foreground/30"
                            )}
                            style={{ height: 'var(--boxed-inputfield-height)' }}
                            title="Filter by Category"
                        >
                            <FiSliders className="w-4 h-4" />
                            <span className="text-sm font-medium">
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

                    <button
                        onClick={onCreateTopic}
                        className="px-4 rounded-xl bg-primary text-primary-foreground text-sm font-bold hover:bg-primary/90 transition-all shadow-sm flex items-center gap-2 shrink-0"
                        style={{ height: 'var(--boxed-inputfield-height)' }}
                    >
                        <FiPlus className="w-4 h-4" />
                        <span>New Topic</span>
                    </button>
                </div>
            </div>
        </div>
    );
};

