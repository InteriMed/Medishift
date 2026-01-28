import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { FiX, FiPlus } from 'react-icons/fi';
import LoadingSpinner from '../../../../components/loadingSpinner';
import Button from '../../../../components/boxedInputFields/button';
import PersonalizedInputField from '../../../../components/boxedInputFields/personnalizedInputField';
import SimpleDropdown from '../../../../components/boxedInputFields/Dropdown-Field';
import TextareaField from '../../../../components/boxedInputFields/textareaField';

const CATEGORIES = [
  { value: 'general', label: 'General' },
  { value: 'feedback', label: 'Feedback' },
  { value: 'bug_report', label: 'Bug Report' },
  { value: 'feature_request', label: 'Feature Request' },
  { value: 'support', label: 'Support' },
  { value: 'question', label: 'Question' }
];

const CreateTicketModal = ({ onClose, onCreate, isLoading }) => {
  const { t } = useTranslation(['support', 'common']);
  const [formData, setFormData] = useState({
    title: '',
    content: '',
    category: 'general'
  });

  const handleSubmit = () => {
    if (!formData.title.trim() || !formData.content.trim()) {
      return;
    }
    onCreate(formData);
  };

  const updateField = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in">
      <div
        className="bg-card w-full max-w-lg rounded-3xl border border-border shadow-2xl overflow-hidden animate-in zoom-in-95"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-6 border-b border-border">
          <div className="flex items-center justify-between mb-1">
            <h2 className="text-xl font-bold">
              {t('support:createTicket.title', 'New Support Ticket')}
            </h2>
            <button
              onClick={onClose}
              className="p-2 hover:bg-muted rounded-full transition-colors"
              disabled={isLoading}
            >
              <FiX className="w-5 h-5 text-muted-foreground" />
            </button>
          </div>
          <p className="text-sm text-muted-foreground">
            {t('support:createTicket.description', 'Describe your issue and our team will help you')}
          </p>
        </div>

        <div className="p-6 space-y-4">
          <PersonalizedInputField
            label={t('support:createTicket.titleLabel', 'Title')}
            placeholder={t('support:createTicket.titlePlaceholder', 'Brief description of your issue')}
            value={formData.title}
            onChange={(e) => updateField('title', e.target.value)}
            required
          />

          <SimpleDropdown
            label={t('support:createTicket.categoryLabel', 'Category')}
            options={CATEGORIES}
            value={formData.category}
            onChange={(value) => updateField('category', value)}
          />

          <TextareaField
            label={t('support:createTicket.contentLabel', 'Description')}
            placeholder={t('support:createTicket.contentPlaceholder', 'Provide detailed information about your issue')}
            value={formData.content}
            onChange={(e) => updateField('content', e.target.value)}
            rows={6}
            required
          />
        </div>

        <div className="p-6 border-t border-border bg-muted/20 flex justify-end gap-3">
          <Button
            onClick={onClose}
            variant="secondary"
            disabled={isLoading}
          >
            {t('common:cancel', 'Cancel')}
          </Button>
          <Button
            onClick={handleSubmit}
            variant="primary"
            disabled={isLoading || !formData.title.trim() || !formData.content.trim()}
          >
            {isLoading ? (
              <>
                <LoadingSpinner size="sm" />
                {t('common:creating', 'Creating...')}
              </>
            ) : (
              <>
                <FiPlus className="w-5 h-5" />
                {t('support:createTicket.submit', 'Create Ticket')}
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default CreateTicketModal;



