import React from 'react';
import SlideBar from '../../../../components/SlideBar/SlideBar';
import DropdownFieldAddList from '../../../../components/Boxed-InputFields/Dropdown-Field-AddList/Dropdown-Field-AddList';
import './combined_css.css';

const Page4_Employee = ({ formData, handleInputChange, errors, handleErrorReset, children, showErrors }) => {
  const locationOptions = ['Location A', 'Location B', 'Location C', 'Other'];
  const certificationOptions = ['CPR', 'First Aid', 'Pharmacy Technician Certification', 'Immunization Administration', 'Medication Therapy Management'];
  const softwareOptions = ['RxSystem', 'EpicCare', 'McKesson', 'PioneerRx', 'PharmacyManager'];

  // Theme variable for gradient
  const themeGradient = {
    color1: '#90da9d',
    color2: '#98b6de'
  };

  const hasErrors = Object.keys(errors).length > 0;

  return (
    <div className="page4-employee">
      <h2 className="page-title">Additional Information </h2>
      <p className="page-subtitle" style={{ marginBottom: '3vh' }}>Tell us about your experiences and preferences</p>
      <form className="signup-form">
        <DropdownFieldAddList
          label="Preferred Work Location*"
          placeholder="Select Locations"
          options={locationOptions}
          value={Array.isArray(formData.preferredWorkLocation) ? formData.preferredWorkLocation : []}
          onChange={(selectedLocation) => handleInputChange({ target: { name: 'preferredWorkLocation', value: selectedLocation } })}
          marginBottom="20px"
          error={errors.preferredWorkLocation}
          onErrorReset={() => handleErrorReset('preferredWorkLocation')}
          disableList={false}
        />
        <div className="form-group">
          <SlideBar
            minValue={0}
            maxValue={20}
            initialValue={formData.yearsOfExperience || 0}
            onChange={(value) => handleInputChange({ target: { name: 'yearsOfExperience', value } })}
            label=""
            beforeLabel="Years of Experience"
            ticksNumber={21}
            specialTicks={["0", "5", "10", "15", "20"]}
            continuousSlide={false}
            bottomMargin="0px"
            sliderColor1={themeGradient.color1}
            sliderColor2={themeGradient.color2}
            colorDot={themeGradient.color2}
            colorRightBar="rgb(230, 230, 230)"
            colorBorder="rgb(230, 230, 230)"
            thumbSize="28px"
            stepSize={1}
          />
        </div>
        <div className="form-group certifications-group">
          <DropdownFieldAddList
            label="Certifications"
            placeholder="Select Certifications"
            options={certificationOptions}
            value={Array.isArray(formData.certifications) ? formData.certifications : []}
            onChange={(selectedCertifications) => handleInputChange({ target: { name: 'certifications', value: selectedCertifications } })}
            marginBottom="20px"
            disableList={false}
          />
        </div>
        <div className="form-group software-group">
          <DropdownFieldAddList
            label="Software"
            placeholder="Select Software"
            options={softwareOptions}
            value={Array.isArray(formData.software) ? formData.software : []}
            onChange={(selectedSoftware) => handleInputChange({ target: { name: 'software', value: selectedSoftware } })}
            marginBottom="20px"
            disableList={false}
          />
        </div>
      </form>
    </div>
  );
};

export default Page4_Employee;
