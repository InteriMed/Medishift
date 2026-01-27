import React, { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate, useLocation, Routes, Route, Navigate } from 'react-router-dom';
import { FiMessageSquare, FiBell, FiInbox, FiFileText, FiShield } from 'react-icons/fi';
import { useDashboard } from '../../contexts/DashboardContext';
import { buildDashboardUrl, getWorkspaceIdForUrl } from '../../../config/routeUtils';
import { cn } from '../../../utils/cn';
import MessagesPage from './MessagesPage';
import AnnouncementsPage from './AnnouncementsPage';
import InternalTicketPage from './InternalTicketPage';
import ReportingPage from './ReportingPage';
import PolicyLibrary from '../organization/components/PolicyLibrary';

const CommunicationsPage = ({ userData }) => {
  const { t } = useTranslation(['messages']);
  const navigate = useNavigate();
  const location = useLocation();
  const { selectedWorkspace } = useDashboard();

  const tabs = useMemo(() => [
    { id: 'messages', path: 'messages', label: t('messages:tabs.messages', 'Messages'), icon: FiMessageSquare },
    { id: 'internalTicket', path: 'internal-ticket', label: t('messages:tabs.internalTicket', 'Internal Ticket'), icon: FiInbox },
    { id: 'announcements', path: 'announcements', label: t('messages:tabs.announcements', 'Announcements'), icon: FiBell },
    { id: 'policy', path: 'policy', label: t('messages:tabs.policy', 'Policy Library'), icon: FiFileText },
    { id: 'reporting', path: 'reporting', label: t('messages:tabs.reporting', 'Reporting'), icon: FiShield },
  ], [t]);

  const activeTab = useMemo(() => {
    const pathParts = location.pathname.split('/');
    const communicationsIndex = pathParts.findIndex(part => part === 'communications');
    if (communicationsIndex !== -1 && pathParts[communicationsIndex + 1]) {
      return pathParts[communicationsIndex + 1];
    }
    return 'messages';
  }, [location.pathname]);

  const handleTabClick = (tabPath) => {
    const workspaceId = getWorkspaceIdForUrl(selectedWorkspace);
    navigate(buildDashboardUrl(`/communications/${tabPath}`, workspaceId));
  };

  return (
    <div className="h-full flex flex-col overflow-hidden animate-in fade-in duration-500">
      {/* Tab Bar */}
      <div className="shrink-0 pt-4 border-b border-border bg-card/30">
        <div className="max-w-[1400px] mx-auto px-4 sm:px-6 md:px-8">
          <h1 className="text-xl font-semibold text-foreground mb-3">
            {t('messages:title', 'Communications')}
          </h1>
          <div className="flex gap-1 sm:gap-2 overflow-x-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none] pb-1">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.path;
              return (
                <button
                  key={tab.id}
                  onClick={() => handleTabClick(tab.path)}
                  className={cn(
                    "flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-3 py-2 text-sm font-medium border-b-2 transition-colors whitespace-nowrap shrink-0",
                    "touch-manipulation active:scale-95",
                    isActive
                      ? "border-primary text-primary bg-primary/5"
                      : "border-transparent text-muted-foreground hover:text-foreground hover:bg-muted/30"
                  )}
                  title={tab.label}
                >
                  <Icon className="w-4 h-4 shrink-0" />
                  <span className="text-xs sm:text-sm min-w-0">{tab.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Content Area */}
      <div className="flex-1 overflow-hidden">
        <Routes>
          <Route path="messages/*" element={<MessagesPage userData={userData} hideHeader />} />
          <Route path="internal-ticket/*" element={<InternalTicketPage userData={userData} hideHeader />} />
          <Route path="announcements/*" element={<AnnouncementsPage userData={userData} hideHeader />} />
          <Route path="policy/*" element={<PolicyLibrary userData={userData} hideHeader />} />
          <Route path="reporting/*" element={<ReportingPage userData={userData} hideHeader />} />
          <Route path="*" element={<Navigate to="messages" replace />} />
        </Routes>
      </div>
    </div>
  );
};

export default CommunicationsPage;

