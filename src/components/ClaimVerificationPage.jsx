import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api } from '../utils/api';
import './ClaimVerification.css';
import Button, { ShieldIcon, UploadIcon } from './Button';
import { Input } from './Input';
import { useNotify } from '../contexts/NotificationContext';
import { useAuth } from '../contexts/AuthContext';

const ClaimVerificationPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { success: notifySuccess, error: notifyError } = useNotify();
  const { isAuthenticated } = useAuth();

  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);
  const [step, setStep] = useState(1);
  const [verificationMethod, setVerificationMethod] = useState('id_number');
  const [isSubmitting, setIsSubmitting] = useState(false);
  // isVerified state removed as it was unused except for assignment

  const [verificationData, setVerificationData] = useState({
    idNumber: '',
    phone: '',
    securityQuestions: {
      q1: '',
      q2: '',
      q3: ''
    }
  });

  const [uploadedFiles, setUploadedFiles] = useState([]);

  useEffect(() => {
    const fetchReport = async () => {
      try {
        setLoading(true);
        console.log('Fetching report for verification:', id);
        const response = await api.get(`/reports/${id}`);
        if (response.success) {
          setReport(response.data);
        }
      } catch (error) {
        console.error('Failed to fetch report:', error);
        notifyError('Error', 'Unable to load report details');
      } finally {
        setLoading(false);
      }
    };

    if (id) fetchReport();
  }, [id, notifyError]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    if (name.startsWith('q')) {
      setVerificationData(prev => ({
        ...prev,
        securityQuestions: {
          ...prev.securityQuestions,
          [name]: value
        }
      }));
    } else {
      setVerificationData(prev => ({ ...prev, [name]: value }));
    }
  };

  const handleFileChange = (e) => {
    const files = Array.from(e.target.files);
    setUploadedFiles(prev => [...prev, ...files]);
  };

  const removeFile = (index) => {
    setUploadedFiles(prev => prev.filter((_, i) => i !== index));
  };

  const validateStep = () => {
    console.log('Validating step for method:', verificationMethod);
    switch (verificationMethod) {
      case 'id_number':
        return verificationData.idNumber && verificationData.idNumber.trim().length >= 3;
      case 'security_questions':
        const answers = Object.values(verificationData.securityQuestions);
        return answers.filter(a => a && a.trim() !== '').length >= 2;
      case 'phone_verification':
        return verificationData.phone && verificationData.phone.trim().length >= 8;
      case 'document_upload':
        return uploadedFiles.length > 0;
      default:
        return false;
    }
  };

  const handleVerificationSubmit = async () => {
    console.log('Submitting verification...');

    if (!validateStep()) {
      notifyError('Validation Failed', 'Please complete the required fields.');
      return;
    }

    setIsSubmitting(true);
    try {
      let response;
      const startRes = await api.post('/verifications/start', {
        reportId: id,
        method: verificationMethod === 'phone_verification' ? 'phone_otp' : verificationMethod
      });

      console.log('Verification started:', startRes);
      const verificationId = startRes.data.verificationId;

      if (verificationMethod === 'document_upload') {
        const formData = new FormData();
        formData.append('verificationId', verificationId);
        formData.append('documentType', 'id_card');
        uploadedFiles.forEach(file => formData.append('documents', file));
        response = await api.upload('/verifications/upload-documents', formData);
      } else if (verificationMethod === 'id_number') {
        response = await api.post('/verifications/verify-id', {
          verificationId,
          idNumber: verificationData.idNumber
        });
      } else if (verificationMethod === 'security_questions') {
        response = await api.post('/verifications/verify-questions', {
          verificationId,
          answers: Object.values(verificationData.securityQuestions)
        });
      } else if (verificationMethod === 'phone_verification') {
        notifySuccess('OTP Sent', 'Check your phone for the verification code');
        response = startRes;
      }

      console.log('Verification response:', response);

      if (response && response.success) {
        notifySuccess('Identity Verified!', 'Processing complete.');
        // setIsVerified(true); // Removed as state is unused
        setStep(3);
      } else {
        throw new Error(response?.error || 'Verification failed');
      }
    } catch (error) {
      console.error('Submit handle error:', error);
      notifyError('Verification Failed', error.message || 'Verification could not be completed at this time.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) return <div className="loading-container">Verifying report existence...</div>;
  if (!report) return <div className="error-container">Report not found.</div>;

  return (
    <div className="claim-verification">
      <div className="verification-steps">
        <div className={`step ${step >= 1 ? 'active' : ''}`}>
          <div className="step-number">1</div>
          <span className="step-label">Method</span>
        </div>
        <div className="step-line"></div>
        <div className={`step ${step >= 2 ? 'active' : ''}`}>
          <div className="step-number">2</div>
          <span className="step-label">Verify</span>
        </div>
        <div className="step-line"></div>
        <div className={`step ${step >= 3 ? 'active' : ''}`}>
          <div className="step-number">3</div>
          <span className="step-label">Complete</span>
        </div>
      </div>

      <div className="verification-container">
        <div className="id-details-panel">
          <h2>Claim Your ID</h2>
          <p className="panel-subtitle">To protect our students, we require identity verification before releasing lost items.</p>

          <div className="id-summary">
            <div className="summary-item">
              <span className="label">Full Name</span>
              <span className="value">{report.fullName}</span>
            </div>
            <div className="summary-item">
              <span className="label">ID Type</span>
              <span className="value">{report.idType.toUpperCase()}</span>
            </div>
            <div className="summary-item">
              <span className="label">Campus</span>
              <span className="value">{report.campus}</span>
            </div>
            <div className="summary-item">
              <span className="label">Date Found</span>
              <span className="value">{new Date(report.createdAt).toLocaleDateString()}</span>
            </div>
          </div>

          <div className="security-badge">
            <ShieldIcon />
            <div>
              <strong>Trusted Platform</strong>
              <p>Your data is encrypted and only visible to authorized security personnel.</p>
            </div>
          </div>
        </div>

        <div className="verification-form-panel">
          {!isAuthenticated && step < 3 && (
            <div className="step-content auth-prompt">
              <h3>Authentication Required</h3>
              <p className="method-intro">You must be logged in to verify your identity and claim this ID.</p>
              <div className="auth-actions">
                <Button
                  variant="primary"
                  fullWidth
                  onClick={() => navigate(`/login?redirect=/claim/${id}`)}
                >
                  Login to Verify Identity
                </Button>
                <p className="auth-secondary-note">Don't have an account? <a href="/register">Register here</a></p>
              </div>
            </div>
          )}

          {isAuthenticated && step === 1 && (
            <div className="step-content">
              <h3>Choose Verification Method</h3>
              <p className="method-intro">Select how you want to prove this ID belongs to you.</p>

              <div className="method-options">
                <div
                  className={`method-option ${verificationMethod === 'id_number' ? 'selected' : ''}`}
                  onClick={() => setVerificationMethod('id_number')}
                >
                  <div className="method-icon">🆔</div>
                  <span className="method-name">ID Number</span>
                </div>

                <div
                  className={`method-option ${verificationMethod === 'security_questions' ? 'selected' : ''}`}
                  onClick={() => setVerificationMethod('security_questions')}
                >
                  <div className="method-icon">❓</div>
                  <span className="method-name">Questions</span>
                </div>

                <div
                  className={`method-option ${verificationMethod === 'document_upload' ? 'selected' : ''}`}
                  onClick={() => setVerificationMethod('document_upload')}
                >
                  <div className="method-icon">📄</div>
                  <span className="method-name">Doc Upload</span>
                </div>
              </div>

              <div className="step-actions">
                <Button variant="primary" fullWidth onClick={() => setStep(2)}>
                  Continue
                </Button>
              </div>
            </div>
          )}

          {isAuthenticated && step === 2 && (
            <div className="step-content">
              <h3>Verify Your Identity</h3>

              {verificationMethod === 'id_number' && (
                <div className="verification-method">
                  <p className="method-description">Enter your complete ID number as it appears on the document.</p>
                  <Input
                    type="text"
                    name="idNumber"
                    placeholder="Enter full ID number..."
                    value={verificationData.idNumber}
                    onChange={handleInputChange}
                    label="Full ID Number *"
                  />
                  <div className="security-note">
                    <ShieldIcon />
                    <span>This will be matched against the secure record.</span>
                  </div>
                </div>
              )}

              {verificationMethod === 'security_questions' && (
                <div className="verification-method">
                  <p className="method-description">Answer the following questions to verify ownership.</p>
                  <Input
                    label="What is your year/level of study?"
                    name="q1"
                    placeholder="e.g. 4th Year"
                    value={verificationData.securityQuestions.q1}
                    onChange={handleInputChange}
                  />
                  <Input
                    label="What is your department/faculty?"
                    name="q2"
                    placeholder="e.g. Computer Science"
                    value={verificationData.securityQuestions.q2}
                    onChange={handleInputChange}
                  />
                </div>
              )}

              {verificationMethod === 'document_upload' && (
                <div className="verification-method">
                  <p className="method-description">Upload a photo of your school fees receipt or another identifying document.</p>
                  <div className="file-upload-area">
                    <div className="file-dropzone">
                      <UploadIcon />
                      <p>Click to upload documents</p>
                      <span>PDF, JPG or PNG (Max 5MB)</span>
                      <input type="file" multiple onChange={handleFileChange} />
                    </div>
                    {uploadedFiles.length > 0 && (
                      <div className="uploaded-files">
                        {uploadedFiles.map((file, i) => (
                          <div key={i} className="file-item">
                            <span>{file.name}</span>
                            <button onClick={() => removeFile(i)}>×</button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}

              <div className="step-actions">
                <Button variant="outline" onClick={() => setStep(1)} disabled={isSubmitting}>Back</Button>
                <Button
                  variant="primary"
                  onClick={handleVerificationSubmit}
                  isLoading={isSubmitting}
                >
                  Verify Identity
                </Button>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="step-content success-state">
              <div className="success-icon">✔️</div>
              <h3>Verification Success!</h3>
              <p className="success-message">Your identity has been verified. You can now collect your ID from the security desk.</p>

              <div className="next-steps">
                <h4>Next Steps:</h4>
                <ol>
                  <li>Go to <strong>{report.campus}</strong> Security Office.</li>
                  <li>Present this screen as proof of verification.</li>
                  <li>Sign the collection register.</li>
                </ol>
              </div>

              <div className="success-actions">
                <Button variant="primary" fullWidth onClick={() => navigate('/')}>Back to Home</Button>
                <Button variant="secondary" fullWidth onClick={() => navigate('/messages')}>Contact Finder</Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ClaimVerificationPage;