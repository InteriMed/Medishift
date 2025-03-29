import React from 'react';
import { CSSTransition } from 'react-transition-group';
import DropdownField from '../../../../components/Boxed-InputFields/Dropdown-Field/Dropdown-Field';
import Switch from '../../../../components/Switch/Switch';
import './combined_css.css';

const Page3_Manager = ({ formData, handleInputChange, errors, handleErrorReset, isFranchise, handleFranchiseSwitch, showErrors }) => {
  const companyOptions = ['Company A', 'Company B', 'Company C', 'Other'];
  const softwareOptions = ['Software A', 'Software B', 'Software C', 'Other'];
  const groupOptions = ['Franchise X', 'Franchise Y', 'Franchise Z', 'Other'];

  const hasErrors = errors.company || errors.software || (isFranchise && errors.franchiseName);

  const getErrorMessage = () => {
    if (!hasErrors || !showErrors) return null;
    const errorFields = [];
    if (errors.company) errorFields.push('Company');
    if (errors.software) errorFields.push('Software');
    if (isFranchise && errors.franchiseName) errorFields.push('Franchise Name');
  };

  return (
    <div className="page3-manager">
      <h2 className="page-title">Company Details </h2>
      <p className="page-subtitle" style={{ marginBottom: '3vh' }}>Tell us about your workplace</p>
      <p className={`required-fields-text ${(hasErrors && showErrors) ? 'error-page-3-manager' : ''}`}></p>
      <form className="signup-form">
        <DropdownField
          label="Company*"
          options={companyOptions}
          value={formData.company}
          onChange={(option) => handleInputChange({ target: { name: 'company', value: option } })}
          marginBottom="20px"
          error={errors.company}
          maxHeight="135px"
          onErrorReset={() => handleErrorReset('company')}
          validationText="Company selected successfully!"
        />
        <DropdownField
          label="Software*"
          options={softwareOptions}
          value={formData.software}
          onChange={(option) => handleInputChange({ target: { name: 'software', value: option } })}
          marginBottom="20px"
          error={errors.software}
          maxHeight="135px"
          onErrorReset={() => handleErrorReset('software')}
        />
        <div className="switch-container">
          <Switch
            label="Franchise"
            checked={isFranchise}
            onChange={handleFranchiseSwitch}
            labelColor={isFranchise ? '#000000' : '#9c9c9c'}
            marginTop="0"
            marginRight="0"
            marginBottom="0"
            marginLeft="0"
          />
        </div>
        <CSSTransition
          in={isFranchise}
          timeout={300}
          classNames="fade-switch"
          unmountOnExit
        >
          <DropdownField
            label="Franchise Name*"
            options={groupOptions}
            value={formData.franchiseName}
            onChange={(option) => handleInputChange({ target: { name: 'franchiseName', value: option } })}
            marginBottom="20px"
            maxHeight="135px"
            error={errors.franchiseName}
            onErrorReset={() => handleErrorReset('franchiseName')}
          />
        </CSSTransition>
      </form>
    </div>
  );
};

export default Page3_Manager;
