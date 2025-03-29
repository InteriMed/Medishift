import React from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import ClickableIcon from '../../../../components/ClickableIcon/ClickableIcon';
import UnderlinedLink from '../../../../components/Links/UnderlinedLink';
import manager from "../../assets/manager.png";
import employee from "../../assets/employee.png";
import './combined_css.css';

const Page1 = ({ userType, handleUserTypeChange, textColor }) => {
  const { t } = useTranslation();
  const { lang } = useParams();
  const navigate = useNavigate();

  const handleSelection = (type) => {
    handleUserTypeChange(type);
    navigate(`/${lang}/signup/basic-info`);
  };

  return (
    <>
      <h1 className="page-title">
        Welcome to Linky!
      </h1>
      <p className="text-light-grey" style={{ fontSize: '14px', marginBottom: '3vh' }}>
        {t('auth.signup.getStarted')}
      </p>
      <div className="Select-user-type">
        <ClickableIcon
          icon={manager}
          alt="Pharmacist"
          onClick={() => handleSelection('Manager')}
          isSelected={userType === 'Manager'}
        />
        <ClickableIcon
          icon={employee}
          alt="Responsible Pharmacist"
          onClick={() => handleSelection('Employee')}
          isSelected={userType === 'Employee'}
        />
      </div>
      <div className="user-type-labels">
        <p>{t('auth.signup.hiring')}</p>
        <p>{t('auth.signup.lookingForWork')}</p>
      </div>
      <UnderlinedLink
        text="Already have an account? Log in"
        to="/login"
        color={textColor}
        fontSize="14px"
        marginTop="50px"
      />
    </>
  );
};

export default Page1;

