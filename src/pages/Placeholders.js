import React from 'react';
import { Outlet } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import PlaceholderPage from '../components/PlaceholderPage';

export const Layout = () => {
  return (
    <>
      <Outlet />
    </>
  );
};

export const PharmaciesPage = () => {
  const { t } = useTranslation('pages');
  return (
    <PlaceholderPage 
      title={t('placeholders.pharmacies.title')} 
      description={t('placeholders.pharmacies.description')} 
    />
  );
};

export const ProfessionalsPage = () => {
  const { t } = useTranslation('pages');
  return (
    <PlaceholderPage 
      title={t('placeholders.professionals.title')} 
      description={t('placeholders.professionals.description')} 
    />
  );
};

export const AboutPage = () => {
  const { t } = useTranslation('pages');
  return (
    <PlaceholderPage 
      title={t('placeholders.about.title')} 
      description={t('placeholders.about.description')} 
    />
  );
};

export const ContactPage = () => {
  const { t } = useTranslation('pages');
  return (
    <PlaceholderPage 
      title={t('placeholders.contact.title')} 
      description={t('placeholders.contact.description')} 
    />
  );
};

export const FAQPage = () => {
  const { t } = useTranslation('pages');
  return (
    <PlaceholderPage 
      title={t('placeholders.faq.title')} 
      description={t('placeholders.faq.description')} 
    />
  );
};

export const BlogPage = () => {
  const { t } = useTranslation('pages');
  return (
    <PlaceholderPage 
      title={t('placeholders.blog.title')} 
      description={t('placeholders.blog.description')} 
    />
  );
};

export const PrivacyPage = () => {
  const { t } = useTranslation('pages');
  return (
    <PlaceholderPage 
      title={t('placeholders.privacy.title')} 
      description={t('placeholders.privacy.description')} 
    />
  );
};

export const TermsPage = () => {
  const { t } = useTranslation('pages');
  return (
    <PlaceholderPage 
      title={t('placeholders.terms.title')} 
      description={t('placeholders.terms.description')} 
    />
  );
}; 