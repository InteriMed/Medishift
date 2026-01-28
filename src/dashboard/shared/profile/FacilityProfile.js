import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../../contexts/authContext';
import { useFlow } from '../../../services/flows/engine';
import { FacilityProfileFlow } from '../../../services/flows/catalog/profile/facilityFlow';
import PageHeader from '../components/titles/PageHeader';
import SubTabs from '../components/titles/SubTabs';
import ProfileLayout from '../../pages/profile/components/profileLayout';
import { useResponsive } from '../../contexts/responsiveContext';
import FacilityCoreDetailsTab from '../../pages/profile/tabs/facility/facilityCoreDetailsTab';
import FacilityLegalBillingTab from './tabs/facility/FacilityLegalBillingTab';
import MarketplacePreferencesTab from './tabs/facility/MarketplacePreferencesTab';

const FacilityProfile = () => {
  const { t } = useTranslation(['dashboard/profile', 'tabs']);
  const { currentUser } = useAuth();
  const { isMobile } = useResponsive();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  const {
    step,
    index,
    data,
    errors,
    updateField,
    jumpToStep
  } = useFlow(FacilityProfileFlow);

  const tabs = FacilityProfileFlow.steps.map(s => ({
    id: s.id,
    label: t(`tabs:${s.id}`)
  }));

  const isTabCompleted = (tabId) => {
    const stepIndex = FacilityProfileFlow.steps.findIndex(s => s.id === tabId);
    return stepIndex < index;
  };

  const handleTabChange = (tabId) => {
    jumpToStep(tabId);
  };

  const renderTabContent = () => {
    switch (step.id) {
      case 'facilityCoreDetails':
        return <FacilityCoreDetailsTab data={data} errors={errors} updateField={updateField} />;
      
      case 'facilityLegalBilling':
        return <FacilityLegalBillingTab data={data} errors={errors} updateField={updateField} />;
      
      case 'marketplace':
        return <MarketplacePreferencesTab data={data} errors={errors} updateField={updateField} />;
      
      default:
        return null;
    }
  };

  return (
    <div className="w-full h-full flex flex-col">
      <PageHeader
        title={t('dashboard/profile:profile.title')}
        subtitle={t('dashboard/profile:profile.subtitle')}
      />
      
      <ProfileLayout
        sidebar={
          <SubTabs
            tabs={tabs}
            activeTab={step.id}
            onTabChange={handleTabChange}
            isTabCompleted={isTabCompleted}
            orientation={isMobile ? 'horizontal' : 'vertical'}
          />
        }
        content={renderTabContent()}
        sidebarCollapsed={sidebarCollapsed}
        onSidebarToggle={() => setSidebarCollapsed(!sidebarCollapsed)}
      />
    </div>
  );
};

export default FacilityProfile;

