// src/pages/PharmacistDashboard.js
import React, { useState, useEffect } from 'react';
import { useAuth } from '../features/auth/context/AuthContext';

const PharmacistDashboard = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { user, logout } = useAuth();

  const toggleSidebar = () => {
    setSidebarOpen(!sidebarOpen);
  };
  
  const handleLogout = () => {
    logout();
  };

  return (
    <div className="flex min-h-screen">
      {/* Sidebar */}
      <aside className={`bg-white w-64 shadow-md fixed inset-y-0 left-0 transform ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'} transition-transform`}>
        <div className="flex flex-col h-full">
          <div className="px-6 py-4 text-lg font-bold">Linky Dashboard</div>
          <nav className="mt-4">
            <a href="/dashboard" className="block px-6 py-2 hover:bg-gray-200">Dashboard Overview</a>
            <a href="/job-search" className="block px-6 py-2 hover:bg-gray-200">Job Search</a>
            <a href="/applications" className="block px-6 py-2 hover:bg-gray-200">Applications</a>
            <a href="/availability" className="block px-6 py-2 hover:bg-gray-200">Availability</a>
            <a href="/profile" className="block px-6 py-2 hover:bg-gray-200">Profile</a>
            <a href="/payments" className="block px-6 py-2 hover:bg-gray-200">Payments</a>
            <a href="/settings" className="block px-6 py-2 hover:bg-gray-200">Settings</a>
          </nav>
          <div className="mt-auto p-4">
            <button onClick={handleLogout} className="w-full px-4 py-2 bg-red-500 text-white rounded">
              Logout
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 bg-gray-100 min-h-screen p-6 ml-64">
        {/* Top Navigation Bar */}
        <header className="bg-white shadow-sm p-4 fixed w-full z-10">
          <div className="container mx-auto flex justify-between items-center">
            <button className="text-gray-500 focus:outline-none" onClick={toggleSidebar}>
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16"></path>
              </svg>
            </button>
            <div className="flex items-center space-x-4">
              <a href="/" className="text-gray-700">Home</a>
              <span>{user?.firstName} {user?.lastName}</span>
            </div>
          </div>
        </header>

        {/* Hero Section */}
        <section className="pt-24">
          <h1 className="text-4xl font-bold mb-4">Welcome, [Pharmacist&apos;s Name]</h1>
          <p className="text-lg mb-8">Find new opportunities and manage your applications.</p>

          {/* Quick Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <div className="bg-white p-6 rounded-lg shadow-md">
              <h2 className="text-xl font-bold">3 Active Applications</h2>
            </div>
            <div className="bg-white p-6 rounded-lg shadow-md">
              <h2 className="text-xl font-bold">5 Jobs Applied</h2>
            </div>
            <div className="bg-white p-6 rounded-lg shadow-md">
              <h2 className="text-xl font-bold">2 Upcoming Shifts</h2>
            </div>
          </div>

          {/* Job Search Section */}
          <section className="mb-8">
            <h2 className="text-2xl font-bold mb-4">Search for Jobs</h2>
            <div className="flex items-center mb-4">
              <input
                type="text"
                placeholder="Search jobs by location, title..."
                className="flex-1 px-4 py-2 border rounded-md mr-4"
              />
              <button className="px-6 py-2 bg-blue-500 text-white rounded-md">Search</button>
            </div>
            <div className="flex items-center space-x-4 mb-4">
              <select className="px-4 py-2 border rounded-md">
                <option>Filter by Availability</option>
                <option>Available Now</option>
                <option>Next Week</option>
              </select>
              <select className="px-4 py-2 border rounded-md">
                <option>Filter by Distance</option>
                <option>Within 5 miles</option>
                <option>Within 10 miles</option>
              </select>
            </div>

            {/* Job Listings */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <div className="bg-white p-6 rounded-lg shadow-md">
                <h3 className="text-lg font-bold">Pharmacy Job - Oct 15 to Oct 20</h3>
                <p className="text-gray-600">Location: Zurich</p>
                <p className="text-gray-600">Pay: CHF 50/hour</p>
                <div className="mt-4">
                  <button className="px-4 py-2 bg-green-500 text-white rounded-md">Quick Apply</button>
                  <button className="px-4 py-2 bg-gray-300 text-gray-700 rounded-md ml-2">Save Job</button>
                </div>
              </div>
              {/* Repeat similar card structure for other job posts */}
            </div>
          </section>

          {/* Application Status Tracking Section */}
          <section className="mb-8">
            <h2 className="text-2xl font-bold mb-4">My Applications</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <div className="bg-white p-6 rounded-lg shadow-md">
                <h3 className="text-lg font-bold">Pharmacy Job - Pending</h3>
                <p className="text-gray-600">Location: Zurich</p>
                <p className="text-gray-600">Pay: CHF 50/hour</p>
                <div className="mt-4">
                  <button className="px-4 py-2 bg-gray-300 text-gray-700 rounded-md mr-2">Withdraw Application</button>
                  <button className="px-4 py-2 bg-blue-500 text-white rounded-md">Message Employer</button>
                </div>
              </div>
              {/* Repeat similar card structure for other applications */}
            </div>
          </section>

          {/* Availability & Calendar Management Section */}
          <section className="mb-8">
            <h2 className="text-2xl font-bold mb-4">Manage Availability</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-white p-6 rounded-lg shadow-md">
                <h3 className="text-lg font-bold">My Availability</h3>
                <p className="text-gray-600">Set your availability for upcoming shifts.</p>
                <button className="mt-4 px-6 py-3 bg-blue-500 text-white rounded-md">Update Availability</button>
              </div>
              <div className="bg-white p-6 rounded-lg shadow-md">
                <h3 className="text-lg font-bold">Upcoming Shifts</h3>
                <p className="text-gray-600">View confirmed shifts and manage your schedule.</p>
                <button className="mt-4 px-6 py-3 bg-green-500 text-white rounded-md">View Calendar</button>
              </div>
            </div>
          </section>

          {/* Profile Management Section */}
          <section className="mb-8">
            <h2 className="text-2xl font-bold mb-4">Manage Profile</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-white p-6 rounded-lg shadow-md">
                <h3 className="text-lg font-bold">Edit Profile</h3>
                <p className="text-gray-600">Update your personal information and certifications.</p>
                <button className="mt-4 px-6 py-3 bg-blue-500 text-white rounded-md">Edit Profile</button>
              </div>
              <div className="bg-white p-6 rounded-lg shadow-md">
                <h3 className="text-lg font-bold">Upload Certifications</h3>
                <p className="text-gray-600">Upload or update your pharmacy-related certifications.</p>
                <button className="mt-4 px-6 py-3 bg-green-500 text-white rounded-md">Upload Documents</button>
              </div>
            </div>
          </section>

          {/* Payment Information & History Section */}
          <section className="mb-8">
            <h2 className="text-2xl font-bold mb-4">Payment Information</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-white p-6 rounded-lg shadow-md">
                <h3 className="text-lg font-bold">Track Payments</h3>
                <p className="text-gray-600">View your earnings from completed jobs and track payment status.</p>
                <button className="mt-4 px-6 py-3 bg-blue-500 text-white rounded-md">View Payment History</button>
              </div>
              <div className="bg-white p-6 rounded-lg shadow-md">
                <h3 className="text-lg font-bold">Manage Payment Methods</h3>
                <p className="text-gray-600">Add or update your bank account details for Stripe payouts.</p>
                <button className="mt-4 px-6 py-3 bg-green-500 text-white rounded-md">Update Payment Methods</button>
              </div>
            </div>
          </section>
        </section>
      </main>
    </div>
  );
};

export default PharmacistDashboard;
