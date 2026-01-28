import React from 'react';

const EmployeeCard = ({ employee }) => {
  return (
    <div>
      <h3>{employee?.name}</h3>
    </div>
  );
};

export default EmployeeCard;

