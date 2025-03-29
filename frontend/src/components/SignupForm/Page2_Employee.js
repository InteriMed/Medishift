import React from 'react';
import InputField from '../components/InputField/InputField';
import DropdownField from '../../../../components/components/Dropdown-Field/Dropdown-Field';
import './Page2_Employee.css';

const countryOptions = ['Switzerland', 'United States', 'United Kingdom', 'Canada', 'Australia', 'Germany', 'France', 'Japan', 'Other'];

const days = Array.from({ length: 31 }, (_, i) => String(i + 1).padStart(2, '0'));
const months = [
  '01 - January', '02 - February', '03 - March', '04 - April',
  '05 - May', '06 - June', '07 - July', '08 - August',
  '09 - September', '10 - October', '11 - November', '12 - December'
];
const currentYear = new Date().getFullYear();
const years = Array.from({ length: 100 }, (_, i) => String(currentYear - i));

const Page2 = ({ formData, handleInputChange, errors, handleErrorReset, showErrors }) => {
  const hasErrors = Object.keys(errors).length > 0;

  const handleDateChange = (type, value) => {
    const currentDate = formData.birthdate ? formData.birthdate.split('-') : ['', '', ''];
    let [year, month, day] = currentDate;

    switch (type) {
      case 'year':
        year = value;
        break;
      case 'month':
        month = value.split(' ')[0];
        break;
      case 'day':
        day = value.padStart(2, '0');
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
    months.find(m => m.startsWith(selectedMonth.padStart(2, '0'))) : 
    '';

  return (
    <>
      <h2 className="page-title">Employee Information</h2>
      <p className="page-subtitle">Let&apos;s start with your basic details</p>
      <p className={`required-fields-text ${hasErrors && showErrors ? 'error-page-2' : ''}`}>Required fields*</p>
      <form className="signup-form">
        <InputField
          label=""
          placeholder="Name*"
          value={formData.name}
          onChange={(e) => handleInputChange({ target: { name: 'name', value: e.target.value } })}
          marginBottom="20px"
          marginRight="10px"
          error={errors.name}
          onErrorReset={() => handleErrorReset('name')}
          verification="required|name|min:2|max:50"
        />
        <InputField
          label=""
          placeholder="Surname*"
          value={formData.surname}
          onChange={(e) => handleInputChange({ target: { name: 'surname', value: e.target.value } })}
          marginBottom="20px"
          error={errors.surname}
          onErrorReset={() => handleErrorReset('surname')}
          verification="required|name|min:2|max:50"
        />
        <InputField
          label=""
          placeholder="Email*"
          value={formData.email}
          onChange={(e) => handleInputChange({ target: { name: 'email', value: e.target.value } })}
          marginBottom="20px"
          error={errors.email}
          onErrorReset={() => handleErrorReset('email')}
          verification="required|email|max:300"
        />
        <div className="birthdate-container">
          <DropdownField
            label="Day*"
            placeholder="Day"
            options={days}
            value={selectedDay ? selectedDay.padStart(2, '0') : ''}
            onChange={(value) => handleDateChange('day', value)}
            marginBottom="20px"
            marginRight="10px"
            error={errors.birthdate}
            onErrorReset={() => handleErrorReset('birthdate')}
          />
          <DropdownField
            label="Month*"
            placeholder="Month"
            options={months}
            value={formattedSelectedMonth}
            onChange={(value) => handleDateChange('month', value)}
            marginBottom="20px"
            marginRight="10px"
            error={errors.birthdate}
            onErrorReset={() => handleErrorReset('birthdate')}
          />
          <DropdownField
            label="Year*"
            placeholder="Year"
            options={years}
            value={selectedYear}
            onChange={(value) => handleDateChange('year', value)}
            marginBottom="20px"
            error={errors.birthdate}
            onErrorReset={() => handleErrorReset('birthdate')}
          />
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <DropdownField
            label="Country*"
            placeholder="Select a country*"
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
            label=""
            placeholder="Phone Number"
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

export default Page2;
