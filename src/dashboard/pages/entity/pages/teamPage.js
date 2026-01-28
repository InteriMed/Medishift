import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate, useLocation, Routes, Route } from 'react-router-dom';
import { cn } from '../../../../utils/cn';

import EmployeesPage from './employeesPage';
import HiringPage from './hiringPage';
import OrganigramPage from './organigramPage';
import AdminManagementPage from './adminManagementPage';
import FloatPoolPage from './floatPoolPage';

const TeamPage = () => {
  const { t } = useTranslation(['organization']);
  const navigate = useNavigate();
  const location = useLocation();
  const [activeSubTab, setActiveSubTab] = useState('employees');

  const subTabs = [
    { id: 'employees', label: t('organization:subTabs.employees', 'Employees') },
    { id: 'hiring', label: t('organization:subTabs.hiring', 'Hiring') },
    { id: 'organigram', label: t('organization:subTabs.organigram', 'Organigram') },
    { id: 'admin', label: t('organization:subTabs.admin', 'Admin Management') },
    { id: 'float-pool', label: t('organization:subTabs.floatPool', 'Float Pool') }
  ];

  const getActiveSubTab = () => {
    const path = location.pathname;
    if (path.includes('/hiring')) return 'hiring';
    if (path.includes('/organigram')) return 'organigram';
    if (path.includes('/admin')) return 'admin';
    if (path.includes('/float-pool')) return 'float-pool';
    return 'employees';
  };

  const handleSubTabChange = (subTabId) => {
    setActiveSubTab(subTabId);
    const basePath = location.pathname.split('/team')[0];
    navigate(`${basePath}/team/${subTabId}`);
  };

  const currentSubTab = getActiveSubTab();

  return (
    <div className="h-full flex flex-col overflow-hidden">
      {/* SUBTABS */}
      <div className="w-full bg-card border-b border-border shrink-0">
        <div className="max-w-[1400px] mx-auto px-6">
          <div className="flex items-center gap-2 overflow-x-auto scrollbar-hide">
            {subTabs.map((subTab) => (
              <button
                key={subTab.id}
                onClick={() => handleSubTabChange(subTab.id)}
                className={cn(
                  "px-4 py-3 text-sm font-medium transition-all whitespace-nowrap border-b-2",
                  currentSubTab === subTab.id
                    ? "border-primary text-primary"
                    : "border-transparent text-muted-foreground hover:text-foreground hover:border-muted"
                )}
              >
                {subTab.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* CONTENT */}
      <div className="flex-1 overflow-hidden">
        <Routes>
          <Route path="employees" element={<EmployeesPage hideHeader />} />
          <Route path="hiring" element={<HiringPage hideHeader />} />
          <Route path="organigram" element={<OrganigramPage hideHeader />} />
          <Route path="admin" element={<AdminManagementPage hideHeader />} />
          <Route path="float-pool" element={<FloatPoolPage hideHeader />} />
          <Route index element={<EmployeesPage hideHeader />} />
        </Routes>
      </div>
    </div>
  );
};

export default TeamPage;

