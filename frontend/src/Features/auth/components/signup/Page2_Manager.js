import React from 'react';
import { useTranslation } from 'react-i18next';
import InputField from '../../../../components/Boxed-InputFields/Personnalized-InputField/Personnalized-InputField';
import DropdownField from '../../../../components/Boxed-InputFields/Dropdown-Field/Dropdown-Field';
import './combined_css.css';
import { API_BASE_URL, ENDPOINTS } from '../../../../config/api.config';

const countryOptions = ['Switzerland', 'United States', 'United Kingdom', 'Canada', 'Australia', 'Germany', 'France', 'Japan', 'Other'];

const Page2_Manager = ({ formData, handleInputChange, errors, handleErrorReset, showErrors, textColor }) => {
  const { t } = useTranslation();
  const hasErrors = Object.keys(errors).length > 0;

  return (
    <>
      <h1 className="page-title">
        {t('auth.signup.pharmacyInfo')}
      </h1>
      <p className="text-light-grey" style={{ fontSize: '14px', marginBottom: '3vh' }}>
        {t('auth.signup.pharmacyDetails')}
      </p>
      <form className="signup-form">
        <InputField
          label={t('auth.signup.forms.name')}
          placeholder=""
          value={formData.name}
          onChange={(e) => handleInputChange({ target: { name: 'name', value: e.target.value } })}
          marginBottom="20px"
          marginRight="10px"
          error={errors.name}
          onErrorReset={() => handleErrorReset('name')}
          verification="required|name|min:2|max:50"
        />
        <InputField
          label={t('auth.signup.forms.surname')}
          placeholder=""
          value={formData.surname}
          onChange={(e) => handleInputChange({ target: { name: 'surname', value: e.target.value } })}
          marginBottom="20px"
          error={errors.surname}
          onErrorReset={() => handleErrorReset('surname')}
          verification="required|name|min:2|max:50"
        />
        <InputField
          label={t('auth.signup.forms.email')}
          placeholder=""
          value={formData.email}
          onChange={(e) => handleInputChange({ target: { name: 'email', value: e.target.value } })}
          marginBottom="20px"
          error={errors.email}
          onErrorReset={() => handleErrorReset('email')}
          verification="required|email|max:300"
        />
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <DropdownField
            label={t('auth.signup.forms.country')}
            placeholder=""
            options={countryOptions}
            value={formData.country}
            onChange={(value) => handleInputChange({ target: { name: 'country', value } })}
            marginBottom="20px"
            marginRight="10px"
            style={{ width: '30%' }}
            error={errors.country}
            maxHeight="135px"
            onErrorReset={() => handleErrorReset('country')}
            required={true}
          />
          <InputField
            label={t('auth.signup.forms.phone')}
            placeholder=""
            value={formData.phoneNumber}
            onChange={(e) => handleInputChange({ target: { name: 'phoneNumber', value: e.target.value } })}
            marginBottom="20px"
            style={{ width: '65%' }}
            error={errors.phoneNumber}
            onErrorReset={() => handleErrorReset('phoneNumber')}
            helperText="Format: +41 XX XXX XX XX"
            verification="phone|min:10"
          />
        </div>
      </form>
    </>
  );
};

export default Page2_Manager;
