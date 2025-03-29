import React from 'react';
import { useParams } from 'react-router-dom';
import './Dashboard Manager.css';
import logo from '../../../../assets/img/logo.png';
import Sidebar from '../sidebar/Sidebar';

const Dashboard = () => {
  const { lang, uid } = useParams();

  return (
    <div className="dashboard-container">
      <Sidebar logo={logo} uid={uid} lang={lang} />
      {/* Main Content */}
      <div className="main-content">
        <div className="content-area">
          <h1>Welcome to Manager Dashboard</h1>
          <p>This is the main dashboard page for managers.</p>
          {/* Dashboard content goes here */}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
