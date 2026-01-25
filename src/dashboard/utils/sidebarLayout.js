export const SIDEBAR_WIDTHS = {
  COLLAPSED: 70,
  EXPANDED: 256
};

export function getSidebarLayout({ viewportWidth, isAdminRoute, isCollapsed }) {
  const isMobileMode = viewportWidth < 768;
  const isOverlayMode = viewportWidth >= 768 && viewportWidth < 1200;
  const isDockedSidebarMode = !isAdminRoute && !isMobileMode && !isOverlayMode;

  const sidebarWidth = isDockedSidebarMode
    ? (isCollapsed ? SIDEBAR_WIDTHS.COLLAPSED : SIDEBAR_WIDTHS.EXPANDED)
    : 0;

  return {
    isMobileMode,
    isOverlayMode,
    isDockedSidebarMode,
    sidebarWidth
  };
}


