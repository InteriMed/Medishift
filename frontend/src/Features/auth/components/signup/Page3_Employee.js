import React from 'react';
import { CSSTransition } from 'react-transition-group';
import Switch from '../../../../components/Switch/Switch';
import DropdownField from '../../../../components/Boxed-InputFields/Dropdown-Field/Dropdown-Field';
import Checkbox from '../../../../components/Checkbox/Checkbox';
import { useTranslation } from 'react-i18next';
import './combined_css.css';

const companyOptions = ['Company A', 'Company B', 'Company C', 'Other'];
const groupOptions = ['Franchise X', 'Franchise Y', 'Franchise Z', 'Other'];

const Page3_Employee = ({
  isCurrentlyEmployed,
  handleEmploymentSwitch,
  isFranchise,
  handleFranchiseSwitch,
  formData,
  handleInputChange,
  errors,
  handleErrorReset,
  isTransitioning,
  showLegalNotice,
  showUnemployedButton,
  handleNotEmployedChange,
  isNotEmployed,
  showErrors,
  textColor
}) => {
  const { t } = useTranslation();
  const hasErrors = isCurrentlyEmployed ? 
    (errors.company || (isFranchise && errors.franchiseName) || errors.jobTitle) : 
    false;

  const getErrorMessage = () => {
    if (!hasErrors || !showErrors) return null;
    const errorFields = [];
    if (errors.jobTitle) errorFields.push('Job Title');
    if (errors.company) errorFields.push(t('auth.signup.forms.employment.company'));
    if (isFranchise && errors.franchiseName) errorFields.push(t('auth.signup.forms.employment.franchiseName'));
    
    return t('auth.signup.errors.requiredFields', { fields: errorFields.join(', ') });
  };

  // Job title options as requested
  const jobTitleOptions = [
    'Pharmacist',
    'Pharmacist Intern',
    'Assistant'
  ];

  return (
    <div className="page3-employee">
      <h2 className="page-title">
        {t('auth.signup.forms.employment.title')}
      </h2>
      <p className="text-light-grey" style={{ fontSize: '14px', marginBottom: '3vh' }}>
        {t('auth.signup.forms.employment.subtitle')}
      </p>

      {/* Job Title Dropdown */}
      <DropdownField
        label="Job Title"
        options={jobTitleOptions}
        value={formData.jobTitle}
        onChange={(value) => handleInputChange({ target: { name: 'jobTitle', value } })}
        marginBottom="20px"
        error={errors.jobTitle}
        maxHeight="135px"
        onErrorReset={() => handleErrorReset('jobTitle')}
      />

      <div className="switch-container">
        <Switch
          label={t('auth.signup.forms.employment.currentlyEmployed')}
          checked={isCurrentlyEmployed}
          onChange={handleEmploymentSwitch}
          labelColor={isCurrentlyEmployed ? '#000000' : '#9c9c9c'}
          marginTop="0"
          marginRight="0"
          marginBottom="20px"
          marginLeft="0"
        />
      </div>
      
      <CSSTransition
        in={isCurrentlyEmployed && !isTransitioning}
        timeout={300}
        classNames="fade-switch"
        unmountOnExit
      >
        <div>
          <p className={`required-fields-text ${(hasErrors && showErrors) ? 'error-page-3-employee' : ''}`}>
            {t('auth.signup.requiredFields')}
          </p>
          <DropdownField
            label={t('auth.signup.forms.employment.company')}
            options={companyOptions}
            value={formData.company}
            onChange={(value) => handleInputChange({ target: { name: 'company', value } })}
            marginBottom="20px"
            error={errors.company}
            maxHeight="135px"
            onErrorReset={() => handleErrorReset('company')}
            validationText="Company selected successfully!"
          />
          <div className="switch-container">
            <Switch
              label={t('auth.signup.forms.employment.franchise')}
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
            timeout={150}
            classNames="fade-switch"
            unmountOnExit
          >
            <DropdownField
              label={t('auth.signup.forms.employment.franchiseName')}
              options={groupOptions}
              value={formData.franchiseName}
              onChange={(value) => handleInputChange({ target: { name: 'franchiseName', value } })}
              marginBottom="20px"
              maxHeight="135px"
              error={errors.franchiseName}
              onErrorReset={() => handleErrorReset('franchiseName')}
            />
          </CSSTransition>
        </div>
      </CSSTransition>
      
      <CSSTransition
        in={!isCurrentlyEmployed && !isTransitioning}
        timeout={300}
        classNames="fade-switch"
        unmountOnExit
      >
        <div>
          <CSSTransition
            in={showLegalNotice}
            timeout={300}
            classNames="fade"
            unmountOnExit
          >
            <p className="legal-notice">
              {t('auth.signup.forms.employment.legalNotice')}
            </p>
          </CSSTransition>

          <CSSTransition
            in={showUnemployedButton || isNotEmployed}
            timeout={isNotEmployed ? 0 : 300}
            classNames="fade"
            unmountOnExit
          >
            <Checkbox
              label={t('auth.signup.forms.employment.notEmployed')}
              checked={isNotEmployed}
              onChange={handleNotEmployedChange}
            />
          </CSSTransition>
        </div>
      </CSSTransition>
    </div>
  );
};

export default Page3_Employee;
