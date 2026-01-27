import React, { useState, useCallback, useMemo, useEffect } from 'react';
import PropTypes from 'prop-types';
import { useTranslation } from 'react-i18next';
import { get, set, cloneDeep } from 'lodash';
import classNames from 'classnames';

import { validateProfileItem, addOrUpdateProfileItem, deleteProfileItem } from '../../utils/professionalBackgroundUtils';
import { useDropdownOptions } from '../../utils/DropdownListsImports';
import useAutoSave from '../../../../hooks/useAutoSave';

import InputField from '../../../../../components/BoxedInputFields/Personnalized-InputField';
import TextareaField from '../../../../../components/BoxedInputFields/TextareaField';
import SimpleDropdown from '../../../../../components/BoxedInputFields/Dropdown-Field';
import DateField from '../../../../../components/BoxedInputFields/DateField';
import Button from '../../../../../components/BoxedInputFields/Button';
import CheckboxField from '../../../../../components/BoxedInputFields/CheckboxField';
import BoxedSwitchField from '../../../../../components/BoxedInputFields/BoxedSwitchField';
import Dialog from '../../../../../components/Dialog/Dialog';
import { FiEdit, FiTrash2, FiAward, FiBookOpen, FiBriefcase, FiPlus, FiEye, FiFileText } from 'react-icons/fi';


// Tailwind styles
const styles = {
   sectionContainer: "flex flex-col gap-6 p-0 w-full max-w-[1400px] mx-auto",
   headerCard: "bg-card rounded-xl border border-border px-6 py-4 hover:shadow-md transition-shadow w-full max-w-[1400px] mx-auto flex flex-col professional-background-header",
   sectionTitle: "text-2xl font-semibold mb-0",
   sectionTitleStyle: { fontSize: '18px', color: 'var(--text-color)', fontFamily: 'var(--font-family-text, Roboto, sans-serif)' },
   sectionSubtitle: "text-sm font-medium",
   sectionSubtitleStyle: { color: 'var(--text-light-color)', fontFamily: 'var(--font-family-text, Roboto, sans-serif)' },
   subtitleRow: "flex items-end justify-between gap-4",
   mandatoryFieldLegend: "text-xs",
   mandatoryFieldLegendStyle: { color: 'var(--text-light-color)', fontFamily: 'var(--font-family-text, Roboto, sans-serif)' },
   mandatoryMark: "text-destructive",
   sectionsWrapper: "professional-background-sections-wrapper w-full max-w-[1400px] mx-auto",
   leftColumn: "flex flex-col gap-6 flex-1",
   rightColumn: "flex flex-col gap-6 flex-1",
   sectionCard: "bg-card rounded-xl border border-border p-6 hover:shadow-md transition-shadow w-full relative",
   cardHeader: "flex items-center gap-3 mb-4 pb-3 border-b border-border/40",
   cardIconWrapper: "p-2.5 rounded-xl bg-primary/10 flex-shrink-0",
   cardIconStyle: { color: 'var(--primary-color)' },
   cardTitle: "flex-1 min-w-0",
   cardTitleH3: "m-0 text-sm font-semibold truncate",
   cardTitleH3Style: { color: 'var(--text-color)', fontFamily: 'var(--font-family-text, Roboto, sans-serif)' },
   itemTitleStyle: { color: 'var(--text-color)', fontFamily: 'var(--font-family-text, Roboto, sans-serif)', fontSize: 'var(--font-size-small)', fontWeight: '500' },
   grid: "grid grid-cols-1 gap-6 !grid-cols-1",
   gridSingle: "grid grid-cols-1 gap-6",
   fieldWrapper: "space-y-2",
   fullWidth: "",
   sectionContent: "space-y-4",
   formSectionError: "border-destructive/50",
   emptyStateText: "text-center py-8",
   emptyStateTextStyle: { color: 'var(--text-light-color)', fontFamily: 'var(--font-family-text, Roboto, sans-serif)' },
   addItemForm: "rounded-xl p-6 border border-border mt-4",
   itemDisplayLine: "flex flex-col",
   itemContent: "flex flex-col gap-1",
   itemActions: "flex gap-2",
   formActions: "flex justify-end gap-4 mt-6",
   errorText: "text-destructive text-sm mt-2"
};

