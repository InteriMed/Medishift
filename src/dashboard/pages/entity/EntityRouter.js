import React from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate, useLocation, Routes, Route } from 'react-router-dom';
import PageHeader from '../components/titles/pageHeader';
import TeamPage from './pages/teamPage';
import ContractsPage from './pages/contractsPage';
import AgencySpendPage from './pages/agencySpendPage';
import { useDashboard } from '../../contexts/DashboardContext';

const EntityRouter = () => {
  const { t } = useTranslation(['organization', 'common']);
  const navigate = useNavigate();
  const location = useLocation();
  const { selectedWorkspace } = useDashboard();

  const tabs = [
    { id: 'team', label: t('organization:tabs.team', 'Team') },
    { id: 'contracts', label: t('organization:tabs.contracts', 'Contracts') },
    { id: 'spend', label: t('organization:tabs.spend', 'Agency Spend') }
  ];

  const getActiveTab = () => {
    const path = location.pathname;
    if (path.includes('/contracts')) return 'contracts';
    if (path.includes('/spend')) return 'spend';
    return 'team';
  };

  const handleTabChange = (tabId) => {
    const basePath = location.pathname.split('/entity')[0];
    navigate(`${basePath}/entity/${tabId}`);
  };

  return (
    <div className="h-full flex flex-col overflow-hidden">
      <PageHeader
        title={t('organization:title', 'Entity Management')}
        subtitle={t('organization:subtitle', 'Manage your team, contracts, and organizational structure')}
        tabs={tabs}
        activeTab={getActiveTab()}
        onTabChange={handleTabChange}
      />
      
      <div className="flex-1 overflow-hidden">
        <Routes>
          <Route path="team/*" element={<TeamPage />} />
          <Route path="contracts/*" element={<ContractsPage hideHeader />} />
          <Route path="spend/*" element={<AgencySpendPage hideHeader />} />
          <Route index element={<TeamPage />} />
        </Routes>
      </div>
    </div>
  );
};

export default EntityRouter;
