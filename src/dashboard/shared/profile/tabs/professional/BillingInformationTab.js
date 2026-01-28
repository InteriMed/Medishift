import React from 'react';
import PropTypes from 'prop-types';
import { useTranslation } from 'react-i18next';
import PersonalizedInputField from '../../../../../components/boxedInputFields/personnalizedInputField';
import FormGrid from '../../components/formGrid';
import ContentSection from '../../components/contentSection';

const BillingInformationTab = ({ data, errors, updateField }) => {
  const { t } = useTranslation(['dashboard/profile']);

  return (
    <ContentSection
      title={t('billingInformation.title')}
      subtitle={t('billingInformation.subtitle')}
    >
      <FormGrid columns={1}>
        <PersonalizedInputField
          label={t('billingInformation.accountHolderName')}
          type="text"
          value={data?.billingInformation?.bankDetails?.accountHolderName || ''}
          onChange={(e) => updateField('billingInformation', {
            ...(data?.billingInformation || {}),
            bankDetails: {
              ...(data?.billingInformation?.bankDetails || {}),
              accountHolderName: e.target.value
            }
          })}
          error={errors['billingInformation.bankDetails.accountHolderName']}
          required
        />

        <PersonalizedInputField
          label={t('billingInformation.iban')}
          type="text"
          value={data?.billingInformation?.bankDetails?.iban || ''}
          onChange={(e) => updateField('billingInformation', {
            ...(data?.billingInformation || {}),
            bankDetails: {
              ...(data?.billingInformation?.bankDetails || {}),
              iban: e.target.value
            }
          })}
          error={errors['billingInformation.bankDetails.iban']}
          placeholder="CH00 0000 0000 0000 0000 0"
          required
        />

        <PersonalizedInputField
          label={t('billingInformation.bankName')}
          type="text"
          value={data?.billingInformation?.bankDetails?.bankName || ''}
          onChange={(e) => updateField('billingInformation', {
            ...(data?.billingInformation || {}),
            bankDetails: {
              ...(data?.billingInformation?.bankDetails || {}),
              bankName: e.target.value
            }
          })}
          error={errors['billingInformation.bankDetails.bankName']}
          required
        />
      </FormGrid>
    </ContentSection>
  );
};

BillingInformationTab.propTypes = {
  data: PropTypes.object,
  errors: PropTypes.object,
  updateField: PropTypes.func.isRequired
};

export default BillingInformationTab;



