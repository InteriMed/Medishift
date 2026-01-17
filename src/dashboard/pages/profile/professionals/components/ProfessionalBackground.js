import React, { useState, useCallback, useMemo } from 'react';
import PropTypes from 'prop-types';
import { useTranslation } from 'react-i18next';
import { get, set, cloneDeep } from 'lodash';
import classNames from 'classnames';

// --- Import Utilities ---
import { validateProfileItem, addOrUpdateProfileItem, deleteProfileItem } from '../../utils/professionalBackgroundUtils';
// Import the dropdown options hook
import { useDropdownOptions } from '../../utils/DropdownListsImports';

// --- Import Base Components (Adjust Paths) ---
import InputField from '../../../../../components/BoxedInputFields/Personnalized-InputField';
import TextareaField from '../../../../../components/BoxedInputFields/TextareaField';
import SimpleDropdown from '../../../../../components/BoxedInputFields/Dropdown-Field';
import Button from '../../../../../components/BoxedInputFields/Button';
import CheckboxField from '../../../../../components/BoxedInputFields/CheckboxField';
import Switch from '../../../../../components/BoxedInputFields/Switch';
import { FiEdit, FiTrash2, FiAward, FiBookOpen, FiBriefcase, FiPlus } from 'react-icons/fi';

// =====================================================================


