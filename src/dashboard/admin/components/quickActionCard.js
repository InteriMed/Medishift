import React from 'react';
import PropTypes from 'prop-types';
import { Link } from 'react-router-dom';
import { cn } from '../../../utils/cn';
import { FiArrowRight } from 'react-icons/fi';

const QuickActionCard = ({ 
  title, 
  description, 
  href,
  icon: Icon,
  variant = 'default',
  badge
}) => {
  return (
    <Link
      to={href}
      className={cn(
        "group p-4 rounded-lg border-2 transition-all",
        "hover:shadow-lg hover:scale-[1.02]",
        variant === 'default' && "bg-primary/5 border-primary/20 hover:border-primary/50",
        variant === 'warning' && "bg-yellow-50 border-yellow-200 hover:border-yellow-400",
        variant === 'success' && "bg-green-50 border-green-200 hover:border-green-400",
        variant === 'danger' && "bg-red-50 border-red-200 hover:border-red-400"
      )}
    >
      <div className="flex items-start justify-between mb-2">
        <div className="flex items-center gap-3">
          {Icon && (
            <div className={cn(
              "p-2 rounded-lg",
              variant === 'default' && "bg-primary/10",
              variant === 'warning' && "bg-yellow-100",
              variant === 'success' && "bg-green-100",
              variant === 'danger' && "bg-red-100"
            )}>
              <Icon className={cn(
                "w-5 h-5",
                variant === 'default' && "text-primary",
                variant === 'warning' && "text-yellow-600",
                variant === 'success' && "text-green-600",
                variant === 'danger' && "text-red-600"
              )} />
            </div>
          )}
          <h3 className="font-medium text-foreground">
            {title}
          </h3>
        </div>
        {badge && (
          <span className={cn(
            "px-2 py-1 text-xs font-medium rounded-full",
            badge.variant === 'error' && "bg-red-100 text-red-700",
            badge.variant === 'warning' && "bg-yellow-100 text-yellow-700",
            badge.variant === 'success' && "bg-green-100 text-green-700"
          )}>
            {badge.text}
          </span>
        )}
      </div>
      <p className="text-sm text-muted-foreground mb-3">
        {description}
      </p>
      <div className="flex items-center gap-1 text-sm font-medium text-primary group-hover:gap-2 transition-all">
        <span>Go to</span>
        <FiArrowRight className="w-4 h-4" />
      </div>
    </Link>
  );
};

QuickActionCard.propTypes = {
  title: PropTypes.string.isRequired,
  description: PropTypes.string.isRequired,
  href: PropTypes.string.isRequired,
  icon: PropTypes.elementType,
  variant: PropTypes.oneOf(['default', 'warning', 'success', 'danger']),
  badge: PropTypes.shape({
    text: PropTypes.string.isRequired,
    variant: PropTypes.oneOf(['error', 'warning', 'success'])
  })
};

export default QuickActionCard;

