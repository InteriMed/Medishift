import React from 'react';
import { useTranslation } from 'react-i18next';

const ActivityItem = ({ title, description, time, icon }) => {
  return (
    <div className="activity-item">
      {icon && <div className="activity-icon">{icon}</div>}
      <div className="activity-content">
        <h4 className="activity-title">{title}</h4>
        <p className="activity-description">{description}</p>
        <span className="activity-time">{time}</span>
      </div>
    </div>
  );
};

const RecentActivityCard = ({ activities = [] }) => {
  const { t } = useTranslation();
  
  return (
    <div className="recent-activity-card">
      <h3 className="card-title">{t('dashboard.recent_activity')}</h3>
      
      {activities.length === 0 ? (
        <div className="no-activity">
          <p>{t('dashboard.no_recent_activity')}</p>
        </div>
      ) : (
        <div className="activity-list">
          {activities.map((activity, index) => (
            <ActivityItem 
              key={index}
              title={activity.title}
              description={activity.description}
              time={activity.time}
              icon={activity.icon}
            />
          ))}
        </div>
      )}
      
      <div className="card-footer">
        <button className="btn-text">{t('dashboard.view_all')}</button>
      </div>
    </div>
  );
};

export default RecentActivityCard; 