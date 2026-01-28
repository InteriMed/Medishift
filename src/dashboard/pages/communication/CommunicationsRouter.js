import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate, useLocation, Routes, Route } from 'react-router-dom';
import PageHeader from '../components/titles/pageHeader';
import MessagesPage from './pages/MessagesPage';
import AnnouncementsPage from './pages/AnnouncementsPage';
import InternalTicketPage from './pages/InternalTicketPage';
import ReportingPage from './pages/ReportingPage';
import { useDashboard } from '../../contexts/dashboardContext';

const CommunicationsRouter = () => {
  const { t } = useTranslation(['messages']);
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useDashboard();

  const hasFacilityProfile = user?.hasFacilityProfile === true;

  const tabs = [
    { id: 'messages', label: t('messages:tabs.messages', 'Messages') },
    { 
      id: 'announcements', 
      label: t('messages:tabs.announcements', 'Announcements'),
      disabled: !hasFacilityProfile
    },
    { 
      id: 'internal-ticket', 
      label: t('messages:tabs.internalTicket', 'Internal Ticket')
    },
    { 
      id: 'reporting', 
      label: t('messages:tabs.reporting', 'Reporting')
    }
  ];

  const getActiveTab = () => {
    const path = location.pathname;
    if (path.includes('/announcements')) return 'announcements';
    if (path.includes('/internal-ticket')) return 'internal-ticket';
    if (path.includes('/reporting')) return 'reporting';
    return 'messages';
  };

  const handleTabChange = (tabId) => {
    const basePath = location.pathname.split('/communications')[0];
    navigate(`${basePath}/communications/${tabId}`);
  };

  return (
    <div className="h-full flex flex-col overflow-hidden">
      <PageHeader
        title={t('messages:title', 'Communications')}
        subtitle={t('messages:subtitle', 'Manage your messages, announcements, and tickets')}
        tabs={tabs}
        activeTab={getActiveTab()}
        onTabChange={handleTabChange}
      />
      
      <div className="flex-1 overflow-hidden">
        <Routes>
          <Route path="messages/*" element={<MessagesPage hideHeader />} />
          <Route path="announcements/*" element={<AnnouncementsPage hideHeader />} />
          <Route path="internal-ticket/*" element={<InternalTicketPage hideHeader />} />
          <Route path="reporting/*" element={<ReportingPage hideHeader />} />
          <Route index element={<MessagesPage hideHeader />} />
        </Routes>
      </div>
    </div>
  );
};

export default CommunicationsRouter;

