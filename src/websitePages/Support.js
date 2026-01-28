// src/pages/Support.js
import React from 'react';
import { useTranslation } from 'react-i18next';

const Support = () => {
  const { t } = useTranslation(['support', 'common']);

  return (
    <div>

      {/* Contact Support Section */}
      <section id="contact-support" className="py-16 bg-gray-100">
        <div className="container mx-auto text-center">
          <h2 className="text-3xl font-bold">{t('contact.title')}</h2>
          <h3 className="mt-4 text-xl">{t('contact.subtitle')}</h3>
          <form className="mt-8 max-w-xl mx-auto">
            <div className="mb-4">
              <input type="text" placeholder={t('placeholders.name')} className="w-full px-4 py-2 border rounded-md" />
            </div>
            <div className="mb-4">
              <input type="email" placeholder={t('placeholders.email')} className="w-full px-4 py-2 border rounded-md" required />
            </div>
            <div className="mb-4">
              <select className="w-full px-4 py-2 border rounded-md">
                <option value="Technical Issue">{t('issueTypes.technical')}</option>
                <option value="Job Posting Issue">{t('issueTypes.jobPosting')}</option>
                <option value="Payment Issue">{t('issueTypes.payment')}</option>
                <option value="Profile Verification">{t('issueTypes.profileVerification')}</option>
                <option value="Other">{t('issueTypes.other')}</option>
              </select>
            </div>
            <div className="mb-4">
              <textarea placeholder={t('placeholders.message')} className="w-full px-4 py-2 border rounded-md" rows="5"></textarea>
            </div>
            <div className="mb-4">
              <input type="file" className="w-full px-4 py-2 border rounded-md" />
            </div>
            <div>
              <button type="submit" className="px-6 py-3 bg-blue-500 text-white rounded-md">{t('submitButton')}</button>
            </div>
          </form>
          <p className="mt-4 text-gray-600">{t('thankYou')}</p>
        </div>
      </section>


      {/* Footer Section */}
      <footer className="bg-gray-800 text-white py-8">
        <div className="container mx-auto text-center">
          <div className="space-x-4">
            <a href="/" className="text-gray-400">{t('footer.homepage')}</a>
            <a href="/about" className="text-gray-400">{t('footer.about')}</a>
            <a href="/faqs" className="text-gray-400">{t('footer.faqs')}</a>
            <a href="/support" className="text-gray-400">{t('footer.support')}</a>
          </div>
          <p className="mt-4">{t('common:footer.copyright')}</p>
          <div className="mt-2 space-x-4">
            <a href="/privacy" className="text-gray-400">{t('footer.privacy')}</a>
            <a href="/terms" className="text-gray-400">{t('footer.terms')}</a>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Support;
 