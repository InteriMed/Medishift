import React from 'react';
import './Settings.css';

const Settings = () => {
  return (
    <div className="content-panel">
      <div className="panel-header">
        <h1>Settings</h1>
      </div>
      <div className="panel-content">
        <div className="settings-container">
          <div className="settings-section">
            <h2>Account Settings</h2>
            <form>
              <div className="form-group">
                <label>Email</label>
                <input type="email" placeholder="your@email.com" />
              </div>
              <div className="form-group">
                <label>Password</label>
                <input type="password" placeholder="********" />
              </div>
              <button type="submit">Save Changes</button>
            </form>
          </div>
          <div className="settings-section">
            <h2>Preferences</h2>
            {/* Preferences settings */}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Settings;