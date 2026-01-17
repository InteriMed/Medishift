import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { FiX } from 'react-icons/fi';
import Button from '../../../../components/BoxedInputFields/Button';
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
            <div className={styles.formGroup}>
              <label htmlFor="title">{t('dashboard.contracts.title')}</label>
              <input
                id="title"
                name="title"
                type="text"
                value={formData.title}
                onChange={handleChange}
                className={styles.input}
                required
              />
            </div>
            
            <div className={styles.formGroup}>
              <label htmlFor="description">{t('dashboard.contracts.description')}</label>
              <textarea
                id="description"
                name="description"
                value={formData.description}
                onChange={handleChange}
                className={styles.textarea}
                rows={3}
              />
            </div>
            
            <div className={styles.formGroup}>
              <label htmlFor="status">{t('dashboard.contracts.status')}</label>
              <select
                id="status"
                name="status"
                value={formData.status}
                onChange={handleChange}
                className={styles.select}
              >
                <option value="draft">{t('dashboard.contracts.statusDraft')}</option>
                <option value="sent">{t('dashboard.contracts.statusSent')}</option>
                <option value="signed">{t('dashboard.contracts.statusSigned')}</option>
                <option value="active">{t('dashboard.contracts.statusActive')}</option>
                <option value="completed">{t('dashboard.contracts.statusCompleted')}</option>
                <option value="cancelled">{t('dashboard.contracts.statusCancelled')}</option>
              </select>
            </div>
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
                  <div className={styles.formGroup}>
                    <label>{t('dashboard.contracts.partyName')}</label>
                    <input
                      type="text"
                      value={party.name}
                      onChange={(e) => handlePartyChange(index, 'name', e.target.value)}
                      className={styles.input}
                      required
                    />
                  </div>
                  
                  <div className={styles.formGroup}>
                    <label>{t('dashboard.contracts.partyRole')}</label>
                    <input
                      type="text"
                      value={party.role}
                      onChange={(e) => handlePartyChange(index, 'role', e.target.value)}
                      className={styles.input}
                    />
                  </div>
                  
                  <div className={styles.formGroup}>
                    <label>{t('dashboard.contracts.partyEmail')}</label>
                    <input
                      type="email"
                      value={party.email}
                      onChange={(e) => handlePartyChange(index, 'email', e.target.value)}
                      className={styles.input}
                    />
                  </div>
                  
                  <div className={styles.formGroup}>
                    <label>{t('dashboard.contracts.partyPhone')}</label>
                    <input
                      type="tel"
                      value={party.phone}
                      onChange={(e) => handlePartyChange(index, 'phone', e.target.value)}
                      className={styles.input}
                    />
                  </div>
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
                  <div className={styles.formGroup}>
                    <label>{t('dashboard.contracts.termTitle')}</label>
                    <input
                      type="text"
                      value={term.title}
                      onChange={(e) => handleTermChange(index, 'title', e.target.value)}
                      className={styles.input}
                      required
                    />
                  </div>
                  
                  <div className={styles.formGroup}>
                    <label>{t('dashboard.contracts.termContent')}</label>
                    <textarea
                      value={term.content}
                      onChange={(e) => handleTermChange(index, 'content', e.target.value)}
                      className={styles.textarea}
                      rows={3}
                      required
                    />
                  </div>
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