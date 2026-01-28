import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import SupportTicketsTab from './tabs/supportTicketsTab';
import FAQTab from './tabs/FAQTab';
import SubTabs from '../components/titles/SubTabs';
import { useResponsive } from '../../contexts/responsiveContext';

const SupportPage = () => {
  const { t } = useTranslation(['support']);
  const { isMobile } = useResponsive();
  const [activeTab, setActiveTab] = useState('tickets');

  const tabs = [
    { id: 'tickets', label: t('support:tabs.tickets', 'Support Tickets') },
    { id: 'faq', label: t('support:tabs.faq', 'FAQ') }
  ];

  const handleTabChange = (tabId) => {
    setActiveTab(tabId);
  };

  const renderTabContent = () => {
    switch (activeTab) {
      case 'tickets':
        return <SupportTicketsTab />;
      case 'faq':
        return <FAQTab />;
      default:
        return <SupportTicketsTab />;
    }
  };

  return (
    <div className="w-full h-full flex flex-col">
      <div className="w-full bg-card border-b border-border shrink-0">
        <div className="max-w-[1400px] mx-auto px-6">
          <div className="flex items-center gap-2 overflow-x-auto scrollbar-hide">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => handleTabChange(tab.id)}
                className={`px-4 py-3 text-sm font-medium transition-all whitespace-nowrap border-b-2 ${
                  activeTab === tab.id
                    ? 'border-primary text-primary'
                    : 'border-transparent text-muted-foreground hover:text-foreground hover:border-muted'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-auto">
        {renderTabContent()}
      </div>
    </div>
  );
};

export default SupportPage;

