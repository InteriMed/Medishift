import React, { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import { useLocation } from 'react-router-dom';
import { Sidebar } from '../components/Sidebar/Sidebar';
import { Header } from '../components/Header/Header';
import { cn } from '../../utils/cn';
import { useSidebar } from '../contexts/SidebarContext';
import { usePageMobile } from '../contexts/PageMobileContext';
import { getSidebarLayout } from '../utils/sidebarLayout';
import './DashboardLayout.css';

export function DashboardLayout({ children }) {
    const location = useLocation();
    const { isMainSidebarCollapsed, setIsMainSidebarCollapsed } = useSidebar();
    const { showBackButton, onBackButtonClick } = usePageMobile();

    const isAdminRoute = location.pathname.includes('/dashboard/admin');
    const [viewportWidth, setViewportWidth] = useState(() => {
        return typeof window !== 'undefined' ? window.innerWidth : 1200;
    });
    const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(() => {
        const vw = typeof window !== 'undefined' ? window.innerWidth : 1200;
        return vw < 1200 ? true : isMainSidebarCollapsed;
    });
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

    const isMobileMode = viewportWidth < 768;
    const isOverlayMode = viewportWidth >= 768 && viewportWidth < 1200;
    const { isDockedSidebarMode } = getSidebarLayout({
        viewportWidth,
        isAdminRoute,
        isCollapsed: isSidebarCollapsed
    });

    useEffect(() => {
        const handleResize = () => {
            const vw = window.innerWidth;
            setViewportWidth(vw);
            if (vw < 768) {
                setIsSidebarCollapsed(true);
            } else if (vw < 1200) {
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
                {/* Desktop Sidebar - Normal mode (viewport >= 1200px) - Hidden for admin routes */}
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
                        className="animate-in fade-in slide-in-from-bottom-4 duration-500" 
                        style={{ 
                            position: 'relative', 
                            zIndex: 0,
                            height: 'calc(100vh - 3.5rem)',
                            overflow: 'visible',
                            marginTop: '3.5rem',
                            padding: 0,
                            width: '100%'
                        }} 
                        data-dashboard="true"
                    >
                        <div className="h-full w-full overflow-visible" style={{ position: 'relative', zIndex: 0 }}>
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
