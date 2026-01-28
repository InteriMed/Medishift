import React from 'react';
import { useTranslation } from 'react-i18next';
import InputField from '../../../../../components/boxedInputFields/personnalizedInputField';
import InputFieldParagraph from '../../../../../components/boxedInputFields/textareaField';
import SimpleDropdown from '../../../../../components/boxedInputFields/dropdownField';
import dateField from '../../../../../components/boxedInputFields/dateField';
import boxedSwitchField from '../../../../../components/boxedInputFields/boxedSwitchField';

const EventFormFields = ({
  formData,
  onFormDataChange,
  employees,
  loadingEmployees,
  facilities,
  organizations,
  selectedWorkspace,
  handleDateChange,
  handleTimeChange,
  showNotesSection = false
}) => {
  const { t } = useTranslation('calendar');

  const handleChange = (e) => {
    const { name, value } = e.target;
    onFormDataChange(prev => ({ ...prev, [name]: value }));
  };

  const shouldShowEmployeeField = 
    (formData.category === 'Meeting' || formData.category === 'Leave Request') || 
    formData.facilityId || 
    formData.organizationId || 
    selectedWorkspace?.type === 'facility' || 
    selectedWorkspace?.type === 'organization' || 
    selectedWorkspace?.facilityId;

  return (
    <>
      <InputField
        label={t('title', 'Title')}
        name="title"
        type="text"
        value={formData.title}
        onChange={handleChange}
        placeholder="Add title"
        marginTop="20px"
      />

      <SimpleDropdown
        label="Calendar"
        labelAsTitle={!formData.isRecurring}
        marginTop={formData.isRecurring ? "0" : "20px"}
        options={[
          { value: 'Leave Request', label: 'Leave Request' },
          { value: 'Sick Leave', label: 'Sick Leave' },
          { value: 'Appointment', label: 'Appointment' },
          { value: 'Meeting', label: 'Meeting' },
          { value: 'Schedule', label: 'Schedule' },
          { value: 'Other', label: 'Other' }
        ]}
        value={formData.category}
        onChange={(value) => onFormDataChange(prev => ({ ...prev, category: value }))}
        placeholder="Select category"
      />

      {shouldShowEmployeeField && (
        <SimpleDropdown
          label="Employee"
          options={employees.map(emp => ({ value: emp.id, label: emp.name }))}
          value={formData.employee}
          onChange={(value) => onFormDataChange(prev => ({ ...prev, employee: value }))}
          placeholder={loadingEmployees ? "Loading employees..." : "Select employee"}
          searchable={true}
        />
      )}

      <SimpleDropdown
        label="Location"
        options={[
          { value: '', label: 'None' },
          ...facilities.map(facility => ({ value: facility.id, label: facility.name })),
          ...(formData.isRecurring 
            ? organizations.map(org => ({ value: `org_${org.id}`, label: org.name }))
            : []
          )
        ]}
        value={formData.facilityId || formData.organizationId ? (formData.organizationId ? `org_${formData.organizationId}` : formData.facilityId) : ''}
        onChange={(value) => {
          if (value.startsWith('org_')) {
            const orgId = value.replace('org_', '');
            onFormDataChange(prev => ({ 
              ...prev, 
              organizationId: orgId,
              facilityId: null,
              employee: '',
              matchFacilityHours: false
            }));
          } else {
            onFormDataChange(prev => ({ 
              ...prev, 
              facilityId: value || null,
              organizationId: formData.isRecurring ? null : prev.organizationId,
              employee: '',
              matchFacilityHours: false
            }));
          }
        }}
        placeholder="Select location"
      />

      {formData.facilityId && selectedWorkspace?.type !== 'personal' && (
        <boxedSwitchField
          label="Match Facility Opening Hours"
          checked={formData.matchFacilityHours}
          onChange={(checked) => onFormDataChange(p => ({ ...p, matchFacilityHours: checked }))}
        />
      )}

      <div className="space-y-4">
        <div className="">
          <div className="grid grid-cols-[1fr_1fr] gap-2">
            <dateField
              label={t('startDate', 'Start Date')}
              value={formData.start}
              onChange={(value) => handleDateChange('startDate', value)}
              marginBottom="0"
            />
            {!formData.matchFacilityHours && !formData.matchSchedulePerDay && (
              <InputField
                label={t('startTime', 'Start Time')}
                type="time"
                value={formData.startTime || ''}
                onChange={(e) => handleTimeChange('startTime', e.target.value)}
                marginBottom="0"
              />
            )}
          </div>
        </div>
        <div className="">
          <div className="grid grid-cols-[1fr_1fr] gap-2">
            <dateField
              label={t('endDate', 'End Date')}
              value={formData.end}
              onChange={(value) => handleDateChange('endDate', value)}
              marginBottom="0"
            />
            {!formData.matchFacilityHours && !formData.matchSchedulePerDay && (
              <InputField
                label={t('endTime', 'End Time')}
                type="time"
                value={formData.endTime || ''}
                onChange={(e) => handleTimeChange('endTime', e.target.value)}
                marginBottom="0"
              />
            )}
          </div>
        </div>
      </div>

      {showNotesSection ? (
        formData.notes || formData.showNotes ? (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium text-muted-foreground">{t('notes', 'Description')}</label>
              <button
                type="button"
                onClick={() => onFormDataChange(prev => ({ ...prev, notes: '', showNotes: false }))}
                className="text-sm text-muted-foreground hover:text-foreground"
              >
                Remove
              </button>
            </div>
            <InputFieldParagraph
              name="notes"
              value={formData.notes || ''}
              onChange={handleChange}
              placeholder="Add description..."
              rows={3}
            />
          </div>
        ) : (
          <button
            type="button"
            onClick={() => onFormDataChange(prev => ({ ...prev, showNotes: true }))}
            className="text-sm text-primary hover:text-primary/80 flex items-center gap-1"
          >
            <span>+</span>
            <span>Add a Note</span>
          </button>
        )
      ) : (
        <InputFieldParagraph
          label={t('notes', 'Description')}
          name="notes"
          value={formData.notes}
          onChange={handleChange}
          placeholder="Add description..."
          rows={3}
        />
      )}
    </>
  );
};

export default EventFormFields;

