import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../../contexts/authContext';
import { useFlow } from '../../../services/flows/engine';
import { OrganizationProfileFlow } from '../../../services/flows/catalog/profile/organizationFlow';
import PageHeader from '../../shared/components/titles/PageHeader';
import SubTabs from '../../shared/components/titles/SubTabs';
import ProfileLayout from './components/profileLayout';
import ContentSection from '../../shared/components/ContentSection';
import { useResponsive } from '../../contexts/responsiveContext';

const OrganizationProfile = () => {
  const { t } = useTranslation(['dashboard/profile', 'tabs']);
  const { currentUser } = useAuth();
  const { isMobile } = useResponsive();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  const {
    step,
    index,
    totalSteps,
    data,
    errors,
    next,
    back,
    updateField,
    jumpToStep,
    progress
  } = useFlow(OrganizationProfileFlow);

  const tabs = OrganizationProfileFlow.steps.map(s => ({
    id: s.id,
    label: t(`tabs:${s.id}`)
  }));

  const isTabCompleted = (tabId) => {
    const stepIndex = OrganizationProfileFlow.steps.findIndex(s => s.id === tabId);
    return stepIndex < index;
  };

  const handleTabChange = (tabId) => {
    jumpToStep(tabId);
  };

  const renderTabContent = () => {
    switch (step.id) {
      case 'organizationCoreDetails':
        return (
          <ContentSection 
            title={t('tabs:organizationCoreDetails')}
            subtitle={t('dashboard/profile:organizationDetails.subtitle')}
          >
            <div>Organization Core Details Content - TO BE IMPLEMENTED</div>
          </ContentSection>
        );
      
      case 'organizationLegalBilling':
        return (
          <ContentSection 
            title={t('tabs:organizationLegalBilling')}
            subtitle={t('dashboard/profile:legalBilling.subtitle')}
          >
            <div>Legal & Billing Content - TO BE IMPLEMENTED</div>
          </ContentSection>
        );
      
      case 'settings':
        return (
          <ContentSection 
            title={t('tabs:settings')}
            subtitle={t('dashboard/profile:settings.subtitle')}
          >
            <div>Settings Content - TO BE IMPLEMENTED</div>
          </ContentSection>
        );
      
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

export default OrganizationProfile;

