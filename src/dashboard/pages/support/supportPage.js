import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import SupportTicketsTab from './tabs/supportTicketsTab';
import FAQTab from './tabs/FAQTab';
import SubTabs from '../../shared/components/titles/SubTabs';
import { useResponsive } from '../../contexts/responsiveContext';

const SupportPage = () => {
  const { t } = useTranslation(['support']);
  const { isMobile } = useResponsive();
  const [activeTab, setActiveTab] = useState('tickets');

  const tabs = [
    { id: 'tickets', label: t('support:tabs.tickets', 'Support Tickets') },
    { id: 'faq', label: t('support:tabs.faq', 'FAQ') }
  ];

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
      <div className="flex-1 overflow-auto">
        <div className="mb-6">
          <SubTabs
            tabs={tabs}
            activeTab={activeTab}
            onTabChange={setActiveTab}
            orientation={isMobile ? 'horizontal' : 'horizontal'}
          />
        </div>
        {renderTabContent()}
      </div>
    </div>
  );
};

export default SupportPage;
