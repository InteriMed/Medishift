export const getSidebarLayout = ({ viewportWidth, isAdminRoute, isCollapsed }) => {
  const isMobile = viewportWidth < 770;
  const isTablet = viewportWidth >= 770 && viewportWidth < 1024;
  const isDesktop = viewportWidth >= 1024;

  if (isAdminRoute) {
    return {
      isDockedSidebarMode: false,
      isOverlayMode: false,
      isMobileMode: isMobile
    };
  }

  if (isMobile) {
    return {
      isDockedSidebarMode: false,
      isOverlayMode: false,
      isMobileMode: true
    };
  }

  if (isTablet) {
    return {
      isDockedSidebarMode: false,
      isOverlayMode: true,
      isMobileMode: false
    };
  }

  return {
    isDockedSidebarMode: true,
    isOverlayMode: false,
    isMobileMode: false
  };
};

