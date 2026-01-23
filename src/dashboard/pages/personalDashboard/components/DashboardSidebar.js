import React from 'react';
import PropTypes from 'prop-types';
import { useNavigate } from 'react-router-dom';
import { FiCalendar, FiSearch, FiCheckCircle, FiArrowRight } from 'react-icons/fi';
import { cn } from '../../../../utils/cn';

const DashboardSidebar = ({ stats, navigate }) => {
  return (
    <div className="space-y-8">
      
      {/* Upcoming Schedule */}
      <div className="bg-card p-6 rounded-xl border border-border shadow-sm">
        <h3 className="text-lg font-bold text-foreground mb-6">Upcoming Schedule</h3>
        
        {stats?.upcomingShifts?.length > 0 ? (
          <div className="space-y-4">
            {stats.upcomingShifts.map((shift, idx) => {
               const shiftDate = shift.startTime instanceof Date ? shift.startTime : shift.startTime.toDate();
               return (
                <div key={idx} className="flex gap-4 items-center p-3 rounded-lg hover:bg-muted/30 transition-colors border border-transparent hover:border-border/50">
                  <div className="flex flex-col items-center justify-center w-12 h-12 bg-primary/10 rounded-lg text-primary shrink-0">
                    <span className="text-xs font-bold uppercase">{shiftDate.toLocaleString('default', { month: 'short' })}</span>
                    <span className="text-lg font-bold">{shiftDate.getDate()}</span>
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-foreground truncate">{shift.facilityName || 'Facility'}</p>
                    <p className="text-xs text-muted-foreground">
                      {shiftDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                </div>
               );
            })}
          </div>
        ) : (
          <div className="text-center py-8 text-muted-foreground bg-muted/10 rounded-lg border border-dashed border-border">
            <FiCalendar className="w-8 h-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">No upcoming jobs</p>
            <button 
              onClick={() => navigate('/dashboard/calendar')}
              className="mt-3 text-xs text-primary font-medium hover:underline"
            >
              View Calendar
            </button>
          </div>
        )}
      </div>

      {/* Quick Actions */}
      <div className="bg-card p-6 rounded-xl border border-border shadow-sm">
        <h3 className="text-lg font-bold text-foreground mb-4">Quick Actions</h3>
        <div className="space-y-3">
          <QuickActionButton 
            icon={FiSearch} 
            label="Browse Marketplace" 
            onClick={() => navigate('/dashboard/marketplace')} 
          />
          <QuickActionButton 
            icon={FiCalendar} 
            label="Update Availability" 
            onClick={() => navigate('/dashboard/calendar')} 
          />
          <QuickActionButton 
            icon={FiCheckCircle} 
            label="Verify Documents" 
            onClick={() => navigate('/dashboard/profile/documents')} 
          />
        </div>
      </div>

    </div>
  );
};

const QuickActionButton = ({ icon: Icon, label, onClick }) => (
  <button 
    onClick={onClick}
    className="w-full flex items-center justify-between p-3 rounded-lg border border-border hover:border-primary hover:bg-primary/5 transition-all group bg-background"
  >
    <div className="flex items-center gap-3">
      <div className="p-2 bg-muted text-muted-foreground rounded-lg group-hover:bg-white group-hover:text-primary transition-colors shadow-sm">
        <Icon className="w-4 h-4" />
      </div>
      <span className="text-sm font-medium text-foreground group-hover:text-primary transition-colors">{label}</span>
    </div>
    <FiArrowRight className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
  </button>
);

DashboardSidebar.propTypes = {
  stats: PropTypes.object,
  navigate: PropTypes.func.isRequired
};

export default DashboardSidebar;

