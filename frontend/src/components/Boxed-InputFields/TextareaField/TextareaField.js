import React from 'react';
import InputFieldParagraph from '../InputField-Paragraph/InputField-Paragraph';
import './TextareaField.css';

const TextareaField = ({ 
  label, 
  value, 
  onChange, 
  rows = 4, 
  marginBottom = '20px',
  placeholder = '',
  required = false
}) => {
  return (
    <div className="textarea-field-container" style={{ marginBottom }}>
      <InputFieldParagraph
        label={label}
        value={value}
        onChange={onChange}
        rows={rows}
        placeholder={placeholder}
        required={required}
      />
    </div>
  );
};

export default TextareaField; 