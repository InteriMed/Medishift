// src/pages/FAQs.js
import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { NavLink, useParams } from 'react-router-dom';

const FAQs = () => {
  const { t } = useTranslation();
  const { lang } = useParams();
  const [searchTerm, setSearchTerm] = useState('');

  const handleSearch = (e) => {
    setSearchTerm(e.target.value);
  };

  return (
    <div>
      {/* Header Section */}
      <header className="bg-white shadow-sm py-4">
        <div className="container mx-auto flex justify-between items-center">
          <div className="flex items-center space-x-8">
            <a href="/" className="text-xl font-bold">Linky</a>
            <nav className="space-x-4">
              <a href="/" className="text-gray-700">Homepage</a>
              <a href="/about" className="text-gray-700">About</a>
              <a href="/faqs" className="text-gray-700">FAQs</a>
              <a href="/support" className="text-gray-700">Support</a>
            </nav>
          </div>
          <div>
            <a href="/login" className="px-4 py-2 bg-blue-500 text-white rounded-md">Login/Sign Up</a>
          </div>
        </div>
      </header>

      {/* Page Title */}
      <section className="py-16 bg-gray-100">
        <div className="container mx-auto text-center">
          <h1 className="text-4xl font-bold">{t('faqs.title')}</h1>
          <h2 className="mt-4 text-2xl">{t('faqs.subtitle')}</h2>
          <input
            type="text"
            placeholder={t('faqs.search')}
            className="mt-6 px-4 py-2 border rounded-md w-full md:w-1/2"
            value={searchTerm}
            onChange={handleSearch}
          />
          <div className="mt-8 space-x-4">
            <a href="#general-faqs" className="text-blue-500">{t('faqs.categories.general')}</a>
            <a href="#pricing" className="text-blue-500">{t('faqs.categories.pricing')}</a>
            <a href="#how-it-works" className="text-blue-500">{t('faqs.categories.howItWorks')}</a>
            <a href="#privacy-policy" className="text-blue-500">{t('faqs.categories.privacy')}</a>
            <a href="#terms-of-service" className="text-blue-500">{t('faqs.categories.terms')}</a>
          </div>
        </div>
      </section>

      {/* General FAQs Section */}
      <section id="general-faqs" className="py-16">
        <div className="container mx-auto text-center">
          <h2 className="text-3xl font-bold">General FAQs</h2>
          <h3 className="mt-4 text-xl">Common questions for pharmacists and employers using Linky.</h3>
          <div className="mt-8 text-left max-w-4xl mx-auto">
            <h4 className="text-2xl font-semibold">FAQs for Pharmacists (Job Seekers)</h4>
            <div className="mt-4">
              <h5 className="font-bold">How do I create an account?</h5>
              <p>Click on the &apos;Sign Up&apos; button on the top right of the homepage, select &apos;Pharmacist&apos;, and follow the steps to fill in your profile, including your certifications and availability.</p>
            </div>
            <div className="mt-4">
              <h5 className="font-bold">What documents do I need to verify my profile?</h5>
              <p>You will need to upload a copy of your pharmacist license, ID, and any relevant certifications to verify your profile.</p>
            </div>
            <div className="mt-4">
              <h5 className="font-bold">How do I apply for a job?</h5>
              <p>Once your profile is complete, browse available jobs by using the search function. You can filter by location, schedule, and more. Click on &apos;Apply&apos; for the job you&apos;re interested in.</p>
            </div>
            <div className="mt-4">
              <h5 className="font-bold">How are payments processed?</h5>
              <p>Payments are handled through Stripe. You will receive your payment directly into your connected bank account once a job is completed.</p>
            </div>
            <div className="mt-4">
              <h5 className="font-bold">Can I change my availability after I&apos;ve set it?</h5>
              <p>Yes, you can update your availability at any time by accessing your profile and editing your calendar.</p>
            </div>
            <div className="mt-4">
              <h5 className="font-bold">Can I work part-time or full-time through Linky?</h5>
              <p>You can choose to work part-time, full-time, or take up temporary positions based on your availability.</p>
            </div>
            <h4 className="text-2xl font-semibold mt-8">FAQs for Employers (Pharmacies)</h4>
            <div className="mt-4">
              <h5 className="font-bold">How do I post a job?</h5>
              <p>Once logged in, go to the &apos;Post a Job&apos; section in your dashboard. Fill out the job details, including the schedule, location, and job description. Your job will be visible to qualified pharmacists.</p>
            </div>
            <div className="mt-4">
              <h5 className="font-bold">How do I verify the pharmacists who apply?</h5>
              <p>All pharmacists on Linky are vetted and verified by our team to ensure they meet industry standards. You can also review their profiles and documentation.</p>
            </div>
            <div className="mt-4">
              <h5 className="font-bold">How much does it cost to post a job?</h5>
              <p>Please refer to the pricing section below for detailed information on job posting fees.</p>
            </div>
            <div className="mt-4">
              <h5 className="font-bold">Can I contact pharmacists before hiring them?</h5>
              <p>Yes, once a pharmacist applies to your job, you can message them directly through the platform to discuss the details.</p>
            </div>
            <div className="mt-4">
              <h5 className="font-bold">What happens if a pharmacist cancels last minute?</h5>
              <p>If a pharmacist cancels, you will be notified immediately. You can repost the job, or we can assist you in finding a replacement.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="py-16 bg-gray-100">
        <div className="container mx-auto text-center">
          <h2 className="text-3xl font-bold">Pricing</h2>
          <h3 className="mt-4 text-xl">Affordable pricing for both pharmacists and employers.</h3>
          <div className="mt-8 text-left max-w-4xl mx-auto">
            <h4 className="text-2xl font-semibold">For Pharmacists (Job Seekers)</h4>
            <p>Is it free for pharmacists to join Linky? Yes, it is free for pharmacists to sign up, create a profile, and apply for jobs.</p>
            <p>Are there any fees for pharmacists? There are no fees for pharmacists. You keep 100% of the payments for the jobs you complete.</p>
            <h4 className="text-2xl font-semibold mt-8">For Employers (Pharmacies)</h4>
            <p>How much does it cost to post a job? You can post your first job for free. After that, job posting fees are as follows:</p>
            <ul className="list-disc ml-8">
              <li>Single job post: CHF 50</li>
              <li>Subscription (Unlimited posts): CHF 200 per month.</li>
            </ul>
            <p>Are there additional costs after a job is filled? No additional costs are charged once a job is filled. The fee only covers the job posting.</p>
            <h4 className="text-2xl font-semibold mt-8">Payment Methods</h4>
            <p>How are payments processed? Payments for job postings are securely processed through Stripe, ensuring a seamless and secure transaction.</p>
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section id="how-it-works" className="py-16">
        <div className="container mx-auto text-center">
          <h2 className="text-3xl font-bold">How It Works</h2>
          <h3 className="mt-4 text-xl">Learn how to get started on Linky, whether you're a pharmacist or employer.</h3>
          <div className="mt-8 text-left max-w-4xl mx-auto">
            <h4 className="text-2xl font-semibold">For Pharmacists</h4>
            <ul className="list-disc ml-8">
              <li>Sign Up & Create Profile: Complete your profile with your qualifications, certifications, and availability.</li>
              <li>Find Jobs: Use the search function to find job opportunities based on location, hours, and job type.</li>
              <li>Apply for Jobs: Click 'Apply' to express interest in the job, and you can message employers directly.</li>
              <li>Get Paid: After completing the job, your payment will be processed securely via Stripe.</li>
            </ul>

            <h4 className="text-2xl font-semibold mt-8">For Employers</h4>
            <ul className="list-disc ml-8">
              <li>Post a Job: Create a job listing with the required details, including location, dates, and qualifications needed.</li>
              <li>Review Candidates: Pharmacists who meet the job requirements will apply, and you can review their profiles and documents.</li>
              <li>Hire a Pharmacist: Once you find a suitable candidate, confirm the hire and communicate directly through the platform.</li>
            </ul>
          </div>
        </div>
      </section>

      {/* Privacy Policy + Legal Compliance Section */}
      <section id="privacy-policy" className="py-16 bg-gray-100">
        <div className="container mx-auto text-center">
          <h2 className="text-3xl font-bold">Privacy Policy & Legal Compliance</h2>
          <h3 className="mt-4 text-xl">Your privacy and security are our priority.</h3>
          <div className="mt-8 text-left max-w-4xl mx-auto">
            <h4 className="text-2xl font-semibold">GDPR & FADP Compliance</h4>
            <p>We follow strict guidelines set by GDPR and Switzerland's FADP (Federal Act on Data Protection) to ensure your personal data is protected at all times.</p>
            <p>What data does Linky collect? We collect basic information such as your name, contact details, qualifications, and employment history to match you with jobs.</p>
            <p>How do I request my data or have it deleted? You have the right to access your personal data and request its deletion at any time. Please contact support to initiate the process.</p>

            <h4 className="text-2xl font-semibold mt-8">Data Encryption & Security</h4>
            <p>Is my data encrypted? Yes, we use HTTPS and SSL encryption to protect your data both in transit and at rest.</p>
            <p>How do you handle payment information? All payment transactions are securely handled via Stripe, which is PCI-DSS Level 1 compliant. We do not store any payment information on our servers.</p>

            <h4 className="text-2xl font-semibold mt-8">Compliance with Swiss and European Law</h4>
            <p>Is Linky compliant with Swiss law? Yes, we adhere to Swiss FADP regulations and ensure that all user data is stored and processed in compliance with Swiss and European laws.</p>
            <p>Can I request a copy of the Data Processing Agreement? Yes, please contact our support team to request a copy of our Data Processing Agreement for services like Firebase and Stripe.</p>
          </div>
        </div>
      </section>

      {/* Terms of Service Section */}
      <section id="terms-of-service" className="py-16">
        <div className="container mx-auto text-center">
          <h2 className="text-3xl font-bold">Terms of Service</h2>
          <h3 className="mt-4 text-xl">The rules and guidelines for using Linky.</h3>
          <div className="mt-8 text-left max-w-4xl mx-auto">
            <h4 className="text-2xl font-semibold">User Responsibilities</h4>
            <p>What are my responsibilities as a pharmacist? As a pharmacist, you are responsible for providing accurate information regarding your qualifications, certifications, and availability.</p>
            <p>What are my responsibilities as an employer? As an employer, you must provide accurate job descriptions and ensure that you meet all legal obligations to the pharmacists you hire.</p>

            <h4 className="text-2xl font-semibold mt-8">Account Management</h4>
            <p>Can I delete my account? Yes, you can delete your account at any time by navigating to the account settings page.</p>
            <p>What happens if I violate the terms of service? If you violate the terms of service, we reserve the right to suspend or terminate your account.</p>

            <h4 className="text-2xl font-semibold mt-8">Payments and Refunds</h4>
            <p>Can I get a refund for a job post? Refunds for job postings are not available unless there is a technical issue that prevents your job from being posted.</p>
            <p>How are disputes handled? If a dispute arises between a pharmacist and an employer, we encourage both parties to resolve the issue directly. If necessary, our support team can mediate the situation.</p>
          </div>
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

export default FAQs;
