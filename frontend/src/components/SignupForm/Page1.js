import React from 'react';
import ClickableIcon from '../ClickableIcon/ClickableIcon';
import UnderlinedLink from '../Links/UnderlinedLink';
import manager from "../../assets/img/manager.png";
import employee from "../../assets/img/employee.png";
import './Page1.css';

const Page1 = ({ userType, handleUserTypeChange, textColor }) => {
  return (
    <>
      <h1 style={{ color: textColor, fontWeight: 'normal', fontSize: '32px', marginTop: '40px' }}>
        Welcome to Linky!
      </h1>
      <p className="text-light-grey" style={{ fontSize: '14px', marginBottom: '65px' }}>
        Hello, shall we get to know each other?
      </p>
      <div className="Select-user-type">
        <ClickableIcon
          icon={manager}
          alt="Pharmacist"
          onClick={() => handleUserTypeChange('Manager')}
          isSelected={userType === 'Manager'}
        />
        <ClickableIcon
          icon={employee}
          alt="Responsible Pharmacist"
          onClick={() => handleUserTypeChange('Employee')}
          isSelected={userType === 'Employee'}
        />
      </div>
      <div className="user-type-labels">
        <p>I&apos;m hiring</p>
        <p>I&apos;m ready to work!!</p>
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

