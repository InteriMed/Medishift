import React from 'react';
import PropTypes from 'prop-types';
import { useTranslation } from 'react-i18next';
import PersonalizedInputField from '../../../../../components/boxedInputFields/personnalizedInputField';
import FormGrid from '../../components/formGrid';
import ContentSection from '../../../../shared/components/ContentSection';

const FacilityLegalBillingTab = ({ data, errors, updateField }) => {
  const { t } = useTranslation(['dashboard/profile']);

  return (
    <ContentSection
      title={t('legalBilling.title')}
      subtitle={t('legalBilling.subtitle')}
    >
      <div className="mb-8">
        <h4 className="text-md font-semibold text-foreground mb-4">
          {t('legalBilling.legalInformation')}
        </h4>
        <FormGrid columns={1}>
          <PersonalizedInputField
            label={t('facilityDetails.legalEntityName')}
            type="text"
            value={data?.identityLegal?.legalCompanyName || ''}
            onChange={(e) => updateField('identityLegal', {
              ...(data?.identityLegal || {}),
              legalCompanyName: e.target.value
            })}
            error={errors['identityLegal.legalCompanyName']}
            required
          />

          <PersonalizedInputField
            label={t('facilityDetails.uidNumber')}
            type="text"
            value={data?.identityLegal?.uidNumber || ''}
            onChange={(e) => updateField('identityLegal', {
              ...(data?.identityLegal || {}),
              uidNumber: e.target.value
            })}
            error={errors['identityLegal.uidNumber']}
            placeholder="CHE-XXX.XXX.XXX"
            required
          />

          <PersonalizedInputField
            label={t('facilityDetails.commercialRegisterNumber')}
            type="text"
            value={data?.identityLegal?.commercialRegisterNumber || ''}
            onChange={(e) => updateField('identityLegal', {
              ...(data?.identityLegal || {}),
              commercialRegisterNumber: e.target.value
            })}
          />
        </FormGrid>
      </div>

      <div className="mb-8">
        <h4 className="text-md font-semibold text-foreground mb-4">
          {t('legalBilling.billingContact')}
        </h4>
        <FormGrid columns={2}>
          <PersonalizedInputField
            label={t('facilityDetails.billingContactName')}
            type="text"
            value={data?.billingContact?.name || ''}
            onChange={(e) => updateField('billingContact', {
              ...(data?.billingContact || {}),
              name: e.target.value
            })}
          />

          <PersonalizedInputField
            label={t('facilityDetails.billingContactEmail')}
            type="email"
            value={data?.billingContact?.email || ''}
            onChange={(e) => updateField('billingContact', {
              ...(data?.billingContact || {}),
              email: e.target.value
            })}
            error={errors['billingContact.email']}
            required
          />

          <PersonalizedInputField
            label={t('facilityDetails.billingContactPhone')}
            type="tel"
            value={data?.billingContact?.phone || ''}
            onChange={(e) => updateField('billingContact', {
              ...(data?.billingContact || {}),
              phone: e.target.value
            })}
          />
        </FormGrid>
      </div>

      <div>
        <h4 className="text-md font-semibold text-foreground mb-4">
          {t('legalBilling.bankingInformation')}
        </h4>
        <FormGrid columns={1}>
          <PersonalizedInputField
            label={t('facilityDetails.facilityIBAN')}
            type="text"
            value={data?.facilityIBAN || ''}
            onChange={(e) => updateField('facilityIBAN', e.target.value)}
            error={errors['facilityIBAN']}
            placeholder="CH00 0000 0000 0000 0000 0"
            required
          />

          <PersonalizedInputField
            label={t('facilityDetails.facilityBankName')}
            type="text"
            value={data?.facilityBankName || ''}
            onChange={(e) => updateField('facilityBankName', e.target.value)}
            error={errors['facilityBankName']}
            required
          />
        </FormGrid>
      </div>
    </ContentSection>
  );
};

FacilityLegalBillingTab.propTypes = {
  data: PropTypes.object,
  errors: PropTypes.object,
  updateField: PropTypes.func.isRequired
};

export default FacilityLegalBillingTab;

