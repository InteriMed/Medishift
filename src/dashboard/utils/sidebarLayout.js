export const SIDEBAR_WIDTHS = {
  COLLAPSED: 70,
  EXPANDED: 256
};

export function getSidebarLayout({ viewportWidth, isAdminRoute, isCollapsed }) {
  const isMobileMode = viewportWidth < 770;
  const isOverlayMode = false;
  const isDockedSidebarMode = !isAdminRoute && !isMobileMode;

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



