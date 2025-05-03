// src/pages/Support.js
import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { NavLink, useParams } from 'react-router-dom';

const Support = () => {
  const { t } = useTranslation();
  const { lang } = useParams();
  const [searchTerm, setSearchTerm] = useState('');

  const handleSearch = (e) => {
    setSearchTerm(e.target.value);
  };

  return (
    <div>

      {/* Contact Support Section */}
      <section id="contact-support" className="py-16 bg-gray-100">
        <div className="container mx-auto text-center">
          <h2 className="text-3xl font-bold">{t('support.contact.title')}</h2>
          <h3 className="mt-4 text-xl">{t('support.contact.subtitle')}</h3>
          <form className="mt-8 max-w-xl mx-auto">
            <div className="mb-4">
              <input type="text" placeholder="Name (optional)" className="w-full px-4 py-2 border rounded-md" />
            </div>
            <div className="mb-4">
              <input type="email" placeholder="Email (required)" className="w-full px-4 py-2 border rounded-md" required />
            </div>
            <div className="mb-4">
              <select className="w-full px-4 py-2 border rounded-md">
                <option value="Technical Issue">Technical Issue</option>
                <option value="Job Posting Issue">Job Posting Issue</option>
                <option value="Payment Issue">Payment Issue</option>
                <option value="Profile Verification">Profile Verification</option>
                <option value="Other">Other</option>
              </select>
            </div>
            <div className="mb-4">
              <textarea placeholder="Message" className="w-full px-4 py-2 border rounded-md" rows="5"></textarea>
            </div>
            <div className="mb-4">
              <input type="file" className="w-full px-4 py-2 border rounded-md" />
            </div>
            <div>
              <button type="submit" className="px-6 py-3 bg-blue-500 text-white rounded-md">Submit Request</button>
            </div>
          </form>
          <p className="mt-4 text-gray-600">Thank you! Our support team will get back to you within 24 hours.</p>
        </div>
      </section>


      {/* Footer Section */}
      <footer className="bg-gray-800 text-white py-8">
        <div className="container mx-auto text-center">
          <div className="space-x-4">
            <a href="/" className="text-gray-400">Homepage</a>
            <a href="/about" className="text-gray-400">About</a>
            <a href="/faqs" className="text-gray-400">FAQs</a>
            <a href="/support" className="text-gray-400">Support</a>
          </div>
          <p className="mt-4">© 2024 Linky. All Rights Reserved.</p>
          <div className="mt-2 space-x-4">
            <a href="/privacy" className="text-gray-400">Privacy Policy</a>
            <a href="/terms" className="text-gray-400">Terms of Service</a>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Support;
 