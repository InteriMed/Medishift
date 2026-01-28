import React from 'react';
import PropTypes from 'prop-types';
import Employees from '../components/TeamEmployees';

const EmployeesPage = ({ hideHeader = false }) => {
  return (
    <div className="h-full flex flex-col overflow-hidden animate-in fade-in duration-500">
      <div className="flex-1 overflow-auto">
        <div className="w-full max-w-[1400px] mx-auto flex-1 flex flex-col pt-6 px-6">
          <Employees hideHeader={true} />
        </div>
      </div>
    </div>
  );
};

EmployeesPage.propTypes = {
  hideHeader: PropTypes.bool
};

export default EmployeesPage;

