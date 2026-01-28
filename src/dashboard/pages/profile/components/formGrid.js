import React from 'react';
import PropTypes from 'prop-types';
import { cn } from '../../../../utils/cn';

const FormGrid = ({ 
  children, 
  columns = 2,
  gap = 'md',
  className 
}) => {
  const gapClasses = {
    sm: 'gap-3',
    md: 'gap-4',
    lg: 'gap-6'
  };

  return (
    <div className={cn(
      "grid w-full",
      columns === 1 && "grid-cols-1",
      columns === 2 && "grid-cols-1 lg:grid-cols-2",
      columns === 3 && "grid-cols-1 md:grid-cols-2 lg:grid-cols-3",
      gapClasses[gap],
      className
    )}>
      {children}
    </div>
  );
};

FormGrid.propTypes = {
  children: PropTypes.node.isRequired,
  columns: PropTypes.oneOf([1, 2, 3]),
  gap: PropTypes.oneOf(['sm', 'md', 'lg']),
  className: PropTypes.string
};

export default FormGrid;

