import React from 'react';
import { useTranslation } from 'react-i18next';
import PersonnalizedInputField from '../../../../components/Boxed-InputFields/Personnalized-InputField/Personnalized-InputField';
import DropdownField from '../../../../components/Boxed-InputFields/Dropdown-Field/Dropdown-Field';
import API_CONFIG from '../../../../config/api.config';
import './combined_css.css';
const countryOptions = ['Switzerland', 'United States', 'United Kingdom', 'Canada', 'Australia', 'Germany', 'France', 'Japan', 'Other'];

const days = Array.from({ length: 31 }, (_, i) => String(i + 1).padStart(2, '0'));
const months = [
  '01 - Jan', '02 - Feb', '03 - Mar', '04 - Apr',
  '05 - May', '06 - Jun', '07 - Jul', '08 - Aug',
  '09 - Sep', '10 - Oct', '11 - Nov', '12 - Dec'
];
const currentYear = new Date().getFullYear();
const years = Array.from({ length: 100 }, (_, i) => String(currentYear - i));

const Page2 = ({ formData, handleInputChange, handleEmailChange, errors, handleErrorReset, showErrors, textColor }) => {
  const { t } = useTranslation();
  const hasErrors = Object.keys(errors).length > 0;

  const handleDateChange = (type, value) => {
    const currentDate = formData.birthdate ? formData.birthdate.split('-') : ['', '', ''];
    let [year, month, day] = currentDate;

    switch (type) {
      case 'year':
        year = value;
        if (errors.birthdate_year) handleErrorReset('birthdate_year');
        break;
      case 'month':
        month = value.substring(0, 2);
        if (errors.birthdate_month) handleErrorReset('birthdate_month');
        break;
      case 'day':
        day = value.padStart(2, '0');
        if (errors.birthdate_day) handleErrorReset('birthdate_day');
        break;
    }

    if (year || month || day) {
      handleInputChange({
        target: {
          name: 'birthdate',
          value: `${year || ''}-${month || ''}-${day || ''}`
        }
      });
    }
  };

  const [selectedYear, selectedMonth, selectedDay] = formData.birthdate ? formData.birthdate.split('-') : ['', '', ''];

  const formattedSelectedMonth = selectedMonth ? 
    months.find(m => m.startsWith(selectedMonth.padStart(2, '0'))) || '' : 
    '';

  const checkEmailExists = async (email) => {
    try {
      const response = await fetch(`${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.CHECK_EMAIL}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email }),
        credentials: 'include'
      });

      if (!response.ok) {
        throw new Error('Network response was not ok');
      }

      const data = await response.json();
      return data.exists;
    } catch (error) {
      console.error('Error checking email:', error);
      return false;
    }
  };

  return (
    <>
      <h1 className="page-title">
        {t('auth.signup.employeeInfo')}
      </h1>
      <p className="text-light-grey" style={{ fontSize: '14px', marginBottom: '3vh' }}>
        {t('auth.signup.basicDetails')}
      </p>
      <form className="signup-form">
        <PersonnalizedInputField
          label={t('auth.signup.forms.name')}
          placeholder={t('auth.signup.forms.namePlaceholder')}
          value={formData.name}
          onChange={(e) => handleInputChange({ target: { name: 'name', value: e.target.value } })}
          marginBottom="20px"
          marginRight="10px"
          error={errors.name}
          onErrorReset={() => handleErrorReset('name')}
          verification="required|name|min:2|max:50"
        />
        <PersonnalizedInputField
          label={t('auth.signup.forms.surname')}
          placeholder={t('auth.signup.forms.surnamePlaceholder')}
          value={formData.surname}
          onChange={(e) => handleInputChange({ target: { name: 'surname', value: e.target.value } })}
          marginBottom="20px"
          error={errors.surname}
          onErrorReset={() => handleErrorReset('surname')}
          verification="required|name|min:2|max:50"
        />
        <PersonnalizedInputField
          label={t('auth.signup.forms.email')}
          placeholder=""
          value={formData.email}
          onChange={handleEmailChange}
          marginBottom="20px"
          error={errors.email}
          onErrorReset={() => handleErrorReset('email')}
          verification="required|email|max:300"
        />
        <div className="birthdate-container">
          <DropdownField
            label={t('auth.signup.forms.birthdate.day.label')}
            placeholder={t('auth.signup.forms.birthdate.day.placeholder')}
            options={days}
            value={selectedDay ? selectedDay.padStart(2, '0') : ''}
            onChange={(value) => handleDateChange('day', value)}
            marginBottom="20px"
            marginRight="10px"
            error={errors.birthdate_day || (errors.birthdate && !selectedDay ? errors.birthdate : '')}
            onErrorReset={() => handleErrorReset('birthdate_day')}
            required={true}
            showErrors={showErrors}
          />
          <DropdownField
            label={t('auth.signup.forms.birthdate.month.label')}
            placeholder={t('auth.signup.forms.birthdate.month.placeholder')}
            options={months}
            value={formattedSelectedMonth}
            onChange={(value) => handleDateChange('month', value)}
            marginBottom="20px"
            marginRight="10px"
            error={errors.birthdate_month || (errors.birthdate && !selectedMonth ? errors.birthdate : '')}
            onErrorReset={() => handleErrorReset('birthdate_month')}
            required={true}
            showErrors={showErrors}
          />
          <DropdownField
            label={t('auth.signup.forms.birthdate.year.label')}
            placeholder={t('auth.signup.forms.birthdate.year.placeholder')}
            options={years}
            value={selectedYear}
            onChange={(value) => handleDateChange('year', value)}
            marginBottom="20px"
            error={errors.birthdate_year || (errors.birthdate && !selectedYear ? errors.birthdate : '')}
            onErrorReset={() => handleErrorReset('birthdate_year')}
            required={true}
            showErrors={showErrors}
          />
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <DropdownField
            label={t('auth.signup.forms.country')}
            placeholder={t('auth.signup.forms.countryPlaceholder')}
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
            showErrors={showErrors}
          />
          <PersonnalizedInputField
            label={t('auth.signup.forms.phone')}
            placeholder={t('auth.signup.forms.phonePlaceholder')}
            value={formData.phoneNumber}
            onChange={(e) => handleInputChange({ target: { name: 'phoneNumber', value: e.target.value } })}
            marginBottom="20px"
            style={{ width: '65%' }}
            error={errors.phoneNumber}
            onErrorReset={() => handleErrorReset('phoneNumber')}
            helperText={t('auth.signup.forms.phoneHelperText')}
            verification="required|phone|min:10"
            required={true}
          />
        </div>
      </form>
    </>
  );
};

export default Page2;
