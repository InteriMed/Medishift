import React from 'react';
import PropTypes from 'prop-types';
import { useTranslation } from 'react-i18next';
import PersonalizedInputField from '../../../../../components/boxedInputFields/personnalizedInputField';
import DropdownField from '../../../../../components/boxedInputFields/dropdownField';
import DateField from '../../../../../components/boxedInputFields/DateField';
import FormGrid from '../../../../pages/profile/components/formGrid';
import ContentSection from '../../../../pages/components/contentSection';

const PersonalDetailsTab = ({ data, errors, updateField }) => {
  const { t } = useTranslation(['dashboard/profile', 'dropdowns']);

  return (
    <ContentSection
      title={t('personalDetails.title')}
      subtitle={t('personalDetails.subtitle')}
    >
      <FormGrid columns={2}>
        <PersonalizedInputField
          label={t('personalDetails.legalFirstName')}
          type="text"
          value={data?.identity?.legalFirstName || ''}
          onChange={(e) => updateField('identity', {
            ...(data?.identity || {}),
            legalFirstName: e.target.value
          })}
          error={errors['identity.legalFirstName']}
          required
        />
        
        <PersonalizedInputField
          label={t('personalDetails.legalLastName')}
          type="text"
          value={data?.identity?.legalLastName || ''}
          onChange={(e) => updateField('identity', {
            ...(data?.identity || {}),
            legalLastName: e.target.value
          })}
          error={errors['identity.legalLastName']}
          required
        />

        <PersonalizedInputField
          label={t('personalDetails.firstName')}
          type="text"
          value={data?.identity?.firstName || ''}
          onChange={(e) => updateField('identity', {
            ...(data?.identity || {}),
            firstName: e.target.value
          })}
        />
        
        <PersonalizedInputField
          label={t('personalDetails.lastName')}
          type="text"
          value={data?.identity?.lastName || ''}
          onChange={(e) => updateField('identity', {
            ...(data?.identity || {}),
            lastName: e.target.value
          })}
        />

        <DateField
          label={t('personalDetails.dateOfBirth')}
          value={data?.identity?.dateOfBirth || ''}
          onChange={(value) => updateField('identity', {
            ...(data?.identity || {}),
            dateOfBirth: value
          })}
          error={errors['identity.dateOfBirth']}
          required
        />

        <DropdownField
          label={t('personalDetails.nationality')}
          options={t('dropdowns:countries', { returnObjects: true })}
          value={data?.identity?.nationality || ''}
          onChange={(value) => updateField('identity', {
            ...(data?.identity || {}),
            nationality: value
          })}
          error={errors['identity.nationality']}
          required
        />

        <DropdownField
          label={t('personalDetails.gender')}
          options={[
            { value: 'male', label: t('personalDetails.genderMale') },
            { value: 'female', label: t('personalDetails.genderFemale') },
            { value: 'other', label: t('personalDetails.genderOther') }
          ]}
          value={data?.identity?.gender || ''}
          onChange={(value) => updateField('identity', {
            ...(data?.identity || {}),
            gender: value
          })}
        />

        <PersonalizedInputField
          label={t('personalDetails.placeOfBirth')}
          type="text"
          value={data?.identity?.placeOfBirth || ''}
          onChange={(e) => updateField('identity', {
            ...(data?.identity || {}),
            placeOfBirth: e.target.value
          })}
        />
      </FormGrid>

      <div className="mt-8">
        <h4 className="text-md font-semibold text-foreground mb-4">
          {t('personalDetails.contactInformation')}
        </h4>
        <FormGrid columns={2}>
          <PersonalizedInputField
            label={t('personalDetails.street')}
            type="text"
            value={data?.contact?.residentialAddress?.street || ''}
            onChange={(e) => updateField('contact', {
              ...(data?.contact || {}),
              residentialAddress: {
                ...(data?.contact?.residentialAddress || {}),
                street: e.target.value
              }
            })}
            error={errors['contact.residentialAddress.street']}
            required
          />

          <PersonalizedInputField
            label={t('personalDetails.number')}
            type="text"
            value={data?.contact?.residentialAddress?.number || ''}
            onChange={(e) => updateField('contact', {
              ...(data?.contact || {}),
              residentialAddress: {
                ...(data?.contact?.residentialAddress || {}),
                number: e.target.value
              }
            })}
            error={errors['contact.residentialAddress.number']}
            required
          />

          <PersonalizedInputField
            label={t('personalDetails.postalCode')}
            type="text"
            value={data?.contact?.residentialAddress?.postalCode || ''}
            onChange={(e) => updateField('contact', {
              ...(data?.contact || {}),
              residentialAddress: {
                ...(data?.contact?.residentialAddress || {}),
                postalCode: e.target.value
              }
            })}
            error={errors['contact.residentialAddress.postalCode']}
            required
          />

          <PersonalizedInputField
            label={t('personalDetails.city')}
            type="text"
            value={data?.contact?.residentialAddress?.city || ''}
            onChange={(e) => updateField('contact', {
              ...(data?.contact || {}),
              residentialAddress: {
                ...(data?.contact?.residentialAddress || {}),
                city: e.target.value
              }
            })}
            error={errors['contact.residentialAddress.city']}
            required
          />

          <DropdownField
            label={t('personalDetails.canton')}
            options={t('dropdowns:cantons', { returnObjects: true })}
            value={data?.contact?.residentialAddress?.canton || ''}
            onChange={(value) => updateField('contact', {
              ...(data?.contact || {}),
              residentialAddress: {
                ...(data?.contact?.residentialAddress || {}),
                canton: value
              }
            })}
            error={errors['contact.residentialAddress.canton']}
            required
          />

          <DropdownField
            label={t('personalDetails.country')}
            options={t('dropdowns:countries', { returnObjects: true })}
            value={data?.contact?.residentialAddress?.country || ''}
            onChange={(value) => updateField('contact', {
              ...(data?.contact || {}),
              residentialAddress: {
                ...(data?.contact?.residentialAddress || {}),
                country: value
              }
            })}
            error={errors['contact.residentialAddress.country']}
            required
          />

          <PersonalizedInputField
            label={t('personalDetails.contactPhone')}
            type="tel"
            value={data?.contact?.contactPhone || ''}
            onChange={(e) => updateField('contact', {
              ...(data?.contact || {}),
              contactPhone: e.target.value
            })}
          />

          <PersonalizedInputField
            label={t('personalDetails.contactEmail')}
            type="email"
            value={data?.contact?.contactEmail || ''}
            onChange={(e) => updateField('contact', {
              ...(data?.contact || {}),
              contactEmail: e.target.value
            })}
          />
        </FormGrid>
      </div>
    </ContentSection>
  );
};

PersonalDetailsTab.propTypes = {
  data: PropTypes.object,
  errors: PropTypes.object,
  updateField: PropTypes.func.isRequired
};

export default PersonalDetailsTab;



