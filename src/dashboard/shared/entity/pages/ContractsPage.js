import React from 'react';
import PropTypes from 'prop-types';
import Contracts from '../components/Contracts';

const ContractsPage = ({ hideHeader = false }) => {
  return (
    <div className="h-full flex flex-col overflow-hidden animate-in fade-in duration-500">
      <div className="flex-1 overflow-auto">
        <div className="w-full max-w-[1400px] mx-auto flex-1 flex flex-col pt-6 px-6">
          <Contracts hideHeader={true} />
        </div>
      </div>
    </div>
  );
};

ContractsPage.propTypes = {
  hideHeader: PropTypes.bool
};

export default ContractsPage;
