import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../../contexts/authContext';
import { useFlow } from '../../../services/flows/engine';
import { ProfessionalProfileFlow } from '../../../services/flows/catalog/profile/professionalFlow';
import PageHeader from '../components/titles/PageHeader';
import SubTabs from '../components/titles/SubTabs';
import ProfileLayout from '../../pages/profile/components/profileLayout';
import ContentSection from '../components/ContentSection';
import { useResponsive } from '../../contexts/responsiveContext';
import PersonalDetailsTab from './tabs/professional/PersonalDetailsTab';
import BillingInformationTab from './tabs/professional/BillingInformationTab';

const ProfessionalProfile = () => {
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
  } = useFlow(ProfessionalProfileFlow);

  const tabs = ProfessionalProfileFlow.steps.map(s => ({
    id: s.id,
    label: t(`tabs:${s.id}`)
  }));

  const isTabCompleted = (tabId) => {
    const stepIndex = ProfessionalProfileFlow.steps.findIndex(s => s.id === tabId);
    return stepIndex < index;
  };

  const handleTabChange = (tabId) => {
    jumpToStep(tabId);
  };

  const renderTabContent = () => {
    switch (step.id) {
      case 'personalDetails':
        return <PersonalDetailsTab data={data} errors={errors} updateField={updateField} />;
      
      case 'professionalBackground':
        return (
          <ContentSection 
            title={t('tabs:professionalBackground')}
            subtitle={t('dashboard/profile:professionalBackground.subtitle')}
          >
            <div>Professional Background - Implementation in progress</div>
          </ContentSection>
        );
      
      case 'billingInformation':
        return <BillingInformationTab data={data} errors={errors} updateField={updateField} />;
      
      case 'documentUploads':
        return (
          <ContentSection 
            title={t('tabs:documentUploads')}
            subtitle={t('dashboard/profile:documentUploads.subtitle')}
          >
            <div>Document Uploads - Implementation in progress</div>
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

export default ProfessionalProfile;

