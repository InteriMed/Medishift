import React from 'react';
import PropTypes from 'prop-types';
import OrganigramView from '../components/teamOrganigramView';

const OrganigramPage = ({ hideHeader = false }) => {
  return (
    <div className="h-full flex flex-col overflow-hidden animate-in fade-in duration-500">
      <div className="flex-1 overflow-hidden">
        <OrganigramView hideHeader={true} />
      </div>
    </div>
  );
};

OrganigramPage.propTypes = {
  hideHeader: PropTypes.bool
};

export default OrganigramPage;

