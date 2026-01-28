import React from 'react';
import PropTypes from 'prop-types';
import { useTranslation } from 'react-i18next';
import boxedSwitchField from '../../../../../components/boxedInputFields/boxedSwitchField';
import ContentSection from '../../../components/ContentSection';

const MarketplacePreferencesTab = ({ data, errors, updateField }) => {
  const { t } = useTranslation(['dashboard/profile']);

  return (
    <ContentSection
      title={t('marketplace.title')}
      subtitle={t('marketplace.subtitle')}
    >
      <div className="space-y-4">
        <boxedSwitchField
          label={t('settings.autoRenewal')}
          checked={data?.contractSettings?.autoRenewal || false}
          onChange={(checked) => updateField('contractSettings', {
            ...(data?.contractSettings || {}),
            autoRenewal: checked
          })}
        />

        <boxedSwitchField
          label={t('settings.requiresApproval')}
          checked={data?.contractSettings?.requiresApproval || false}
          onChange={(checked) => updateField('contractSettings', {
            ...(data?.contractSettings || {}),
            requiresApproval: checked
          })}
        />
      </div>
    </ContentSection>
  );
};

MarketplacePreferencesTab.propTypes = {
  data: PropTypes.object,
  errors: PropTypes.object,
  updateField: PropTypes.func.isRequired
};

export default MarketplacePreferencesTab;



