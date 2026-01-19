import React, { useState } from 'react';
import PropTypes from 'prop-types';
import { cn } from '../../../utils/cn';

/**
 * LockedMenuItem component
 * Renders a locked menu item with visual feedback when clicked
 * Replaces redundant blocking logic with single unified component
 */
const LockedMenuItem = ({ item, collapsed = false, isMobile = false }) => {
    const [showTooltip, setShowTooltip] = useState(false);
    const [isShaking, setIsShaking] = useState(false);

    const handleClick = (e) => {
        e.preventDefault();
        e.stopPropagation();

        console.log(`[LockedMenuItem] Click prevented on ${item.path} - item is locked`);

        // Show tooltip
        setShowTooltip(true);

        // Trigger shake animation
        setIsShaking(true);

        // Auto-hide tooltip and stop shake after 3 seconds
        setTimeout(() => {
            setShowTooltip(false);
            setIsShaking(false);
        }, 3000);
    };

    return (
        <div
            role="button"
            aria-disabled="true"
            aria-label={`${item.title} - Locked. Complete the profile tutorial to unlock.`}
            onClick={handleClick}
            className={cn(
                "global-lock group relative flex gap-3 rounded-lg border min-w-0 transition-all duration-200 outline-none select-none",
                collapsed ? "p-2 justify-center" : "p-3",
                "text-muted-foreground/40 cursor-not-allowed",
                "border-transparent",
                "hover:bg-muted/20 hover:border-muted/30",
                isShaking && "animate-shake"
            )}
            style={{
                userSelect: 'none',
                pointerEvents: 'auto'
            }}
        >

            <div className={cn(
                "w-1.5 h-full absolute left-0 top-0 bottom-0 rounded-l-lg",
                "bg-muted/20"
            )} />

            <div className={cn(
                "w-full flex items-center justify-between min-w-0",
                collapsed ? "justify-center pl-0" : "pl-1.5"
            )}>
                <div className={cn(
                    "flex items-center min-w-0",
                    collapsed ? "justify-center" : "gap-3"
                )}>
                    <div className={cn(
                        "shrink-0 icon-container",
                        "bg-muted/10 text-muted-foreground/40"
                    )}>
                        <item.icon className="w-5 h-5 shrink-0" />
                    </div>
                    {!collapsed && (
                        <>
                            <span className={cn(
                                "text-sm font-medium truncate text-container",
                                "text-muted-foreground/40"
                            )}>
                                {item.title}
                            </span>
                            {/* Lock icon */}
                            <svg
                                className="w-3.5 h-3.5 ml-auto shrink-0 text-muted-foreground/30"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                            >
                                <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                                />
                            </svg>
                        </>
                    )}
                </div>
            </div>

            {/* Hover tooltip for collapsed mode */}
            {collapsed && (
                <div className="absolute left-full ml-2 px-2 py-1 bg-popover text-popover-foreground text-xs rounded shadow-md opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity z-50 whitespace-nowrap border border-border">
                    {item.title} (Locked)
                </div>
            )}

            {/* Feedback tooltip */}
            {showTooltip && !collapsed && (
                <div className={cn(
                    "absolute left-0 right-0 -bottom-2 translate-y-full",
                    "px-3 py-2 bg-amber-50 dark:bg-amber-950/50 text-amber-900 dark:text-amber-100",
                    "text-xs rounded-md shadow-lg border border-amber-200 dark:border-amber-800",
                    "z-50 whitespace-normal",
                    "animate-in slide-in-from-top-2 duration-200"
                )}>
                    <div className="flex items-start gap-2">
                        <svg className="w-4 h-4 shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                        </svg>
                        <span className="font-medium">
                            Complete the profile tutorial to unlock this feature
                        </span>
                    </div>
                </div>
            )}

            {/* Mobile-specific tooltip (appears at bottom of screen) */}
            {showTooltip && isMobile && (
                <div className={cn(
                    "fixed bottom-20 left-4 right-4",
                    "px-4 py-3 bg-amber-50 dark:bg-amber-950/50 text-amber-900 dark:text-amber-100",
                    "text-sm rounded-lg shadow-xl border border-amber-200 dark:border-amber-800",
                    "z-[9999]",
                    "animate-in slide-in-from-bottom-4 duration-300"
                )}>
                    <div className="flex items-start gap-3">
                        <svg className="w-5 h-5 shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                        </svg>
                        <div>
                            <div className="font-semibold mb-1">{item.title} is locked</div>
                            <div className="text-xs opacity-90">
                                Complete the profile tutorial to unlock all features
                            </div>
                        </div>
                    </div>
                </div>
            )}

        </div>
    );
};

LockedMenuItem.propTypes = {
    item: PropTypes.shape({
        title: PropTypes.string.isRequired,
        icon: PropTypes.elementType.isRequired,
        path: PropTypes.string.isRequired
    }).isRequired,
    collapsed: PropTypes.bool,
    isMobile: PropTypes.bool
};

export default LockedMenuItem;
