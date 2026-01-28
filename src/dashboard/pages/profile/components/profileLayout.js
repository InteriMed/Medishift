import React from 'react';
import PropTypes from 'prop-types';
import { cn } from '../../../../services/utils/formatting';
import { useResponsive } from '../../../contexts/responsiveContext';

const ProfileLayout = ({ 
  sidebar, 
  content, 
  className,
  sidebarCollapsed = false,
  onSidebarToggle
}) => {
  const { windowWidth } = useResponsive();
  const isSingleColumn = windowWidth < 1024;

  return (
    <div className={cn("w-full h-full flex flex-col", className)}>
      <div className={cn(
        "flex w-full h-full gap-6 p-6",
        isSingleColumn ? "flex-col" : "flex-row"
      )}>
        {sidebar && (
          <div className={cn(
            "shrink-0 transition-all duration-300",
            isSingleColumn 
              ? "w-full" 
              : sidebarCollapsed 
                ? "w-20" 
                : "w-80"
          )}>
            {sidebar}
          </div>
        )}
        
        <div className="flex-1 min-w-0">
          {content}
        </div>
      </div>
    </div>
  );
};

ProfileLayout.propTypes = {
  sidebar: PropTypes.node,
  content: PropTypes.node.isRequired,
  className: PropTypes.string,
  sidebarCollapsed: PropTypes.bool,
  onSidebarToggle: PropTypes.func
};

export default ProfileLayout;

