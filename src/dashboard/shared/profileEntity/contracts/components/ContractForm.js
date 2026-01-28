import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { FiX } from 'react-icons/fi';
import Button from '../../../../components/colorPicker/button';
import PersonnalizedInputField from '../../../../components/boxedInputFields/personnalizedInputField';
import TextareaField from '../../../../components/boxedInputFields/textareaField';
import SimpleDropdown from '../../../../components/boxedInputFields/dropdownField';
import styles from './contractForm.module.css';

const ContractForm = ({ contract, onSubmit, onCancel }) => {
  const { t } = useTranslation();
  const [formData, setFormData] = useState({
    title: contract?.title || '',
    description: contract?.description || '',
    status: contract?.status || 'draft',
    parties: contract?.parties || [
      { name: '', role: '', email: '', phone: '' },
      { name: '', role: '', email: '', phone: '' }
    ],
    terms: contract?.terms || [
      { title: '', content: '' }
    ]
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };
  
  const handlePartyChange = (index, field, value) => {
    setFormData(prev => {
      const updatedParties = [...prev.parties];
      updatedParties[index] = {
        ...updatedParties[index],
        [field]: value
      };
      return {
        ...prev,
        parties: updatedParties
      };
    });
  };
  
  const handleTermChange = (index, field, value) => {
    setFormData(prev => {
      const updatedTerms = [...prev.terms];
      updatedTerms[index] = {
        ...updatedTerms[index],
        [field]: value
      };
      return {
        ...prev,
        terms: updatedTerms
      };
    });
  };
  
  const addParty = () => {
    setFormData(prev => ({
      ...prev,
      parties: [...prev.parties, { name: '', role: '', email: '', phone: '' }]
    }));
  };
  
  const removeParty = (index) => {
    if (formData.parties.length <= 2) return;
    
    setFormData(prev => ({
      ...prev,
      parties: prev.parties.filter((_, i) => i !== index)
    }));
  };
  
  const addTerm = () => {
    setFormData(prev => ({
      ...prev,
      terms: [...prev.terms, { title: '', content: '' }]
    }));
  };
  
  const removeTerm = (index) => {
    if (formData.terms.length <= 1) return;
    
    setFormData(prev => ({
      ...prev,
      terms: prev.terms.filter((_, i) => i !== index)
    }));
  };
  
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    setIsSubmitting(true);
    try {
      await onSubmit(formData);
      onCancel();
    } finally {
      setIsSubmitting(false);
    }
  };
  
  return (
    <div className={styles.overlay}>
      <div className={styles.modal}>
        <div className={styles.header}>
          <h2 className={styles.title}>
            {contract ? t('dashboard.contracts.editContract') : t('dashboard.contracts.newContract')}
          </h2>
          <Button 
            className={styles.closeButton} 
            onClick={onCancel}
            variant="secondary"
          >
            <FiX />
          </Button>
        </div>
        
        <form className={styles.form} onSubmit={handleSubmit}>
          <div className={styles.formSection}>
            <PersonnalizedInputField
              label={t('dashboard.contracts.title')}
              name="title"
              type="text"
              value={formData.title}
              onChange={(e) => handleChange(e)}
              required
            />
            
            <TextareaField
              label={t('dashboard.contracts.description')}
              name="description"
              value={formData.description}
              onChange={(e) => handleChange(e)}
            />
            
            <SimpleDropdown
              label={t('dashboard.contracts.status')}
              options={[
                { value: 'draft', label: t('dashboard.contracts.statusDraft') },
                { value: 'sent', label: t('dashboard.contracts.statusSent') },
                { value: 'signed', label: t('dashboard.contracts.statusSigned') },
                { value: 'active', label: t('dashboard.contracts.statusActive') },
                { value: 'completed', label: t('dashboard.contracts.statusCompleted') },
                { value: 'cancelled', label: t('dashboard.contracts.statusCancelled') }
              ]}
              value={formData.status}
              onChange={(value) => setFormData(prev => ({ ...prev, status: value }))}
            />
          </div>
          
          <div className={styles.formSection}>
            <div className={styles.sectionHeader}>
              <h3>{t('dashboard.contracts.parties')}</h3>
              <Button 
                type="button" 
                className={styles.addButton}
                onClick={addParty}
                variant="secondary"
              >
                + {t('dashboard.contracts.addParty')}
              </Button>
            </div>
            
            {formData.parties.map((party, index) => (
              <div key={index} className={styles.partyItem}>
                <div className={styles.partyHeader}>
                  <span>{t('dashboard.contracts.party')} {index + 1}</span>
                  {index >= 2 && (
                    <Button 
                      type="button"
                      className={styles.removeButton}
                      onClick={() => removeParty(index)}
                      variant="secondary"
                    >
                      <FiX />
                    </Button>
                  )}
                </div>
                
                <div className={styles.partyFields}>
                  <PersonnalizedInputField
                    label={t('dashboard.contracts.partyName')}
                    type="text"
                    value={party.name}
                    onChange={(e) => handlePartyChange(index, 'name', e.target.value)}
                    required
                  />
                  
                  <PersonnalizedInputField
                    label={t('dashboard.contracts.partyRole')}
                    type="text"
                    value={party.role}
                    onChange={(e) => handlePartyChange(index, 'role', e.target.value)}
                  />
                  
                  <PersonnalizedInputField
                    label={t('dashboard.contracts.partyEmail')}
                    type="email"
                    value={party.email}
                    onChange={(e) => handlePartyChange(index, 'email', e.target.value)}
                  />
                  
                  <PersonnalizedInputField
                    label={t('dashboard.contracts.partyPhone')}
                    type="tel"
                    value={party.phone}
                    onChange={(e) => handlePartyChange(index, 'phone', e.target.value)}
                  />
                </div>
              </div>
            ))}
          </div>
          
          <div className={styles.formSection}>
            <div className={styles.sectionHeader}>
              <h3>{t('dashboard.contracts.terms')}</h3>
              <Button 
                type="button" 
                className={styles.addButton}
                onClick={addTerm}
                variant="secondary"
              >
                + {t('dashboard.contracts.addTerm')}
              </Button>
            </div>
            
            {formData.terms.map((term, index) => (
              <div key={index} className={styles.termItem}>
                <div className={styles.termHeader}>
                  <span>{t('dashboard.contracts.term')} {index + 1}</span>
                  {formData.terms.length > 1 && (
                    <Button 
                      type="button"
                      className={styles.removeButton}
                      onClick={() => removeTerm(index)}
                      variant="secondary"
                    >
                      <FiX />
                    </Button>
                  )}
                </div>
                
                <div className={styles.termFields}>
                  <PersonnalizedInputField
                    label={t('dashboard.contracts.termTitle')}
                    type="text"
                    value={term.title}
                    onChange={(e) => handleTermChange(index, 'title', e.target.value)}
                    required
                  />
                  
                  <TextareaField
                    label={t('dashboard.contracts.termContent')}
                    value={term.content}
                    onChange={(e) => handleTermChange(index, 'content', e.target.value)}
                    required
                  />
                </div>
              </div>
            ))}
          </div>
          
          <div className={styles.formActions}>
            <Button
              type="button"
              className={styles.cancelButton}
              onClick={onCancel}
              variant="secondary"
            >
              {t('dashboard.contracts.cancel')}
            </Button>
            
            <Button
              type="submit"
              className={styles.submitButton}
              disabled={isSubmitting}
              variant="primary"
            >
              {isSubmitting 
                ? (contract ? t('dashboard.contracts.updating') : t('dashboard.contracts.creating'))
                : (contract ? t('dashboard.contracts.updateContract') : t('dashboard.contracts.createContract'))
              }
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ContractForm; 