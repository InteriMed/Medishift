import React from 'react';
import PropTypes from 'prop-types';
import { useTranslation } from 'react-i18next';
import PersonalizedInputField from '../../../../../components/boxedInputFields/personnalizedInputField';
import DropdownField from '../../../../../components/boxedInputFields/dropdownField';
import FormGrid from '../../components/formGrid';
import ContentSection from '../../components/contentSection';

const FacilityCoreDetailsTab = ({ data, errors, updateField }) => {
  const { t } = useTranslation(['dashboard/profile', 'dropdowns']);

  return (
    <ContentSection
      title={t('facilityDetails.title')}
      subtitle={t('facilityDetails.subtitle')}
    >
      <FormGrid columns={2}>
        <PersonalizedInputField
          label={t('facilityDetails.facilityName')}
          type="text"
          value={data?.facilityDetails?.name || ''}
          onChange={(e) => updateField('facilityDetails', {
            ...(data?.facilityDetails || {}),
            name: e.target.value
          })}
          error={errors['facilityDetails.name']}
          required
        />

        <DropdownField
          label={t('facilityDetails.facilityType')}
          options={t('dropdowns:facilityTypes', { returnObjects: true })}
          value={data?.facilityDetails?.facilityType || ''}
          onChange={(value) => updateField('facilityDetails', {
            ...(data?.facilityDetails || {}),
            facilityType: value
          })}
          error={errors['facilityDetails.facilityType']}
          required
        />

        <PersonalizedInputField
          label={t('facilityDetails.street')}
          type="text"
          value={data?.facilityDetails?.address?.street || ''}
          onChange={(e) => updateField('facilityDetails', {
            ...(data?.facilityDetails || {}),
            address: {
              ...(data?.facilityDetails?.address || {}),
              street: e.target.value
            }
          })}
          error={errors['facilityDetails.address.street']}
          required
        />

        <PersonalizedInputField
          label={t('facilityDetails.houseNumber')}
          type="text"
          value={data?.facilityDetails?.address?.number || ''}
          onChange={(e) => updateField('facilityDetails', {
            ...(data?.facilityDetails || {}),
            address: {
              ...(data?.facilityDetails?.address || {}),
              number: e.target.value
            }
          })}
          error={errors['facilityDetails.address.number']}
          required
        />

        <PersonalizedInputField
          label={t('facilityDetails.postalCode')}
          type="text"
          value={data?.facilityDetails?.address?.postalCode || ''}
          onChange={(e) => updateField('facilityDetails', {
            ...(data?.facilityDetails || {}),
            address: {
              ...(data?.facilityDetails?.address || {}),
              postalCode: e.target.value
            }
          })}
          error={errors['facilityDetails.address.postalCode']}
          required
        />

        <PersonalizedInputField
          label={t('facilityDetails.city')}
          type="text"
          value={data?.facilityDetails?.address?.city || ''}
          onChange={(e) => updateField('facilityDetails', {
            ...(data?.facilityDetails || {}),
            address: {
              ...(data?.facilityDetails?.address || {}),
              city: e.target.value
            }
          })}
          error={errors['facilityDetails.address.city']}
          required
        />

        <DropdownField
          label={t('facilityDetails.canton')}
          options={t('dropdowns:cantons', { returnObjects: true })}
          value={data?.facilityDetails?.address?.canton || ''}
          onChange={(value) => updateField('facilityDetails', {
            ...(data?.facilityDetails || {}),
            address: {
              ...(data?.facilityDetails?.address || {}),
              canton: value
            }
          })}
          error={errors['facilityDetails.address.canton']}
          required
        />

        <DropdownField
          label={t('facilityDetails.country')}
          options={t('dropdowns:countries', { returnObjects: true })}
          value={data?.facilityDetails?.address?.country || ''}
          onChange={(value) => updateField('facilityDetails', {
            ...(data?.facilityDetails || {}),
            address: {
              ...(data?.facilityDetails?.address || {}),
              country: value
            }
          })}
          error={errors['facilityDetails.address.country']}
          required
        />

        <PersonalizedInputField
          label={t('facilityDetails.mainPhoneNumber')}
          type="tel"
          value={data?.facilityDetails?.mainPhoneNumber || ''}
          onChange={(e) => updateField('facilityDetails', {
            ...(data?.facilityDetails || {}),
            mainPhoneNumber: e.target.value
          })}
          error={errors['facilityDetails.mainPhoneNumber']}
          required
        />

        <PersonalizedInputField
          label={t('facilityDetails.mainEmail')}
          type="email"
          value={data?.facilityDetails?.mainEmail || ''}
          onChange={(e) => updateField('facilityDetails', {
            ...(data?.facilityDetails || {}),
            mainEmail: e.target.value
          })}
          error={errors['facilityDetails.mainEmail']}
          required
        />

        <PersonalizedInputField
          label={t('facilityDetails.website')}
          type="url"
          value={data?.facilityDetails?.website || ''}
          onChange={(e) => updateField('facilityDetails', {
            ...(data?.facilityDetails || {}),
            website: e.target.value
          })}
        />
      </FormGrid>

      <div className="mt-8">
        <h4 className="text-md font-semibold text-foreground mb-4">
          {t('facilityDetails.legalRepresentative')}
        </h4>
        <FormGrid columns={2}>
          <PersonalizedInputField
            label={t('facilityDetails.legalRepFirstName')}
            type="text"
            value={data?.legalRepresentative?.firstName || ''}
            onChange={(e) => updateField('legalRepresentative', {
              ...(data?.legalRepresentative || {}),
              firstName: e.target.value
            })}
            error={errors['legalRepresentative.firstName']}
            required
          />

          <PersonalizedInputField
            label={t('facilityDetails.legalRepLastName')}
            type="text"
            value={data?.legalRepresentative?.lastName || ''}
            onChange={(e) => updateField('legalRepresentative', {
              ...(data?.legalRepresentative || {}),
              lastName: e.target.value
            })}
            error={errors['legalRepresentative.lastName']}
            required
          />

          <PersonalizedInputField
            label={t('facilityDetails.legalRepEmail')}
            type="email"
            value={data?.legalRepresentative?.email || ''}
            onChange={(e) => updateField('legalRepresentative', {
              ...(data?.legalRepresentative || {}),
              email: e.target.value
            })}
            error={errors['legalRepresentative.email']}
            required
          />

          <PersonalizedInputField
            label={t('facilityDetails.legalRepPhone')}
            type="tel"
            value={data?.legalRepresentative?.phone || ''}
            onChange={(e) => updateField('legalRepresentative', {
              ...(data?.legalRepresentative || {}),
              phone: e.target.value
            })}
          />

          <DropdownField
            label={t('personalDetails.nationality')}
            options={t('dropdowns:countries', { returnObjects: true })}
            value={data?.responsiblePersonIdentity?.nationality || ''}
            onChange={(value) => updateField('responsiblePersonIdentity', {
              ...(data?.responsiblePersonIdentity || {}),
              nationality: value
            })}
            error={errors['responsiblePersonIdentity.nationality']}
            required
          />
        </FormGrid>
      </div>
    </ContentSection>
  );
};

FacilityCoreDetailsTab.propTypes = {
  data: PropTypes.object,
  errors: PropTypes.object,
  updateField: PropTypes.func.isRequired
};

export default FacilityCoreDetailsTab;

