import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import './PageValidation.css';
import checkmarkIcon from '../../assets/img/checkmark.png';
import Button from '../Button/Button';
import UploadFile from '../UploadFile/UploadFile';

const PageValidation = () => {
  const navigate = useNavigate();
  const [isUploaded, setIsUploaded] = useState(false);
  const [showButton, setShowButton] = useState(false);

  const handleContinue = () => {
    if (!isUploaded) return;
    history.push('/dashboard');
  };

  useEffect(() => {
    if (isUploaded) {
      setTimeout(() => {
        setShowButton(true);
      }, 300);
    }
  }, [isUploaded]);

  const handleUploadComplete = async () => {
    const userId = localStorage.getItem('userId');
    if (!userId) return;

    try {
      const response = await fetch('/api/users/update-documents', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId,
          documentsUploaded: true,
        }),
      });

      if (response.ok) {
        setIsUploaded(true);
      } else {
        throw new Error('Failed to update document status');
      }
    } catch (error) {
      console.error('Error updating document status:', error);
    }
  };

  return (
    <div className="validation-container">
      <div className="validation-content">
        <img src={checkmarkIcon} alt="Success" className="checkmark-icon" />
        <h2>Account Created Successfully!</h2>
        <p>Please upload your official documents to activate your account. A validation email will be sent once your documents are reviewed (within 48 hours).</p>
        
        <div className="upload-section">
          <UploadFile 
            onUploadComplete={handleUploadComplete}
            acceptedFileTypes=".pdf,.jpg,.jpeg,.png"
            maxFileSize={5}
          />
        </div>

        <div className={`button-container ${showButton ? 'fade-in' : 'fade-out'}`}>
          <Button
            color="#000000"
            textColor="#FFFFFF"
            focusColor="#333333"
            width="100%"
            height="48px"
            onClick={handleContinue}
            disabled={!isUploaded}
            borderColor="#000000"
            style={{ 
              opacity: showButton ? 1 : 0,
              cursor: isUploaded ? 'pointer' : 'not-allowed' 
            }}
          >
            Continue to Dashboard
          </Button
          
          >
        </div>
      </div>
    </div>
  );
};

export default PageValidation;
