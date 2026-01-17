import React from 'react';
import { Outlet } from 'react-router-dom';

const Layout = () => {
  return (
    <div className="main-layout">
      {/* Main content with outlet for child routes */}
      <div className="main-content">
        <Outlet />
      </div>
    </div>
  );
};

export default Layout; 