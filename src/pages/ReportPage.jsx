import React, { useState } from 'react';
import Button from '../components/Button';
import { ToggleGroup, Input, Select } from '../components/Input';
import { api } from '../utils/api';
import './ReportPage.css';

import { useNotify } from '../contexts/NotificationContext';

const ReportPage = () => {
  const { success: notifySuccess, error: notifyError } = useNotify();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [formData, setFormData] = useState({
    idType: 'student',
    firstName: '',
    lastName: '',
    idNumber: '',
    campus: '',
    contactMethod: 'email',
    contactDetails: '',
    photo: null
  });

  const campusOptions = [
    { value: '', label: 'Select campus...' },
    { value: 'Athi River', label: 'Athi River Campus' },
    { value: 'Nairobi', label: 'Nairobi Campus' },
    { value: 'Mombasa', label: 'Mombasa Campus' }
  ];

  const idTypeOptions = [
    { value: 'student', label: 'Student ID' },
    { value: 'staff', label: 'Staff ID' }
  ];

  const contactOptions = [
    { value: 'email', label: 'Email' },
    { value: 'phone', label: 'Phone' }
  ];

  const handleChange = (key, value) => {
    setFormData(prev => ({ ...prev, [key]: value }));
  };

  const handlePhotoUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      setFormData(prev => ({ ...prev, photo: file }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const reportData = new FormData();
      // Map frontend fields to backend expected fields
      // Backend expects: fullName, finderType, finderContact, finderContactMethod, specificLocation
      reportData.append('idType', formData.idType);
      reportData.append('fullName', `${formData.firstName} ${formData.lastName}`); // Combine names
      reportData.append('idNumber', formData.idNumber);

      // Finder info
      reportData.append('finderType', 'public'); // Default to public for now
      reportData.append('finderContact', formData.contactDetails);
      reportData.append('finderContactMethod', formData.contactMethod);

      // Location
      reportData.append('campus', formData.campus);
      reportData.append('specificLocation', 'Not specified'); // Required by backend

      if (formData.photo) {
        reportData.append('photos', formData.photo);
      }

      const response = await api.upload('/reports', reportData);

      if (response.success) {
        notifySuccess(
          'Report Submitted!',
          'Thank you! The ID has been reported successfully.'
        );

        // Reset form
        setFormData({
          idType: 'student',
          firstName: '',
          lastName: '',
          idNumber: '',
          campus: '',
          contactMethod: 'email',
          contactDetails: '',
          photo: null
        });
      }
    } catch (error) {
      console.error('Submission failed', error);
      notifyError(
        'Submission Failed',
        error.message || 'Unable to submit report. Please try again.'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="container">
      <div className="page-header">
        <h1 className="page-title">Report a Found ID</h1>
        <p className="page-subtitle">
          Help reunite someone with their lost identification card by providing the details below.
        </p>
      </div>

      <div className="form-container">
        <form className="report-form" onSubmit={handleSubmit}>
          {/* ID Type */}
          <ToggleGroup
            options={idTypeOptions}
            value={formData.idType}
            onChange={(value) => handleChange('idType', value)}
            label="ID Type *"
          />

          {/* Name Fields */}
          <div className="form-row">
            <Input
              type="text"
              id="firstName"
              placeholder="Enter first name"
              value={formData.firstName}
              onChange={(e) => handleChange('firstName', e.target.value)}
              label="First Name *"
              required
            />
            <Input
              type="text"
              id="lastName"
              placeholder="Enter last name"
              value={formData.lastName}
              onChange={(e) => handleChange('lastName', e.target.value)}
              label="Last Name *"
              required
            />
          </div>

          {/* ID Number */}
          <Input
            type="text"
            id="idNumber"
            placeholder="Enter ID number from card"
            value={formData.idNumber}
            onChange={(e) => handleChange('idNumber', e.target.value)}
            label="ID Number *"
            required
            hint="The ID number will be partially masked for privacy."
          />

          {/* Campus Location */}
          <Select
            id="campus"
            options={campusOptions}
            value={formData.campus}
            onChange={(e) => handleChange('campus', e.target.value)}
            label="Campus Location *"
            required
          />

          {/* Photo Upload */}
          <div className="form-group">
            <label className="form-label">Photo (Optional)</label>
            <div className="file-upload">
              <div className="file-upload-content">
                <UploadIcon />
                <p>Click to upload or drag and drop</p>
                <span>PNG, JPG up to 5MB</span>
              </div>
              <input type="file" accept="image/*" onChange={handlePhotoUpload} />
            </div>
            <p className="form-hint privacy-hint">
              <ShieldIconSmall />
              Photos are reviewed before being made public. Cover sensitive information.
            </p>
          </div>

          {/* Contact Preference */}
          <div className="form-group">
            <label className="form-label">Contact Preference *</label>
            <div className="radio-group">
              {contactOptions.map(option => (
                <label key={option.value} className="radio-label">
                  <input
                    type="radio"
                    name="contactMethod"
                    value={option.value}
                    checked={formData.contactMethod === option.value}
                    onChange={(e) => handleChange('contactMethod', e.target.value)}
                  />
                  <span className="radio-custom"></span>
                  {option.label}
                </label>
              ))}
            </div>
          </div>

          {/* Contact Details */}
          <Input
            type="text"
            id="contactDetails"
            placeholder={`Enter your ${formData.contactMethod === 'email' ? 'email' : 'phone number'}`}
            value={formData.contactDetails}
            onChange={(e) => handleChange('contactDetails', e.target.value)}
            label="Contact Details *"
            required
            hint="Your contact info is only shared with the verified ID owner."
          />

          {/* Privacy Notice */}
          <div className="privacy-box">
            <ShieldIcon />
            <div>
              <strong>Privacy Assurance</strong>
              <p>
                Your personal information is protected. We only share your contact details with
                verified ID owners after they confirm their identity.
              </p>
            </div>
          </div>

          {/* Submit Button */}
          <Button
            type="submit"
            variant="primary"
            size="lg"
            fullWidth
            isLoading={isSubmitting}
          >
            Submit Report
          </Button>
        </form>
      </div>
    </div>
  );
};

const ShieldIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10" />
  </svg>
);

const ShieldIconSmall = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10" />
  </svg>
);

const UploadIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
    <polyline points="17 8 12 3 7 8" />
    <line x1="12" x2="12" y1="3" y2="15" />
  </svg>
);

export default ReportPage;