const ProfessionalBackground = ({
   formData,
   config,
   errors,
   isSubmitting,
   onArrayChange,
   onSaveAndContinue,
   onSave,
   onCancel,
   getNestedValue,
   onInputChange,
   validateCurrentTabData,
   completionPercentage,
   handleAutoFillClick,
   isUploading,
   isAnalyzing,
   autoFillButtonRef,
   uploadInputRef,
   handleFileUpload,
   uploadProgress,
   t: tProp,
}) => {
   const { t, i18n } = useTranslation(['dashboardProfile', 'dropdowns', 'common', 'validation']);

   const dropdownOptionsFromHook = useDropdownOptions();

   const extractTabData = useCallback(() => {
      if (!formData) return null;
      const tabData = {};
      const sectionConfig = config?.fields?.professionalBackground || {};
      Object.keys(sectionConfig).forEach(sectionKey => {
         const value = getNestedValue(formData, sectionKey);
         if (value !== undefined && value !== null) {
            tabData[sectionKey] = value;
         }
      });
      return tabData;
   }, [formData, config, getNestedValue]);

   useAutoSave({
      formData,
      config,
      activeTab: 'professionalBackground',
      onInputChange,
      onSave,
      getNestedValue,
      extractTabData,
      validateCurrentTabData
   });

   useEffect(() => {
      if (validateCurrentTabData && formData && config) {
         validateCurrentTabData(null, null, true);
      }
   }, [validateCurrentTabData, formData, config]);


   // --- Config Extraction ---
   const sectionConfig = useMemo(() => config?.fields?.professionalBackground || {}, [config]);
   const itemSchemas = useMemo(() => config?.itemSchemas || {}, [config]);

   const [dialogState, setDialogState] = useState({
      isOpen: false,
      mode: null,
      sectionKey: null,
      index: -1,
      itemData: {},
      itemErrors: {}
   });

   // --- Helper Functions (mostly related to local state) ---
   const getDropdownOptions = useCallback((optionsKey) => {
      // Handle special cases for optionsKey mapping
      const mappedOptionsKey = optionsKey === 'educationLevels' ? 'education' : optionsKey;

      // First try using the hook with mapped key
      const suffixedKey = `${mappedOptionsKey}Options`;
      const optionsFromHook = dropdownOptionsFromHook[suffixedKey];
      if (optionsFromHook && optionsFromHook.length > 0) {
         return optionsFromHook;
      }

      // Also try with specific educationLevel naming (legacy support)
      if (optionsKey === 'educationLevels') {
         const educationLevelOptions = dropdownOptionsFromHook['educationLevelOptions'];
         if (educationLevelOptions && educationLevelOptions.length > 0) {
            return educationLevelOptions;
         }
      }

      // Try direct access to translations
      const dropdownTranslations = i18n.getResourceBundle(i18n.language, 'dropdowns');
      if (dropdownTranslations) {
         // First try the original key
         if (dropdownTranslations[optionsKey]) {
            return Object.entries(dropdownTranslations[optionsKey]).map(([key, value]) => ({
               value: key,
               label: value
            }));
         }
         // Then try the mapped key if different
         if (mappedOptionsKey !== optionsKey && dropdownTranslations[mappedOptionsKey]) {
            return Object.entries(dropdownTranslations[mappedOptionsKey]).map(([key, value]) => ({
               value: key,
               label: value
            }));
         }
      }

      return [];
   }, [dropdownOptionsFromHook, i18n]);

   const closeDialog = useCallback(() => {
      setDialogState({
         isOpen: false,
         mode: null,
         sectionKey: null,
         index: -1,
         itemData: {},
         itemErrors: {}
      });
   }, []);

   const handleShowAddForm = (sectionKey) => {
      setDialogState({
         isOpen: true,
         mode: 'add',
         sectionKey,
         index: -1,
         itemData: {},
         itemErrors: {}
      });
   };

   const handleShowEditForm = (sectionKey, index) => {
      const fullSectionPath = `professionalDetails.${sectionKey}`;
      const currentList = getNestedValue(formData, fullSectionPath) || [];
      const itemData = cloneDeep(currentList[index]);

      const itemSchemaRef = sectionConfig[sectionKey]?.itemSchemaRef;
      const itemSchema = itemSchemas[itemSchemaRef] || [];
      const { errors: itemErrors } = validateProfileItem(itemData, itemSchema, t);

      setDialogState({
         isOpen: true,
         mode: 'edit',
         sectionKey,
         index,
         itemData,
         itemErrors
      });
   };

   const handleItemChange = (fieldName, value) => {
      setDialogState(prev => {
         const newState = cloneDeep(prev);
         set(newState.itemData, fieldName, value);
         set(newState.itemErrors, fieldName, undefined);
         return newState;
      });
   };

   const handleAddOrUpdateItem = () => {
      if (!dialogState.sectionKey) return;

      const { itemData, index: editIndex, sectionKey } = dialogState;
      const itemSchemaRef = sectionConfig[sectionKey]?.itemSchemaRef;
      const itemSchema = itemSchemas[itemSchemaRef] || [];

      const fullSectionPath = `professionalDetails.${sectionKey}`;
      const currentList = getNestedValue(formData, fullSectionPath) || [];

      const validationResult = validateProfileItem(itemData, itemSchema, t);

      if (validationResult.isValid) {
         addOrUpdateProfileItem({
            sectionKey: fullSectionPath,
            itemData,
            editIndex,
            currentList,
            onArrayChange,
            resetFormStateCallback: closeDialog,
            validationResult,
            setLocalErrorsCallback: (errors) => {
               setDialogState(prev => ({ ...prev, itemErrors: errors }));
            }
         });
      } else {
         setDialogState(prev => ({ ...prev, itemErrors: validationResult.errors }));
      }
   };

   const handleDeleteItem = (sectionKey, index) => {
      // Updated to use professionalDetails prefix for nested data
      const fullSectionPath = `professionalDetails.${sectionKey}`;
      const currentList = getNestedValue(formData, fullSectionPath) || [];
      // Call the utility function
      deleteProfileItem({
         sectionKey: fullSectionPath, // Use full path for nested structure
         indexToDelete: index,
         currentList,
         onArrayChange
      });
   };

   const handleShowView = (sectionKey, index) => {
      const fullSectionPath = `professionalDetails.${sectionKey}`;
      const currentList = getNestedValue(formData, fullSectionPath) || [];
      const itemData = cloneDeep(currentList[index]);

      setDialogState({
         isOpen: true,
         mode: 'view',
         sectionKey,
         index,
         itemData: itemData,
         itemErrors: {}
      });
   };

   const renderItemFormField = (fieldRule) => {
      const { name, type, required, labelKey, optionsKey, dependsOn, dependsOnValue, dependsOnValueExclude, maxYear } = fieldRule;

      const { itemData, itemErrors } = dialogState;

      // Check dependency for rendering
      if (dependsOn) {
         const dependentValue = get(itemData, dependsOn);
         let conditionMet = true;

         if (dependsOnValue) {
            conditionMet = dependsOnValue.includes(dependentValue);
         } else if (dependsOnValueExclude) {
            conditionMet = !dependsOnValueExclude.includes(dependentValue);
         }

         if (!conditionMet) return null; // Don't render if dependency not met
      }

      const value = get(itemData, name);
      const error = get(itemErrors, name);
      const label = t(labelKey, name.charAt(0).toUpperCase() + name.slice(1).replace(/([A-Z])/g, ' $1'));

      // Determine if field is *currently* required based on dependencies
      let isActuallyRequired = required;
      if (dependsOn && isActuallyRequired) {
         const dependentValue = get(itemData, dependsOn);
         let dependencyMet = true;

         if (dependsOnValue) {
            dependencyMet = dependsOnValue.includes(dependentValue);
         } else if (dependsOnValueExclude) {
            dependencyMet = !dependsOnValueExclude.includes(dependentValue);
         }

         if (!dependencyMet) {
            isActuallyRequired = false;
         }
      }
      const commonProps = {
         label: label,
         error: error,
         required: isActuallyRequired
      };

      switch (type) {
         case 'text':
            return <InputField key={name} {...commonProps} value={value || ''} onChange={e => handleItemChange(name, e.target.value)} />;
         case 'textarea':
            return <TextareaField key={name} {...commonProps} value={value || ''} onChange={e => handleItemChange(name, e.target.value)} />;
         case 'date':
            const maxDateValue = maxYear
               ? new Date(maxYear, 11, 31).toISOString().split('T')[0]
               : undefined;
            const dateValue = value ? (typeof value === 'string' ? new Date(value) : value instanceof Date ? value : new Date(value)) : null;
            return (
               <DateField
                  key={name}
                  label={commonProps.label}
                  value={dateValue}
                  onChange={(date) => {
                     handleItemChange(name, date ? date.toISOString().split('T')[0] : null);
                  }}
                  max={maxDateValue}
                  required={commonProps.required}
                  error={commonProps.error}
                  onErrorReset={() => {}}
                  marginBottom={0}
               />
            );
         case 'dropdown':
            const options = getDropdownOptions(optionsKey);
            return (
               <SimpleDropdown
                  key={name}
                  label={commonProps.label}
                  options={options}
                  value={value}
                  onChange={(newValue) => handleItemChange(name, newValue)}
                  placeholder={t('common.selectPlaceholder', 'Select...')}
                  required={commonProps.required}
                  error={commonProps.error}
               />
            );
         case 'checkbox':
            if (name === 'validForLife' || name === 'currentlyStudying' || name === 'current') {
               return (
                  <BoxedSwitchField
                     key={name}
                     label={label}
                     checked={!!value}
                     onChange={(newValue) => handleItemChange(name, newValue)}
                     error={error}
                     required={isActuallyRequired}
                     marginBottom="0"
                  />
               );
            }
            return <CheckboxField key={name} label={label} checked={!!value} onChange={(e) => handleItemChange(name, e.target.checked)} />;
         default:
            return null;
      }
   };

   const getSectionIcon = (sectionKey) => {
      switch (sectionKey) {
         case 'education': return <FiBookOpen className="w-4 h-4" style={styles.cardIconStyle} />;
         case 'workExperience': return <FiBriefcase className="w-4 h-4" style={styles.cardIconStyle} />;
         case 'qualifications': return <FiAward className="w-4 h-4" style={styles.cardIconStyle} />;
         default: return <FiBriefcase className="w-4 h-4" style={styles.cardIconStyle} />;
      }
   };

   const formatFieldValue = (value, fieldRule) => {
      if (value === null || value === undefined || value === '') {
         return '-';
      }

      const { type, optionsKey } = fieldRule;

      switch (type) {
         case 'date':
            if (typeof value === 'string') {
               const date = new Date(value);
               return date.toLocaleDateString(i18n.language || 'en', { year: 'numeric', month: 'long', day: 'numeric' });
            }
            return new Date(value).toLocaleDateString(i18n.language || 'en', { year: 'numeric', month: 'long', day: 'numeric' });
         case 'dropdown':
            const options = getDropdownOptions(optionsKey);
            const option = options.find(opt => opt.value === value);
            return option ? option.label : value;
         case 'checkbox':
            return value ? t('common.yes', 'Yes') : t('common.no', 'No');
         case 'textarea':
            return value;
         default:
            return value;
      }
   };

   const renderDialog = () => {
      if (!dialogState.isOpen || !dialogState.sectionKey) return null;

      const { mode, sectionKey, itemData, itemErrors } = dialogState;
      const mainSectionRule = sectionConfig[sectionKey];
      if (!mainSectionRule) return null;

      const itemSchemaRef = mainSectionRule.itemSchemaRef;
      const itemSchema = itemSchemas[itemSchemaRef] || [];
      const subsectionTitle = t(mainSectionRule.labelKey || sectionKey, sectionKey.charAt(0).toUpperCase() + sectionKey.slice(1).replace(/([A-Z])/g, ' $1'));

      if (mode === 'view') {
         const validateItemForView = (itemData, schema) => {
            const itemErrors = {};
            schema.forEach((fieldRule) => {
               const { name, required, dependsOn, dependsOnValue, dependsOnValueExclude } = fieldRule;
               let isActuallyRequired = required;
               if (dependsOn) {
                  const dependentValue = get(itemData, dependsOn);
                  let conditionMet = true;
                  if (dependsOnValue && !dependsOnValue.includes(dependentValue)) conditionMet = false;
                  if (dependsOnValueExclude && dependsOnValueExclude.includes(dependentValue)) conditionMet = false;
                  if (!conditionMet) isActuallyRequired = false;
               }
               if (isActuallyRequired) {
                  const value = get(itemData, name);
                  if (value === null || value === undefined || String(value).trim() === '') {
                     itemErrors[name] = t('validation.required', 'This field is required');
                  }
               }
            });
            return itemErrors;
         };

         const viewItemErrors = validateItemForView(itemData, itemSchema);

         return (
            <Dialog
               isOpen={dialogState.isOpen}
               onClose={closeDialog}
               title={`${t('common.view', 'View')} ${subsectionTitle}`}
               size="xlarge"
               actions={
                  <Button onClick={closeDialog} variant="primary">
                     {t('common.close', 'Close')}
                  </Button>
               }
            >
               <div style={{ padding: '1rem 0' }}>
                  <div className="space-y-4">
                     {itemSchema.map((fieldRule) => {
                        const { name, labelKey, required, dependsOn, dependsOnValue, dependsOnValueExclude } = fieldRule;
                        const value = get(itemData, name);
                        const label = t(labelKey, name.charAt(0).toUpperCase() + name.slice(1).replace(/([A-Z])/g, ' $1'));
                        const formattedValue = formatFieldValue(value, fieldRule);

                        let isActuallyRequired = required;
                        if (dependsOn) {
                           const dependentValue = get(itemData, dependsOn);
                           let conditionMet = true;
                           if (dependsOnValue && !dependsOnValue.includes(dependentValue)) conditionMet = false;
                           if (dependsOnValueExclude && dependsOnValueExclude.includes(dependentValue)) conditionMet = false;
                           if (!conditionMet) isActuallyRequired = false;
                        }

                        const hasError = viewItemErrors[name] !== undefined;
                        const isEmpty = value === null || value === undefined || String(value).trim() === '';

                        return (
                           <div
                              key={name}
                              style={{
                                 padding: '1rem',
                                 marginBottom: '0.5rem',
                                 border: hasError ? '2px dotted hsl(var(--destructive))' : '1px solid hsl(var(--border) / 0.3)',
                                 borderRadius: '8px',
                                 backgroundColor: hasError ? 'hsl(var(--destructive) / 0.05)' : 'transparent'
                              }}
                           >
                              <div style={{
                                 fontSize: '0.75rem',
                                 fontWeight: '600',
                                 color: hasError ? 'hsl(var(--destructive))' : 'hsl(var(--muted-foreground))',
                                 marginBottom: '0.5rem',
                                 fontFamily: 'var(--font-family-text, Roboto, sans-serif)'
                              }}>
                                 {label} {isActuallyRequired && <span style={{ color: 'hsl(var(--destructive))' }}>*</span>}
                              </div>
                              <div style={{
                                 fontSize: '0.875rem',
                                 color: hasError ? 'hsl(var(--destructive))' : 'hsl(var(--foreground))',
                                 fontFamily: 'var(--font-family-text, Roboto, sans-serif)',
                                 fontStyle: isEmpty ? 'italic' : 'normal'
                              }}>
                                 {formattedValue}
                              </div>
                              {hasError && (
                                 <div style={{
                                    fontSize: '0.75rem',
                                    color: 'hsl(var(--destructive))',
                                    marginTop: '0.5rem',
                                    fontFamily: 'var(--font-family-text, Roboto, sans-serif)'
                                 }}>
                                    {viewItemErrors[name]}
                                 </div>
                              )}
                           </div>
                        );
                     })}
                  </div>
               </div>
            </Dialog>
         );
      }

      if (mode === 'add' || mode === 'edit') {
         return (
            <Dialog
               isOpen={dialogState.isOpen}
               onClose={closeDialog}
               title={`${mode === 'edit' ? t('common.edit') : t('common.add')} ${subsectionTitle}`}
               size="xlarge"
               actions={
                  <>
                     <Button onClick={closeDialog} variant="secondary">{t('common.cancel')}</Button>
                     <Button onClick={handleAddOrUpdateItem} variant="primary">
                        {mode === 'edit' ? t('common.update') : t('common.add')}
                     </Button>
                  </>
               }
            >
               <div style={{ padding: '1rem 0' }}>
                  <div className={styles.grid}>
                     {itemSchema.map(fieldRule => renderItemFormField(fieldRule))}
                  </div>
               </div>
            </Dialog>
         );
      }

      return null;
   };

   const checkItemHasNestedError = useCallback((errors, sectionPath, index) => {
      if (!errors || typeof errors !== 'object') return false;
      
      const itemErrorPath = `${sectionPath}.${index}`;
      const directError = get(errors, itemErrorPath);
      
      if (directError) {
         if (typeof directError === 'string') return true;
         if (typeof directError === 'object' && Object.keys(directError).length > 0) return true;
      }
      
      const errorKeys = Object.keys(errors);
      const itemErrorPrefix = `${itemErrorPath}.`;
      
      for (const key of errorKeys) {
         if (key.startsWith(itemErrorPrefix)) {
            return true;
         }
         const pathParts = key.split('.');
         if (pathParts.length >= 3 && pathParts[0] === 'professionalDetails') {
            const sectionKey = pathParts[1];
            const itemIndex = parseInt(pathParts[2], 10);
            if (!isNaN(itemIndex) && sectionPath.endsWith(`.${sectionKey}`) && itemIndex === index) {
               return true;
            }
         }
      }
      
      return false;
   }, []);

   // --- Generic Renderer for a List Section (Remains in component) ---
   const renderListSection = (sectionKey) => {
      const mainSectionRule = sectionConfig[sectionKey];
      if (!mainSectionRule) return null;

      const itemSchemaRef = mainSectionRule.itemSchemaRef;
      const itemSchema = itemSchemas[itemSchemaRef] || [];

      const mainSectionPath = `professionalDetails.${sectionKey}`;
      const currentList = getNestedValue(formData, mainSectionPath) || [];
      const sectionErrors = get(errors, mainSectionPath);

      const subsectionTitle = t(mainSectionRule.labelKey, sectionKey.charAt(0).toUpperCase() + sectionKey.slice(1).replace(/([A-Z])/g, ' $1'));

      return (
         <div key={sectionKey} className={styles.sectionCard}>
            <div className={styles.sectionContent}>
               <div className={styles.cardHeader}>
                  <div className={styles.cardIconWrapper}>
                     {getSectionIcon(sectionKey)}
                  </div>
                  <div className={styles.cardTitle}>
                     <h3 className={styles.cardTitleH3} style={styles.cardTitleH3Style}>
                        {subsectionTitle}
                     </h3>
                  </div>
               </div>
               <p className={styles.sectionSubtitle} style={{
                  fontSize: '0.75rem',
                  margin: 0,
                  fontFamily: 'var(--font-family-text, Roboto, sans-serif)',
                     color: 'hsl(var(--muted-foreground))'
                  }}>
                     {t(mainSectionRule.descriptionKey, t('professionalBackground.subtitle'))}
                  </p>
               </div>

               <div style={{ display: 'flex', flexDirection: 'column', gap: 0, marginBottom: 0 }}>
                  {currentList.length > 0 && currentList.map((item, index) => {
                     const itemHasError = checkItemHasNestedError(errors, mainSectionPath, index);
                     

                     return (
                        <React.Fragment key={`${sectionKey}-${index}`}>
                           <div style={{
                              padding: '0.5rem',
                              margin: '2px 0',
                              display: 'flex',
                              justifyContent: 'space-between',
                              alignItems: 'center',
                              borderRadius: '8px',
                              borderWidth: '1px',
                              borderStyle: 'dotted',
                              borderColor: itemHasError ? 'hsl(var(--destructive))' : 'hsl(var(--border) / 0.6)',
                              backgroundColor: itemHasError ? 'hsl(var(--destructive) / 0.03)' : 'transparent'
                           }}>
                              <div className={styles.itemContent}>
                                 <div className="text-sm font-medium" style={{
                                    color: itemHasError ? 'hsl(var(--destructive))' : 'hsl(var(--foreground))',
                                    fontFamily: 'var(--font-family-text, Roboto, sans-serif)',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    justifyContent: 'center'
                                 }}>
                                    <strong style={{ color: itemHasError ? 'hsl(var(--destructive))' : 'inherit' }}>{item.title || item.degree || item.jobTitle || 'Item'}</strong>
                                    {itemHasError && (
                                       <span className="text-[10px] uppercase tracking-wider font-bold text-destructive leading-tight">
                                          {t('validation:incomplete', 'Incomplete')}
                                       </span>
                                    )}
                                 </div>
                                 <div className="text-xs" style={{
                                    color: itemHasError ? 'hsl(var(--destructive) / 0.7)' : 'hsl(var(--muted-foreground))',
                                    fontFamily: 'var(--font-family-text, Roboto, sans-serif)'
                                 }}>
                                    {item.institution || item.employer}
                                 </div>
                              </div>
                              <div className={styles.itemActions} style={{ display: 'flex', gap: '0.75rem' }}>
                                 <button
                                    onClick={() => handleShowView(sectionKey, index)}
                                    className={classNames("flex items-center justify-center w-8 h-8 transition-colors", itemHasError ? "text-destructive hover:text-destructive/80" : "text-muted-foreground hover:text-primary")}
                                    title={t('common.view', 'View')}
                                    aria-label={t('common.view', 'View')}
                                    style={itemHasError ? { color: 'hsl(var(--destructive))' } : {}}
                                 >
                                    <FiEye className="w-4 h-4" style={itemHasError ? { color: 'hsl(var(--destructive))' } : {}} />
                                 </button>
                                 <button
                                    onClick={() => handleShowEditForm(sectionKey, index)}
                                    className={classNames("flex items-center justify-center w-8 h-8 transition-colors", itemHasError ? "text-destructive hover:text-destructive/80" : "text-muted-foreground hover:text-primary")}
                                    title={t('common.edit')}
                                    aria-label={t('common.edit')}
                                    style={itemHasError ? { color: 'hsl(var(--destructive))' } : {}}
                                 >
                                    <FiEdit className="w-4 h-4" style={itemHasError ? { color: 'hsl(var(--destructive))' } : {}} />
                                 </button>
                                 <button
                                    onClick={() => handleDeleteItem(sectionKey, index)}
                                    className={classNames("flex items-center justify-center w-8 h-8 transition-colors", itemHasError ? "text-destructive hover:text-destructive/80" : "text-muted-foreground hover:text-destructive")}
                                    title={t('common.delete')}
                                    aria-label={t('common.delete')}
                                    style={itemHasError ? { color: 'hsl(var(--destructive))' } : {}}
                                 >
                                    <FiTrash2 className="w-4 h-4" style={itemHasError ? { color: 'hsl(var(--destructive))' } : {}} />
                                 </button>
                              </div>
                           </div>
                           {index < currentList.length - 1 && !itemHasError && (
                              <div style={{ height: '1px', backgroundColor: 'hsl(var(--border) / 0.3)', margin: '0.25rem 0' }} />
                           )}
                        </React.Fragment>
                     );
                  })}

                  {currentList.length === 0 && (
                     <p className={styles.emptyStateText} style={{ textAlign: 'center', color: 'gray', padding: '2rem' }}>{t(`professionalBackground.no${sectionKey.charAt(0).toUpperCase() + sectionKey.slice(1)}`, 'No entries added yet.')}</p>
                  )}

                  {typeof sectionErrors === 'string' && !currentList.length && <p className={styles.errorText}>{sectionErrors}</p>}

                  <div style={{ display: 'flex', justifyContent: 'center', marginTop: 0, padding: 0 }}>
                     <button
                        onClick={() => handleShowAddForm(sectionKey)}
                        className="flex items-center justify-center w-8 h-8 text-muted-foreground hover:text-primary transition-colors"
                        title={t('common:add', 'Add')}
                        aria-label={t('common:add', 'Add')}
                     >
                        <FiPlus className="w-4 h-4" />
                     </button>
                  </div>
               </div>
            </div>
      );
   };

   // --- Main Component Render ---
   return (
      <div className={styles.sectionContainer}>
         <style>{`
            .professional-background-container {
               container-type: inline-size;
            }
            
            .professional-background-header-grid {
               display: grid;
               gap: 1.5rem;
               width: 100%;
               grid-template-columns: 1fr 1fr;
               grid-template-areas: 
                  "title title"
                  "completion autofill";
               align-items: center;
            }

            .header-title-row {
               grid-area: title;
               display: flex;
               flex-direction: column;
               gap: 0.25rem;
            }

            .header-completion-centered {
               grid-area: completion;
               display: flex;
               justify-content: flex-start;
               width: 100%;
            }

            .header-autofill-right {
               grid-area: autofill;
               display: flex;
               justify-content: flex-end;
            }

            .professional-background-sections-wrapper {
               display: grid;
               grid-template-columns: 1fr 1fr;
               gap: 1.5rem;
            }

            @container (max-width: 700px) {
               .professional-background-sections-wrapper {
                  grid-template-columns: 1fr;
               }
            }
         `}</style>
         {/* Dynamically render each section based on config items */}
         <div className={styles.sectionsWrapper}>
               <div className={styles.leftColumn}>
                  {Object.keys(sectionConfig).filter(sectionKey => sectionKey === 'education' || sectionKey === 'qualifications').map(sectionKey => renderListSection(sectionKey))}
               </div>

               <div className={styles.rightColumn}>
                  {Object.keys(sectionConfig).filter(sectionKey => sectionKey === 'workExperience').map(sectionKey => renderListSection(sectionKey))}
                  <div className={styles.sectionCard}>
                     <div className={styles.gridSingle}>
                        <div className={styles.cardHeader}>
                           <div className={styles.cardIconWrapper}>
                              <FiFileText className="w-4 h-4" style={styles.cardIconStyle} />
                           </div>
                           <div className={styles.cardTitle}>
                              <h3 className={styles.cardTitleH3} style={styles.cardTitleH3Style}>{t('personalDetails.summary', 'Summary')}</h3>
                           </div>
                        </div>
                        <div className={styles.gridSingle}>
                           <TextareaField
                              label=""
                              name="professionalDetails.professionalSummary"
                              value={getNestedValue(formData, 'professionalDetails.professionalSummary') || ''}
                              onChange={(e) => onInputChange('professionalDetails.professionalSummary', e.target.value)}
                              placeholder={t('personalDetails.summaryPlaceholder', 'Tell us about your professional background...')}
                              error={getNestedValue(errors, 'professionalDetails.professionalSummary')}
                              maxLength={1000}
                              rows={8}
                           />
                        </div>
                     </div>
                  </div>
               </div>
            </div>

         {renderDialog()}
      </div>
   );
};

ProfessionalBackground.propTypes = {
   formData: PropTypes.object.isRequired,
   config: PropTypes.shape({
      fields: PropTypes.shape({
         professionalBackground: PropTypes.object
      }),
      itemSchemas: PropTypes.object
   }).isRequired,
   errors: PropTypes.object.isRequired,
   isSubmitting: PropTypes.bool.isRequired,
   onArrayChange: PropTypes.func.isRequired,
   onSaveAndContinue: PropTypes.func.isRequired,
   onSave: PropTypes.func,
   onCancel: PropTypes.func.isRequired,
   getNestedValue: PropTypes.func.isRequired,
   onInputChange: PropTypes.func.isRequired
};

export default ProfessionalBackground;