// Tailwind styles
const styles = {
   sectionContainer: "flex flex-col gap-6 p-1 w-full max-w-[1000px] mx-auto",
   headerCard: "bg-card rounded-xl border border-border/60 p-6 pb-4 shadow-sm w-full max-w-[1000px] mx-auto",
   sectionTitle: "text-2xl font-semibold mb-2",
   sectionTitleStyle: { fontSize: '18px', color: 'hsl(var(--foreground))', fontFamily: 'var(--font-family-text, Roboto, sans-serif)' },
   sectionSubtitle: "text-sm font-medium text-muted-foreground",
   subtitleRow: "flex items-end justify-between gap-4",
   mandatoryFieldLegend: "text-xs text-muted-foreground",
   mandatoryMark: "text-destructive",
   sectionsWrapper: "flex flex-col lg:flex-row gap-6 w-full max-w-[1000px] mx-auto",
   leftColumn: "flex flex-col gap-6 flex-1",
   rightColumn: "flex flex-col gap-6 flex-1",
   sectionCard: "bg-card rounded-xl border border-border/60 p-6 shadow-sm w-full",
   cardHeader: "flex items-center gap-4 mb-0",
   cardIconWrapper: "p-2 rounded-lg bg-primary/10 text-primary",
   cardTitle: "flex-1",
   cardTitleH3: "m-0",
   cardTitleH3Style: { color: 'hsl(var(--card-foreground))', fontFamily: 'var(--font-family-text, Roboto, sans-serif)' },
   itemTitleStyle: { color: 'hsl(var(--foreground))', fontFamily: 'var(--font-family-text, Roboto, sans-serif)', fontSize: 'var(--font-size-small)', fontWeight: '500' },
   grid: "grid grid-cols-1 gap-6 !grid-cols-1",
   gridSingle: "grid grid-cols-1 gap-6",
   fieldWrapper: "space-y-2",
   fullWidth: "",
   sectionContent: "space-y-4",
   formSectionError: "border-destructive/50",
   emptyStateText: "text-center text-muted-foreground py-8",
   addItemForm: "rounded-lg p-6 border border-border/60 mt-4",
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
   onCancel,
   getNestedValue,
   onInputChange,
}) => {
   const { t, i18n } = useTranslation(['dashboardProfile', 'dropdowns', 'common', 'validation']);

   // Get dropdown options using the hook
   const dropdownOptionsFromHook = useDropdownOptions();

   // Handle cancel with page reload
   const handleCancel = useCallback(() => {
      // First call the original onCancel handler if provided
      if (onCancel) {
         onCancel();
      }

      // Then reload the page
      window.location.reload();
   }, [onCancel]);

   // --- Config Extraction ---
   const sectionConfig = useMemo(() => config?.fields?.professionalBackground || {}, [config]);
   const itemSchemas = useMemo(() => config?.itemSchemas || {}, [config]);

   // --- Local State for Forms ---
   const [formStates, setFormStates] = useState({});

   // Initialize/Reset form states
   useMemo(() => {
      const initialStates = {};
      Object.keys(sectionConfig).forEach(key => {
         initialStates[key] = { showForm: false, editIndex: -1, itemData: {}, itemErrors: {} };
      });
      setFormStates(initialStates);
   }, [sectionConfig]);

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

      console.warn(`No options found for key: ${optionsKey} (mapped to: ${mappedOptionsKey})`);
      return [];
   }, [dropdownOptionsFromHook, i18n]);

   const setLocalItemErrors = useCallback((sectionKey, errors) => {
      setFormStates(prev => ({
         ...prev,
         [sectionKey]: { ...prev[sectionKey], itemErrors: errors }
      }));
   }, []);

   const resetFormState = useCallback((sectionKey) => {
      setFormStates(prev => ({
         ...prev,
         [sectionKey]: { showForm: false, editIndex: -1, itemData: {}, itemErrors: {} }
      }));
   }, []);

   // --- Handlers Using Utilities ---
   const handleShowAddForm = (sectionKey) => {
      // Reset state before showing
      setFormStates(prev => ({
         ...prev,
         [sectionKey]: { showForm: true, editIndex: -1, itemData: {}, itemErrors: {} }
      }));
   };

   const handleShowEditForm = (sectionKey, index) => {
      // Updated to use professionalDetails prefix for nested data
      const fullSectionPath = `professionalDetails.${sectionKey}`;
      const currentList = getNestedValue(formData, fullSectionPath) || [];
      setFormStates(prev => ({
         ...prev,
         [sectionKey]: { showForm: true, editIndex: index, itemData: cloneDeep(currentList[index]), itemErrors: {} }
      }));
   };

   const handleCancelForm = (sectionKey) => {
      resetFormState(sectionKey);
   };

   const handleItemChange = (sectionKey, fieldName, value) => {
      setFormStates(prev => {
         const newState = cloneDeep(prev);
         set(newState[sectionKey].itemData, fieldName, value);
         set(newState[sectionKey].itemErrors, fieldName, undefined);
         return newState;
      });
   };

   const handleAddOrUpdateItem = (sectionKey) => {
      const currentFormState = formStates[sectionKey];
      if (!currentFormState) return;

      const { itemData, editIndex } = currentFormState;
      const itemSchemaRef = sectionConfig[sectionKey]?.itemSchemaRef;
      const itemSchema = itemSchemas[itemSchemaRef] || [];

      // Updated to use professionalDetails prefix for nested data
      const fullSectionPath = `professionalDetails.${sectionKey}`;
      const currentList = getNestedValue(formData, fullSectionPath) || [];

      // 1. Validate using the utility function
      const validationResult = validateProfileItem(itemData, itemSchema, t);

      // 2. Add/Update using the utility function with updated section path
      addOrUpdateProfileItem({
         sectionKey: fullSectionPath, // Use full path for nested structure
         itemData,
         editIndex,
         currentList,
         onArrayChange,
         resetFormStateCallback: () => resetFormState(sectionKey), // Pass reset function
         validationResult,
         setLocalErrorsCallback: (errors) => setLocalItemErrors(sectionKey, errors) // Pass setter for local errors
      });
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

   // --- Dynamic Field Rendering (Remains in component) ---
   const renderItemFormField = (sectionKey, fieldRule) => {
      const { name, type, required, labelKey, optionsKey, dependsOn, dependsOnValue, dependsOnValueExclude, maxYear } = fieldRule;
      const currentFormState = formStates[sectionKey];
      if (!currentFormState) return null;

      const { itemData, itemErrors } = currentFormState;

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
      const finalLabel = <>{label} {isActuallyRequired && <span className={styles.mandatoryMark}>*</span>}</>;

      const commonProps = {
         label: finalLabel,
         error: error,
         required: isActuallyRequired,
         wrapperClassName: styles.fieldWrapper
      };

      const wrapInput = (component, isFullWidth = false) => (
         <div key={name} className={classNames(styles.fieldWrapper, { [styles.fullWidth]: isFullWidth })}>
            {component}
         </div>
      );

      switch (type) {
         case 'text':
            return wrapInput(<InputField {...commonProps} value={value || ''} onChange={e => handleItemChange(sectionKey, name, e.target.value)} />);
         case 'textarea':
            return wrapInput(<TextareaField {...commonProps} value={value || ''} onChange={e => handleItemChange(sectionKey, name, e.target.value)} />, true);
         case 'date':
            const maxDateValue = maxYear
               ? new Date(maxYear, 11, 31).toISOString().split('T')[0]
               : undefined;
            const dateValue = value ? (typeof value === 'string' ? value : new Date(value).toISOString().split('T')[0]) : '';
            return wrapInput(
               <div>
                  {commonProps.label && (
                     <label className={`boxed-date-label ${commonProps.error ? 'boxed-date-label--error' : ''}`}>
                        {commonProps.label}
                     </label>
                  )}
                  <input
                     type="date"
                     value={dateValue}
                     onChange={(e) => handleItemChange(sectionKey, name, e.target.value || null)}
                     max={maxDateValue}
                     className={`w-full h-9 px-3 rounded-lg border bg-background text-xs text-left focus:outline-none focus:ring-2 focus:ring-ring transition-all ${commonProps.error ? 'date-input-error' : ''}`}
                     style={{
                        fontFamily: 'var(--font-family-text, Roboto, sans-serif)',
                        borderColor: commonProps.error ? 'var(--boxed-inputfield-error-color)' : 'hsl(var(--border) / 0.6)',
                        color: commonProps.error ? 'var(--boxed-inputfield-error-color)' : 'inherit'
                     }}
                  />
               </div>
            );
         case 'dropdown':
            const options = getDropdownOptions(optionsKey);
            return wrapInput(
               <SimpleDropdown
                  label={commonProps.label}
                  options={options}
                  value={value}
                  onChange={(newValue) => handleItemChange(sectionKey, name, newValue)}
                  placeholder={t('common.selectPlaceholder', 'Select...')}
                  required={commonProps.required}
                  error={commonProps.error}
               />
            );
         case 'checkbox':
            // Use Switch for "currently" checkboxes (currentlyStudying, current)
            if (name === 'currentlyStudying' || name === 'current') {
               return wrapInput(
                  <Switch
                     label={label}
                     checked={!!value}
                     onChange={(newValue) => handleItemChange(sectionKey, name, newValue)}
                     marginBottom="0"
                  />,
                  false
               );
            }
            return wrapInput(<CheckboxField label={label} checked={!!value} onChange={(e) => handleItemChange(sectionKey, name, e.target.checked)} />, true);
         default:
            return null;
      }
   };

   const getSectionIcon = (sectionKey) => {
      switch (sectionKey) {
         case 'education': return <FiBookOpen />;
         case 'workExperience': return <FiBriefcase />;
         case 'qualifications': return <FiAward />;
         default: return <FiBriefcase />;
      }
   };

   // --- Generic Renderer for a List Section (Remains in component) ---
   const renderListSection = (sectionKey) => {
      const mainSectionRule = sectionConfig[sectionKey];
      if (!mainSectionRule) return null;

      const itemSchemaRef = mainSectionRule.itemSchemaRef;
      const itemSchema = itemSchemas[itemSchemaRef] || [];

      const fullSectionPath = `professionalDetails.${sectionKey}`;
      const currentList = getNestedValue(formData, fullSectionPath) || [];
      const mainSectionError = getNestedValue(errors, fullSectionPath);
      const currentFormState = formStates[sectionKey];

      const subsectionTitle = t(mainSectionRule.labelKey, sectionKey.charAt(0).toUpperCase() + sectionKey.slice(1).replace(/([A-Z])/g, ' $1'));

      return (
         <div key={sectionKey} className={styles.sectionCard}>
            <div className={classNames(styles.sectionContent, { [styles.formSectionError]: mainSectionError && !currentList.length })}>
               <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
                  <div className={styles.cardIconWrapper}>{getSectionIcon(sectionKey)}</div>
                  <h3 className={styles.cardTitleH3} style={styles.cardTitleH3Style}>{subsectionTitle}</h3>
               </div>

               {/* List of added items */}
               {!currentFormState?.showForm && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 0, marginBottom: 0 }}>
                     {currentList.length > 0 && currentList.map((item, index) => (
                        <React.Fragment key={`${sectionKey}-${index}`}>
                           <div style={{
                              padding: 0,
                              margin: 0,
                              display: 'flex',
                              justifyContent: 'space-between',
                              alignItems: 'center'
                           }}>
                              <div className={styles.itemContent}>
                                 <div className="text-sm font-medium" style={{ color: 'hsl(var(--foreground))', fontFamily: 'var(--font-family-text, Roboto, sans-serif)' }}><strong>{item.title || item.degree || item.jobTitle || 'Item'}</strong></div>
                                 <div className="text-xs" style={{ color: 'hsl(var(--muted-foreground))', fontFamily: 'var(--font-family-text, Roboto, sans-serif)' }}>{item.institution || item.employer}</div>
                              </div>
                              <div className={styles.itemActions} style={{ display: 'flex', gap: '0.75rem' }}>
                                 <button
                                    onClick={() => handleShowEditForm(sectionKey, index)}
                                    className="flex items-center justify-center w-8 h-8 text-muted-foreground hover:text-primary transition-colors"
                                    title={t('common.edit')}
                                    aria-label={t('common.edit')}
                                 >
                                    <FiEdit className="w-4 h-4" />
                                 </button>
                                 <button
                                    onClick={() => handleDeleteItem(sectionKey, index)}
                                    className="flex items-center justify-center w-8 h-8 text-muted-foreground hover:text-destructive transition-colors"
                                    title={t('common.delete')}
                                    aria-label={t('common.delete')}
                                 >
                                    <FiTrash2 className="w-4 h-4" />
                                 </button>
                              </div>
                           </div>
                           {index < currentList.length - 1 && (
                              <div style={{ height: '1px', backgroundColor: 'hsl(var(--border) / 0.3)', margin: '0.5rem 0' }} />
                           )}
                        </React.Fragment>
                     ))}

                     {currentList.length === 0 && (
                        <p className={styles.emptyStateText} style={{ textAlign: 'center', color: 'gray', padding: '2rem' }}>{t(`professionalBackground.no${sectionKey.charAt(0).toUpperCase() + sectionKey.slice(1)}`, 'No entries added yet.')}</p>
                     )}

                     {mainSectionError && !currentList.length && <p className={styles.errorText}>{mainSectionError}</p>}

                     <div style={{ display: 'flex', justifyContent: 'center', marginTop: 0, padding: 0 }}>
                        <button
                           onClick={() => handleShowAddForm(sectionKey)}
                           className="flex items-center justify-center w-8 h-8 text-muted-foreground hover:text-primary transition-colors"
                           title={t('common.add')}
                           aria-label={t('common.add')}
                        >
                           <FiPlus className="w-4 h-4" />
                        </button>
                     </div>
                  </div>
               )}

               {/* Add/Edit Form */}
               {currentFormState?.showForm && (
                  <div className={styles.addItemForm}>
                     <h4 style={{ marginTop: 0, marginBottom: '1.5rem', color: 'hsl(var(--card-foreground))', fontFamily: 'var(--font-family-text, Roboto, sans-serif)' }}>{currentFormState.editIndex > -1 ? t('common.edit') : t('common.add')} {subsectionTitle}</h4>

                     <div className={styles.grid}>
                        {itemSchema.map(fieldRule => renderItemFormField(sectionKey, fieldRule))}
                     </div>

                     <div className={styles.formActions} style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem', marginTop: '1.5rem' }}>
                        <Button onClick={() => handleCancelForm(sectionKey)} variant="secondary">{t('common.cancel')}</Button>
                        <Button onClick={() => handleAddOrUpdateItem(sectionKey)} variant="primary">
                           {currentFormState.editIndex > -1 ? t('common.update') : t('common.add')}
                        </Button>
                     </div>
                  </div>
               )}
            </div>
         </div>
      );
   };

   // --- Main Component Render ---
   return (
      <div className={styles.sectionContainer}>
         <div className={styles.headerCard}>
            <h2 className={styles.sectionTitle} style={styles.sectionTitleStyle}>{t('professionalBackground.title')}</h2>
            <div className={styles.subtitleRow}>
               <p className={styles.sectionSubtitle} style={{ fontFamily: 'var(--font-family-text, Roboto, sans-serif)' }}>{t('professionalBackground.subtitle')}</p>
               <div className={styles.mandatoryFieldLegend}><span className={styles.mandatoryMark}>*</span> {t('common.mandatoryFields')}</div>
            </div>
         </div>

         {/* Dynamically render each section based on config items */}
         <div className={styles.sectionsWrapper}>
            {/* Left Column: Education and Qualifications */}
            <div className={styles.leftColumn}>
               {Object.keys(sectionConfig).filter(sectionKey => sectionKey === 'education' || sectionKey === 'qualifications').map(sectionKey => renderListSection(sectionKey))}
            </div>

            {/* Right Column: Work Experience */}
            <div className={styles.rightColumn}>
               {Object.keys(sectionConfig).filter(sectionKey => sectionKey === 'workExperience').map(sectionKey => renderListSection(sectionKey))}
            </div>
         </div>

         {/* --- Main Action Buttons --- */}
         <div className={styles.sectionCard}>
            <div className={styles.formActions} style={{ marginTop: 0 }}>
               <Button onClick={handleCancel} variant="secondary" disabled={isSubmitting}>
                  {t('common.cancel')}
               </Button>
               <Button onClick={onSaveAndContinue} variant="confirmation" disabled={isSubmitting}>
                  {isSubmitting ? t('common.saving') : t('common.saveAndContinue')}
               </Button>
            </div>
         </div>
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
   onCancel: PropTypes.func.isRequired,
   getNestedValue: PropTypes.func.isRequired,
   onInputChange: PropTypes.func.isRequired
};

export default ProfessionalBackground;