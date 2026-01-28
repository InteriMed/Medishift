import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { httpsCallable } from 'firebase/functions';
import { functions } from '../../services/services/firebase';
import Modal from './modals';
import Button from '../boxedInputFields/button';
import PersonnalizedInputField from '../boxedInputFields/personnalizedInputField';
import TextareaField from '../boxedInputFields/textareaField';
import SimpleDropdown from '../boxedInputFields/dropdownField';
import { FaArrowRight } from 'react-icons/fa';

const ContactFormPopup = ({ isOpen, onClose }) => {
  const { t } = useTranslation(['contact', 'common']);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    message: '',
    subject: '',
    company: '',
    type: 'general'
  });
  const [formErrors, setFormErrors] = useState({});
  const [formSubmitted, setFormSubmitted] = useState(false);
  const [formSubmitting, setFormSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value
    });

    if (formErrors[name]) {
      setFormErrors({
        ...formErrors,
        [name]: ''
      });
    }
  };

  const handleDropdownChange = (name, value) => {
    setFormData({
      ...formData,
      [name]: value
    });

    if (formErrors[name]) {
      setFormErrors({
        ...formErrors,
        [name]: ''
      });
    }
  };

  const handleErrorReset = (fieldName) => {
    if (formErrors[fieldName]) {
      setFormErrors({
        ...formErrors,
        [fieldName]: ''
      });
    }
  };

  const validateForm = () => {
    const errors = {};

    if (!formData.name.trim()) {
      errors.name = t('contact.form.errors.nameRequired');
    }

    if (!formData.email.trim()) {
      errors.email = t('contact.form.errors.emailRequired');
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      errors.email = t('contact.form.errors.emailInvalid');
    }

    if (!formData.message.trim()) {
      errors.message = t('contact.form.errors.messageRequired');
    }

    if (!formData.subject.trim()) {
      errors.subject = t('contact.form.errors.subjectRequired');
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setFormSubmitting(true);
    setSubmitError('');

    try {
      const sendContactFormEmail = httpsCallable(functions, 'sendContactFormEmail');
      await sendContactFormEmail({
        name: formData.name,
        email: formData.email,
        phone: formData.phone,
        company: formData.company,
        subject: formData.subject,
        message: formData.message,
        type: formData.type
      });

      setFormSubmitted(true);
      setFormData({
        name: '',
        email: '',
        phone: '',
        message: '',
        subject: '',
        company: '',
        type: 'general'
      });

      setTimeout(() => {
        setFormSubmitted(false);
        onClose();
      }, 3000);
    } catch (error) {
      console.error('Contact form error:', error);
      setSubmitError(t('contact.form.errors.submitFailed', 'Failed to send message. Please try again.'));
    } finally {
      setFormSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={t('contact.form.title', 'Contact Us')}
      size="large"
      blurred_background={true}
      messageType="info"
    >
      <div className="space-y-6">
        <p className="text-sm text-muted-foreground mb-4">{t('contact.form.subtitle', 'We\'re here to help. Send us a message and we\'ll get back to you soon.')}</p>
          {formSubmitted && (
            <div className="bg-green-50 border border-green-200 rounded-2xl p-6 flex items-start gap-4">
              <div className="bg-green-100 p-2 rounded-full text-green-600 mt-1">
                <FaArrowRight className="rotate-45" size={12} />
              </div>
              <div>
                <h3 className="text-green-800 font-bold text-lg mb-1">{t('contact.form.success.title', 'Message Sent!')}</h3>
                <p className="text-green-700">{t('contact.form.success.message', 'Thank you for contacting us. We\'ll get back to you shortly.')}</p>
              </div>
            </div>
          )}

          {submitError && (
            <div className="bg-red-50 border border-red-200 rounded-2xl p-6 flex items-start gap-4">
              <div className="bg-red-100 p-2 rounded-full text-red-600 mt-1">
                <FaArrowRight className="rotate-[135deg]" size={12} />
              </div>
              <div>
                <h3 className="text-red-800 font-bold text-lg mb-1">{t('contact.form.errors.title', 'Error')}</h3>
                <p className="text-red-700">{submitError}</p>
              </div>
            </div>
          )}

          {!formSubmitted && (
            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <SimpleDropdown
                  label={t('contact.form.inquiryType.label', 'Inquiry Type')}
                  placeholder={t('contact.form.inquiryType.placeholder', 'Select inquiry type')}
                  value={formData.type}
                  onChange={(value) => handleDropdownChange('type', value)}
                  options={[
                    { value: 'general', label: t('contact.form.inquiryType.options.general', 'General Inquiry') },
                    { value: 'professional', label: t('contact.form.inquiryType.options.professional', 'Professional Account') },
                    { value: 'facility', label: t('contact.form.inquiryType.options.facility', 'Facility Account') },
                    { value: 'partnership', label: t('contact.form.inquiryType.options.partnership', 'Partnership') },
                    { value: 'media', label: t('contact.form.inquiryType.options.media', 'Media Inquiry') }
                  ]}
                  error={formErrors.type}
                  marginBottom="0"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <PersonnalizedInputField
                  label={t('contact.form.name', 'Name')}
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  placeholder={t('contact.form.namePlaceholder', 'Your full name')}
                  error={formErrors.name}
                  onErrorReset={() => handleErrorReset('name')}
                  required={true}
                  marginBottom="0"
                />

                <PersonnalizedInputField
                  label={t('contact.form.company', 'Company')}
                  type="text"
                  name="company"
                  value={formData.company}
                  onChange={handleChange}
                  placeholder={t('contact.form.companyPlaceholder', 'Company name (optional)')}
                  onErrorReset={() => handleErrorReset('company')}
                  marginBottom="0"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <PersonnalizedInputField
                  label={t('contact.form.email', 'Email')}
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  placeholder={t('contact.form.emailPlaceholder', 'your.email@example.com')}
                  error={formErrors.email}
                  onErrorReset={() => handleErrorReset('email')}
                  required={true}
                  marginBottom="0"
                />

                <PersonnalizedInputField
                  label={t('contact.form.phone', 'Phone')}
                  type="tel"
                  name="phone"
                  value={formData.phone}
                  onChange={handleChange}
                  placeholder={t('contact.form.phonePlaceholder', 'Phone number (optional)')}
                  onErrorReset={() => handleErrorReset('phone')}
                  marginBottom="0"
                />
              </div>

              <div>
                <PersonnalizedInputField
                  label={t('contact.form.subject', 'Subject')}
                  type="text"
                  name="subject"
                  value={formData.subject}
                  onChange={handleChange}
                  placeholder={t('contact.form.subjectPlaceholder', 'Brief subject line')}
                  error={formErrors.subject}
                  onErrorReset={() => handleErrorReset('subject')}
                  required={true}
                  marginBottom="0"
                />
              </div>

              <div>
                <TextareaField
                  label={t('contact.form.message', 'Message')}
                  name="message"
                  value={formData.message}
                  onChange={handleChange}
                  placeholder={t('contact.form.messagePlaceholder', 'Tell us how we can help...')}
                  error={formErrors.message}
                  onErrorReset={() => handleErrorReset('message')}
                  required={true}
                  rows={5}
                  marginBottom="0"
                />
              </div>

              <div className="flex gap-3 pt-4">
                <Button
                  type="button"
                  variant="secondary"
                  onClick={onClose}
                  className="flex-1 rounded-xl font-medium"
                  disabled={formSubmitting}
                >
                  {t('common:cancel', 'Cancel')}
                </Button>
                <Button
                  type="submit"
                  className="flex-1 py-3 bg-primary text-primary-foreground rounded-xl font-medium shadow-lg shadow-primary/20 hover:bg-primary/90 transition-all flex items-center justify-center gap-2"
                  disabled={formSubmitting}
                >
                  {formSubmitting ? t('contact.form.submitting', 'Sending...') : (
                    <>
                      {t('contact.form.submit', 'Send Message')} <FaArrowRight />
                    </>
                  )}
                </Button>
              </div>
            </form>
          )}
      </div>
    </Modal>
  );
};

export default ContactFormPopup;

