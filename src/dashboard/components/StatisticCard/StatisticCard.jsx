import React from 'react';
import { useTranslation } from 'react-i18next';

const StatisticCard = ({ title, value, icon, color = 'primary', trend, trendValue }) => {
  const { t } = useTranslation();
  
  return (
    <div className={`statistic-card ${color}`}>
      {icon && <div className="card-icon">{icon}</div>}
      <div className="card-content">
        <h3 className="card-title">{title}</h3>
        <div className="card-value">{value}</div>
        {trend && (
          <div className={`card-trend ${trend}`}>
            <span className="trend-icon">
              {trend === 'up' ? '↑' : '↓'}
            </span>
            <span className="trend-value">{trendValue}</span>
            <span className="trend-text">
              {trend === 'up' 
                ? t('dashboard.from_last_period') 
                : t('dashboard.from_last_period')}
            </span>
          </div>
        )}
      </div>
    </div>
  );
};

export default StatisticCard; 