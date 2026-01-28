import React from 'react';
import PropTypes from 'prop-types';
import { cn } from '../../../utils/cn';

const StatCard = ({ 
  title, 
  value, 
  icon: Icon, 
  color, 
  bgColor,
  trend,
  onClick,
  loading = false 
}) => {
  const Component = onClick ? 'button' : 'div';

  return (
    <Component
      onClick={onClick}
      className={cn(
        "bg-card rounded-xl border border-border p-6 transition-all",
        onClick && "hover:shadow-lg cursor-pointer hover:border-primary/50"
      )}
    >
      <div className="flex items-center justify-between mb-4">
        <div 
          className="p-3 rounded-lg"
          style={{ backgroundColor: bgColor }}
        >
          <Icon size={24} style={{ color }} />
        </div>
        {trend && (
          <div className={cn(
            "text-sm font-medium",
            trend.direction === 'up' ? "text-green-600" : "text-red-600"
          )}>
            {trend.value}
          </div>
        )}
      </div>
      <h3 className="text-sm font-medium text-muted-foreground mb-1">
        {title}
      </h3>
      {loading ? (
        <div className="animate-pulse h-8 w-24 bg-muted rounded" />
      ) : (
        <p className="text-2xl font-bold" style={{ color }}>
          {value}
        </p>
      )}
    </Component>
  );
};

StatCard.propTypes = {
  title: PropTypes.string.isRequired,
  value: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
  icon: PropTypes.elementType.isRequired,
  color: PropTypes.string.isRequired,
  bgColor: PropTypes.string.isRequired,
  trend: PropTypes.shape({
    direction: PropTypes.oneOf(['up', 'down']),
    value: PropTypes.string
  }),
  onClick: PropTypes.func,
  loading: PropTypes.bool
};

export default StatCard;



