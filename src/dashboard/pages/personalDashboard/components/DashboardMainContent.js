import React from 'react';
import PropTypes from 'prop-types';
import { FiBriefcase, FiClock } from 'react-icons/fi';
import { 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  AreaChart,
  Area
} from 'recharts';
import { cn } from '../../../../utils/cn';

const DashboardMainContent = ({ stats, chartData }) => {
  return (
    <div className="space-y-8">
      {/* Activity Chart */}
      <div className="bg-card p-6 rounded-xl border border-border hover:shadow-md transition-shadow">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-lg font-semibold text-foreground">Weekly Activity</h3>
          <select className="text-sm border-input rounded-lg text-muted-foreground bg-transparent focus:ring-primary focus:border-primary">
            <option>This Week</option>
            <option>Last Week</option>
          </select>
        </div>
        <div className="h-[300px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData}>
              <defs>
                <linearGradient id="colorHours" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="var(--primary-color)" stopOpacity={0.1}/>
                  <stop offset="95%" stopColor="var(--primary-color)" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border-color)" opacity={0.5} />
              <XAxis 
                dataKey="name" 
                axisLine={false} 
                tickLine={false} 
                tick={{ fill: 'var(--text-light-color)', fontSize: 12 }} 
                dy={10}
              />
              <YAxis 
                axisLine={false} 
                tickLine={false} 
                tick={{ fill: 'var(--text-light-color)', fontSize: 12 }} 
              />
              <Tooltip 
                contentStyle={{ 
                  borderRadius: '8px', 
                  border: '1px solid var(--border-color)', 
                  boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
                  backgroundColor: 'var(--background-color)'
                }}
              />
              <Area 
                type="monotone" 
                dataKey="hours" 
                stroke="var(--primary-color)" 
                strokeWidth={3}
                fillOpacity={1} 
                fill="url(#colorHours)" 
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Recent Activity List */}
      <div className="bg-card p-6 rounded-xl border border-border hover:shadow-md transition-shadow">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-lg font-semibold text-foreground">Recent Activity</h3>
          <button className="text-sm text-primary hover:text-primary/80 font-medium transition-colors">View All</button>
        </div>
        
        <div className="space-y-6">
          {stats?.recentActivity?.length > 0 ? (
            stats.recentActivity.map((activity, index) => (
              <div key={index} className="flex items-start gap-4 group">
                <div className={cn(
                  "p-2 rounded-full shrink-0 transition-colors",
                  activity.type === 'contract' ? 'bg-purple-100 text-purple-600' : 'bg-blue-100 text-blue-600'
                )}>
                  {activity.type === 'contract' ? <FiBriefcase /> : <FiClock />}
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="text-sm font-semibold text-foreground truncate group-hover:text-primary transition-colors">
                    {activity.title}
                  </h4>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {new Date(activity.time).toLocaleString(undefined, { 
                      month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' 
                    })}
                  </p>
                </div>
                <div className="text-xs font-medium text-muted-foreground bg-muted/50 px-2 py-1 rounded-full">
                  {activity.type === 'contract' ? 'Contract' : 'Shift'}
                </div>
              </div>
            ))
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <p>No recent activity</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

DashboardMainContent.propTypes = {
  stats: PropTypes.object,
  chartData: PropTypes.array
};

export default DashboardMainContent;

