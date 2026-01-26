import React, { useState, useRef, useEffect } from 'react';
import {
    FiSearch,
    FiPlus,
    FiMessageSquare,
    FiSliders,
} from 'react-icons/fi';
import { useMobileView } from '../../../hooks/useMobileView';
import { cn } from '../../../../utils/cn';
import '../../../../components/BoxedInputFields/styles/boxedInputFields.css';

const filterLabels = {
    all: 'All Messages',
    unread: 'Unread',
    unresponded: 'Unresponded',
};

export const MessagesToolbar = ({
    searchQuery,
    setSearchQuery,
    selectedFilter,
    setSelectedFilter,
    onCreateMessage,
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
                        Messages
                    </h3>
                </div>
                <div className="pt-3 border-t border-border mb-4 px-6">
                    <p className="text-sm text-muted-foreground">
                        Browse and manage your conversations.
                    </p>
                </div>
                <div className="flex flex-wrap items-center gap-3 w-full px-6 pb-6">
                    <div className="relative flex-1 min-w-[200px]">
                        <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none z-10" />
                        <input
                            type="text"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder="Search messages..."
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
                                selectedFilter !== 'all' || showFiltersOverlay
                                    ? "bg-primary/10 border-primary/20 text-primary"
                                    : "bg-background border-input text-muted-foreground hover:text-foreground hover:border-muted-foreground/30"
                            )}
                            style={{ height: 'var(--boxed-inputfield-height)' }}
                            title="Filter Messages"
                        >
                            <FiSliders className="w-4 h-4" />
                            <span className="text-sm font-medium">
                                {filterLabels[selectedFilter] || 'Filter'}
                            </span>
                        </button>

                        {showFiltersOverlay && (
                            <div className="absolute right-0 top-full mt-2 w-56 rounded-xl border border-border bg-popover shadow-lg p-1.5 z-50 animate-in fade-in zoom-in-95 duration-200">
                                <div className="text-xs font-semibold text-muted-foreground px-2 py-1.5 mb-1">
                                    Filters
                                </div>
                                <button
                                    onClick={() => { setSelectedFilter('all'); setShowFiltersOverlay(false); }}
                                    className={cn(
                                        "w-full text-left px-2 py-1.5 rounded-lg text-sm transition-colors flex items-center gap-2",
                                        selectedFilter === 'all'
                                            ? "bg-primary/10 text-primary font-medium"
                                            : "text-foreground hover:bg-muted"
                                    )}
                                >
                                    <span>All Messages</span>
                                </button>
                                <button
                                    onClick={() => { setSelectedFilter('unread'); setShowFiltersOverlay(false); }}
                                    className={cn(
                                        "w-full text-left px-2 py-1.5 rounded-lg text-sm transition-colors flex items-center gap-2",
                                        selectedFilter === 'unread'
                                            ? "bg-primary/10 text-primary font-medium"
                                            : "text-foreground hover:bg-muted"
                                    )}
                                >
                                    <span>Unread</span>
                                </button>
                                <button
                                    onClick={() => { setSelectedFilter('unresponded'); setShowFiltersOverlay(false); }}
                                    className={cn(
                                        "w-full text-left px-2 py-1.5 rounded-lg text-sm transition-colors flex items-center gap-2",
                                        selectedFilter === 'unresponded'
                                            ? "bg-primary/10 text-primary font-medium"
                                            : "text-foreground hover:bg-muted"
                                    )}
                                >
                                    <span>Unresponded</span>
                                </button>
                            </div>
                        )}
                    </div>

                    <button
                        onClick={onCreateMessage}
                        className="px-4 rounded-xl bg-primary text-primary-foreground text-sm font-bold hover:bg-primary/90 transition-all shadow-sm flex items-center gap-2 shrink-0"
                        style={{ height: 'var(--boxed-inputfield-height)' }}
                    >
                        <FiPlus className="w-4 h-4" />
                        <span>New Message</span>
                    </button>
                </div>
            </div>
        </div>
    );
};

