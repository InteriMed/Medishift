import React from 'react';
import { Outlet } from 'react-router-dom';
import PlaceholderPage from '../components/PlaceholderPage';

// Main layout component with header/footer
export const Layout = () => {
  return (
    <>
      <Outlet />
    </>
  );
};

// Placeholder pages for different sections
export const PharmaciesPage = () => (
  <PlaceholderPage 
    title="For Pharmacies" 
    description="Find qualified pharmacy staff quickly and compliantly" 
  />
);

export const ProfessionalsPage = () => (
  <PlaceholderPage 
    title="For Professionals" 
    description="Discover flexible pharmacy work opportunities that fit your schedule" 
  />
);

export const AboutPage = () => (
  <PlaceholderPage 
    title="About Us" 
    description="Learn about InteriMed's mission, team, and how we're transforming pharmacy staffing in Switzerland" 
  />
);

export const ContactPage = () => (
  <PlaceholderPage 
    title="Contact Us" 
    description="Get in touch with the InteriMed team for support, questions, or partnership inquiries" 
  />
);

export const FAQPage = () => (
  <PlaceholderPage 
    title="Frequently Asked Questions" 
    description="Find answers to common questions about using InteriMed for pharmacy staffing" 
  />
);

export const BlogPage = () => (
  <PlaceholderPage 
    title="Blog & Resources" 
    description="Insights, updates, and guidance for the Swiss pharmacy sector" 
  />
);

export const PrivacyPage = () => (
  <PlaceholderPage 
    title="Privacy Policy" 
    description="Information about how we collect, use, and protect your data" 
  />
);

export const TermsPage = () => (
  <PlaceholderPage 
    title="Terms of Service" 
    description="The legal terms governing your use of the InteriMed platform" 
  />
); 