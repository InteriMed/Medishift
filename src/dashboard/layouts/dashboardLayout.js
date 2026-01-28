import React, { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import { useLocation } from 'react-router-dom';
import { Sidebar } from '../pages/components/sidebar/sidebar';
import { Header } from '../pages/components/header/header';
import { cn } from '../../utils/cn';
import { usePageMobile } from '../contexts/responsiveContext';
import { getSidebarLayout } from '../utils/sidebarLayout';
import './dashboardLayout';

export function DashboardLayout({ children }) {
    const location = useLocation();
    const { isMainSidebarCollapsed, setIsMainSidebarCollapsed, showBackButton, onBackButtonClick } = usePageMobile();

    const isAdminRoute = location.pathname.includes('/dashboard/admin');
    const isCalendarRoute = location.pathname.includes('/dashboard/calendar');
    const [viewportWidth, setViewportWidth] = useState(() => {
        return typeof window !== 'undefined' ? window.innerWidth : 1200;
    });
    const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(() => {
        const vw = typeof window !== 'undefined' ? window.innerWidth : 1200;
        return vw < 770 ? true : isMainSidebarCollapsed;
    });
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

    const isMobileMode = viewportWidth < 770;
    const isOverlayMode = false;
    const { isDockedSidebarMode } = getSidebarLayout({
        viewportWidth,
        isAdminRoute,
        isCollapsed: isSidebarCollapsed
    });

    useEffect(() => {
        const handleResize = () => {
            const vw = window.innerWidth;
            setViewportWidth(vw);
            if (vw < 770) {
                setIsSidebarCollapsed(true);
            } else {
                setIsSidebarCollapsed(isMainSidebarCollapsed);
            }
        };

        handleResize();
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, [isMainSidebarCollapsed]);

    useEffect(() => {
        if (!isOverlayMode) {
            if (isSidebarCollapsed !== isMainSidebarCollapsed) {
                setIsMainSidebarCollapsed(isSidebarCollapsed);
            }
        }
    }, [isSidebarCollapsed, isMainSidebarCollapsed, setIsMainSidebarCollapsed, isOverlayMode]);


    const toggleSidebar = () => {
        setIsSidebarCollapsed(!isSidebarCollapsed);
    };

    const closeOverlaySidebar = () => {
        if (isOverlayMode && !isMobileMode) {
            setIsSidebarCollapsed(true);
        }
    };

    const toggleMobileMenu = () => {
        setIsMobileMenuOpen(!isMobileMenuOpen);
    };

    const closeMobileMenu = () => {
        setIsMobileMenuOpen(false);
    };

    return (
        <div className="dashboard-layout-wrapper">
            <div className="dashboard-layout-content h-screen text-foreground font-sans antialiased flex flex-col">
                {/* Desktop Sidebar - Normal mode (viewport >= 770px) - Hidden for admin routes */}
                {!isAdminRoute && !isOverlayMode && !isMobileMode && (
                    <Sidebar
                        collapsed={isSidebarCollapsed}
                        onToggle={toggleSidebar}
                        isMobile={false}
                    />
                )}

                {/* Overlay Sidebar for 768px <= viewport < 1200px - Hidden for admin routes */}
                {!isAdminRoute && isOverlayMode && !isMobileMenuOpen && (
                    <>
                        {!isSidebarCollapsed && (
                            <div
                                className="fixed inset-0 bg-black/50 z-[45]"
                                onClick={closeOverlaySidebar}
                            />
                        )}
                        <Sidebar
                            collapsed={isSidebarCollapsed}
                            onToggle={toggleSidebar}
                            isMobile={false}
                            isOverlayMode={true}
                            isOverlayExpanded={!isSidebarCollapsed}
                        />
                    </>
                )}

                {/* Mobile Sidebar Overlay - Only shown when mobile menu is open - Hidden for admin routes */}
                {!isAdminRoute && isMobileMode && isMobileMenuOpen && (
                    <>
                        <div
                            className="fixed inset-0 bg-black/50 z-[45]"
                            onClick={closeMobileMenu}
                        />
                        <Sidebar
                            collapsed={false}
                            onToggle={closeMobileMenu}
                            isMobile={true}
                        />
                    </>
                )}

                {/* Overlay Sidebar for 768px <= viewport < 1200px when menu is open - Hidden for admin routes */}
                {!isAdminRoute && isOverlayMode && isMobileMenuOpen && (
                    <>
                        <div
                            className="fixed inset-0 bg-black/50 z-[45]"
                            onClick={closeMobileMenu}
                        />
                        <Sidebar
                            collapsed={false}
                            onToggle={closeMobileMenu}
                            isMobile={false}
                            isOverlayMode={true}
                            isOverlayExpanded={true}
                        />
                    </>
                )}

                {/* Main Content Area */}
                <div 
                    className={cn(
                        "flex-1 flex flex-col",
                        isDockedSidebarMode && (isSidebarCollapsed ? "md:ml-[70px]" : "md:ml-64"),
                        (!isDockedSidebarMode || isMobileMode) && "ml-0 w-full"
                    )}
                    style={{
                        transition: isDockedSidebarMode
                            ? 'margin-left 300ms cubic-bezier(0.4, 0, 0.2, 1)' 
                            : 'none',
                        height: '100vh',
                        overflow: 'visible'
                    }}
                >
                    <Header
                        collapsed={isSidebarCollapsed}
                        onMobileMenuToggle={toggleMobileMenu}
                        isMobileMenuOpen={isMobileMenuOpen}
                        showBackButton={showBackButton}
                        onBackButtonClick={onBackButtonClick}
                    />

                    <main 
                        className="dashboard-main-content" 
                        style={{ 
                            position: 'relative', 
                            zIndex: 0,
                            height: 'calc(100vh - 3.5rem)',
                            overflow: 'hidden',
                            marginTop: '3.5rem',
                            padding: 0,
                            width: '100%',
                            backgroundColor: 'var(--background-color, #ffffff)'
                        }} 
                        data-dashboard="true"
                    >
                        <div 
                            className={cn(
                                "dashboard-content-wrapper",
                                !isCalendarRoute && "dashboard-scrollable-content"
                            )}
                            style={{ 
                                position: 'relative', 
                                zIndex: 0,
                                height: '100%',
                                width: '100%',
                                padding: isCalendarRoute ? 0 : 'var(--spacing-xl, 32px)',
                                paddingTop: isCalendarRoute ? 0 : 'var(--spacing-lg, 24px)',
                                maxWidth: '100%',
                                margin: '0 auto'
                            }}
                        >
                            {children}
                        </div>
                    </main>
                </div>
            </div>
        </div>
    );
}

DashboardLayout.propTypes = {
    children: PropTypes.node.isRequired
};

export default DashboardLayout;
